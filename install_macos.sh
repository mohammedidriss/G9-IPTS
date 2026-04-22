#!/bin/bash
# =============================================================================
#  IPTS — macOS Installation Script
#  Integrated Payment Transformation System
#
#  Supports : macOS 12 Monterey · 13 Ventura · 14 Sonoma · 15 Sequoia
#  Run from : the IPTS project root directory
#  Usage    : bash install_macos.sh [OPTIONS]
#
#  Options:
#    --no-ollama          Skip Ollama/LLM installation
#    --nginx              Use Nginx reverse proxy on port 80 (non-interactive)
#    --ngrok TOKEN        Use ngrok public tunnel with given auth token
#    --domain NAME        Domain for Nginx (implies --nginx)
#    --no-ssl             Skip Let's Encrypt SSL (with --nginx --domain)
#
#  Examples:
#    bash install_macos.sh                     # interactive wizard
#    bash install_macos.sh --nginx             # Nginx on port 80
#    bash install_macos.sh --ngrok 2abc...xyz  # ngrok tunnel
#    bash install_macos.sh --no-ollama         # skip AI chat
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
#    14. Configures public access (Nginx / ngrok / local)
#    15. Runs the first-time setup (trains ML models, deploys contracts, seeds DB)
#    16. Verifies all services are healthy
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

# ── Defaults ──────────────────────────────────────────────────────────────────
ACCESS_MODE=""       # "nginx" | "ngrok" | "local"
NGROK_TOKEN=""
DOMAIN=""
INSTALL_SSL=false
INSTALL_OLLAMA=true

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-ollama)  INSTALL_OLLAMA=false; shift ;;
    --nginx)      ACCESS_MODE="nginx";  shift ;;
    --ngrok)      ACCESS_MODE="ngrok"; NGROK_TOKEN="$2"; shift 2 ;;
    --domain)     DOMAIN="$2"; ACCESS_MODE="nginx"; shift 2 ;;
    --no-ssl)     INSTALL_SSL=false; shift ;;
    *) warn "Unknown argument: $1"; shift ;;
  esac
done

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

# ── Interactive setup wizard (runs if --nginx or --ngrok not passed) ──────────
if [[ -z "$ACCESS_MODE" ]]; then
  echo ""
  echo -e "  ${BOLD}How should IPTS be accessed?${NC}"
  echo ""
  echo -e "  ${CYAN}[1]${NC} ${BOLD}Local only${NC} — access at http://127.0.0.1:5001 (default for Mac dev)"
  echo -e "      Best for: personal development, demos on your own machine"
  echo ""
  echo -e "  ${CYAN}[2]${NC} ${BOLD}Nginx${NC} — serve on port 80 via Nginx reverse proxy"
  echo -e "      Best for: sharing on a local network or a dedicated Mac server"
  echo -e "      Requires: sudo password (Nginx binds to port 80)"
  echo ""
  echo -e "  ${CYAN}[3]${NC} ${BOLD}ngrok${NC} — create a secure public HTTPS tunnel"
  echo -e "      Best for: sharing with others over the internet without network config"
  echo -e "      Requires: free account at https://ngrok.com"
  echo ""
  while true; do
    read -rp "  Enter your choice [1/2/3]: " CHOICE
    case "$CHOICE" in
      1) ACCESS_MODE="local"; break ;;
      2) ACCESS_MODE="nginx"; break ;;
      3) ACCESS_MODE="ngrok"; break ;;
      *) echo -e "  ${RED}Invalid choice. Please enter 1, 2, or 3.${NC}" ;;
    esac
  done

  # ngrok: ask for auth token
  if [[ "$ACCESS_MODE" == "ngrok" ]]; then
    echo ""
    echo -e "  ${BOLD}ngrok Auth Token${NC}"
    echo -e "  Get your free token at: ${CYAN}https://ngrok.com${NC} → Sign up → Dashboard → Your Authtoken"
    echo ""
    while [[ -z "$NGROK_TOKEN" ]]; do
      read -rp "  Paste your ngrok auth token: " NGROK_TOKEN
      [[ -z "$NGROK_TOKEN" ]] && echo -e "  ${RED}Token cannot be empty.${NC}"
    done
    ok "ngrok token saved"
  fi

  # nginx: ask for optional domain + SSL
  if [[ "$ACCESS_MODE" == "nginx" ]]; then
    echo ""
    echo -e "  ${BOLD}Domain name${NC} (optional — leave blank to use local IP)"
    read -rp "  Enter domain name (or press Enter to skip): " DOMAIN_INPUT
    if [[ -n "$DOMAIN_INPUT" ]]; then
      DOMAIN="$DOMAIN_INPUT"
      read -rp "  Set up free SSL with Let's Encrypt? [y/N]: " SSL_INPUT
      [[ "$SSL_INPUT" =~ ^[Yy]$ ]] && INSTALL_SSL=true
    fi
    ok "Nginx mode selected${DOMAIN:+ — domain: $DOMAIN}"
  fi
