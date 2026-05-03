-- ============================================================================
-- Menu Whisper - Complete Database Schema
-- Supabase PostgreSQL with pgvector
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- TABLE 1: restaurants
-- Stores restaurant/tenant information
-- ============================================================================

CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    
    -- WhatsApp configuration
    whatsapp_number_id TEXT UNIQUE,
    whatsapp_phone_number TEXT,
    
    -- AI configuration
    ai_tone_config JSONB DEFAULT '{"personality":"warm","formality":"polite"}',
    
    -- Branding
    primary_color TEXT DEFAULT '#c9a96e',
    logo_url TEXT,
    
    -- Subscription
    plan_tier TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'professional', 'enterprise')),
    setup_fee_paid BOOLEAN DEFAULT false,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for restaurants
CREATE INDEX idx_restaurants_owner ON restaurants(owner_user_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_whatsapp_number ON restaurants(whatsapp_number_id);

-- ============================================================================
-- TABLE 2: menu_items
-- Stores menu items with vector embeddings for similarity search
-- ============================================================================

CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Versioning
    version INT DEFAULT 1,
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT,
    
    -- Dietary information
    dietary_tags TEXT[] DEFAULT '{}',
    allergens TEXT[] DEFAULT '{}',
    calories INT CHECK (calories >= 0),
    preparation_time INT CHECK (preparation_time >= 0),
    
    -- Detailed info
    ingredients JSONB DEFAULT '[]',
    wine_pairing TEXT,
    chef_note TEXT,
    image_url TEXT,
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    
    -- Vector embedding for similarity search (OpenAI ada-002 = 1536 dimensions)
    embedding VECTOR(1536),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_price CHECK (price >= 0)
);

-- Indexes for menu_items
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id) WHERE is_available = true;

-- Note: Full-text search index will be created in performance optimizations
-- Note: Vector index will be created after data is inserted (requires pgvector extension)

-- ============================================================================
-- TABLE 3: guest_profiles
-- Anonymized guest profiles (phone numbers hashed)
-- ============================================================================

CREATE TABLE guest_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Privacy: SHA256 hash of phone number (never store raw)
    wa_number_hash TEXT NOT NULL,
    
    -- Preferences
    dietary_preferences JSONB DEFAULT '{}',
    
    -- Taste vector for personalization (optional)
    taste_vector VECTOR(1536),
    
    -- Visit history
    visit_count INT DEFAULT 1 CHECK (visit_count >= 0),
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    total_spent DECIMAL(10,2) DEFAULT 0 CHECK (total_spent >= 0),
    
    -- Marketing
    opted_in_marketing BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(restaurant_id, wa_number_hash)
);

-- Indexes for guest_profiles
CREATE INDEX idx_guest_profiles_restaurant ON guest_profiles(restaurant_id);
CREATE INDEX idx_guest_profiles_hash ON guest_profiles(restaurant_id, wa_number_hash);
CREATE INDEX idx_guest_profiles_last_visit ON guest_profiles(last_visit);
CREATE INDEX idx_guest_profiles_marketing ON guest_profiles(restaurant_id) WHERE opted_in_marketing = true;

