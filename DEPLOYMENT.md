# Menu Whisper Deployment Guide

## 🚀 Automated Deployment Checklist

### Phase 1: Infrastructure Setup (One-Time)

#### 1.1 Database (Supabase)
```bash
# Create Supabase project at https://supabase.com
# Copy credentials to .env

# Run migrations
psql $DATABASE_URL < migrations/001_initial_schema.sql

# Enable pgvector extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Configure Row Level Security policies (already in migration)
```

#### 1.2 Redis (Upstash)
```bash
# Create Redis database at https://upstash.com
# Copy UPSTASH_REDIS_URL to .env
```

#### 1.3 WhatsApp Business API
```bash
# Option A: Direct Meta Cloud API
# 1. Create Meta Business Account
# 2. Apply for WhatsApp Business API access
# 3. Get phone number approved (2-3 weeks)
# 4. Copy credentials to .env

# Option B: Use BSP (AiSensy/WATI) - Faster
# 1. Sign up at https://aisensy.com
# 2. Provision WhatsApp number via dashboard
# 3. Copy API credentials to .env
```

### Phase 2: Backend Deployment (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Link to GitHub repo (for auto-deploy)
railway link

# Set environment variables
railway variables set DATABASE_URL=$DATABASE_URL
railway variables set REDIS_URL=$REDIS_URL
railway variables set META_ACCESS_TOKEN=$META_ACCESS_TOKEN
# ... (all variables from .env.example)

# Deploy
railway up

# Get deployment URL
railway domain
# Example: https://menu-whisper-production.up.railway.app
```

**Configure WhatsApp Webhook:**
```bash
# Register webhook with Meta
curl -X POST "https://graph.facebook.com/v18.0/$WABA_ID/subscribed_apps" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -d "callback_url=https://your-app.railway.app/webhook/whatsapp" \
  -d "verify_token=$WEBHOOK_VERIFY_TOKEN"
```

### Phase 3: Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy dashboard
cd frontend-dashboard
vercel --prod

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://your-app.railway.app
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Phase 4: n8n Workflow Engine

**Option A: Self-hosted on Railway**
```bash
# Add n8n service to Railway
railway add n8n

# Set environment variables
railway variables set N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
railway variables set WEBHOOK_URL=https://your-n8n.railway.app
```

**Option B: n8n Cloud**
```bash
# Sign up at https://n8n.io/cloud
# Import workflows from n8n/workflows/
# Configure credentials (Supabase, OpenAI, etc.)
```

### Phase 5: Monitoring Setup

#### 5.1 Better Stack
```bash
# Sign up at https://betterstack.com
# Create uptime monitor for https://your-app.railway.app/health
# Set alert channels (Slack, Email, SMS)
```

#### 5.2 Sentry
```bash
# Sign up at https://sentry.io
# Create new project
# Copy DSN to .env

# Add to backend/package.json
npm install @sentry/node @sentry/profiling-node

# Sentry will auto-capture errors
```

---

## 🤖 Automation Verification

After deployment, verify these automated processes are running:

### 1. Health Checks (Every 1 minute)
```bash
curl https://your-app.railway.app/health
# Expected: {"status":"ok","checks":{...}}
```

### 2. WhatsApp Webhook (Real-time)
```bash
# Send test message to your WhatsApp number
# Check logs: railway logs
# Expected: "WhatsApp message sent to..."
```

### 3. Cron Jobs (Check logs)
```bash
railway logs --filter "Cron"

# Expected outputs:
# - "Running marketing re-engagement job" (9 AM daily)
# - "Processing marketing queue" (every 5 min)
# - "Generating daily analytics reports" (11 PM daily)
# - "Cleaning up old logs" (2 AM daily)
```

### 4. Payment Webhooks
```bash
# Test Razorpay webhook
curl -X POST https://your-app.railway.app/webhook/payment/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test" \
  -d '{"event":"payment.captured","payload":{...}}'
```

### 5. Real-time Dashboard Updates
```bash
# Open dashboard: https://your-dashboard.vercel.app
# Place test order via WhatsApp
# Verify order appears in dashboard without refresh
```

---

## 📊 Monitoring Dashboard URLs

After setup, bookmark these:

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | https://your-app.railway.app | Main API |
| Health Check | https://your-app.railway.app/health | System status |
| Dashboard | https://your-dashboard.vercel.app | Restaurant UI |
| n8n Workflows | https://your-n8n.railway.app | Workflow editor |
| Better Stack | https://betterstack.com/team/your-team | Uptime monitoring |
| Sentry | https://sentry.io/organizations/your-org | Error tracking |
| Railway Logs | https://railway.app/project/your-project | Live logs |
| Supabase | https://supabase.com/dashboard/project/your-project | Database |

---

## 🔄 Continuous Deployment (Auto-Deploy)

Once connected to GitHub, every push to `main` triggers:

1. **GitHub Actions** runs tests
2. **Railway** auto-deploys backend
3. **Vercel** auto-deploys frontend
4. **Better Stack** verifies deployment health
5. **Slack notification** confirms success

**No manual intervention needed!**

---

## 🚨 Troubleshooting Automation

### WhatsApp messages not sending
```bash
# Check webhook registration
curl "https://graph.facebook.com/v18.0/$WABA_ID/subscribed_apps?access_token=$META_ACCESS_TOKEN"

# Check logs
railway logs --filter "WhatsApp"

# Verify token
curl "https://graph.facebook.com/v18.0/debug_token?input_token=$META_ACCESS_TOKEN&access_token=$META_ACCESS_TOKEN"
```

### Cron jobs not running
```bash
# Check if ENABLE_CRON_JOBS is set
railway variables get ENABLE_CRON_JOBS

# Restart service
railway restart

# Check logs
railway logs --filter "Cron"
```

### Database connection issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Supabase dashboard for connection limits
# Upgrade plan if needed
```

### Kitchen printer not working
```bash
# Check printer service config
railway variables get PRINTER_SERVICE

# Test webhook
curl -X POST $KITCHEN_PRINTER_WEBHOOK -d '{"test":true}'

# Check dead letter queue
# Orders that failed to print are logged there
```

---

## 💰 Cost Breakdown (Monthly)

| Service | Free Tier | Paid (100 restaurants) |
|---------|-----------|------------------------|
| Railway (Backend) | $5 | $20 |
| Vercel (Frontend) | Free | $20 |
| Supabase | Free | $25 |
| Upstash Redis | Free | $10 |
| WhatsApp API | 1K free convos | $0.004/msg |
| OpenAI (GPT-4o-mini) | - | $150 |
| Anthropic (Claude) | - | $50 |
| Better Stack | Free | $20 |
| Sentry | Free | $26 |
| **Total** | **~$5** | **~$321** |

**Revenue per restaurant:** ₹8,000-18,000/month  
**Break-even:** 2-3 restaurants

---

## ✅ Post-Deployment Checklist

- [ ] Health check returns 200 OK
- [ ] WhatsApp webhook verified with Meta
- [ ] Test message sent and received
- [ ] Dashboard loads and shows data
- [ ] Cron jobs running (check logs)
- [ ] Payment webhook tested
- [ ] Kitchen printer tested
- [ ] Monitoring alerts configured
- [ ] Backup cron job running
- [ ] SSL certificates valid
- [ ] Environment variables secured
- [ ] Documentation updated

---

## 🎯 Day 1 Operations

After deployment, the system runs autonomously. Your only tasks:

1. **Monitor Slack alerts** (5 min/day)
2. **Review analytics dashboard** (10 min/week)
3. **Respond to support tickets** (as needed)
4. **Update marketing templates** (monthly)

**Everything else is automated!**
