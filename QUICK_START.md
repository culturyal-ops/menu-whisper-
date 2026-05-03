# Menu Whisper - Quick Start Guide

## 🚀 Get Running in 30 Minutes

### Prerequisites
- Node.js 18+
- Docker Desktop
- Supabase account (free)
- Meta WhatsApp Business API access OR AiSensy account

---

## Step 1: Clone & Install (5 min)

```bash
# Clone repository
git clone <your-repo>
cd menu-whisper

# Install dependencies
npm install
cd backend && npm install
cd ../frontend-dashboard && npm install
cd ..
```

---

## Step 2: Setup Environment (10 min)

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required variables:**
```bash
# Database (from Supabase dashboard)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Redis (from Upstash dashboard)
REDIS_URL=redis://...

# WhatsApp (from Meta or AiSensy)
META_ACCESS_TOKEN=EAAx...
META_PHONE_NUMBER_ID=123456789
WEBHOOK_VERIFY_TOKEN=your-secret-token

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Step 3: Start Services (5 min)

```bash
# Start database, Redis, n8n
docker-compose up -d

# Run migrations
npm run migrate

# Start backend
cd backend
npm run dev

# In new terminal: Start dashboard
cd frontend-dashboard
npm run dev
```

**Services running:**
- Backend API: http://localhost:3000
- Dashboard: http://localhost:3001
- n8n: http://localhost:5678
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## Step 4: Configure n8n Workflow (5 min)

1. Open http://localhost:5678
2. Create account (first time only)
3. Click **Workflows** → **Import from File**
4. Import `n8n/workflows/complete-whatsapp-flow.json`
5. Set credentials:
   - Add **Supabase** credential
   - Add **OpenAI** credential
   - Set environment variable `BACKEND_URL=http://backend:3000`
6. **Activate** the workflow (toggle switch)

---

## Step 5: Register Webhook with Meta (5 min)

```bash
# Get your n8n webhook URL
# If local: use ngrok to expose
ngrok http 5678

# Register with Meta
curl -X POST "https://graph.facebook.com/v18.0/$WABA_ID/subscribed_apps" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -d "callback_url=https://your-ngrok-url.ngrok.io/webhook/whatsapp" \
  -d "verify_token=$WEBHOOK_VERIFY_TOKEN" \
  -d "subscribed_fields=messages"
```

---

## Step 6: Test the System

### Test 1: Send WhatsApp Message
1. Send message to your WhatsApp Business number
2. Check n8n execution log (should show workflow running)
3. Verify AI reply received

### Test 2: Check Dashboard
1. Open http://localhost:3001
2. Login (use test credentials or create account)
3. Verify stats and orders appear

### Test 3: Health Check
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","checks":{...}}
```

---

## 🎯 What Happens Now?

### Automated Processes Running:

1. **WhatsApp Messages** → n8n workflow → AI processing → Reply sent
2. **Orders** → Kitchen printer → Dashboard update
3. **Payments** → Razorpay webhook → Order marked paid
4. **Marketing** → Cron job (9 AM daily) → Re-engagement messages
5. **Analytics** → Cron job (11 PM daily) → Reports generated
6. **Health Checks** → Every 1 minute → Monitoring

### No Manual Work Required!

---

## 📊 Monitoring URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Backend Health | http://localhost:3000/health | System status |
| Dashboard | http://localhost:3001 | Restaurant UI |
| n8n Workflows | http://localhost:5678 | Workflow editor |
| Supabase | https://supabase.com/dashboard | Database |

---

## 🐛 Troubleshooting

### WhatsApp messages not working
```bash
# Check n8n logs
docker logs menu-whisper-n8n-1

# Verify webhook registration
curl "https://graph.facebook.com/v18.0/$WABA_ID/subscribed_apps?access_token=$META_ACCESS_TOKEN"
```

### Database connection failed
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### AI not responding
```bash
# Check API keys
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Check backend logs
cd backend && npm run dev
```

---

## 🚀 Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment guide.

**Quick deploy:**
```bash
# Deploy backend to Railway
railway up

# Deploy frontend to Vercel
cd frontend-dashboard
vercel --prod

# Update webhook URL with Meta (use production URL)
```

---

## 📚 Next Steps

1. **Add Menu Items** - Use dashboard to populate menu
2. **Customize AI Tone** - Edit restaurant settings
3. **Setup Payment** - Configure Razorpay/Stripe
4. **Configure Printer** - Add kitchen printer webhook
5. **Enable Marketing** - Opt-in guests for re-engagement

---

## 🆘 Need Help?

- Check logs: `docker-compose logs -f`
- Review [DEPLOYMENT.md](./DEPLOYMENT.md)
- Test health endpoint: `curl localhost:3000/health`

**System is now running! Send a WhatsApp message to test.**
