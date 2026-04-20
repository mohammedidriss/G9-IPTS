#!/bin/bash
# =============================================================================
#  IPTS — Red Hat Linux Installation Script
#  Integrated Payment Transformation System
#
#  Supports : RHEL 8/9 · Rocky Linux 8/9 · AlmaLinux 8/9 · CentOS Stream 8/9
#  Run as   : root or via sudo
#  Usage    : sudo bash install_redhat.sh [OPTIONS]
#
#  Options:
#    --dir   /path/to/install   Installation directory (default: /opt/ipts)
#    --port  5001               Flask application port (default: 5001)
#    --prod                     Production mode: Gunicorn + Nginx + systemd
#    --domain yourdomain.com    Domain name for Nginx + SSL (implies --prod)
#    --no-ollama                Skip Ollama/LLM installation
#    --no-ssl                   Skip Let's Encrypt SSL setup
#
#  Examples:
#    sudo bash install_redhat.sh                          # local dev install
#    sudo bash install_redhat.sh --prod                   # production (no SSL)
#    sudo bash install_redhat.sh --prod --domain ipts.example.com
#
#  What this script does:
#    1.  Validates system (RHEL 8/9, root, disk space)
#    2.  Enables EPEL + CodeReady Builder repos
#    3.  Installs system packages (gcc, openssl, sqlite, tesseract, nginx…)
#    4.  Builds and installs Python 3.12 from source
#    5.  Installs Node.js 20 LTS via NodeSource
#    6.  Installs Ganache globally
#    7.  Installs Ollama + pulls llama3.2 model
#    8.  Creates ipts system user and directory structure
#    9.  Copies project files into place
#    10. Creates Python virtual environment + installs all packages
#    11. Installs Node packages
#    12. Fixes IPTS_DIR paths in restart.sh and run_local.sh
#    13. Syncs frontend template to runtime directory
#    14. Runs first-time setup (trains ML models, deploys contracts, seeds DB)
#    [prod] 15. Creates systemd services (Ganache, Flask/Gunicorn, Ollama)
#    [prod] 16. Configures Nginx reverse proxy with SSE support
#    [prod] 17. Applies SELinux policies
#    [prod] 18. Configures firewalld (HTTP/HTTPS)
#    [prod] 19. Obtains Let's Encrypt SSL certificate (if --domain provided)
#    20. Starts all services and verifies health
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
IPTS_INSTALL_DIR="/opt/ipts"
APP_PORT=5001
GANACHE_PORT=8545
PROD_MODE=false
INSTALL_OLLAMA=true
INSTALL_SSL=false
DOMAIN=""
IPTS_USER="ipts"

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)       IPTS_INSTALL_DIR="$2"; shift 2 ;;
    --port)      APP_PORT="$2";         shift 2 ;;
    --prod)      PROD_MODE=true;        shift ;;
    --domain)    DOMAIN="$2"; PROD_MODE=true; INSTALL_SSL=true; shift 2 ;;
    --no-ollama) INSTALL_OLLAMA=false;  shift ;;
    --no-ssl)    INSTALL_SSL=false;     shift ;;
    *) warn "Unknown argument: $1";     shift ;;
  esac
done

# Derived paths
VENV_DIR="$IPTS_INSTALL_DIR/.venv"
RUNTIME_DIR="$IPTS_INSTALL_DIR/.runtime"
LOG_DIR="$IPTS_INSTALL_DIR/logs"
SCRIPT_SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
echo -e "  ${YELLOW}Red Hat Linux Installation Script — $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""
line
echo -e "  Install dir : ${BOLD}$IPTS_INSTALL_DIR${NC}"
echo -e "  App port    : ${BOLD}$APP_PORT${NC}"
echo -e "  Mode        : ${BOLD}$([ "$PROD_MODE" == "true" ] && echo "Production (Gunicorn + Nginx + systemd)" || echo "Development (Flask direct)")${NC}"
echo -e "  Ollama/LLM  : ${BOLD}$([ "$INSTALL_OLLAMA" == "true" ] && echo "Yes" || echo "No")${NC}"
echo -e "  Domain/SSL  : ${BOLD}$([ -n "$DOMAIN" ] && echo "$DOMAIN" || echo "None (IP access)")${NC}"
echo ""
line