fi

# Summary before starting
echo ""
line
ACCESS_MODE_LABEL="Local only (http://127.0.0.1:$APP_PORT)"
[[ "$ACCESS_MODE" == "nginx" ]] && ACCESS_MODE_LABEL="Nginx on port 80${DOMAIN:+ (domain: $DOMAIN)}"
[[ "$ACCESS_MODE" == "ngrok" ]] && ACCESS_MODE_LABEL="ngrok public HTTPS tunnel"
echo -e "  Project dir  : ${BOLD}$IPTS_DIR${NC}"
echo -e "  App port     : ${BOLD}$APP_PORT${NC}"
echo -e "  Access mode  : ${BOLD}${ACCESS_MODE_LABEL}${NC}"
echo -e "  Ollama/LLM   : ${BOLD}$([ "$INSTALL_OLLAMA" == "true" ] && echo "Yes" || echo "No")${NC}"
echo ""
echo -e "  ${YELLOW}Starting installation in 5 seconds... (Ctrl+C to cancel)${NC}"
sleep 5
line

# ── Step 1: System check ──────────────────────────────────────────────────────
hdr "STEP 1 — System Requirements"

if [[ "$(uname)" != "Darwin" ]]; then
  err "This script is for macOS only. Use install_redhat.sh for Linux."
fi
ok "macOS detected: $(sw_vers -productVersion)"

if [[ "$(id -u)" -eq 0 ]]; then
  err "Do not run this script as root. Run as your normal user account."
fi
ok "Running as user: $(whoami)"

AVAIL_GB=$(df -g "$HOME" | awk 'NR==2 {print $4}')
if [[ "$AVAIL_GB" -lt 5 ]]; then
  warn "Low disk space: ${AVAIL_GB}GB available. At least 5 GB recommended."
else
  ok "Disk space: ${AVAIL_GB}GB available"
fi

if ! curl -sf --max-time 5 https://pypi.org/simple/ &>/dev/null; then
  err "No internet connectivity — cannot download dependencies."
fi
ok "Internet connectivity confirmed"

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
  brew link python@3.12 --force 2>/dev/null || true
  ok "Python 3.12 installed"
fi

PY_VER=$(python3.12 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
[[ "$PY_VER" != "3.12" ]] && err "Expected Python 3.12 but got $PY_VER."
ok "Python version verified: $PY_VER"

# ── Step 4: Node.js ───────────────────────────────────────────────────────────
hdr "STEP 4 — Node.js"

if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | grep -oE '[0-9]+' | head -1)
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    ok "Node.js $(node -v) already installed"
  else
    info "Upgrading Node.js..."
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

