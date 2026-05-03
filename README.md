# Menu Whisper

**The Invisible Concierge for Luxury Dining**

A WhatsApp AI concierge that answers guest questions, takes orders, and processes payments — all without leaving WhatsApp.

## Architecture

- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL) with pgvector
- **Cache**: Upstash Redis
- **AI**: GPT-4o-mini + Claude (tiered routing)
- **WhatsApp**: Meta Cloud API
- **Payments**: Razorpay (India) + Stripe (Global)
- **Frontend**: Next.js 14 + Tailwind CSS
- **Workflow**: n8n (self-hosted)

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Supabase account
- Meta WhatsApp Business API access
- Razorpay/Stripe account

### Local Development

```bash
# Clone and install
git clone <repo>
cd menu-whisper
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Start services
docker-compose up -d

# Run migrations
npm run migrate

# Start backend
cd backend
npm run dev

# Start dashboard (separate terminal)
cd frontend-dashboard
npm run dev
```

### Deployment

```bash
# Deploy to Railway
railway up

# Deploy frontend to Vercel
cd frontend-dashboard
vercel --prod
```

## Project Structure

```
menu-whisper/
├── backend/              # Express API + WhatsApp webhook
├── frontend-dashboard/   # Next.js restaurant dashboard
├── landing-page/         # Static marketing site
├── n8n/                  # Workflow definitions
├── docker-compose.yml    # Local development
└── migrations/           # Database schema
```

## Security

- Phone numbers hashed (SHA256)
- Row Level Security (RLS) on all tables
- Rate limiting (100 msg/min per number)
- HTTPS only, HSTS enabled
- Prompt injection guardrails

## License

Proprietary - Built in Pala, Kerala, 2025
