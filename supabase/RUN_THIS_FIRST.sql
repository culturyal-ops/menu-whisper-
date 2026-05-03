-- ============================================================================
-- Menu Whisper - COMPLETE DATABASE SETUP
-- ============================================================================
-- Run this ENTIRE file in Supabase SQL Editor
-- This is the corrected version with all errors fixed
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- STEP 2: Create Tables
-- ============================================================================

-- TABLE 1: restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    whatsapp_number_id TEXT UNIQUE,
    whatsapp_phone_number TEXT,
    ai_tone_config JSONB DEFAULT '{"personality":"warm","formality":"polite"}',
    primary_color TEXT DEFAULT '#c9a96e',
    logo_url TEXT,
    plan_tier TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'professional', 'enterprise')),
    setup_fee_paid BOOLEAN DEFAULT false,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- TABLE 2: menu_items
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    version INT DEFAULT 1,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT,
    dietary_tags TEXT[] DEFAULT '{}',
    allergens TEXT[] DEFAULT '{}',
    calories INT CHECK (calories >= 0),
    preparation_time INT CHECK (preparation_time >= 0),
    ingredients JSONB DEFAULT '[]',
    wine_pairing TEXT,
    chef_note TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 3: guest_profiles
CREATE TABLE IF NOT EXISTS guest_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    wa_number_hash TEXT NOT NULL,
    dietary_preferences JSONB DEFAULT '{}',
    taste_vector VECTOR(1536),
    visit_count INT DEFAULT 1 CHECK (visit_count >= 0),
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    total_spent DECIMAL(10,2) DEFAULT 0 CHECK (total_spent >= 0),
    opted_in_marketing BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, wa_number_hash)
);

-- TABLE 4: sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
    wa_phone_number TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'closed')),
    current_order_id UUID,
    session_data JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- TABLE 5: orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
    table_number TEXT,
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
    payment_id TEXT,
    payment_method TEXT,
    kitchen_sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 6: conversation_logs
CREATE TABLE IF NOT EXISTS conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai', 'system')),
    message_content TEXT NOT NULL,
    intent_detected TEXT,
    tokens_used INT CHECK (tokens_used >= 0),
    cost_usd DECIMAL(10,6) CHECK (cost_usd >= 0),
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 7: marketing_queue
CREATE TABLE IF NOT EXISTS marketing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    guest_profile_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
    message_template_id TEXT NOT NULL,
    message_content TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Create Indexes
-- ============================================================================

-- Restaurants indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_whatsapp_number ON restaurants(whatsapp_number_id);

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(restaurant_id) WHERE is_available = true;

-- Guest profiles indexes
CREATE INDEX IF NOT EXISTS idx_guest_profiles_restaurant ON guest_profiles(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_hash ON guest_profiles(restaurant_id, wa_number_hash);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_last_visit ON guest_profiles(last_visit);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_marketing ON guest_profiles(restaurant_id) WHERE opted_in_marketing = true;

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_restaurant ON sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_guest ON sessions(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(restaurant_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sessions_last_message ON sessions(last_message_at DESC);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest ON orders(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_id, created_at);

-- Conversation logs indexes
CREATE INDEX IF NOT EXISTS idx_conversation_logs_restaurant ON conversation_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_session ON conversation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created ON conversation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_intent ON conversation_logs(intent_detected);

-- Marketing queue indexes
CREATE INDEX IF NOT EXISTS idx_marketing_queue_restaurant ON marketing_queue(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_guest ON marketing_queue(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_scheduled ON marketing_queue(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_pending ON marketing_queue(restaurant_id) WHERE status = 'pending';

-- ============================================================================
-- STEP 4: Create Functions
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
-- STEP 5: Create Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STEP 6: Create Views
-- ============================================================================

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

CREATE OR REPLACE VIEW active_sessions_count AS
SELECT 
    restaurant_id,
    COUNT(*) as active_sessions
FROM sessions
WHERE status = 'active'
GROUP BY restaurant_id;

-- ============================================================================
-- STEP 7: Grant Permissions
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 8: Enable Row Level Security
-- ============================================================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 9: Create RLS Policies
-- ============================================================================

-- Restaurants policies
DROP POLICY IF EXISTS "Restaurant owners can read own restaurant" ON restaurants;
CREATE POLICY "Restaurant owners can read own restaurant"
ON restaurants FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own restaurant" ON restaurants;
CREATE POLICY "Users can create own restaurant"
ON restaurants FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Restaurant owners can update own restaurant" ON restaurants;
CREATE POLICY "Restaurant owners can update own restaurant"
ON restaurants FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Menu items policies
DROP POLICY IF EXISTS "Restaurant owners can read own menu" ON menu_items;
CREATE POLICY "Restaurant owners can read own menu"
ON menu_items FOR SELECT TO authenticated
USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Restaurant owners can insert own menu items" ON menu_items;
CREATE POLICY "Restaurant owners can insert own menu items"
ON menu_items FOR INSERT TO authenticated
WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Restaurant owners can update own menu items" ON menu_items;
CREATE POLICY "Restaurant owners can update own menu items"
ON menu_items FOR UPDATE TO authenticated
USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

-- Guest profiles policies
DROP POLICY IF EXISTS "Restaurant owners can read own guests" ON guest_profiles;
CREATE POLICY "Restaurant owners can read own guests"
ON guest_profiles FOR SELECT TO authenticated
USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

-- Orders policies
DROP POLICY IF EXISTS "Restaurant owners can read own orders" ON orders;
CREATE POLICY "Restaurant owners can read own orders"
ON orders FOR SELECT TO authenticated
USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "Restaurant owners can update own orders" ON orders;
CREATE POLICY "Restaurant owners can update own orders"
ON orders FOR UPDATE TO authenticated
USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

-- Conversation logs policies
DROP POLICY IF EXISTS "Restaurant owners can read own conversations" ON conversation_logs;
CREATE POLICY "Restaurant owners can read own conversations"
ON conversation_logs FOR SELECT TO authenticated
USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check extensions
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector');

-- Check RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check indexes
SELECT COUNT(*) as index_count 
FROM pg_indexes 
WHERE schemaname = 'public';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Database setup complete!';
    RAISE NOTICE 'Tables created: 7';
    RAISE NOTICE 'RLS enabled: Yes';
    RAISE NOTICE 'Indexes created: Check count above';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create a user in Authentication → Users';
    RAISE NOTICE '2. Run the seed script to add sample data';
    RAISE NOTICE '3. Start your backend: cd backend && npm run dev';
END $$;