# ── Step 1: System validation ─────────────────────────────────────────────────
hdr "STEP 1 — System Validation"

# Must be root
[[ "$(id -u)" -ne 0 ]] && err "Run as root: sudo bash install_redhat.sh"
ok "Running as root"

# Must be RHEL/Rocky/Alma
if [[ ! -f /etc/redhat-release ]]; then
  err "This script requires a Red Hat-based system (RHEL, Rocky, AlmaLinux)."
fi

DISTRO=$(cat /etc/redhat-release)
RHEL_VER=$(rpm -E '%{rhel}' 2>/dev/null || grep -oP '\d+' /etc/redhat-release | head -1)
ok "Detected: $DISTRO (RHEL $RHEL_VER)"

[[ "$RHEL_VER" -lt 8 ]] && err "RHEL 8 or 9 required. Found RHEL $RHEL_VER."

# Check available disk space (need at least 8 GB)
AVAIL_GB=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
if [[ "$AVAIL_GB" -lt 8 ]]; then
  warn "Low disk space: ${AVAIL_GB}GB available. At least 8 GB recommended."
else
  ok "Disk space: ${AVAIL_GB}GB available"
fi

# Check internet connectivity
if ! curl -sf --max-time 5 https://pypi.org/simple/ &>/dev/null; then
  err "No internet connectivity — cannot download dependencies."
fi
ok "Internet connectivity confirmed"

# ── Step 2: System packages ───────────────────────────────────────────────────
hdr "STEP 2 — System Packages"

info "Enabling EPEL repository..."
dnf install -y epel-release 2>/dev/null || \
  dnf install -y "https://dl.fedoraproject.org/pub/epel/epel-release-latest-${RHEL_VER}.noarch.rpm" \
  || warn "EPEL install had warnings (may already be enabled)"

info "Enabling CodeReady Builder / CRB..."
if command -v crb &>/dev/null; then
  crb enable 2>/dev/null || true
else
  dnf config-manager --set-enabled crb 2>/dev/null || \
  dnf config-manager --set-enabled powertools 2>/dev/null || \
  warn "Could not enable CRB — some packages may be missing"
fi

info "Updating system packages..."
dnf update -y --quiet

info "Installing build tools and system dependencies..."
dnf install -y \
  curl wget git tar unzip bzip2 \
  gcc gcc-c++ make \
  openssl openssl-devel \
  bzip2-devel readline-devel \
  sqlite sqlite-devel \
  libffi-devel zlib-devel xz-devel \
  tesseract tesseract-langpack-eng \
  jq procps-ng lsof \
  2>/dev/null || warn "Some packages may have been skipped (check output above)"

# Install nginx and certbot only in production mode
if [[ "$PROD_MODE" == "true" ]]; then
  info "Installing Nginx, firewalld, certbot (production mode)..."
  dnf install -y nginx firewalld \
    certbot python3-certbot-nginx 2>/dev/null || \
    warn "Some production packages could not be installed"
fi

ok "System packages installed"

# ── Step 3: Python 3.12 ───────────────────────────────────────────────────────
hdr "STEP 3 — Python 3.12"