-- ============================================================================
-- TABLE 4: sessions
-- WhatsApp conversation sessions
-- ============================================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
    
    -- Session info
    wa_phone_number TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'closed')),
    
    -- Current order reference
    current_order_id UUID,
    
    -- Session context (conversation state, preferences, etc.)
    session_data JSONB DEFAULT '{}',
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Indexes for sessions
CREATE INDEX idx_sessions_restaurant ON sessions(restaurant_id);
CREATE INDEX idx_sessions_guest ON sessions(guest_profile_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_active ON sessions(restaurant_id, status) WHERE status = 'active';
CREATE INDEX idx_sessions_last_message ON sessions(last_message_at DESC);

-- ============================================================================
-- TABLE 5: orders
-- Guest orders
-- ============================================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
    
    -- Order details
    table_number TEXT,
    items JSONB NOT NULL,
    
    -- Pricing
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
    
    -- Payment info
    payment_id TEXT,
    payment_method TEXT,
    
    -- Timestamps
    kitchen_sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_orders_guest ON orders(guest_profile_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_restaurant_created ON orders(restaurant_id, created_at);

-- ============================================================================
-- TABLE 6: conversation_logs
-- Logs all WhatsApp conversations for analytics
-- ============================================================================

CREATE TABLE conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Message info
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai', 'system')),
    message_content TEXT NOT NULL,
    
    -- AI metadata
    intent_detected TEXT,
    tokens_used INT CHECK (tokens_used >= 0),
    cost_usd DECIMAL(10,6) CHECK (cost_usd >= 0),
    model_used TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conversation_logs
CREATE INDEX idx_conversation_logs_restaurant ON conversation_logs(restaurant_id);
CREATE INDEX idx_conversation_logs_session ON conversation_logs(session_id);
CREATE INDEX idx_conversation_logs_created ON conversation_logs(created_at DESC);
CREATE INDEX idx_conversation_logs_intent ON conversation_logs(intent_detected);

-- Partition by month for better performance (optional, for high volume)
-- CREATE TABLE conversation_logs_2025_05 PARTITION OF conversation_logs
-- FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

-- ============================================================================
-- TABLE 7: marketing_queue
-- Queue for scheduled marketing messages
-- ============================================================================

CREATE TABLE marketing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    guest_profile_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
    
    -- Message info
    message_template_id TEXT NOT NULL,
    message_content TEXT,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for marketing_queue
CREATE INDEX idx_marketing_queue_restaurant ON marketing_queue(restaurant_id);
CREATE INDEX idx_marketing_queue_guest ON marketing_queue(guest_profile_id);
CREATE INDEX idx_marketing_queue_scheduled ON marketing_queue(scheduled_for, status);
CREATE INDEX idx_marketing_queue_pending ON marketing_queue(restaurant_id) WHERE status = 'pending';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment guest spent amount
CREATE OR REPLACE FUNCTION increment_guest_spent(profile_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE guest_profiles
    SET total_spent = total_spent + amount
    WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on restaurants
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at on menu_items
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VIEWS (for analytics)
-- ============================================================================

-- Daily revenue by restaurant
CREATE OR REPLACE VIEW daily_revenue AS
SELECT 
    restaurant_id,
    DATE(created_at) as date,
    COUNT(*) as order_count,
    SUM(total) as revenue,
    AVG(total) as avg_order_value
FROM orders
WHERE payment_status = 'paid'
GROUP BY restaurant_id, DATE(created_at);

-- Active sessions count
CREATE OR REPLACE VIEW active_sessions_count AS
SELECT 
    restaurant_id,
    COUNT(*) as active_sessions
FROM sessions
WHERE status = 'active'
GROUP BY restaurant_id;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample restaurant (you'll need to replace owner_user_id with actual auth.users id)
-- INSERT INTO restaurants (owner_user_id, name, slug, email, phone, whatsapp_number_id, whatsapp_phone_number)
-- VALUES (
--     'YOUR_AUTH_USER_ID',
--     'The Leela Kovalam',
--     'leela-kovalam',
--     'contact@leela-kovalam.com',
--     '+91 471 302 5555',
--     '123456789',
--     '+919876543210'
-- );

-- ============================================================================
-- GRANTS (for service role)
-- ============================================================================

-- Grant all privileges to service role (for backend API)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE restaurants IS 'Multi-tenant restaurant accounts';
COMMENT ON TABLE menu_items IS 'Menu items with vector embeddings for similarity search';
COMMENT ON TABLE guest_profiles IS 'Anonymized guest profiles (phone numbers hashed for privacy)';
COMMENT ON TABLE sessions IS 'WhatsApp conversation sessions';
COMMENT ON TABLE orders IS 'Guest orders with payment tracking';
COMMENT ON TABLE conversation_logs IS 'All WhatsApp messages for analytics';
COMMENT ON TABLE marketing_queue IS 'Scheduled marketing messages';

COMMENT ON COLUMN guest_profiles.wa_number_hash IS 'SHA256 hash of phone number - never store raw phone numbers';
COMMENT ON COLUMN menu_items.embedding IS 'OpenAI ada-002 embedding (1536 dimensions) for similarity search';
COMMENT ON COLUMN guest_profiles.taste_vector IS 'Personalization vector based on order history';
