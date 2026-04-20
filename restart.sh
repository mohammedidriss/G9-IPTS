#!/bin/bash
# ============================================================
#  IPTS — Stop & Restart All Services
#  Usage: ./restart.sh
#  Run from: /Users/mohamadidriss/Projects/IPTS/
# ============================================================

IPTS_DIR="/Users/mohamadidriss/Projects/IPTS"
RUNTIME_DIR="$IPTS_DIR/.runtime"
VENV_DIR="$IPTS_DIR/.venv"
LOG_DIR="$IPTS_DIR/logs"
APP_PORT=5001
GANACHE_PORT=8545

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

line() { echo -e "${CYAN}────────────────────────────────────────────────────${NC}"; }
ok()   { echo -e "  ${GREEN}✔  $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠  $1${NC}"; }
err()  { echo -e "  ${RED}✘  $1${NC}"; }
hdr()  { echo -e "\n${BOLD}$1${NC}"; line; }

clear
echo ""
echo -e "${BOLD}${CYAN}  ██╗██████╗ ████████╗███████╗${NC}"
echo -e "${BOLD}${CYAN}  ██║██╔══██╗╚══██╔══╝██╔════╝${NC}"
echo -e "${BOLD}${CYAN}  ██║██████╔╝   ██║   ███████╗${NC}"
echo -e "${BOLD}${CYAN}  ██║██╔═══╝    ██║   ╚════██║${NC}"
echo -e "${BOLD}${CYAN}  ██║██║        ██║   ███████║${NC}"
echo -e "${BOLD}${CYAN}  ╚═╝╚═╝        ╚═╝   ╚══════╝${NC}"
echo ""
echo -e "  ${BOLD}Integrated Payment Transformation System${NC}"
echo -e "  ${YELLOW}Restart Script — $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""
line

# ── STEP 1: STOP ALL SERVICES ────────────────────────────────────────────────
hdr "STEP 1 — Stopping All Services"

# Kill Flask app on port 5001
echo -e "\n  Stopping Flask app (port $APP_PORT)..."
FLASK_PIDS=$(lsof -ti:$APP_PORT 2>/dev/null || true)
if [ -n "$FLASK_PIDS" ]; then
    echo "$FLASK_PIDS" | xargs kill -9 2>/dev/null || true
    ok "Flask app stopped (PID: $FLASK_PIDS)"
else
    warn "Flask app was not running"
fi

# Kill Ganache blockchain on port 8545
echo -e "\n  Stopping Ganache blockchain (port $GANACHE_PORT)..."
GANACHE_PIDS=$(lsof -ti:$GANACHE_PORT 2>/dev/null || true)
if [ -n "$GANACHE_PIDS" ]; then
    echo "$GANACHE_PIDS" | xargs kill -9 2>/dev/null || true
    ok "Ganache stopped (PID: $GANACHE_PIDS)"
else
    warn "Ganache was not running"
fi

# Kill any leftover Python processes from this project
echo -e "\n  Checking for leftover IPTS Python processes..."
LEFTOVER=$(pgrep -f "ipts_local_deploy\|$RUNTIME_DIR/app.py" 2>/dev/null || true)
if [ -n "$LEFTOVER" ]; then
    echo "$LEFTOVER" | xargs kill -9 2>/dev/null || true
    ok "Leftover processes cleaned up"
else
    warn "No leftover processes found"
fi

# Short pause to let ports fully release
sleep 2
ok "All services stopped — ports are free"

# ── STEP 2: CHECK OLLAMA (AI CHAT) ───────────────────────────────────────────
hdr "STEP 2 — Checking Ollama (AI Support Chat)"

if command -v ollama &>/dev/null; then
    # Check if Ollama server is already running
    if curl -s http://localhost:11434/api/tags &>/dev/null; then
        ok "Ollama is already running"
    else
        echo -e "\n  Starting Ollama server..."
        ollama serve > "$LOG_DIR/ollama.log" 2>&1 &
        sleep 3
        if curl -s http://localhost:11434/api/tags &>/dev/null; then
            ok "Ollama started successfully"
        else
            warn "Ollama may still be starting (check logs/ollama.log)"
        fi
    fi

    # Verify the model used by IPTS is available
    if ollama list 2>/dev/null | grep -q "llama3\|qwen"; then
        ok "AI model is available"
    else
        warn "No AI model found — run: ollama pull llama3.2"
    fi
else
    warn "Ollama not installed — AI Support Chat will be unavailable"
    warn "Install: brew install ollama"
fi

# ── STEP 3: ACTIVATE VIRTUAL ENVIRONMENT ─────────────────────────────────────
hdr "STEP 3 — Activating Python Environment"

if [ ! -d "$VENV_DIR" ]; then
    err "Virtual environment not found at $VENV_DIR"
    echo ""
    echo "  Run the full setup first:"
    echo "  cd $IPTS_DIR && ./run_local.sh"
    echo ""
    exit 1