install_python312() {
  # ── Attempt 1: dnf package (RHEL 9 AppStream — instant) ──────────────────
  info "Attempt 1/3: dnf install python3.12 (pre-built package)..."
  if dnf install -y python3.12 python3.12-devel 2>/dev/null; then
    if command -v python3.12 &>/dev/null; then
      ok "Python 3.12 installed via dnf (pre-built)"
      return 0
    fi
  fi
  warn "dnf package not available — trying next method"

  # ── Attempt 2: IUS / Remi repo (RHEL 8 — pre-built RPM) ─────────────────
  info "Attempt 2/3: IUS/Remi repository (pre-built RPM)..."
  if [[ "$RHEL_VER" -eq 8 ]]; then
    dnf install -y \
      "https://repo.ius.io/ius-release-el8.noarch.rpm" 2>/dev/null || true
    dnf install -y python3.12 python3.12-devel 2>/dev/null || true
  else
    # Try Remi repo for RHEL 9
    dnf install -y \
      "https://rpms.remirepo.net/enterprise/remi-release-${RHEL_VER}.rpm" 2>/dev/null || true
    dnf module reset python312 -y 2>/dev/null || true
    dnf install -y python3.12 python3.12-devel 2>/dev/null || true
  fi

  if command -v python3.12 &>/dev/null; then
    ok "Python 3.12 installed via RPM repository"
    return 0
  fi
  warn "RPM repository not available — falling back to source compilation"

  # ── Attempt 3: Build from source (works everywhere, takes 10–20 min) ─────
  info "Attempt 3/3: Building Python 3.12 from source..."
  echo ""
  echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  ${YELLOW}  Source compilation on a $(nproc)-core machine takes 10–20 min.${NC}"
  echo -e "  ${YELLOW}  Output is shown live below — it is NOT stuck.${NC}"
  echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  PYTHON_VER="3.12.7"
  BUILD_DIR="/tmp/python312_build"
  mkdir -p "$BUILD_DIR"
  cd "$BUILD_DIR"

  info "Downloading Python ${PYTHON_VER} source..."
  wget --progress=bar:force \
    "https://www.python.org/ftp/python/${PYTHON_VER}/Python-${PYTHON_VER}.tgz" \
    -O "Python-${PYTHON_VER}.tgz"
  tar -xzf "Python-${PYTHON_VER}.tgz"
  cd "Python-${PYTHON_VER}"

  info "Configuring build (optimisations enabled)..."
  ./configure \
    --enable-optimizations \
    --with-lto \
    --enable-shared \
    LDFLAGS="-Wl,-rpath /usr/local/lib"

  info "Compiling with $(nproc) cores — please wait..."
  make -j"$(nproc)"

  info "Installing (altinstall — won't replace system python3)..."
  make altinstall

  cd /tmp && rm -rf "$BUILD_DIR"
  ok "Python 3.12 built and installed from source"
  return 0
}

if command -v python3.12 &>/dev/null; then
  ok "Python $(python3.12 --version) already installed"
else
  install_python312
fi

# Verify correct version — 3.13/3.14 break scikit-learn
PY_VER=$(python3.12 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "")
if [[ "$PY_VER" != "3.12" ]]; then
  err "Python 3.12 not found after installation. Check the output above."
fi
ok "Python version verified: $PY_VER"

# ── Step 4: Node.js 20 LTS ────────────────────────────────────────────────────
hdr "STEP 4 — Node.js 20 LTS"

NODE_OK=false
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | grep -oE '[0-9]+' | head -1)
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    ok "Node.js $(node -v) already installed"
    NODE_OK=true
  fi
fi

if [[ "$NODE_OK" == "false" ]]; then
  info "Installing Node.js 20 LTS via NodeSource..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  dnf install -y nodejs
  ok "Node.js $(node -v) installed"
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
    info "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    ok "Ollama installed"
  fi

  # Start Ollama temporarily to pull the model
  if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    info "Starting Ollama server to pull model..."
    ollama serve > /tmp/ollama_install.log 2>&1 &
    OLLAMA_TMP_PID=$!
    sleep 5
  fi

  if ollama list 2>/dev/null | grep -q "llama3.2"; then
    ok "llama3.2 model already downloaded"
  else
    info "Pulling llama3.2 model (~2 GB — this may take several minutes)..."
    ollama pull llama3.2 \
      && ok "llama3.2 model downloaded" \
      || warn "Model pull failed — run 'ollama pull llama3.2' manually"
  fi
else
  warn "Skipping Ollama installation (--no-ollama flag set). AI Support Chat will be unavailable."
fi

# ── Step 7: Create system user and directories ────────────────────────────────
hdr "STEP 7 — System User and Directories"

if ! id "$IPTS_USER" &>/dev/null; then
  info "Creating system user '$IPTS_USER'..."
  useradd -r -s /bin/bash -d "$IPTS_INSTALL_DIR" -m "$IPTS_USER"
  ok "User '$IPTS_USER' created"
else
  ok "User '$IPTS_USER' already exists"
fi

info "Creating directory structure..."
mkdir -p "$IPTS_INSTALL_DIR" "$LOG_DIR" "$RUNTIME_DIR" "$RUNTIME_DIR/templates" \
         "$IPTS_INSTALL_DIR/models" "$IPTS_INSTALL_DIR/templates" \
         "$IPTS_INSTALL_DIR/docs" "$IPTS_INSTALL_DIR/src"
