#!/bin/bash
# =============================================================================
#  IPTS — macOS Installation Script
#  Integrated Payment Transformation System
#
#  Supports : macOS 12 Monterey · 13 Ventura · 14 Sonoma · 15 Sequoia
#  Run from : the IPTS project root directory
#  Usage    : bash install_macos.sh
#
#  What this script does (in order):
#    1.  Checks system requirements
#    2.  Installs Homebrew (if missing)
#    3.  Installs Python 3.12
#    4.  Installs Node.js + npm
#    5.  Installs Ganache (global npm package)
#    6.  Installs Ollama (local LLM runtime)
#    7.  Installs Tesseract OCR
#    8.  Creates Python virtual environment
#    9.  Installs all Python packages (requirements.txt)
#    10. Installs Node packages (npm install)
#    11. Pulls the Llama 3.2 AI model (~2 GB, one-time)
#    12. Fixes the IPTS_DIR path in restart.sh and run_local.sh
#    13. Syncs the frontend template to the runtime directory
#    14. Runs the first-time setup (trains ML models, deploys contracts, seeds DB)
#    15. Verifies all services are healthy
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m';   GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m';  BOLD='\033[1m';     NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔  $*${NC}"; }
warn() { echo -e "  ${YELLOW}⚠  $*${NC}"; }
err()  { echo -e "  ${RED}✘  $*${NC}"; exit 1; }
info() { echo -e "  ${CYAN}→  $*${NC}"; }
hdr()  { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${NC}\n"; }
line() { echo -e "${CYAN}────────────────────────────────────────────────────${NC}"; }

# ── Banner ────────────────────────────────────────────────────────────────────
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
echo -e "  ${YELLOW}macOS Installation Script — $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""
line

# ── Resolve project root ──────────────────────────────────────────────────────
IPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$IPTS_DIR/.venv"
RUNTIME_DIR="$IPTS_DIR/.runtime"
LOG_DIR="$IPTS_DIR/logs"
APP_PORT=5001
GANACHE_PORT=8545

info "Project directory: $IPTS_DIR"

# ── Step 1: System check ──────────────────────────────────────────────────────
hdr "STEP 1 — System Requirements"

# Must be macOS
if [[ "$(uname)" != "Darwin" ]]; then
  err "This script is for macOS only. Use install_redhat.sh for Linux."
fi
ok "macOS detected: $(sw_vers -productVersion)"

# Must be run as a normal user (not root)
if [[ "$(id -u)" -eq 0 ]]; then
  err "Do not run this script as root. Run as your normal user account."
fi
ok "Running as user: $(whoami)"

# Check available disk space (need at least 5 GB)
AVAIL_GB=$(df -g "$HOME" | awk 'NR==2 {print $4}')
if [[ "$AVAIL_GB" -lt 5 ]]; then
  warn "Low disk space: ${AVAIL_GB}GB available. At least 5 GB recommended."
else
  ok "Disk space: ${AVAIL_GB}GB available"
fi

mkdir -p "$LOG_DIR"

# ── Step 2: Homebrew ──────────────────────────────────────────────────────────
hdr "STEP 2 — Homebrew"

if ! command -v brew &>/dev/null; then
  info "Homebrew not found — installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  fi
  ok "Homebrew installed"
else
  ok "Homebrew $(brew --version | head -1) already installed"
fi

info "Updating Homebrew..."
brew update --quiet 2>/dev/null || warn "Brew update had warnings (non-fatal)"

# ── Step 3: Python 3.12 ───────────────────────────────────────────────────────
hdr "STEP 3 — Python 3.12"

if command -v python3.12 &>/dev/null; then
  ok "Python $(python3.12 --version) already installed"
else
  info "Installing Python 3.12..."
  brew install python@3.12
  # Symlink so python3.12 is accessible
  brew link python@3.12 --force 2>/dev/null || true
  ok "Python 3.12 installed"
fi

# Verify version — 3.13/3.14 will break scikit-learn
PY_VER=$(python3.12 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
if [[ "$PY_VER" != "3.12" ]]; then
  err "Expected Python 3.12 but got $PY_VER. Install Python 3.12 manually."
fi
ok "Python version verified: $PY_VER"

# ── Step 4: Node.js ───────────────────────────────────────────────────────────
hdr "STEP 4 — Node.js"

if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | grep -oE '[0-9]+' | head -1)
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    ok "Node.js $(node -v) already installed"
  else
    info "Node.js version too old ($(node -v)) — upgrading..."
    brew upgrade node || brew install node
  fi
else
  info "Installing Node.js..."
  brew install node
  ok "Node.js installed: $(node -v)"
fi
ok "npm $(npm -v) ready"

# ── Step 5: Ganache ───────────────────────────────────────────────────────────
hdr "STEP 5 — Ganache (Local Ethereum Blockchain)"

if command -v ganache &>/dev/null; then
  ok "Ganache already installed: $(ganache --version 2>/dev/null | head -1)"
else
  info "Installing Ganache globally via npm..."
  npm install -g ganache
  ok "Ganache installed: $(ganache --version 2>/dev/null | head -1)"
fi

# ── Step 6: Ollama ────────────────────────────────────────────────────────────
hdr "STEP 6 — Ollama (Local AI / LLM Runtime)"

if command -v ollama &>/dev/null; then
  ok "Ollama already installed"
else
  info "Installing Ollama via Homebrew..."
  brew install ollama
  ok "Ollama installed"
fi

# Start Ollama server in background if not already running
if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
  info "Starting Ollama server..."
  ollama serve > "$LOG_DIR/ollama.log" 2>&1 &
  OLLAMA_PID=$!
  sleep 4
  if curl -s http://localhost:11434/api/tags &>/dev/null; then
    ok "Ollama server started (PID: $OLLAMA_PID)"
  else
    warn "Ollama server may still be starting — check $LOG_DIR/ollama.log"
  fi
else
  ok "Ollama server is already running"
fi

# ── Step 7: Tesseract OCR ─────────────────────────────────────────────────────
hdr "STEP 7 — Tesseract OCR (KYC Document Scanning)"

if command -v tesseract &>/dev/null; then
  ok "Tesseract $(tesseract --version 2>&1 | head -1) already installed"
else
  info "Installing Tesseract..."
  brew install tesseract
  ok "Tesseract installed"
fi

# ── Step 8: Python virtual environment ───────────────────────────────────────
hdr "STEP 8 — Python Virtual Environment"

if [[ -d "$VENV_DIR" ]]; then
  info "Virtual environment already exists — recreating to ensure clean state..."
  rm -rf "$VENV_DIR"
fi

info "Creating virtual environment at $VENV_DIR ..."
python3.12 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
ok "Virtual environment created and activated"

info "Upgrading pip, wheel, setuptools..."
pip install --upgrade pip wheel setuptools --quiet
ok "pip $(pip --version | awk '{print $2}') ready"

# ── Step 9: Python packages ───────────────────────────────────────────────────
hdr "STEP 9 — Python Dependencies"

if [[ ! -f "$IPTS_DIR/requirements.txt" ]]; then
  err "requirements.txt not found in $IPTS_DIR"
fi

info "Installing Python packages (this takes 3–5 minutes)..."
pip install -r "$IPTS_DIR/requirements.txt" --quiet
ok "All Python packages installed"

# Verify critical imports
info "Verifying critical imports..."
python3 -c "import flask, jwt, sklearn, xgboost, shap, web3, networkx, pandas" \
  && ok "All critical Python imports verified" \
  || err "One or more imports failed — check the output above"

# ── Step 10: Node packages ────────────────────────────────────────────────────
hdr "STEP 10 — Node.js Packages"

cd "$IPTS_DIR"
if [[ -f "package.json" ]]; then
  info "Installing Node packages..."
  npm install --silent
  ok "Node packages installed"
else
  warn "package.json not found — skipping npm install"
fi

# ── Step 11: Pull AI model ────────────────────────────────────────────────────
hdr "STEP 11 — Llama 3.2 AI Model (~2 GB)"

if ollama list 2>/dev/null | grep -q "llama3.2"; then
  ok "llama3.2 model already downloaded"
else
  info "Pulling llama3.2 model (this may take 5–15 minutes depending on connection)..."
  ollama pull llama3.2 && ok "llama3.2 model downloaded successfully" \
    || warn "Model pull failed — run 'ollama pull llama3.2' manually after installation"
fi

# ── Step 12: Fix paths in scripts ────────────────────────────────────────────
hdr "STEP 12 — Updating Project Paths"

for SCRIPT in restart.sh run_local.sh; do
  if [[ -f "$IPTS_DIR/$SCRIPT" ]]; then
    # Replace any hardcoded IPTS_DIR with the actual current path
    sed -i '' "s|IPTS_DIR=\"/Users/[^\"]*\"|IPTS_DIR=\"$IPTS_DIR\"|g" "$IPTS_DIR/$SCRIPT"
    ok "$SCRIPT — path updated to $IPTS_DIR"
  else
    warn "$SCRIPT not found — skipping"
  fi
done

# Ensure scripts are executable
chmod +x "$IPTS_DIR/restart.sh" "$IPTS_DIR/run_local.sh" 2>/dev/null || true

# ── Step 13: Sync frontend template ──────────────────────────────────────────
hdr "STEP 13 — Frontend Template Sync"

mkdir -p "$RUNTIME_DIR/templates"
if [[ -f "$IPTS_DIR/templates/ipts_frontend.html" ]]; then
  cp "$IPTS_DIR/templates/ipts_frontend.html" "$RUNTIME_DIR/templates/index.html"
  ok "Frontend template synced to runtime"
else
  warn "ipts_frontend.html not found in templates/ — skipping sync"
fi

# ── Step 14: First-time setup (train models, deploy contracts, seed DB) ───────
hdr "STEP 14 — First-Time Setup (ML Training + Blockchain Deploy)"

echo ""
info "This step trains 7 ML models and deploys 7 smart contracts."
info "It runs once and takes 5–10 minutes. Subsequent restarts use restart.sh (15 sec)."
echo ""

# Kill any existing processes on the required ports
for PORT_NUM in $APP_PORT $GANACHE_PORT; do
  PIDS=$(lsof -ti:$PORT_NUM 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    info "Cleared port $PORT_NUM"
  fi
done
sleep 2

# Run the full setup
cd "$IPTS_DIR"
source "$VENV_DIR/bin/activate"

if [[ -f "$IPTS_DIR/run_local.sh" ]]; then
  info "Running run_local.sh ..."
  bash "$IPTS_DIR/run_local.sh" 2>&1 | tee "$LOG_DIR/install_setup.log" &
  SETUP_PID=$!

  # Wait for Flask to become ready (up to 3 minutes)
  echo -e "  Waiting for Flask to be ready"
  READY=false
  for i in $(seq 1 36); do
    sleep 5
    if curl -s "http://127.0.0.1:$APP_PORT/api/health" &>/dev/null; then
      READY=true
      break
    fi
    printf "  ."
  done
  echo ""

  if [[ "$READY" == "true" ]]; then
    ok "IPTS is up and running!"
  else
    warn "Flask did not respond in time."
    warn "Check $LOG_DIR/install_setup.log and $LOG_DIR/flask_stderr.log for errors."
  fi
else
  warn "run_local.sh not found — running restart.sh instead"
  bash "$IPTS_DIR/restart.sh"
fi

# ── Step 15: Verification ─────────────────────────────────────────────────────
hdr "STEP 15 — Verification"

echo ""
printf "  %-30s" "Flask API (port $APP_PORT):"
if lsof -ti:$APP_PORT &>/dev/null; then
  echo -e "${GREEN}RUNNING${NC}"
else
  echo -e "${RED}NOT RUNNING${NC}"
fi

printf "  %-30s" "Ganache blockchain (port $GANACHE_PORT):"
if lsof -ti:$GANACHE_PORT &>/dev/null; then
  echo -e "${GREEN}RUNNING${NC}"
else
  echo -e "${YELLOW}NOT RUNNING${NC}"
fi

printf "  %-30s" "Ollama AI (port 11434):"
if curl -s http://localhost:11434/api/tags &>/dev/null; then
  echo -e "${GREEN}RUNNING${NC}"
else
  echo -e "${YELLOW}NOT RUNNING${NC}"
fi

printf "  %-30s" "Health check (/api/health):"
HEALTH=$(curl -s "http://127.0.0.1:$APP_PORT/api/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status"'; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
fi

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
line
echo ""
echo -e "  ${BOLD}${GREEN}Installation complete!${NC}"
echo ""
echo -e "  ${BOLD}Open in browser:${NC}   http://127.0.0.1:$APP_PORT"
echo ""
echo -e "  ${BOLD}Login credentials:${NC}"
echo -e "    Admin       →  mohamad / Mohamad@2026!"
echo -e "    Operator    →  rohit   / Rohit@2026!"
echo -e "    Compliance  →  walid   / Walid@2026!"
echo -e "    Client      →  sara    / Sara@2026!"
echo ""
echo -e "  ${BOLD}To restart IPTS after rebooting:${NC}"
echo -e "    cd $IPTS_DIR && bash restart.sh"
echo ""
echo -e "  ${BOLD}Logs:${NC}"
echo -e "    Flask     →  $LOG_DIR/flask_stderr.log"
echo -e "    Ganache   →  $LOG_DIR/ganache.log"
echo -e "    Ollama    →  $LOG_DIR/ollama.log"
echo ""
line
echo ""