if [[ "$INSTALL_OLLAMA" == "true" ]]; then
  if command -v ollama &>/dev/null; then
    ok "Ollama already installed"
  else
    info "Installing Ollama via Homebrew..."
    brew install ollama
    ok "Ollama installed"
  fi

  if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    info "Starting Ollama server..."
    ollama serve > "$LOG_DIR/ollama.log" 2>&1 &
    sleep 4
    curl -s http://localhost:11434/api/tags &>/dev/null \
      && ok "Ollama server started" \
      || warn "Ollama may still be starting — check $LOG_DIR/ollama.log"
  else
    ok "Ollama server is already running"
  fi
else
  warn "Skipping Ollama (--no-ollama). AI Support Chat will be unavailable."
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
  info "Existing virtual environment found — recreating for clean state..."
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

[[ ! -f "$IPTS_DIR/requirements.txt" ]] && err "requirements.txt not found in $IPTS_DIR"

info "Installing Python packages (this takes 3–5 minutes)..."
pip install -r "$IPTS_DIR/requirements.txt" --quiet
ok "All Python packages installed"

info "Verifying critical imports..."
python3 -c "import flask, jwt, sklearn, xgboost, shap, web3, networkx, pandas" \
  && ok "All critical Python imports verified" \
  || err "One or more imports failed — check above"

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

if [[ "$INSTALL_OLLAMA" == "true" ]]; then
  if ollama list 2>/dev/null | grep -q "llama3.2"; then
    ok "llama3.2 model already downloaded"
  else
    info "Pulling llama3.2 model (5–15 minutes depending on connection)..."
    ollama pull llama3.2 && ok "llama3.2 model downloaded" \
      || warn "Model pull failed — run 'ollama pull llama3.2' manually"
  fi
else
  info "Skipping model pull (Ollama not installed)"
fi

# ── Step 12: Fix paths in scripts ────────────────────────────────────────────
hdr "STEP 12 — Updating Project Paths"

for SCRIPT in restart.sh run_local.sh; do
  if [[ -f "$IPTS_DIR/$SCRIPT" ]]; then
    sed -i '' "s|IPTS_DIR=\"/Users/[^\"]*\"|IPTS_DIR=\"$IPTS_DIR\"|g" "$IPTS_DIR/$SCRIPT"
    ok "$SCRIPT — path updated to $IPTS_DIR"
  else
    warn "$SCRIPT not found — skipping"
  fi
done
chmod +x "$IPTS_DIR/restart.sh" "$IPTS_DIR/run_local.sh" 2>/dev/null || true

# ── Step 13: Sync frontend template ──────────────────────────────────────────
hdr "STEP 13 — Frontend Template Sync"

mkdir -p "$RUNTIME_DIR/templates" "$RUNTIME_DIR/models" "$RUNTIME_DIR/contracts" "$RUNTIME_DIR/data"
if [[ -f "$IPTS_DIR/templates/ipts_frontend.html" ]]; then
  cp "$IPTS_DIR/templates/ipts_frontend.html" "$RUNTIME_DIR/templates/index.html"
  ok "Frontend template synced to runtime"
else
  warn "ipts_frontend.html not found in templates/ — UI may not load"
fi

# ── Step 14: Public access setup ─────────────────────────────────────────────
hdr "STEP 14 — Public Access Setup (${ACCESS_MODE:-local})"

if [[ "$ACCESS_MODE" == "nginx" ]]; then

  info "Installing Nginx via Homebrew..."
  brew install nginx 2>/dev/null || ok "Nginx already installed"

  # Detect Homebrew prefix (differs on Apple Silicon vs Intel)
  BREW_PREFIX="$(brew --prefix)"
  NGINX_CONF_DIR="$BREW_PREFIX/etc/nginx/servers"
  mkdir -p "$NGINX_CONF_DIR"

  SERVER_NAME="${DOMAIN:-localhost}"

  cat > "$NGINX_CONF_DIR/ipts.conf" << EOF
