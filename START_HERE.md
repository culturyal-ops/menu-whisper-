# 🚀 Menu Whisper - START HERE

## Your Supabase is Ready!

✅ **Supabase URL**: `https://vrasilzpmbcoliddobve.supabase.co`  
✅ **Credentials**: Already configured in `.env.production`

---

## Quick Start (5 Minutes)

### Step 1: Setup Database

```bash
# Set your Supabase password (get from Supabase Dashboard → Settings → Database)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.vrasilzpmbcoliddobve.supabase.co:5432/postgres"

# Run setup script
bash scripts/setup-supabase.sh
```

This will:
- Create all 7 tables
- Enable pgvector extension
- Setup Row Level Security
- Add performance indexes
- Create helper functions

### Step 2: Create Your First Restaurant

1. Go to https://vrasilzpmbcoliddobve.supabase.co
2. Click **Authentication** → **Users** → **Add User**
3. Enter email and password
4. Copy the user's UUID
5. Edit `scripts/seed-database.sql` and replace `YOUR_USER_UUID`
6. Run:

```bash
psql $DATABASE_URL < scripts/seed-database.sql
```

This adds:
- 1 restaurant (The Leela Kovalam)
- 11 menu items (appetizers, mains, desserts, wine)
- 1 test guest
- 1 sample order

### Step 3: Start Services

```bash
# Start Docker (PostgreSQL, Redis, n8n)
docker-compose up -d

# Start backend
cd backend
npm install
npm run dev

# In new terminal: Start dashboard
cd frontend-dashboard
npm install
npm run dev
```

### Step 4: Access Everything

- **Dashboard**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **n8n**: http://localhost:5678
- **Health Check**: http://localhost:3000/health

---

## What You Have

### ✅ Database (Supabase)
- 7 tables with RLS policies
- pgvector for AI embeddings
- Full-text search indexes
- Performance optimizations

### ✅ Backend API (Express)
- WhatsApp webhook handler
- AI routing (GPT-4o-mini + Claude)
- Order processing
- Payment webhooks
- Cron jobs for marketing
- Real-time updates

### ✅ Frontend (Next.js)
- Restaurant dashboard
- Orders management
- Menu editor
- Analytics
- Real-time updates

### ✅ Automation (n8n)
- WhatsApp message processing
- Marketing automation
- Error handling & retries

---

## Next Steps

### 1. Configure WhatsApp

Get credentials from Meta:
1. Go to https://developers.facebook.com/apps
2. Create WhatsApp Business App
3. Get phone number approved
4. Copy credentials to `.env`:

```bash
META_ACCESS_TOKEN=your_token
META_PHONE_NUMBER_ID=your_id
```

### 2. Configure AI APIs

```bash
# OpenAI
OPENAI_API_KEY=sk-your_key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your_key
```

### 3. Setup n8n Workflows

1. Open http://localhost:5678
2. Create account
3. Import `n8n/workflows/complete-whatsapp-flow.json`
4. Import `n8n/workflows/marketing-automation.json`
5. Set credentials (Supabase, OpenAI)
6. Activate workflows

### 4. Register Webhook with Meta

```bash
# Get your n8n URL (use ngrok for local testing)
ngrok http 5678

# Register webhook
curl -X POST "https://graph.facebook.com/v18.0/$WABA_ID/subscribed_apps" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -d "callback_url=https://your-ngrok-url.ngrok.io/webhook/whatsapp" \
  -d "verify_token=menu-whisper-verify-token-2025"
```

---

## Testing

### Test 1: Database

```bash
psql $DATABASE_URL -c "SELECT name FROM restaurants;"
# Should show: The Leela Kovalam

psql $DATABASE_URL -c "SELECT COUNT(*) FROM menu_items;"
# Should show: 11
```

### Test 2: Backend API

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok",...}
```

### Test 3: Dashboard

1. Open http://localhost:3001
2. Login with your auth user credentials
3. Should see dashboard with stats

### Test 4: WhatsApp (after webhook setup)

1. Send message to your WhatsApp number
2. Check n8n execution log
3. Should receive AI reply

---

## Deployment

### Frontend → Vercel

```bash
cd frontend-dashboard
vercel --prod
```

### Backend + n8n → Railway

```bash
railway login
railway up
```

See [VERCEL_VS_RAILWAY.md](./VERCEL_VS_RAILWAY.md) for full deployment guide.

---

## Troubleshooting

### Database connection fails

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check password in Supabase Dashboard → Settings → Database
```

### pgvector not enabled

1. Go to Supabase Dashboard
2. Database → Extensions
3. Enable "vector" extension

### RLS blocking queries

```bash
# Make sure backend uses SERVICE_KEY, not ANON_KEY
# Check .env:
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### n8n workflows not running

1. Check n8n logs: `docker logs menu-whisper-n8n-1`
2. Verify credentials are set
3. Activate workflows (toggle switch)

---

## 📚 Documentation

- [Supabase Setup Guide](./supabase/SETUP_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Vercel vs Railway](./VERCEL_VS_RAILWAY.md)
- [Quick Start](./QUICK_START.md)

---

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Test health: `curl localhost:3000/health`
3. Verify database: `psql $DATABASE_URL -c "SELECT 1;"`

---

**Your Supabase credentials are already configured. Just add your password and you're ready to go!**