fi

source "$VENV_DIR/bin/activate"
ok "Virtual environment activated ($VENV_DIR)"

# Quick check for critical packages
python3 -c "import flask, jwt, sklearn, xgboost, shap, web3" 2>/dev/null \
    && ok "All Python packages verified" \
    || warn "Some packages may be missing — run: pip install -r requirements.txt"

# ── STEP 4: START GANACHE BLOCKCHAIN ─────────────────────────────────────────
hdr "STEP 4 — Starting Ganache Blockchain"

if command -v ganache &>/dev/null; then
    ganache \
        --port $GANACHE_PORT \
        --accounts 10 \
        --deterministic \
        --quiet \
        > "$LOG_DIR/ganache.log" 2>&1 &

    GANACHE_PID=$!
    sleep 2

    if lsof -ti:$GANACHE_PORT &>/dev/null; then
        ok "Ganache started on port $GANACHE_PORT (PID: $GANACHE_PID)"
    else
        warn "Ganache may have failed to start — check logs/ganache.log"
    fi
else
    warn "Ganache not installed — blockchain features may be limited"
    warn "Install: npm install -g ganache"
fi

# ── STEP 5: START FLASK APP ───────────────────────────────────────────────────
hdr "STEP 5 — Starting IPTS Flask Application"

# Sync latest frontend template to runtime
echo -e "\n  Syncing frontend template..."
cp "$IPTS_DIR/templates/ipts_frontend.html" "$RUNTIME_DIR/templates/index.html" 2>/dev/null \
    && ok "Frontend template synced" \
    || warn "Could not sync template (check paths)"

# Rotate old logs
if [ -f "$LOG_DIR/flask_stdout.log" ]; then
    mv "$LOG_DIR/flask_stdout.log" "$LOG_DIR/flask_stdout.$(date +%Y%m%d_%H%M%S).log" 2>/dev/null || true
fi
if [ -f "$LOG_DIR/flask_stderr.log" ]; then
    mv "$LOG_DIR/flask_stderr.log" "$LOG_DIR/flask_stderr.$(date +%Y%m%d_%H%M%S).log" 2>/dev/null || true
fi

echo -e "\n  Starting Flask app..."
cd "$RUNTIME_DIR"
"$VENV_DIR/bin/python3" app.py \
    > "$LOG_DIR/flask_stdout.log" \
    2> "$LOG_DIR/flask_stderr.log" &

FLASK_PID=$!

# Wait for the app to be ready (up to 15 seconds)
echo -e "  Waiting for app to be ready..."
READY=false
for i in $(seq 1 15); do
    sleep 1
    if curl -s http://127.0.0.1:$APP_PORT/api/health &>/dev/null; then
        READY=true
        break
    fi
    printf "  ."
done
echo ""

if [ "$READY" = true ]; then
    ok "Flask app is ready (PID: $FLASK_PID)"
else
    err "Flask app did not respond in time"
    warn "Check logs/flask_stderr.log for errors"
    echo ""
    echo "  Last 10 lines of error log:"
    tail -10 "$LOG_DIR/flask_stderr.log" 2>/dev/null | sed 's/^/  /'
    echo ""
fi

# ── FINAL STATUS ─────────────────────────────────────────────────────────────
hdr "System Status"

echo ""
printf "  %-25s" "Flask App (port $APP_PORT):"
if lsof -ti:$APP_PORT &>/dev/null; then
    echo -e "${GREEN}RUNNING${NC}"
else
    echo -e "${RED}NOT RUNNING${NC}"
fi

printf "  %-25s" "Ganache (port $GANACHE_PORT):"
if lsof -ti:$GANACHE_PORT &>/dev/null; then
    echo -e "${GREEN}RUNNING${NC}"
else
    echo -e "${YELLOW}NOT RUNNING${NC}"
fi

printf "  %-25s" "Ollama (AI Chat):"
if curl -s http://localhost:11434/api/tags &>/dev/null; then
    echo -e "${GREEN}RUNNING${NC}"
else
    echo -e "${YELLOW}NOT RUNNING${NC}"
fi

echo ""
line
echo ""
echo -e "  ${BOLD}${GREEN}IPTS is ready!${NC}"
echo ""
echo -e "  ${BOLD}Open in browser:${NC}  http://127.0.0.1:$APP_PORT"
echo ""
echo -e "  ${BOLD}Credentials:${NC}"
echo -e "    Admin       →  mohamad / Mohamad@2026!"
echo -e "    Operator    →  rohit   / Rohit@2026!"
echo -e "    Compliance  →  walid   / Walid@2026!"
echo ""
echo -e "  ${BOLD}Logs:${NC}"
echo -e "    Flask out   →  $LOG_DIR/flask_stdout.log"
echo -e "    Flask err   →  $LOG_DIR/flask_stderr.log"
echo -e "    Ganache     →  $LOG_DIR/ganache.log"
echo ""
line
echo ""
