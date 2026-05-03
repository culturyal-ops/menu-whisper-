-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Restaurants / Tenants
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    whatsapp_number_id TEXT,
    whatsapp_phone_number TEXT,
    ai_tone_config JSONB DEFAULT '{"personality":"warm","formality":"polite"}',
    primary_color TEXT DEFAULT '#c9a96e',
    logo_url TEXT,
    plan_tier TEXT DEFAULT 'starter',
    setup_fee_paid BOOLEAN DEFAULT false,
    owner_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Items (versioned)
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    version INT DEFAULT 1,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT,
    dietary_tags TEXT[],
    allergens TEXT[],
    calories INT,
    preparation_time INT,
    ingredients JSONB,
    wine_pairing TEXT,
    chef_note TEXT,
    is_available BOOLEAN DEFAULT true,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);

-- Guest Profiles (anonymized)
CREATE TABLE guest_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    wa_number_hash TEXT NOT NULL,
    dietary_preferences JSONB,
    taste_vector VECTOR(1536),
    visit_count INT DEFAULT 1,
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    total_spent DECIMAL(10,2) DEFAULT 0,
    opted_in_marketing BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, wa_number_hash)
);

CREATE INDEX idx_guest_profiles_hash ON guest_profiles(restaurant_id, wa_number_hash);

-- WhatsApp Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    guest_profile_id UUID REFERENCES guest_profiles(id),
    wa_phone_number TEXT,
    status TEXT DEFAULT 'active',
    current_order_id UUID,
    session_data JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_restaurant ON sessions(restaurant_id);
CREATE INDEX idx_sessions_guest ON sessions(guest_profile_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    guest_profile_id UUID REFERENCES guest_profiles(id),
    table_number TEXT,
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    payment_id TEXT,
    kitchen_sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Conversation Logs (analytics)
CREATE TABLE conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    message_type TEXT,
    message_content TEXT,
    intent_detected TEXT,
    tokens_used INT,
    cost_usd DECIMAL(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_logs_restaurant ON conversation_logs(restaurant_id);
CREATE INDEX idx_conversation_logs_session ON conversation_logs(session_id);
CREATE INDEX idx_conversation_logs_created ON conversation_logs(created_at DESC);

-- Marketing / Re-engagement Queue
CREATE TABLE marketing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    guest_profile_id UUID REFERENCES guest_profiles(id),
    message_template_id TEXT,
    scheduled_for TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_queue_scheduled ON marketing_queue(scheduled_for) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies (restaurant owners can only see their own data)
CREATE POLICY restaurant_isolation_menu ON menu_items
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    ));

CREATE POLICY restaurant_isolation_orders ON orders
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    ));

CREATE POLICY restaurant_isolation_guests ON guest_profiles
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    ));

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
