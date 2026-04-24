#!/bin/bash

# =========================================
# RentHub - Generic Rental Marketplace
# Start Script
# =========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}"
echo "========================================="
echo "    🏪 RentHub Marketplace"
echo "    Rent Anything, Anywhere"
echo "========================================="
echo -e "${NC}"

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo -e "${YELLOW}[1/6] Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT...${NC}"
lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
echo -e "${GREEN}      Ports cleared.${NC}"

# Check PostgreSQL
echo -e "${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}PostgreSQL not found! Install with: brew install postgresql@14${NC}"
  exit 1
fi

if ! pg_isready -q 2>/dev/null; then
  echo -e "${YELLOW}      Starting PostgreSQL...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  sleep 3
fi

if pg_isready -q 2>/dev/null; then
  echo -e "${GREEN}      PostgreSQL is running.${NC}"
else
  echo -e "${RED}      PostgreSQL failed to start. Check your installation.${NC}"
  exit 1
fi

# Create database
echo -e "${YELLOW}[3/6] Setting up database...${NC}"
DB_NAME=${DB_NAME:-rental_marketplace}
createdb "$DB_NAME" 2>/dev/null && echo -e "${GREEN}      Database '$DB_NAME' created.${NC}" || echo -e "${BLUE}      Database '$DB_NAME' already exists.${NC}"

# Install backend dependencies
echo -e "${YELLOW}[4/6] Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}      Backend dependencies installed.${NC}"

# Seed database
echo -e "${YELLOW}[5/6] Seeding database...${NC}"
node seed.js

# Install frontend dependencies
echo -e "${YELLOW}[6/6] Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}      Frontend dependencies installed.${NC}"

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${GREEN}  All systems ready! Starting servers...${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "${BLUE}  🌐 Frontend: ${NC}http://localhost:$FRONTEND_PORT"
echo -e "${BLUE}  🔌 Backend:  ${NC}http://localhost:$BACKEND_PORT"
echo -e "${BLUE}  👤 Login:    ${NC}demo@rental.com / demo1234"
echo ""
echo -e "${PURPLE}  Both servers have hot-reload enabled.${NC}"
echo -e "${PURPLE}  Press Ctrl+C to stop.${NC}"
echo ""

# Start backend with nodemon (hot reload on code changes)
cd "$PROJECT_DIR/backend"
npx nodemon --quiet server.js &
BACKEND_PID=$!

# Start frontend with Vite (hot reload built-in)
cd "$PROJECT_DIR/frontend"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!

# Cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down RentHub...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}RentHub stopped. Goodbye!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

wait
