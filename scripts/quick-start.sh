#!/bin/bash

# ============================================================================
# Menu Whisper - Quick Start Script
# ============================================================================
# This script sets up everything you need to run Menu Whisper locally
# ============================================================================

set -e

echo "🚀 Menu Whisper - Quick Start"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠${NC} .env file not found"
    echo "Copying .env.production to .env..."
    cp .env.production .env
    echo -e "${GREEN}✓${NC} .env file created"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT:${NC} Edit .env and add your credentials:"
    echo "  - DATABASE_URL (Supabase password)"
    echo "  - REDIS_URL (Upstash)"
    echo "  - META_ACCESS_TOKEN (WhatsApp)"
    echo "  - OPENAI_API_KEY"
    echo "  - ANTHROPIC_API_KEY"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

echo -e "${GREEN}✓${NC} .env file found"
echo ""

# Install dependencies
echo "Installing dependencies..."
echo ""

if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend-dashboard/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend-dashboard && npm install && cd ..
fi

echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Start Docker services
echo "Starting Docker services (PostgreSQL, Redis, n8n)..."
docker-compose up -d

echo -e "${GREEN}✓${NC} Docker services started"
echo ""

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Run Supabase migrations
echo "Setting up Supabase database..."
if [ -n "$DATABASE_URL" ]; then
    bash scripts/setup-supabase.sh
else
    echo -e "${YELLOW}⚠${NC} DATABASE_URL not set, skipping migrations"
    echo "Run manually: bash scripts/setup-supabase.sh"
fi

echo ""
echo "=============================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo "=============================="
echo ""
echo "Services running:"
echo -e "  ${BLUE}•${NC} Backend API: http://localhost:3000"
echo -e "  ${BLUE}•${NC} Dashboard: http://localhost:3001"
echo -e "  ${BLUE}•${NC} n8n: http://localhost:5678"
echo -e "  ${BLUE}•${NC} PostgreSQL: localhost:5432"
echo -e "  ${BLUE}•${NC} Redis: localhost:6379"
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && npm run dev"
echo "2. Start dashboard: cd frontend-dashboard && npm run dev"
echo "3. Open n8n: http://localhost:5678"
echo "4. Import workflows from n8n/workflows/"
echo ""
echo "To stop services: docker-compose down"
echo ""
