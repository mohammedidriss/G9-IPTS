#!/bin/bash
# =============================================================================
# IPTS — Red Hat Enterprise Linux Deployment Script
# Supports: RHEL 8/9, Rocky Linux 8/9, AlmaLinux 8/9
# Run as root or with sudo privileges
# Usage: sudo bash deploy_rhel.sh [--domain yourdomain.com] [--port 5000]
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
header()  { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; \
            echo -e "${CYAN}  $*${NC}"; \
            echo -e "${CYAN}══════════════════════════════════════════${NC}"; }

# ── Parse arguments ───────────────────────────────────────────────────────────
DOMAIN=""
PORT=5000
INSTALL_OLLAMA=false
INSTALL_SSL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain)   DOMAIN="$2";       INSTALL_SSL=true; shift 2 ;;
    --port)     PORT="$2";         shift 2 ;;
    --ollama)   INSTALL_OLLAMA=true; shift ;;
    --no-ssl)   INSTALL_SSL=false; shift ;;
    *) warn "Unknown argument: $1"; shift ;;
  esac
done

IPTS_DIR="/opt/ipts"
IPTS_USER="ipts"
VENV_DIR="$IPTS_DIR/.venv"
LOG_DIR="/var/log/ipts"
RUNTIME_DIR="$IPTS_DIR/.runtime"

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e "${CYAN}"
cat << 'EOF'
  ██╗██████╗ ████████╗███████╗
  ██║██╔══██╗╚══██╔══╝██╔════╝
  ██║██████╔╝   ██║   ███████╗
  ██║██╔═══╝    ██║   ╚════██║
  ██║██║        ██║   ███████║
  ╚═╝╚═╝        ╚═╝   ╚══════╝
  Integrated Payment Transformation System
  Red Hat Linux Deployment — v6.0
EOF
echo -e "${NC}"

[[ $(id -u) -ne 0 ]] && error "Please run as root: sudo bash deploy_rhel.sh"

# ── Detect RHEL version ───────────────────────────────────────────────────────
header "Phase 1 · System Detection"
if [[ -f /etc/redhat-release ]]; then
  RHEL_VER=$(rpm -E '%{rhel}' 2>/dev/null || grep -oP '\d+' /etc/redhat-release | head -1)
  DISTRO=$(cat /etc/redhat-release)
  info "Detected: $DISTRO (RHEL $RHEL_VER)"
else
  error "Not a Red Hat-based system. Exiting."
fi

[[ "$RHEL_VER" -lt 8 ]] && error "RHEL 8 or 9 required. Found RHEL $RHEL_VER"

# ── Phase 2: System packages ──────────────────────────────────────────────────
header "Phase 2 · System Packages (dnf)"

info "Enabling EPEL and CodeReady Builder repos..."
dnf install -y epel-release 2>/dev/null || \
  dnf install -y "https://dl.fedoraproject.org/pub/epel/epel-release-latest-${RHEL_VER}.noarch.rpm"

# Enable CRB (CodeReady Builder) — needed for some devel packages
if command -v crb &>/dev/null; then
  crb enable
else
  dnf config-manager --set-enabled crb 2>/dev/null || \
  dnf config-manager --set-enabled powertools 2>/dev/null || true
fi

info "Installing system dependencies..."
dnf update -y
dnf install -y \
  curl wget git tar unzip \
  gcc gcc-c++ make \
  openssl openssl-devel \
  bzip2 bzip2-devel \
  readline-devel \
  sqlite sqlite-devel \
  libffi-devel \
  zlib-devel \
  xz-devel \
  nginx \
  firewalld \
  certbot python3-certbot-nginx \
  tesseract tesseract-langpack-eng \
  supervisor \
  jq

success "System packages installed"

# ── Phase 3: Python 3.12 ──────────────────────────────────────────────────────
header "Phase 3 · Python 3.12"

if ! command -v python3.12 &>/dev/null; then
  info "Python 3.12 not found — building from source..."
  cd /tmp
  PYTHON_VER="3.12.7"
  wget -q "https://www.python.org/ftp/python/${PYTHON_VER}/Python-${PYTHON_VER}.tgz"
  tar -xzf "Python-${PYTHON_VER}.tgz"
  cd "Python-${PYTHON_VER}"
  ./configure --enable-optimizations --with-lto --enable-shared \
    LDFLAGS="-Wl,-rpath /usr/local/lib" > /dev/null 2>&1
  make -j"$(nproc)" > /dev/null 2>&1
  make altinstall > /dev/null 2>&1
  cd /tmp && rm -rf "Python-${PYTHON_VER}" "Python-${PYTHON_VER}.tgz"
  info "Python 3.12 built and installed"