# IPTS Nginx config — auto-generated by install_macos.sh
upstream ipts_backend { server 127.0.0.1:$APP_PORT; keepalive 32; }
server {
    listen 80;
    server_name $SERVER_NAME;
    client_max_body_size 16M;

    # SSE — disable buffering for real-time events
    location /api/stream {
        proxy_pass         http://ipts_backend;
        proxy_http_version 1.1;
        proxy_set_header   Connection        "";
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 3600s;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
    }
    location / {
        proxy_pass         http://ipts_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }
    access_log $LOG_DIR/nginx_access.log;
    error_log  $LOG_DIR/nginx_error.log;
}
EOF

  nginx -t -c "$BREW_PREFIX/etc/nginx/nginx.conf" \
    && ok "Nginx config valid" \
    || warn "Nginx config error — check: nginx -t"

  # Nginx on macOS needs sudo to bind to port 80
  # Use brew services which runs as root via launchd
  info "Starting Nginx (may ask for sudo password to bind port 80)..."
  sudo brew services start nginx \
    && ok "Nginx started on port 80" \
    || warn "Nginx failed to start — try: sudo brew services restart nginx"

  if [[ "$INSTALL_SSL" == "true" && -n "$DOMAIN" ]]; then
    info "Installing certbot for Let's Encrypt..."
    brew install certbot 2>/dev/null || true
    sudo certbot --nginx -d "$DOMAIN" \
      --non-interactive --agree-tos \
      --email "admin@$DOMAIN" \
      --redirect \
      && ok "SSL certificate installed for $DOMAIN" \
      || warn "certbot failed — run: sudo certbot --nginx -d $DOMAIN"
  fi

elif [[ "$ACCESS_MODE" == "ngrok" ]]; then

  info "Installing ngrok via Homebrew..."
  if command -v ngrok &>/dev/null; then
    ok "ngrok already installed: $(ngrok version 2>/dev/null | head -1)"
  else
    # Use the official ngrok Homebrew tap
    brew install ngrok/ngrok/ngrok \
      && ok "ngrok installed" \
      || {
        # Fallback: direct download
        warn "Homebrew tap failed — downloading ngrok directly..."
        ARCH="darwin_amd64"
        [[ "$(uname -m)" == "arm64" ]] && ARCH="darwin_arm64"
        curl -fsSL \
          "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-${ARCH}.zip" \
          -o /tmp/ngrok.zip \
          && unzip -o /tmp/ngrok.zip -d /usr/local/bin/ \
          && chmod +x /usr/local/bin/ngrok \
          && rm -f /tmp/ngrok.zip \
          && ok "ngrok installed to /usr/local/bin/ngrok" \
          || err "ngrok installation failed — visit https://ngrok.com/download"
      }
  fi

  info "Configuring ngrok auth token..."
  ngrok config add-authtoken "$NGROK_TOKEN" \
    && ok "ngrok auth token configured" \
    || err "Invalid ngrok token — re-run with a valid token from https://ngrok.com"

  # Create a launchd plist so ngrok survives across restarts
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST_FILE="$PLIST_DIR/com.ipts.ngrok.plist"
  mkdir -p "$PLIST_DIR"

  cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>             <string>com.ipts.ngrok</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ngrok</string>
        <string>http</string>
        <string>$APP_PORT</string>
        <string>--log=stdout</string>
    </array>
    <key>RunAtLoad</key>         <true/>
    <key>KeepAlive</key>         <true/>
    <key>StandardOutPath</key>   <string>$LOG_DIR/ngrok.log</string>
    <key>StandardErrorPath</key> <string>$LOG_DIR/ngrok_error.log</string>
</dict>
</plist>
EOF

  # Fix path for Apple Silicon (ngrok may be in /opt/homebrew/bin)
  NGROK_BIN="$(command -v ngrok)"
  sed -i '' "s|/usr/local/bin/ngrok|$NGROK_BIN|g" "$PLIST_FILE"

  # Unload old agent if present, then load fresh
  launchctl unload "$PLIST_FILE" 2>/dev/null || true
  launchctl load -w "$PLIST_FILE" \
    && ok "ngrok launchd agent loaded (persists across reboots)" \
    || warn "launchctl load failed — ngrok may need to be started manually"

  # Wait for ngrok to obtain a public URL
  info "Waiting for ngrok to obtain public URL..."
  NGROK_URL=""
  for i in $(seq 1 20); do
    sleep 1
    NGROK_URL=$(curl -sf http://localhost:4040/api/tunnels 2>/dev/null \
      | grep -oE '"public_url":"https://[^"]+' \
      | head -1 \
      | sed 's/"public_url":"//') || true
    [[ -n "$NGROK_URL" ]] && break
    printf "."
  done
  echo ""

  if [[ -n "$NGROK_URL" ]]; then
    ok "ngrok tunnel is live: $NGROK_URL"
    echo "$NGROK_URL" > "$IPTS_DIR/.ngrok_url"
    ok "Public URL saved to $IPTS_DIR/.ngrok_url"
  else
    warn "ngrok URL not yet available — check:"
    warn "  curl -s http://localhost:4040/api/tunnels | grep public_url"
    warn "  or open: http://localhost:4040 in your browser"
  fi

else
  info "Local-only mode — IPTS will be available at http://127.0.0.1:$APP_PORT"
fi

# ── Step 15: First-time setup (train models, deploy contracts, seed DB) ───────
hdr "STEP 15 — First-Time Setup (ML Training + Blockchain Deploy)"

echo ""
info "This step trains 7 ML models and deploys 7 smart contracts."
info "It runs once and takes 5–10 minutes. Subsequent restarts use restart.sh (15 sec)."
echo ""

# Kill any existing processes on required ports
for PORT_NUM in $APP_PORT $GANACHE_PORT; do
  PIDS=$(lsof -ti:$PORT_NUM 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    info "Cleared port $PORT_NUM"
  fi
done
sleep 2

cd "$IPTS_DIR"
source "$VENV_DIR/bin/activate"

if [[ -f "$IPTS_DIR/run_local.sh" ]]; then
  info "Running run_local.sh ..."
  bash "$IPTS_DIR/run_local.sh" > "$LOG_DIR/install_setup.log" 2>&1 &

  echo -n "  Waiting for Flask to be ready"
  READY=false
  for i in $(seq 1 36); do
    sleep 5
    if curl -s "http://127.0.0.1:$APP_PORT/api/health" &>/dev/null; then
      READY=true
      break
    fi
    printf "."
  done
  echo ""

  if [[ "$READY" == "true" ]]; then
    ok "IPTS is up and running!"
  else
    warn "Flask did not respond in time."
    warn "Check $LOG_DIR/install_setup.log and $LOG_DIR/flask_stderr.log"
  fi
else
  warn "run_local.sh not found — running restart.sh instead"
  bash "$IPTS_DIR/restart.sh"
fi

# ── Step 16: Verification ─────────────────────────────────────────────────────
hdr "STEP 16 — Verification"

echo ""
printf "  %-35s" "Flask API (port $APP_PORT):"
lsof -ti:$APP_PORT &>/dev/null && echo -e "${GREEN}RUNNING${NC}" || echo -e "${RED}NOT RUNNING${NC}"

printf "  %-35s" "Ganache blockchain (port $GANACHE_PORT):"
lsof -ti:$GANACHE_PORT &>/dev/null && echo -e "${GREEN}RUNNING${NC}" || echo -e "${YELLOW}NOT RUNNING${NC}"

if [[ "$INSTALL_OLLAMA" == "true" ]]; then
  printf "  %-35s" "Ollama AI (port 11434):"
  curl -s http://localhost:11434/api/tags &>/dev/null \
    && echo -e "${GREEN}RUNNING${NC}" || echo -e "${YELLOW}NOT RUNNING${NC}"
fi

printf "  %-35s" "Health check (/api/health):"
HEALTH=$(curl -s "http://127.0.0.1:$APP_PORT/api/health" 2>/dev/null || echo "")
echo "$HEALTH" | grep -q '"status"' \
  && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}"

if [[ "$ACCESS_MODE" == "nginx" ]]; then
  printf "  %-35s" "Nginx proxy (port 80):"
  curl -sf "http://localhost/api/health" &>/dev/null \
    && echo -e "${GREEN}PASS${NC}" || echo -e "${YELLOW}CHECK NGINX${NC}"
fi

if [[ "$ACCESS_MODE" == "ngrok" ]]; then
  printf "  %-35s" "ngrok tunnel:"
  curl -sf http://localhost:4040/api/tunnels &>/dev/null \
    && echo -e "${GREEN}RUNNING${NC}" || echo -e "${YELLOW}NOT RUNNING${NC}"
fi

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
line
echo ""
echo -e "  ${BOLD}${GREEN}Installation complete!${NC}"
echo ""

case "$ACCESS_MODE" in
  nginx)
    if [[ -n "$DOMAIN" && "$INSTALL_SSL" == "true" ]]; then
      echo -e "  ${BOLD}Open in browser:${NC}   https://$DOMAIN"
    else
      echo -e "  ${BOLD}Open in browser:${NC}   http://localhost"
    fi
    ;;
  ngrok)
    SAVED_URL=$(cat "$IPTS_DIR/.ngrok_url" 2>/dev/null || true)
    if [[ -n "$SAVED_URL" ]]; then
      echo -e "  ${BOLD}Open in browser:${NC}   $SAVED_URL"
      echo -e "  ${YELLOW}  (URL changes each restart unless you have a paid ngrok plan)${NC}"
    else
      echo -e "  ${BOLD}Open in browser:${NC}   http://127.0.0.1:$APP_PORT  (local)"
      echo -e "  ${YELLOW}  Get ngrok URL: curl -s http://localhost:4040/api/tunnels | grep public_url${NC}"
    fi
    ;;
  *)
    echo -e "  ${BOLD}Open in browser:${NC}   http://127.0.0.1:$APP_PORT"
    ;;
