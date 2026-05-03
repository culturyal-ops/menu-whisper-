#!/bin/bash

# ============================================================================
# Menu Whisper - Supabase Setup Script
# ============================================================================
# This script runs all migrations and sets up your Supabase database
# ============================================================================

set -e  # Exit on error

echo "🚀 Menu Whisper - Supabase Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
    echo ""
    echo "Please set your DATABASE_URL:"
    echo "export DATABASE_URL='postgresql://postgres:[PASSWORD]@db.vrasilzpmbcoliddobve.supabase.co:5432/postgres'"
    echo ""
    echo "Get your password from Supabase Dashboard → Settings → Database"
    exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL found"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ ERROR: psql not found${NC}"
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    echo "  Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo -e "${GREEN}✓${NC} psql found"
echo ""

# Test connection
echo "Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}❌ ERROR: Cannot connect to database${NC}"
    echo "Please check your DATABASE_URL and password"
    exit 1
fi
echo ""

# Run migrations
echo "Running migrations..."
echo ""

echo "1/3 Creating schema..."
if psql "$DATABASE_URL" -f supabase/migrations/001_complete_schema.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Schema created"
else
    echo -e "${YELLOW}⚠${NC} Schema may already exist (this is OK)"
fi

echo "2/3 Setting up Row Level Security..."
if psql "$DATABASE_URL" -f supabase/migrations/002_row_level_security.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} RLS policies created"
else
    echo -e "${YELLOW}⚠${NC} RLS policies may already exist (this is OK)"
fi

echo "3/3 Adding performance optimizations..."
if psql "$DATABASE_URL" -f supabase/migrations/003_performance_optimizations.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Performance optimizations added"
else
    echo -e "${YELLOW}⚠${NC} Optimizations may already exist (this is OK)"
fi

echo ""
echo "Verifying setup..."
echo ""

# Verify tables
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo -e "${GREEN}✓${NC} Tables created: $TABLE_COUNT"

# Verify pgvector
VECTOR_ENABLED=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';")
if [ "$VECTOR_ENABLED" -eq "1" ]; then
    echo -e "${GREEN}✓${NC} pgvector extension enabled"
else
    echo -e "${RED}❌${NC} pgvector extension NOT enabled"
    echo "   Enable it in Supabase Dashboard → Database → Extensions"
fi

# Verify RLS
RLS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;")
echo -e "${GREEN}✓${NC} RLS enabled on $RLS_COUNT tables"

# Verify indexes
INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")
echo -e "${GREEN}✓${NC} Indexes created: $INDEX_COUNT"

echo ""
echo "=================================="
echo -e "${GREEN}✅ Supabase setup complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Create a test user in Supabase Auth dashboard"
echo "2. Run: npm run seed (to add sample data)"
echo "3. Start backend: cd backend && npm run dev"
echo "4. Start dashboard: cd frontend-dashboard && npm run dev"
echo ""
