-- ============================================================================
-- Menu Whisper - QUICK SETUP (Copy & Paste Method)
-- ============================================================================
-- This is the easiest way to add your restaurant and menu
-- Just replace the UUIDs and run!
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Auth User First!
-- ============================================================================
-- Before running this SQL:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Enter email: admin@leela-kovalam.com
-- 4. Enter password: (your secure password)
-- 5. Click "Create User"
-- 6. COPY THE USER UUID (looks like: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
-- ============================================================================

-- ============================================================================
-- STEP 2: Insert Restaurant
-- ============================================================================
-- Replace the UUID below with your user UUID from Step 1

DO $$
DECLARE
    v_restaurant_id UUID;
    v_user_uuid UUID := 'f7359560-06e0-45b0-8eca-155fc4460a24'::uuid;
BEGIN
    -- Insert restaurant
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
        v_user_uuid,
        'The Leela Kovalam',
        'leela-kovalam',
        'contact@leela-kovalam.com',
        '+91 471 302 5555',
        'Kovalam Beach, Thiruvananthapuram, Kerala 695527, India',
        '123456789',
        '+919876543210',
        'professional'
    ) RETURNING id INTO v_restaurant_id;

    RAISE NOTICE 'Restaurant created with ID: %', v_restaurant_id;

    -- Insert menu items
    INSERT INTO menu_items (restaurant_id, name, description, price, category, dietary_tags, allergens, calories, preparation_time, is_available)
    VALUES 
    -- Appetizers
    (v_restaurant_id, 'Burrata with Heirloom Tomatoes', 'Creamy burrata cheese with heirloom tomatoes, basil, and aged balsamic', 850.00, 'Appetizer', ARRAY['vegetarian', 'gluten-free'], ARRAY['dairy'], 320, 15, true),
    (v_restaurant_id, 'Grilled Octopus', 'Tender octopus with chickpea purée, chorizo, and paprika oil', 1200.00, 'Appetizer', ARRAY['gluten-free', 'pescatarian'], ARRAY['shellfish'], 280, 20, true),
    
    -- Main Courses
    (v_restaurant_id, 'Dry-Aged Lamb Rack', 'Herb-crusted lamb rack with cauliflower purée, rosemary jus, and seasonal vegetables', 2800.00, 'Main Course', ARRAY['gluten-free'], ARRAY['dairy'], 650, 35, true),
    (v_restaurant_id, 'Grilled Sea Bass', 'Fresh sea bass with lemon butter sauce, asparagus, and baby potatoes', 2400.00, 'Main Course', ARRAY['gluten-free', 'pescatarian'], ARRAY['fish', 'dairy'], 520, 30, true),
    (v_restaurant_id, 'Truffle Risotto', 'Creamy arborio rice with black truffle, parmesan, and wild mushrooms', 1800.00, 'Main Course', ARRAY['vegetarian'], ARRAY['dairy'], 580, 25, true),
    (v_restaurant_id, 'Vegan Buddha Bowl', 'Quinoa, roasted vegetables, tahini dressing, and avocado', 1200.00, 'Main Course', ARRAY['vegan', 'gluten-free'], ARRAY[], 420, 20, true),
    (v_restaurant_id, 'Ribeye Steak', '300g dry-aged ribeye with peppercorn sauce and truffle fries', 3200.00, 'Main Course', ARRAY['gluten-free'], ARRAY['dairy'], 780, 40, true),
    
    -- Desserts
    (v_restaurant_id, 'Chocolate Fondant', 'Warm chocolate cake with molten center, vanilla ice cream', 650.00, 'Dessert', ARRAY['vegetarian'], ARRAY['dairy', 'eggs', 'gluten'], 520, 15, true),
    (v_restaurant_id, 'Mango Panna Cotta', 'Silky panna cotta with fresh mango coulis and mint', 550.00, 'Dessert', ARRAY['vegetarian', 'gluten-free'], ARRAY['dairy'], 380, 10, true),
    
    -- Beverages
    (v_restaurant_id, 'Malbec Reserve', 'Full-bodied Argentinian Malbec with notes of blackberry and oak', 4500.00, 'Wine', ARRAY['vegan'], ARRAY[], 125, 5, true),
    (v_restaurant_id, 'Sauvignon Blanc', 'Crisp New Zealand Sauvignon Blanc with citrus and tropical notes', 3800.00, 'Wine', ARRAY['vegan'], ARRAY[], 120, 5, true);

    RAISE NOTICE '✅ Menu items created: 11';
    
    -- Create a test guest profile
    INSERT INTO guest_profiles (
        restaurant_id,
        wa_number_hash,
        dietary_preferences,
        visit_count,
        opted_in_marketing
    ) VALUES (
        v_restaurant_id,
        encode(sha256('919876543210'::bytea), 'hex'),
        '{"gluten_free": true, "vegetarian": false}',
        1,
        true
    );
    
    RAISE NOTICE '✅ Test guest profile created';
    
    -- Show summary
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Restaurant ID: %', v_restaurant_id;
    RAISE NOTICE 'Restaurant: The Leela Kovalam';
    RAISE NOTICE 'Menu Items: 11';
    RAISE NOTICE 'Test Guest: 1';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Start backend: cd backend && npm run dev';
    RAISE NOTICE '2. Start dashboard: cd frontend-dashboard && npm run dev';
    RAISE NOTICE '3. Login with: admin@leela-kovalam.com';
    RAISE NOTICE '========================================';
END $$;

-- Verify everything
SELECT 
    (SELECT COUNT(*) FROM restaurants) as restaurants,
    (SELECT COUNT(*) FROM menu_items) as menu_items,
    (SELECT COUNT(*) FROM guest_profiles) as guests;

-- View your data
SELECT id, name, slug, email FROM restaurants;
SELECT name, price, category FROM menu_items ORDER BY category, name;