esac

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

if [[ "$ACCESS_MODE" == "ngrok" ]]; then
  echo -e "  ${BOLD}ngrok management:${NC}"
  echo -e "    launchctl list | grep ngrok      # Check agent status"
  echo -e "    launchctl stop  com.ipts.ngrok   # Stop tunnel"
  echo -e "    launchctl start com.ipts.ngrok   # Start tunnel"
  echo -e "    open http://localhost:4040        # ngrok web dashboard"
  echo -e "    cat $IPTS_DIR/.ngrok_url          # Saved public URL"
  echo ""
fi

if [[ "$ACCESS_MODE" == "nginx" ]]; then
  echo -e "  ${BOLD}Nginx management:${NC}"
  echo -e "    sudo brew services status nginx   # Check status"
  echo -e "    sudo brew services restart nginx  # Restart"
  echo -e "    tail -f $LOG_DIR/nginx_error.log  # View logs"
  echo ""
fi

echo -e "  ${BOLD}Log files:${NC}"
echo -e "    Flask     →  $LOG_DIR/flask_stderr.log"
echo -e "    Ganache   →  $LOG_DIR/ganache.log"
[[ "$INSTALL_OLLAMA" == "true" ]] && echo -e "    Ollama    →  $LOG_DIR/ollama.log"
[[ "$ACCESS_MODE" == "ngrok" ]]   && echo -e "    ngrok     →  $LOG_DIR/ngrok.log"
[[ "$ACCESS_MODE" == "nginx" ]]   && echo -e "    Nginx     →  $LOG_DIR/nginx_error.log"
echo ""
line
echo ""
