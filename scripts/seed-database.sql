-- ============================================================================
-- Menu Whisper - Sample Data Seeding
-- ============================================================================
-- Run this after creating your first auth user
-- Replace 'YOUR_USER_UUID' with actual UUID from auth.users table
-- ============================================================================

-- User UUID: f7359560-06e0-45b0-8eca-155fc4460a24

-- ============================================================================
-- 1. INSERT SAMPLE RESTAURANT
-- ============================================================================

INSERT INTO restaurants (
    owner_user_id,
    name,
    slug,
    email,
    phone,
    address,
    whatsapp_number_id,
    whatsapp_phone_number,
    ai_tone_config,
    plan_tier
) VALUES (
    'f7359560-06e0-45b0-8eca-155fc4460a24'::uuid,
    'The Leela Kovalam',
    'leela-kovalam',
    'contact@leela-kovalam.com',
    '+91 471 302 5555',
    'Kovalam Beach, Thiruvananthapuram, Kerala 695527, India',
    '123456789',  -- Replace with actual Meta phone number ID
    '+919876543210',  -- Replace with actual WhatsApp number
    '{"personality":"warm","formality":"polite"}',
    'professional'
) ON CONFLICT (slug) DO NOTHING;

-- Get restaurant ID
-- SELECT id, name FROM restaurants WHERE slug = 'leela-kovalam';

-- ============================================================================
-- 2. INSERT SAMPLE MENU ITEMS
-- ============================================================================

-- Replace 'YOUR_RESTAURANT_ID' with the ID from above query

INSERT INTO menu_items (restaurant_id, name, description, price, category, dietary_tags, allergens, calories, preparation_time, is_available)
VALUES 
-- Appetizers
(
    'YOUR_RESTAURANT_ID',
    'Burrata with Heirloom Tomatoes',
    'Creamy burrata cheese with heirloom tomatoes, basil, and aged balsamic',
    850.00,
    'Appetizer',
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy'],
    320,
    15,
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Grilled Octopus',
    'Tender octopus with chickpea purée, chorizo, and paprika oil',
    1200.00,
    'Appetizer',
    ARRAY['gluten-free', 'pescatarian'],
    ARRAY['shellfish'],
    280,
    20,
    true
),

-- Main Courses
(
    'YOUR_RESTAURANT_ID',
    'Dry-Aged Lamb Rack',
    'Herb-crusted lamb rack with cauliflower purée, rosemary jus, and seasonal vegetables',
    2800.00,
    'Main Course',
    ARRAY['gluten-free'],
    ARRAY['dairy'],
    650,
    35,
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Grilled Sea Bass',
    'Fresh sea bass with lemon butter sauce, asparagus, and baby potatoes',
    2400.00,
    'Main Course',
    ARRAY['gluten-free', 'pescatarian'],
    ARRAY['fish', 'dairy'],
    520,
    30,
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Truffle Risotto',
    'Creamy arborio rice with black truffle, parmesan, and wild mushrooms',
    1800.00,
    'Main Course',
    ARRAY['vegetarian'],
    ARRAY['dairy'],
    580,
    25,
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Vegan Buddha Bowl',
    'Quinoa, roasted vegetables, tahini dressing, and avocado',
    1200.00,
    'Main Course',
    ARRAY['vegan', 'gluten-free'],
    ARRAY[],
    420,
    20,
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Ribeye Steak',
    '300g dry-aged ribeye with peppercorn sauce and truffle fries',
    3200.00,
    'Main Course',
    ARRAY['gluten-free'],
    ARRAY['dairy'],
    780,
    40,
    true
),

-- Desserts
(
    'YOUR_RESTAURANT_ID',
    'Chocolate Fondant',
    'Warm chocolate cake with molten center, vanilla ice cream',
    650.00,
    'Dessert',
    ARRAY['vegetarian'],
    ARRAY['dairy', 'eggs', 'gluten'],
    520,
    15,
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Mango Panna Cotta',
    'Silky panna cotta with fresh mango coulis and mint',
    550.00,
    'Dessert',
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy'],
    380,
    10,
    true
),

-- Beverages
(
    'YOUR_RESTAURANT_ID',
    'Malbec Reserve',
    'Full-bodied Argentinian Malbec with notes of blackberry and oak',
    4500.00,
    'Wine',
    ARRAY['vegan'],
    ARRAY[],
    125,
    5,
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Sauvignon Blanc',
    'Crisp New Zealand Sauvignon Blanc with citrus and tropical notes',
    3800.00,
    'Wine',
    ARRAY['vegan'],
    ARRAY[],
    120,
    5,
    true
);

-- ============================================================================
-- 3. VERIFY DATA
-- ============================================================================

-- Check restaurants
SELECT id, name, slug FROM restaurants;

-- Check menu items
SELECT name, price, category, dietary_tags FROM menu_items ORDER BY category, name;

-- Count by category
SELECT category, COUNT(*) as item_count 
FROM menu_items 
GROUP BY category 
ORDER BY category;

-- ============================================================================
-- 4. CREATE SAMPLE GUEST (for testing)
-- ============================================================================

-- This creates a test guest profile
INSERT INTO guest_profiles (
    restaurant_id,
    wa_number_hash,
    dietary_preferences,
    visit_count,
    opted_in_marketing
) VALUES (
    'YOUR_RESTAURANT_ID',
    encode(sha256('919876543210'::bytea), 'hex'),  -- Hashed phone number
    '{"gluten_free": true, "vegetarian": false}',
    1,
    true
) ON CONFLICT (restaurant_id, wa_number_hash) DO NOTHING;

-- ============================================================================
-- 5. CREATE SAMPLE ORDER (for testing dashboard)
-- ============================================================================

-- First, get guest_profile_id
-- SELECT id FROM guest_profiles WHERE restaurant_id = 'YOUR_RESTAURANT_ID';

INSERT INTO orders (
    restaurant_id,
    guest_profile_id,
    table_number,
    items,
    subtotal,
    tax,
    total,
    status,
    payment_status
) VALUES (
    'YOUR_RESTAURANT_ID',
    'YOUR_GUEST_PROFILE_ID',  -- Replace with guest_profile_id from above
    '7',
    '[
        {"name": "Dry-Aged Lamb Rack", "quantity": 1, "price": 2800, "modifications": "dairy-free"},
        {"name": "Malbec Reserve", "quantity": 1, "price": 4500}
    ]'::jsonb,
    7300.00,
    730.00,
    8030.00,
    'confirmed',
    'unpaid'
);

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verify everything
SELECT 
    (SELECT COUNT(*) FROM restaurants) as restaurants,
    (SELECT COUNT(*) FROM menu_items) as menu_items,
    (SELECT COUNT(*) FROM guest_profiles) as guests,
    (SELECT COUNT(*) FROM orders) as orders;

-- You should see:
-- restaurants: 1
-- menu_items: 11
-- guests: 1
-- orders: 1