else
  PYVER=$(python3.12 --version)
  info "Found $PYVER"
fi
success "Python 3.12 ready"

# ── Phase 4: Node.js 20 LTS ───────────────────────────────────────────────────
header "Phase 4 · Node.js 20 LTS"

if ! command -v node &>/dev/null || [[ $(node -v | grep -oP '\d+' | head -1) -lt 18 ]]; then
  info "Installing Node.js 20 LTS via NodeSource..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
fi
success "Node.js $(node -v) ready"

# ── Phase 5: Ganache ──────────────────────────────────────────────────────────
header "Phase 5 · Ganache (Local Ethereum)"

if ! command -v ganache &>/dev/null; then
  info "Installing Ganache CLI globally..."
  npm install -g ganache@latest
fi
success "Ganache $(ganache --version 2>/dev/null | head -1) ready"

# ── Phase 6: Ollama (optional) ────────────────────────────────────────────────
if [[ "$INSTALL_OLLAMA" == "true" ]]; then
  header "Phase 6 · Ollama LLM (llama3.2)"
  if ! command -v ollama &>/dev/null; then
    info "Installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
  fi
  info "Pulling llama3.2:3b model (this may take a few minutes)..."
  ollama pull llama3.2:3b || warn "Could not pull model — run 'ollama pull llama3.2:3b' manually"
  success "Ollama installed"
else
  info "Skipping Ollama (use --ollama flag to install)"
fi

# ── Phase 7: Application setup ────────────────────────────────────────────────
header "Phase 7 · Application Setup"

info "Creating IPTS system user..."
if ! id "$IPTS_USER" &>/dev/null; then
  useradd -r -s /bin/bash -d "$IPTS_DIR" -m "$IPTS_USER"
fi

info "Creating directory structure..."
mkdir -p "$IPTS_DIR" "$LOG_DIR" "$RUNTIME_DIR"

# Copy application files
info "Copying application files to $IPTS_DIR..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy main files
cp "$SCRIPT_DIR/src/IPTS_deploy.py"          "$IPTS_DIR/"
cp "$SCRIPT_DIR/templates/ipts_frontend.html" "$IPTS_DIR/"

# Create Python virtual environment
info "Creating Python virtual environment..."
python3.12 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip wheel setuptools -q

info "Installing Python dependencies (this takes 3-5 minutes)..."
"$VENV_DIR/bin/pip" install -q \
  flask==3.0.3 \
  flask-cors==4.0.1 \
  pyjwt==2.8.0 \
  werkzeug==3.0.3 \
  gunicorn==22.0.0 \
  web3==6.15.1 \
  py-solc-x==2.1.1 \
  scikit-learn==1.4.2 \
  xgboost==2.0.3 \
  shap==0.44.1 \
  numpy==1.26.4 \
  pandas==2.2.2 \
  imbalanced-learn==0.12.3 \
  networkx==3.2.1 \
  joblib==1.4.2 \
  cryptography==42.0.8 \
  requests==2.32.3 \
  pillow==10.4.0 \
  pytesseract==0.3.13 \
  qrcode==7.4.2

success "Python dependencies installed"

# ── Phase 8: Generate app.py ──────────────────────────────────────────────────
header "Phase 8 · Deploy Flask Application"

info "Running IPTS_deploy.py to generate app.py..."
cat > /tmp/run_deploy.py << PYEOF
import subprocess, sys, os

os.chdir("$IPTS_DIR")
env = os.environ.copy()
env["IPTS_PORT"] = "$PORT"
env["IPTS_HOST"] = "0.0.0.0"
env["PYTHONPATH"] = "$IPTS_DIR"

result = subprocess.run(
    ["$VENV_DIR/bin/python3", "IPTS_deploy.py",
     "--port", "$PORT", "--host", "0.0.0.0"],
    capture_output=True, text=True, env=env, timeout=300
)
print(result.stdout[-3000:] if result.stdout else "")
if result.stderr:
    print("STDERR:", result.stderr[-1000:])
