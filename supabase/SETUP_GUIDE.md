# Supabase Setup Guide for Menu Whisper

## 📋 Prerequisites
- Supabase account (free tier is fine to start)
- PostgreSQL client (psql) or use Supabase SQL Editor

---

## Step 1: Create Supabase Project (5 min)

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Fill in:
   - **Name**: menu-whisper
   - **Database Password**: (generate strong password, save it!)
   - **Region**: Choose closest to your users (e.g., Mumbai for India)
   - **Pricing Plan**: Free (500 MB database, 2 GB bandwidth)
4. Wait 2-3 minutes for project to provision

---

## Step 2: Enable pgvector Extension (2 min)

1. In Supabase dashboard, go to **Database** → **Extensions**
2. Search for `vector`
3. Enable **vector** extension
4. Confirm it's enabled (green checkmark)

---

## Step 3: Run Migrations (10 min)

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Copy contents of `supabase/migrations/001_complete_schema.sql`
4. Paste and click **Run**
5. Wait for success message
6. Repeat for `002_row_level_security.sql`
7. Repeat for `003_performance_optimizations.sql`

### Option B: Using psql CLI

```bash
# Get connection string from Supabase dashboard (Settings → Database)
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations in order
psql $DATABASE_URL < supabase/migrations/001_complete_schema.sql
psql $DATABASE_URL < supabase/migrations/002_row_level_security.sql
psql $DATABASE_URL < supabase/migrations/003_performance_optimizations.sql
```

---

## Step 4: Verify Setup (5 min)

Run these queries in SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected output:
-- conversation_logs
-- guest_profiles
-- marketing_queue
-- menu_items
-- orders
-- restaurants
-- sessions

-- Check pgvector is working
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All tables should have rowsecurity = true

-- Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY indexname;
```

---

## Step 5: Get API Credentials (2 min)

1. Go to **Settings** → **API**
2. Copy these values to your `.env` file:

```bash
# Supabase credentials
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URL (for direct connections)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**⚠️ IMPORTANT:**
- **ANON_KEY**: Use in frontend (Next.js dashboard) - respects RLS
- **SERVICE_KEY**: Use in backend API - bypasses RLS (keep secret!)

---

## Step 6: Create First Restaurant (5 min)

### 6.1 Create Auth User

1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter email and password
4. Copy the user's UUID (you'll need this)

### 6.2 Insert Restaurant

```sql
-- Replace 'YOUR_USER_UUID' with the UUID from step 6.1
INSERT INTO restaurants (
    owner_user_id,
    name,
    slug,
    email,
    phone,
    whatsapp_number_id,
    whatsapp_phone_number
) VALUES (
    'YOUR_USER_UUID',
    'The Leela Kovalam',
    'leela-kovalam',
    'contact@leela-kovalam.com',
    '+91 471 302 5555',
    '123456789',  -- Replace with actual Meta phone number ID
    '+919876543210'  -- Replace with actual WhatsApp number
);

-- Get the restaurant ID
SELECT id, name FROM restaurants;
```

### 6.3 Insert Sample Menu Items

```sql
-- Replace 'YOUR_RESTAURANT_ID' with the ID from step 6.2
INSERT INTO menu_items (restaurant_id, name, description, price, category, dietary_tags, allergens, is_available)
VALUES 
(
    'YOUR_RESTAURANT_ID',
    'Dry-Aged Lamb Rack',
    'Herb-crusted lamb rack with cauliflower purée and rosemary jus',
    2800.00,
    'Main Course',
    ARRAY['gluten-free'],
    ARRAY['dairy'],
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Grilled Sea Bass',
    'Fresh sea bass with lemon butter sauce and seasonal vegetables',
    2400.00,
    'Main Course',
    ARRAY['gluten-free', 'pescatarian'],
    ARRAY['fish', 'dairy'],
    true
),
(
    'YOUR_RESTAURANT_ID',
    'Vegan Buddha Bowl',
    'Quinoa, roasted vegetables, tahini dressing',
    1200.00,
    'Main Course',
    ARRAY['vegan', 'gluten-free'],
    ARRAY[],
    true
);

-- Verify
SELECT name, price, dietary_tags FROM menu_items;
```

---

## Step 7: Test RLS Policies (5 min)

```sql
-- Test as authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "YOUR_USER_UUID"}';

-- Should see your restaurant
SELECT * FROM restaurants;

-- Should see your menu items
SELECT * FROM menu_items;

-- Try to access another restaurant's data (should return empty)
SELECT * FROM menu_items WHERE restaurant_id = 'SOME_OTHER_ID';

-- Reset to service role
RESET ROLE;
```

---

## Step 8: Configure Realtime (Optional, 2 min)

For live dashboard updates:

1. Go to **Database** → **Replication**
2. Enable replication for these tables:
   - `orders`
   - `conversation_logs`
3. Click **Save**

---

## Step 9: Setup Storage (Optional, for menu images)

1. Go to **Storage** → **Create Bucket**
2. Name: `menu-images`
3. Public: Yes
4. Create policy:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Restaurant owners can upload menu images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'menu-images' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM restaurants WHERE owner_user_id = auth.uid()
    )
);

-- Allow public read access
CREATE POLICY "Anyone can view menu images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'menu-images');
```

---

## 🎯 Verification Checklist

- [ ] pgvector extension enabled
- [ ] All 7 tables created
- [ ] RLS enabled on all tables
- [ ] RLS policies created (28 policies total)
- [ ] Indexes created
- [ ] Performance functions created
- [ ] Test user created
- [ ] Test restaurant inserted
- [ ] Sample menu items inserted
- [ ] RLS policies tested
- [ ] API credentials copied to .env

---

## 📊 Free Tier Limits

| Resource | Free Tier | Notes |
|----------|-----------|-------|
| Database Size | 500 MB | ~50K menu items, 500K conversations |
| Bandwidth | 2 GB/month | ~20K API requests |
| Realtime Connections | 200 concurrent | Enough for 50 restaurants |
| Storage | 1 GB | ~10K menu images |
| Auth Users | Unlimited | ✅ |

**When to upgrade:**
- Database >400 MB → Upgrade to Pro ($25/month)
- >100 restaurants → Upgrade for better performance
- Need daily backups → Pro plan

---

## 🐛 Troubleshooting

### Error: "extension vector does not exist"
```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "permission denied for table restaurants"
```sql
-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
```

### RLS blocking backend API
```bash
# Make sure you're using SERVICE_KEY in backend, not ANON_KEY
# Service role bypasses RLS
```

### Slow queries
```sql
-- Check if indexes exist
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- Refresh materialized views
SELECT refresh_daily_stats();
```

---

## 🚀 Next Steps

1. Connect backend API to Supabase (use SERVICE_KEY)
2. Connect dashboard to Supabase (use ANON_KEY)
3. Test WhatsApp webhook flow
4. Monitor database usage in Supabase dashboard

---

## 📚 Useful Queries

```sql
-- Get database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Get table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Count rows in all tables
SELECT 
    schemaname,
    tablename,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

**Setup complete! Your Supabase database is ready for Menu Whisper.**
