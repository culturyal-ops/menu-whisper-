-- ============================================================================
-- Menu Whisper - FINAL SETUP (All errors fixed, ready to run!)
-- User UUID: f7359560-06e0-45b0-8eca-155fc4460a24
-- ============================================================================

DO $$
DECLARE
    v_user_uuid  UUID := 'f7359560-06e0-45b0-8eca-155fc4460a24';
    v_rid        UUID;  -- restaurant id (auto-generated)
BEGIN

    -- ----------------------------------------------------------------
    -- 1. Restaurant
    -- ----------------------------------------------------------------
    INSERT INTO restaurants (
        owner_user_id, name, slug, email, phone, address,
        whatsapp_number_id, whatsapp_phone_number, plan_tier
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
    )
    RETURNING id INTO v_rid;

    RAISE NOTICE 'Restaurant created → %', v_rid;

    -- ----------------------------------------------------------------
    -- 2. Menu items
    --    Fix: ARRAY[]::text[] for items with no allergens
    -- ----------------------------------------------------------------
    INSERT INTO menu_items (
        restaurant_id, name, description,
        price, category, dietary_tags, allergens,
        calories, preparation_time, is_available
    ) VALUES

    -- Appetizers
    (v_rid, 'Burrata with Heirloom Tomatoes',
     'Creamy burrata cheese with heirloom tomatoes, basil, and aged balsamic',
     850.00,  'Appetizer',
     ARRAY['vegetarian','gluten-free']::text[], ARRAY['dairy']::text[],
     320, 15, true),

    (v_rid, 'Grilled Octopus',
     'Tender octopus with chickpea purée, chorizo, and paprika oil',
     1200.00, 'Appetizer',
     ARRAY['gluten-free','pescatarian']::text[], ARRAY['shellfish']::text[],
     280, 20, true),

    -- Main Courses
    (v_rid, 'Dry-Aged Lamb Rack',
     'Herb-crusted lamb rack with cauliflower purée, rosemary jus, and seasonal vegetables',
     2800.00, 'Main Course',
     ARRAY['gluten-free']::text[], ARRAY['dairy']::text[],
     650, 35, true),

    (v_rid, 'Grilled Sea Bass',
     'Fresh sea bass with lemon butter sauce, asparagus, and baby potatoes',
     2400.00, 'Main Course',
     ARRAY['gluten-free','pescatarian']::text[], ARRAY['fish','dairy']::text[],
     520, 30, true),

    (v_rid, 'Truffle Risotto',
     'Creamy arborio rice with black truffle, parmesan, and wild mushrooms',
     1800.00, 'Main Course',
     ARRAY['vegetarian']::text[], ARRAY['dairy']::text[],
     580, 25, true),

    (v_rid, 'Vegan Buddha Bowl',
     'Quinoa, roasted vegetables, tahini dressing, and avocado',
     1200.00, 'Main Course',
     ARRAY['vegan','gluten-free']::text[], ARRAY[]::text[],   -- ← fixed empty array
     420, 20, true),

    (v_rid, 'Ribeye Steak',
     '300g dry-aged ribeye with peppercorn sauce and truffle fries',
     3200.00, 'Main Course',
     ARRAY['gluten-free']::text[], ARRAY['dairy']::text[],
     780, 40, true),

    -- Desserts
    (v_rid, 'Chocolate Fondant',
     'Warm chocolate cake with molten center, vanilla ice cream',
     650.00,  'Dessert',
     ARRAY['vegetarian']::text[], ARRAY['dairy','eggs','gluten']::text[],
     520, 15, true),

    (v_rid, 'Mango Panna Cotta',
     'Silky panna cotta with fresh mango coulis and mint',
     550.00,  'Dessert',
     ARRAY['vegetarian','gluten-free']::text[], ARRAY['dairy']::text[],
     380, 10, true),

    -- Beverages / Wine
    (v_rid, 'Malbec Reserve',
     'Full-bodied Argentinian Malbec with notes of blackberry and oak',
     4500.00, 'Wine',
     ARRAY['vegan']::text[], ARRAY[]::text[],                 -- ← fixed empty array
     125, 5, true),

    (v_rid, 'Sauvignon Blanc',
     'Crisp New Zealand Sauvignon Blanc with citrus and tropical notes',
     3800.00, 'Wine',
     ARRAY['vegan']::text[], ARRAY[]::text[],                 -- ← fixed empty array
     120, 5, true);

    RAISE NOTICE 'Menu items created → 11';

    -- ----------------------------------------------------------------
    -- 3. Test guest profile
    -- ----------------------------------------------------------------
    INSERT INTO guest_profiles (
        restaurant_id, wa_number_hash,
        dietary_preferences, visit_count, opted_in_marketing
    ) VALUES (
        v_rid,
        encode(sha256('919876543210'::bytea), 'hex'),
        '{"gluten_free": true, "vegetarian": false}',
        1,
        true
    );

    RAISE NOTICE 'Test guest created';

    -- ----------------------------------------------------------------
    -- 4. Sample order (so dashboard shows data immediately)
    -- ----------------------------------------------------------------
    INSERT INTO orders (
        restaurant_id, guest_profile_id,
        table_number, items,
        subtotal, tax, total,
        status, payment_status
    ) VALUES (
        v_rid,
        (SELECT id FROM guest_profiles WHERE restaurant_id = v_rid LIMIT 1),
        '7',
        '[
            {"name":"Dry-Aged Lamb Rack","quantity":1,"price":2800,"modifications":"dairy-free"},
            {"name":"Malbec Reserve","quantity":1,"price":4500}
        ]'::jsonb,
        7300.00, 730.00, 8030.00,
        'confirmed', 'unpaid'
    );

    RAISE NOTICE 'Sample order created';

    -- ----------------------------------------------------------------
    -- Done
    -- ----------------------------------------------------------------
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  SETUP COMPLETE!';
    RAISE NOTICE '  Restaurant ID : %', v_rid;
    RAISE NOTICE '  Owner UUID    : f7359560-06e0-45b0-8eca-155fc4460a24';
    RAISE NOTICE '  Menu items    : 11';
    RAISE NOTICE '  Test guest    : 1';
    RAISE NOTICE '  Sample order  : 1';
    RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- Quick verification
-- ============================================================================
SELECT
    (SELECT COUNT(*) FROM restaurants)    AS restaurants,
    (SELECT COUNT(*) FROM menu_items)     AS menu_items,
    (SELECT COUNT(*) FROM guest_profiles) AS guests,
    (SELECT COUNT(*) FROM orders)         AS orders;

SELECT id, name, slug, plan_tier FROM restaurants;

SELECT name, price, category, dietary_tags, allergens
FROM   menu_items
ORDER  BY category, price;