sys.exit(result.returncode)
PYEOF

# Run deployment (generates .runtime/app.py + trains ML models)
cd "$IPTS_DIR"
"$VENV_DIR/bin/python3" IPTS_deploy.py --port "$PORT" --host 0.0.0.0 &
DEPLOY_PID=$!
sleep 90  # Wait for training + startup

# Check if Flask started
if curl -sf "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then
  success "Flask app is running on port $PORT"
  kill $DEPLOY_PID 2>/dev/null || true
else
  warn "Flask did not start in time — will be started by systemd"
  kill $DEPLOY_PID 2>/dev/null || true
fi

# Fix permissions
chown -R "$IPTS_USER:$IPTS_USER" "$IPTS_DIR" "$LOG_DIR"

# ── Phase 9: Gunicorn + systemd ───────────────────────────────────────────────
header "Phase 9 · Gunicorn + systemd Service"

info "Creating Ganache systemd service..."
cat > /etc/systemd/system/ipts-ganache.service << EOF
[Unit]
Description=IPTS Ganache Ethereum Node
After=network.target

[Service]
Type=simple
User=$IPTS_USER
WorkingDirectory=$IPTS_DIR
ExecStart=$(which ganache) --port 8545 --deterministic --accounts 10 \
  --defaultBalanceEther 10000 --networkId 1337 --quiet
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/ganache.log
StandardError=append:$LOG_DIR/ganache.log

[Install]
WantedBy=multi-user.target
EOF

info "Creating IPTS Flask/Gunicorn systemd service..."
cat > /etc/systemd/system/ipts.service << EOF
[Unit]
Description=IPTS — Integrated Payment Transformation System
After=network.target ipts-ganache.service
Requires=ipts-ganache.service

[Service]
Type=simple
User=$IPTS_USER
WorkingDirectory=$IPTS_DIR/.runtime
Environment="PATH=$VENV_DIR/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONUNBUFFERED=1"
Environment="FLASK_ENV=production"
ExecStartPre=/bin/sleep 5
ExecStart=$VENV_DIR/bin/gunicorn \
  --workers 3 \
  --worker-class gthread \
  --threads 4 \
  --bind 127.0.0.1:$PORT \
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
  info "Creating Ollama systemd service..."
  cat > /etc/systemd/system/ipts-ollama.service << EOF
[Unit]
Description=Ollama LLM Server (IPTS)
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
[[ "$INSTALL_OLLAMA" == "true" ]] && systemctl enable ipts-ollama

success "systemd services created and enabled"

# ── Phase 10: Nginx ───────────────────────────────────────────────────────────
header "Phase 10 · Nginx Reverse Proxy"

NGINX_CONF="/etc/nginx/conf.d/ipts.conf"

if [[ -n "$DOMAIN" ]]; then
  SERVER_NAME="$DOMAIN www.$DOMAIN"
else
  SERVER_NAME="_"
fi

info "Writing nginx config to $NGINX_CONF..."
cat > "$NGINX_CONF" << EOF
# IPTS — Nginx reverse proxy configuration
# Auto-generated by deploy_rhel.sh

upstream ipts_backend {
    server 127.0.0.1:$PORT;
    keepalive 32;
}

# Redirect HTTP → HTTPS (active after SSL setup)
# server {
#     listen 80;
#     server_name $SERVER_NAME;
#     return 301 https://\$host\$request_uri;
# }

