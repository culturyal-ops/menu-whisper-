-- ============================================================================
-- Menu Whisper - Add Your First Restaurant
-- ============================================================================
-- INSTRUCTIONS:
-- 1. First, create a user in Supabase Dashboard → Authentication → Users
-- 2. Copy the user's UUID
-- 3. Replace 'PASTE_YOUR_USER_UUID_HERE' below with the actual UUID
-- 4. Run this entire file in SQL Editor
-- ============================================================================

-- Your User UUID: f7359560-06e0-45b0-8eca-155fc4460a24

-- STEP 2: Insert restaurant
INSERT INTO restaurants (
    owner_user_id,
    name,
    slug,
    email,
    phone,
    address,
    whatsapp_number_id,
    whatsapp_phone_number,
    plan_tier
) VALUES (
    'f7359560-06e0-45b0-8eca-155fc4460a24'::uuid,
    'The Leela Kovalam',
    'leela-kovalam',
    'contact@leela-kovalam.com',
    '+91 471 302 5555',
    'Kovalam Beach, Thiruvananthapuram, Kerala 695527, India',
    '123456789',
    '+919876543210',
    'professional'
) RETURNING id, name, slug;

-- ⚠️ COPY THE RESTAURANT ID FROM ABOVE RESULT!
-- Then replace 'PASTE_RESTAURANT_ID_HERE' below

-- STEP 3: Insert menu items (REPLACE THE RESTAURANT ID BELOW!)
INSERT INTO menu_items (restaurant_id, name, description, price, category, dietary_tags, allergens, calories, preparation_time, is_available)
VALUES 
-- Appetizers
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Burrata with Heirloom Tomatoes', 'Creamy burrata cheese with heirloom tomatoes, basil, and aged balsamic', 850.00, 'Appetizer', ARRAY['vegetarian', 'gluten-free'], ARRAY['dairy'], 320, 15, true),
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Grilled Octopus', 'Tender octopus with chickpea purée, chorizo, and paprika oil', 1200.00, 'Appetizer', ARRAY['gluten-free', 'pescatarian'], ARRAY['shellfish'], 280, 20, true),

-- Main Courses
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Dry-Aged Lamb Rack', 'Herb-crusted lamb rack with cauliflower purée, rosemary jus, and seasonal vegetables', 2800.00, 'Main Course', ARRAY['gluten-free'], ARRAY['dairy'], 650, 35, true),
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Grilled Sea Bass', 'Fresh sea bass with lemon butter sauce, asparagus, and baby potatoes', 2400.00, 'Main Course', ARRAY['gluten-free', 'pescatarian'], ARRAY['fish', 'dairy'], 520, 30, true),
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Truffle Risotto', 'Creamy arborio rice with black truffle, parmesan, and wild mushrooms', 1800.00, 'Main Course', ARRAY['vegetarian'], ARRAY['dairy'], 580, 25, true),
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Vegan Buddha Bowl', 'Quinoa, roasted vegetables, tahini dressing, and avocado', 1200.00, 'Main Course', ARRAY['vegan', 'gluten-free'], ARRAY[], 420, 20, true),
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Ribeye Steak', '300g dry-aged ribeye with peppercorn sauce and truffle fries', 3200.00, 'Main Course', ARRAY['gluten-free'], ARRAY['dairy'], 780, 40, true),

-- Desserts
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Chocolate Fondant', 'Warm chocolate cake with molten center, vanilla ice cream', 650.00, 'Dessert', ARRAY['vegetarian'], ARRAY['dairy', 'eggs', 'gluten'], 520, 15, true),
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Mango Panna Cotta', 'Silky panna cotta with fresh mango coulis and mint', 550.00, 'Dessert', ARRAY['vegetarian', 'gluten-free'], ARRAY['dairy'], 380, 10, true),

-- Beverages
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Malbec Reserve', 'Full-bodied Argentinian Malbec with notes of blackberry and oak', 4500.00, 'Wine', ARRAY['vegan'], ARRAY[], 125, 5, true),
('PASTE_RESTAURANT_ID_HERE'::uuid, 'Sauvignon Blanc', 'Crisp New Zealand Sauvignon Blanc with citrus and tropical notes', 3800.00, 'Wine', ARRAY['vegan'], ARRAY[], 120, 5, true);

-- STEP 4: Verify everything
SELECT 
    (SELECT COUNT(*) FROM restaurants) as restaurants,
    (SELECT COUNT(*) FROM menu_items) as menu_items;

-- Should show:
-- restaurants: 1
-- menu_items: 11

-- View your data
SELECT name, slug, email FROM restaurants;
SELECT name, price, category FROM menu_items ORDER BY category, name;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- Your restaurant and menu are now in the database.
-- Next steps:
-- 1. Start backend: cd backend && npm run dev
-- 2. Start dashboard: cd frontend-dashboard && npm run dev
-- 3. Login with the email/password you created in Authentication
-- ============================================================================
