#!/usr/bin/env bash

# ==============================================================================
# MedCorpus AI — Startup Script for Frontend & Backend
# CBC 2.0 Hackathon | Binary Builders | Problem Statement 17
# ==============================================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Detect package manager (pnpm > npm)
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
else
    PKG_MGR="npm"
fi

echo -e "${BOLD}${CYAN}======================================================${NC}"
echo -e "${BOLD}${CYAN}          MedCorpus AI — Unified Launcher            ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"

# Clean up subprocesses on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down MedCorpus backend and frontend...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill -TERM "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill -TERM "$FRONTEND_PID" 2>/dev/null
    fi
    # Also free ports on exit
    for port in 8000 8443 5173; do
        pids=$(lsof -ti :$port 2>/dev/null)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null
        fi
    done
    wait 2>/dev/null
    echo -e "${GREEN}All processes stopped cleanly.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Auto-free any stale processes holding ports before launch
for port in 8000 8443 5173; do
    pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Freeing port $port (closing stale PID $pids)...${NC}"
        kill -9 $pids 2>/dev/null
    fi
done


# ------------------------------------------------------------------------------
# 1. Check / Initialize Backend Virtualenv
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[1/2] Initializing Backend (FastAPI)...${NC}"
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment in backend/venv...${NC}"
    python3 -m venv "$BACKEND_DIR/venv"
    source "$BACKEND_DIR/venv/bin/activate"
    pip install -r "$BACKEND_DIR/requirements.txt"
else
    source "$BACKEND_DIR/venv/bin/activate"
fi

# ------------------------------------------------------------------------------
# 2. Check Frontend Node Modules & Binaries
# ------------------------------------------------------------------------------
echo -e "${BLUE}[2/2] Checking Frontend (Vite React with $PKG_MGR)...${NC}"
if [ ! -f "$FRONTEND_DIR/node_modules/.bin/vite" ]; then
    echo -e "${YELLOW}Installing frontend dependencies using $PKG_MGR...${NC}"
    cd "$FRONTEND_DIR" && $PKG_MGR install && cd "$ROOT_DIR"
fi

# ------------------------------------------------------------------------------
# 3. Start Backend Server
# ------------------------------------------------------------------------------
echo -e "\n${GREEN} Starting FastAPI Backend on http://localhost:8000${NC}"
PYTHONPATH="$ROOT_DIR" "$BACKEND_DIR/venv/bin/python" "$BACKEND_DIR/run.py" &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 1.5

# ------------------------------------------------------------------------------
# 4. Start Frontend Dev Server
# ------------------------------------------------------------------------------
echo -e "${GREEN} Starting Vite Frontend on http://localhost:8443${NC}"
cd "$FRONTEND_DIR"
PATH="$FRONTEND_DIR/node_modules/.bin:$PATH" $PKG_MGR run dev &
FRONTEND_PID=$!
cd "$ROOT_DIR"

echo -e "\n${BOLD}${GREEN}✔ MedCorpus is running!${NC}"
echo -e "  ➜  ${BOLD}Frontend:${NC} http://localhost:8443"
echo -e "  ➜  ${BOLD}Backend API:${NC} http://localhost:8000"
echo -e "  ➜  ${BOLD}API Docs (Swagger):${NC} http://localhost:8000/docs"
echo -e "\n${CYAN}Press Ctrl+C to stop both servers.${NC}\n"


# Keep script running and wait for background jobs
wait