server {
    listen 80;
    server_name $SERVER_NAME;

    # Security headers
    add_header X-Frame-Options           "SAMEORIGIN"           always;
    add_header X-Content-Type-Options    "nosniff"              always;
    add_header X-XSS-Protection         "1; mode=block"        always;
    add_header Referrer-Policy           "strict-origin"        always;
    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    # Client limits
    client_max_body_size 16M;

    # SSE — disable buffering so events arrive in real-time
    location /api/stream {
        proxy_pass         http://ipts_backend;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";
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

    # Health check endpoint (no auth needed)
    location /api/health {
        proxy_pass http://ipts_backend;
        access_log off;
    }

    # Logging
    access_log /var/log/nginx/ipts_access.log;
    error_log  /var/log/nginx/ipts_error.log;
}
EOF

# Validate nginx config
nginx -t && success "Nginx config valid"

# ── Phase 11: SELinux ─────────────────────────────────────────────────────────
header "Phase 11 · SELinux Configuration"

SELINUX_STATUS=$(getenforce 2>/dev/null || echo "Disabled")
info "SELinux status: $SELINUX_STATUS"

if [[ "$SELINUX_STATUS" == "Enforcing" || "$SELINUX_STATUS" == "Permissive" ]]; then
  info "Applying SELinux policies for nginx → Flask proxy..."
  setsebool -P httpd_can_network_connect 1
  setsebool -P httpd_can_network_relay  1

  # Allow nginx to read log files
  chcon -Rt httpd_log_t "$LOG_DIR" 2>/dev/null || true

  # Allow Flask process to bind to the port
  if command -v semanage &>/dev/null; then
    semanage port -a -t http_port_t -p tcp "$PORT" 2>/dev/null || \
    semanage port -m -t http_port_t -p tcp "$PORT" 2>/dev/null || true
  else
    warn "semanage not found — install policycoreutils-python-utils if needed"
  fi
  success "SELinux policies applied"
else
  info "SELinux disabled — skipping"
fi

# ── Phase 12: Firewall ────────────────────────────────────────────────────────
header "Phase 12 · Firewall (firewalld)"

systemctl enable --now firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
[[ "$INSTALL_OLLAMA" == "true" ]] && \
  firewall-cmd --permanent --add-port=11434/tcp
firewall-cmd --reload
success "Firewall rules applied (HTTP/HTTPS open)"

# ── Phase 13: SSL with Let's Encrypt ─────────────────────────────────────────
if [[ "$INSTALL_SSL" == "true" && -n "$DOMAIN" ]]; then
  header "Phase 13 · SSL Certificate (Let's Encrypt)"
  info "Obtaining SSL certificate for $DOMAIN..."
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
    --non-interactive --agree-tos \
    --email "admin@$DOMAIN" \
    --redirect || warn "SSL certificate failed — run certbot manually later"

  # Auto-renew
  systemctl enable --now certbot-renew.timer 2>/dev/null || \
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
  success "SSL certificate installed + auto-renewal configured"
else
  info "Skipping SSL (provide --domain yourdomain.com to enable)"
fi

# ── Phase 14: Start services ──────────────────────────────────────────────────
header "Phase 14 · Start Services"

info "Starting Ganache..."
systemctl start ipts-ganache
sleep 3

info "Starting IPTS Flask app..."
systemctl start ipts
sleep 5

[[ "$INSTALL_OLLAMA" == "true" ]] && systemctl start ipts-ollama

info "Starting Nginx..."
systemctl enable --now nginx

# ── Phase 15: Verify ──────────────────────────────────────────────────────────
header "Phase 15 · Verification"

sleep 5
if curl -sf "http://127.0.0.1:$PORT/api/health" | grep -q '"status":"healthy"'; then
  success "Flask API is healthy on port $PORT"
else
  warn "Flask API not responding yet — check: journalctl -u ipts -f"
fi

if curl -sf "http://localhost/api/health" | grep -q '"status":"healthy"'; then
  success "Nginx proxy is working"
else
  warn "Nginx proxy not responding — check: nginx -t && systemctl status nginx"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           IPTS Deployment Complete                   ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
if [[ -n "$DOMAIN" && "$INSTALL_SSL" == "true" ]]; then
  echo -e "  🌐 URL:      ${GREEN}https://$DOMAIN${NC}"
else
  SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
  echo -e "  🌐 URL:      ${GREEN}http://$SERVER_IP${NC}"
fi
echo ""
echo -e "  📁 App dir:  $IPTS_DIR"
echo -e "  📋 Logs:     $LOG_DIR"
echo ""
echo -e "  ${YELLOW}Service commands:${NC}"
echo -e "  systemctl status ipts           # Flask app status"
echo -e "  systemctl status ipts-ganache   # Blockchain status"
echo -e "  journalctl -u ipts -f           # Live logs"
echo -e "  systemctl restart ipts          # Restart app"
echo ""
echo -e "  ${YELLOW}Default login credentials:${NC}"
echo -e "  Admin:      mohamad / Mohamad@2026!"
echo -e "  Supervisor: walid   / Walid@2026!"
echo -e "  User:       rohit   / Rohit@2026!"
echo ""
