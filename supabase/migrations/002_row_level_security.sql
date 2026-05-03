-- ============================================================================
-- Menu Whisper - Row Level Security (RLS) Policies
-- ============================================================================
-- 
-- SECURITY MODEL:
-- - Restaurant owners can only access their own data
-- - Service role (backend API) bypasses RLS
-- - Anonymous users have no access
-- 
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICY 1: restaurants
-- Restaurant owners can only see/edit their own restaurant
-- ============================================================================

-- SELECT: Owner can read their own restaurant
CREATE POLICY "Restaurant owners can read own restaurant"
ON restaurants
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

-- INSERT: Users can create their own restaurant
CREATE POLICY "Users can create own restaurant"
ON restaurants
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

-- UPDATE: Owner can update their own restaurant
CREATE POLICY "Restaurant owners can update own restaurant"
ON restaurants
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- DELETE: Owner can delete their own restaurant
CREATE POLICY "Restaurant owners can delete own restaurant"
ON restaurants
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- ============================================================================
-- POLICY 2: menu_items
-- Restaurant owners can only manage their own menu
-- ============================================================================

-- SELECT: Owner can read their restaurant's menu
CREATE POLICY "Restaurant owners can read own menu"
ON menu_items
FOR SELECT
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- INSERT: Owner can add items to their menu
CREATE POLICY "Restaurant owners can insert own menu items"
ON menu_items
FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- UPDATE: Owner can update their menu items
CREATE POLICY "Restaurant owners can update own menu items"
ON menu_items
FOR UPDATE
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- DELETE: Owner can delete their menu items
CREATE POLICY "Restaurant owners can delete own menu items"
ON menu_items
FOR DELETE
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- ============================================================================
-- POLICY 3: guest_profiles
-- Restaurant owners can only see their own guests
-- ============================================================================

-- SELECT: Owner can read their restaurant's guests
CREATE POLICY "Restaurant owners can read own guests"
ON guest_profiles
FOR SELECT
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- INSERT: Service role only (backend creates guests)
-- No policy needed - service role bypasses RLS

-- UPDATE: Owner can update guest preferences
CREATE POLICY "Restaurant owners can update own guests"
ON guest_profiles
FOR UPDATE
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- DELETE: Owner can delete guests (GDPR compliance)
CREATE POLICY "Restaurant owners can delete own guests"
ON guest_profiles
FOR DELETE
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- ============================================================================
-- POLICY 4: sessions
-- Restaurant owners can only see their own sessions
-- ============================================================================

-- SELECT: Owner can read their restaurant's sessions
CREATE POLICY "Restaurant owners can read own sessions"
ON sessions
FOR SELECT
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- INSERT/UPDATE/DELETE: Service role only (backend manages sessions)
-- No policies needed - service role bypasses RLS

-- ============================================================================
-- POLICY 5: orders
-- Restaurant owners can only see their own orders
-- ============================================================================

-- SELECT: Owner can read their restaurant's orders
CREATE POLICY "Restaurant owners can read own orders"
ON orders
FOR SELECT
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- UPDATE: Owner can update order status (confirm, cancel)
CREATE POLICY "Restaurant owners can update own orders"
ON orders
FOR UPDATE
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- INSERT/DELETE: Service role only (backend creates orders)
-- No policies needed - service role bypasses RLS

-- ============================================================================
-- POLICY 6: conversation_logs
-- Restaurant owners can only see their own conversations
-- ============================================================================

-- SELECT: Owner can read their restaurant's conversations
CREATE POLICY "Restaurant owners can read own conversations"
ON conversation_logs
FOR SELECT
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- INSERT/UPDATE/DELETE: Service role only (backend logs conversations)
-- No policies needed - service role bypasses RLS

-- ============================================================================
-- POLICY 7: marketing_queue
-- Restaurant owners can only see their own marketing queue
-- ============================================================================

-- SELECT: Owner can read their restaurant's marketing queue
CREATE POLICY "Restaurant owners can read own marketing queue"
ON marketing_queue
FOR SELECT
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- INSERT: Owner can schedule marketing messages
CREATE POLICY "Restaurant owners can insert own marketing messages"
ON marketing_queue
FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- UPDATE: Owner can cancel scheduled messages
CREATE POLICY "Restaurant owners can update own marketing messages"
ON marketing_queue
FOR UPDATE
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- DELETE: Owner can delete marketing messages
CREATE POLICY "Restaurant owners can delete own marketing messages"
ON marketing_queue
FOR DELETE
TO authenticated
USING (
    restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- ============================================================================
-- TESTING RLS POLICIES
-- ============================================================================

-- To test RLS policies:
-- 
-- 1. Create a test user in Supabase Auth dashboard
-- 2. Get the user's UUID from auth.users table
-- 3. Insert a test restaurant with that owner_user_id
-- 4. In Supabase SQL Editor, run queries as that user:
--
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "USER_UUID_HERE"}';
-- 
-- SELECT * FROM restaurants;  -- Should only see own restaurant
-- SELECT * FROM menu_items;   -- Should only see own menu
-- 
-- -- Try to access another restaurant's data (should return empty)
-- SELECT * FROM menu_items WHERE restaurant_id = 'OTHER_RESTAURANT_ID';
--
-- -- Reset to service role
-- RESET ROLE;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- RLS policies use subqueries which can be slow. To optimize:
-- 1. Ensure indexes exist on foreign keys (already created in schema)
-- 2. Use service_role for backend API (bypasses RLS)
-- 3. Only use authenticated role for dashboard frontend
-- 4. Consider caching restaurant_id in JWT claims for faster lookups

-- ============================================================================
-- SECURITY CHECKLIST
-- ============================================================================

-- ✅ RLS enabled on all tables
-- ✅ Policies prevent cross-tenant data access
-- ✅ Service role bypasses RLS (for backend API)
-- ✅ Authenticated users can only access their own data
-- ✅ Anonymous users have no access
-- ✅ Phone numbers are hashed (never stored raw)
-- ✅ Policies tested with SET ROLE commands