ok "Directories created under $IPTS_INSTALL_DIR"

# ── Step 8: Copy project files ────────────────────────────────────────────────
hdr "STEP 8 — Copy Project Files"

info "Copying project files from $SCRIPT_SOURCE_DIR to $IPTS_INSTALL_DIR ..."

# Copy all project files, excluding venv, node_modules, logs, cache, git
rsync -a \
  --exclude='.venv/' \
  --exclude='node_modules/' \
  --exclude='logs/' \
  --exclude='__pycache__/' \
  --exclude='.runtime/__pycache__/' \
  --exclude='.git/' \
  --exclude='*.pyc' \
  "$SCRIPT_SOURCE_DIR/" "$IPTS_INSTALL_DIR/" \
  2>/dev/null || {
    # Fallback to cp if rsync is not available
    warn "rsync not available, using cp..."
    cp -r "$SCRIPT_SOURCE_DIR/." "$IPTS_INSTALL_DIR/"
    rm -rf "$IPTS_INSTALL_DIR/.venv" \
           "$IPTS_INSTALL_DIR/node_modules" \
           "$IPTS_INSTALL_DIR/logs" 2>/dev/null || true
  }

ok "Project files copied to $IPTS_INSTALL_DIR"

# ── Step 9: Python virtual environment ───────────────────────────────────────
hdr "STEP 9 — Python Virtual Environment"

info "Creating virtual environment at $VENV_DIR ..."
python3.12 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip wheel setuptools --quiet
ok "Virtual environment created: pip $("$VENV_DIR/bin/pip" --version | awk '{print $2}')"

info "Installing Python packages (this takes 3–5 minutes)..."
"$VENV_DIR/bin/pip" install -r "$IPTS_INSTALL_DIR/requirements.txt" --quiet
ok "All Python packages installed"

# Verify critical imports
info "Verifying critical imports..."
"$VENV_DIR/bin/python3" -c \
  "import flask, jwt, sklearn, xgboost, shap, web3, networkx, pandas" \
  && ok "All critical Python imports verified" \
  || err "One or more imports failed — check the output above"

# ── Step 10: Node packages ────────────────────────────────────────────────────
hdr "STEP 10 — Node.js Packages"

cd "$IPTS_INSTALL_DIR"
if [[ -f "package.json" ]]; then
  info "Installing Node packages..."
  npm install --silent
  ok "Node packages installed"
else
  warn "package.json not found — skipping npm install"
fi

# ── Step 11: Fix paths ────────────────────────────────────────────────────────
hdr "STEP 11 — Updating Project Paths"

for SCRIPT in restart.sh run_local.sh; do
  if [[ -f "$IPTS_INSTALL_DIR/$SCRIPT" ]]; then
    # Replace any existing IPTS_DIR value with the actual install path
    sed -i "s|IPTS_DIR=\"/Users/[^\"]*\"|IPTS_DIR=\"$IPTS_INSTALL_DIR\"|g" \
           "$IPTS_INSTALL_DIR/$SCRIPT"
    sed -i "s|IPTS_DIR=\"/opt/ipts\"|IPTS_DIR=\"$IPTS_INSTALL_DIR\"|g" \
           "$IPTS_INSTALL_DIR/$SCRIPT"
    ok "$SCRIPT — IPTS_DIR updated to $IPTS_INSTALL_DIR"
  fi
done

chmod +x "$IPTS_INSTALL_DIR/restart.sh" \
         "$IPTS_INSTALL_DIR/run_local.sh" 2>/dev/null || true

# ── Step 12: Sync frontend template ──────────────────────────────────────────
hdr "STEP 12 — Frontend Template Sync"

if [[ -f "$IPTS_INSTALL_DIR/templates/ipts_frontend.html" ]]; then
  cp "$IPTS_INSTALL_DIR/templates/ipts_frontend.html" \
     "$RUNTIME_DIR/templates/index.html"
  ok "Frontend template synced to runtime"
else
  warn "ipts_frontend.html not found — UI may not load correctly"
fi

# ── Step 13: First-time setup ─────────────────────────────────────────────────
hdr "STEP 13 — First-Time Setup (ML Training + Blockchain)"

echo ""
info "Training 7 ML models and deploying 7 smart contracts to Ganache."
info "This runs once and takes 5–10 minutes."
echo ""

# Kill anything already on our ports
for PORT_NUM in $APP_PORT $GANACHE_PORT; do
  PIDS=$(lsof -ti:$PORT_NUM 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    info "Cleared port $PORT_NUM"
  fi
done
sleep 2

cd "$IPTS_INSTALL_DIR"

# Start Ganache
info "Starting Ganache..."
"$(which ganache)" \
  --port "$GANACHE_PORT" \
  --accounts 10 \
  --deterministic \
  --quiet \
  > "$LOG_DIR/ganache.log" 2>&1 &
sleep 3

# Run the Flask app once to initialise DB + train models
info "Starting Flask (first run — training models)..."
"$VENV_DIR/bin/python3" "$RUNTIME_DIR/app.py" \
  > "$LOG_DIR/flask_stdout.log" \
  2> "$LOG_DIR/flask_stderr.log" &
FLASK_PID=$!

# Wait for Flask health endpoint (up to 4 minutes)
echo -n "  Waiting for Flask to be ready"
READY=false
for i in $(seq 1 48); do
  sleep 5
  if curl -sf "http://127.0.0.1:$APP_PORT/api/health" &>/dev/null; then
    READY=true
    break
  fi
  printf "."
done
echo ""

if [[ "$READY" == "true" ]]; then
  ok "Flask API is ready on port $APP_PORT"
  # Stop temporary Flask process — systemd/restart.sh will manage it from here
  if [[ "$PROD_MODE" == "true" ]]; then
    kill $FLASK_PID 2>/dev/null || true
    PIDS=$(lsof -ti:$APP_PORT 2>/dev/null || true)
    [[ -n "$PIDS" ]] && echo "$PIDS" | xargs kill -9 2>/dev/null || true
    info "Flask stopped — will be managed by systemd in production mode"
  fi
else
  warn "Flask did not respond in time."
  warn "Check $LOG_DIR/flask_stderr.log for errors."
  tail -20 "$LOG_DIR/flask_stderr.log" 2>/dev/null | sed 's/^/  /' || true
fi

# Set ownership
chown -R "$IPTS_USER:$IPTS_USER" "$IPTS_INSTALL_DIR" "$LOG_DIR" 2>/dev/null || true

# ── Step 14: Production systemd services (--prod only) ────────────────────────
if [[ "$PROD_MODE" == "true" ]]; then

  hdr "STEP 14 — systemd Services (Production)"

  info "Creating Ganache service..."
  cat > /etc/systemd/system/ipts-ganache.service << EOF
[Unit]
Description=IPTS Ganache Ethereum Node
After=network.target

[Service]
Type=simple
User=$IPTS_USER
WorkingDirectory=$IPTS_INSTALL_DIR
ExecStart=$(which ganache) --port $GANACHE_PORT --deterministic --accounts 10 --defaultBalanceEther 10000 --networkId 1337 --quiet
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/ganache.log
StandardError=append:$LOG_DIR/ganache.log

[Install]
WantedBy=multi-user.target
EOF

  info "Creating IPTS Flask/Gunicorn service..."
  cat > /etc/systemd/system/ipts.service << EOF
[Unit]
Description=IPTS Integrated Payment Transformation System
After=network.target ipts-ganache.service
Requires=ipts-ganache.service

[Service]
Type=simple
User=$IPTS_USER
WorkingDirectory=$RUNTIME_DIR
Environment="PATH=$VENV_DIR/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
Environment="FLASK_ENV=production"
ExecStartPre=/bin/sleep 5
ExecStart=$VENV_DIR/bin/gunicorn \
  --workers 3 \
  --worker-class gthread \
  --threads 4 \
  --bind 127.0.0.1:$APP_PORT \
  --timeout 120 \
  --access-logfile $LOG_DIR/access.log \
  --error-logfile $LOG_DIR/error.log \
  --log-level info \
  app:app
Restart=always
RestartSec=10
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

  if [[ "$INSTALL_OLLAMA" == "true" ]]; then
    info "Creating Ollama service..."
    cat > /etc/systemd/system/ipts-ollama.service << EOF
[Unit]
Description=Ollama LLM Server for IPTS
After=network.target

[Service]
Type=simple
User=$IPTS_USER
ExecStart=$(which ollama) serve
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/ollama.log
StandardError=append:$LOG_DIR/ollama.log

[Install]
WantedBy=multi-user.target
EOF
  fi

  systemctl daemon-reload
  systemctl enable ipts-ganache ipts
  [[ "$INSTALL_OLLAMA" == "true" ]] && systemctl enable ipts-ollama || true
  ok "systemd services created and enabled"

  # ── Step 15: Nginx ─────────────────────────────────────────────────────────
  hdr "STEP 15 — Nginx Reverse Proxy"

  SERVER_NAME="${DOMAIN:-_}"
  NGINX_CONF="/etc/nginx/conf.d/ipts.conf"

  cat > "$NGINX_CONF" << EOF
# IPTS Nginx Reverse Proxy — auto-generated by install_redhat.sh

upstream ipts_backend {
    server 127.0.0.1:$APP_PORT;
    keepalive 32;
}

server {
    listen 80;
    server_name $SERVER_NAME;

    # Security headers
    add_header X-Frame-Options        "SAMEORIGIN"  always;
    add_header X-Content-Type-Options "nosniff"     always;
    add_header X-XSS-Protection       "1; mode=block" always;
    add_header Referrer-Policy        "strict-origin" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    client_max_body_size 16M;

    # SSE endpoint — disable buffering for real-time events
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
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    # Main application
    location / {
        proxy_pass         http://ipts_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    # Health check (unauthenticated)
    location /api/health {
        proxy_pass http://ipts_backend;
        access_log off;
    }

    access_log /var/log/nginx/ipts_access.log;
    error_log  /var/log/nginx/ipts_error.log;
}
EOF

  nginx -t && ok "Nginx config valid" || warn "Nginx config has errors — check: nginx -t"

  # ── Step 16: SELinux ───────────────────────────────────────────────────────
  hdr "STEP 16 — SELinux"

  SELINUX_STATUS=$(getenforce 2>/dev/null || echo "Disabled")
  info "SELinux: $SELINUX_STATUS"

  if [[ "$SELINUX_STATUS" == "Enforcing" || "$SELINUX_STATUS" == "Permissive" ]]; then
    setsebool -P httpd_can_network_connect 1
    setsebool -P httpd_can_network_relay  1
    chcon -Rt httpd_log_t "$LOG_DIR" 2>/dev/null || true
    if command -v semanage &>/dev/null; then
      semanage port -a -t http_port_t -p tcp "$APP_PORT" 2>/dev/null || \
      semanage port -m -t http_port_t -p tcp "$APP_PORT" 2>/dev/null || true
    else
      warn "semanage not found — install policycoreutils-python-utils if needed"
    fi
    ok "SELinux policies applied"
  else
    info "SELinux disabled — skipping"
  fi

  # ── Step 17: Firewall ──────────────────────────────────────────────────────
  hdr "STEP 17 — Firewall"

  systemctl enable --now firewalld
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  [[ "$INSTALL_OLLAMA" == "true" ]] && \
    firewall-cmd --permanent --add-port=11434/tcp || true
  firewall-cmd --reload
  ok "Firewall: HTTP and HTTPS open"

  # ── Step 18: SSL (Let's Encrypt) ──────────────────────────────────────────
  if [[ "$INSTALL_SSL" == "true" && -n "$DOMAIN" ]]; then
    hdr "STEP 18 — SSL Certificate (Let's Encrypt)"
    info "Obtaining certificate for $DOMAIN ..."
    certbot --nginx \
      -d "$DOMAIN" -d "www.$DOMAIN" \
      --non-interactive --agree-tos \
      --email "admin@$DOMAIN" \
      --redirect \
      && ok "SSL certificate installed for $DOMAIN" \
      || warn "certbot failed — run manually: certbot --nginx -d $DOMAIN"

    # Enable auto-renewal
    systemctl enable --now certbot-renew.timer 2>/dev/null || \
      (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
    ok "SSL auto-renewal configured"
  else
    info "Skipping SSL — provide --domain yourdomain.com to enable"
  fi

  # ── Start production services ──────────────────────────────────────────────
  hdr "Starting Production Services"

  systemctl start ipts-ganache
  sleep 3
  ok "Ganache started"

  systemctl start ipts
  sleep 5
  ok "IPTS Flask/Gunicorn started"

  [[ "$INSTALL_OLLAMA" == "true" ]] && { systemctl start ipts-ollama; ok "Ollama started"; } || true

  systemctl enable --now nginx
  ok "Nginx started"

fi  # end PROD_MODE

# ── Step 19: Verification ─────────────────────────────────────────────────────
hdr "$([ "$PROD_MODE" == "true" ] && echo "STEP 19" || echo "STEP 14") — Verification"

echo ""

printf "  %-35s" "Flask API (port $APP_PORT):"
if lsof -ti:$APP_PORT &>/dev/null 2>&1; then
  echo -e "${GREEN}RUNNING${NC}"
else
  echo -e "${RED}NOT RUNNING${NC}"
fi

printf "  %-35s" "Ganache blockchain (port $GANACHE_PORT):"
if lsof -ti:$GANACHE_PORT &>/dev/null 2>&1; then
  echo -e "${GREEN}RUNNING${NC}"
else
  echo -e "${YELLOW}NOT RUNNING${NC}"
fi

if [[ "$INSTALL_OLLAMA" == "true" ]]; then
  printf "  %-35s" "Ollama AI (port 11434):"
  if curl -sf http://localhost:11434/api/tags &>/dev/null; then
    echo -e "${GREEN}RUNNING${NC}"
  else
    echo -e "${YELLOW}NOT RUNNING${NC}"
  fi
fi

printf "  %-35s" "Health check (/api/health):"
HEALTH=$(curl -sf "http://127.0.0.1:$APP_PORT/api/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status"'; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL — check $LOG_DIR/flask_stderr.log${NC}"
fi

if [[ "$PROD_MODE" == "true" ]]; then
  printf "  %-35s" "Nginx proxy (port 80):"
  if curl -sf "http://localhost/api/health" &>/dev/null; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${YELLOW}CHECK NGINX${NC}"
  fi
fi

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
line
echo ""
echo -e "  ${BOLD}${GREEN}Installation complete!${NC}"
echo ""

if [[ "$PROD_MODE" == "true" ]]; then
  if [[ -n "$DOMAIN" && "$INSTALL_SSL" == "true" ]]; then
    echo -e "  ${BOLD}Open in browser:${NC}   https://$DOMAIN"
  else
    SERVER_IP=$(curl -sf --max-time 3 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    echo -e "  ${BOLD}Open in browser:${NC}   http://$SERVER_IP"
  fi
else
  echo -e "  ${BOLD}Open in browser:${NC}   http://127.0.0.1:$APP_PORT"
fi

echo ""
echo -e "  ${BOLD}Login credentials:${NC}"
echo -e "    Admin       →  mohamad / Mohamad@2026!"
echo -e "    Operator    →  rohit   / Rohit@2026!"
echo -e "    Compliance  →  walid   / Walid@2026!"
echo -e "    Client      →  sara    / Sara@2026!"
echo ""

if [[ "$PROD_MODE" == "true" ]]; then
  echo -e "  ${BOLD}Service management:${NC}"
  echo -e "    systemctl status  ipts           # App status"
  echo -e "    systemctl restart ipts           # Restart app"
  echo -e "    systemctl status  ipts-ganache   # Blockchain status"
  echo -e "    journalctl -u ipts -f            # Live app logs"
  echo ""
else
  echo -e "  ${BOLD}To restart IPTS after rebooting:${NC}"
  echo -e "    cd $IPTS_INSTALL_DIR && bash restart.sh"
  echo ""
fi

echo -e "  ${BOLD}Log files:${NC}"
echo -e "    Flask      →  $LOG_DIR/flask_stderr.log"
echo -e "    Ganache    →  $LOG_DIR/ganache.log"
[[ "$INSTALL_OLLAMA" == "true" ]] && \
  echo -e "    Ollama     →  $LOG_DIR/ollama.log" || true
echo ""
echo -e "  ${BOLD}Install directory:${NC}  $IPTS_INSTALL_DIR"
echo ""
line
echo ""
