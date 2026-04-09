#!/bin/bash
# ============================================================
# IPTS Local Runner for macOS
# Run from: /Users/mohamadidriss/Projects/IPTS/
# ============================================================

set -e

IPTS_DIR="/Users/mohamadidriss/Projects/IPTS"
RUNTIME_DIR="$IPTS_DIR/.runtime"
FRONTEND_HTML="$IPTS_DIR/templates/ipts_frontend.html"

echo "============================================================"
echo "  IPTS - Local Deployment for macOS"
echo "============================================================"

# --- Step 1: Kill existing processes ---
echo ""
echo "[1/6] Cleaning up old processes..."
for port in 8545 5001; do
    pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
        echo "  Killed processes on port $port"
    else
        echo "  Port $port is free"
    fi
done

# --- Step 2: Create Python virtual environment ---
echo ""
echo "[2/6] Setting up Python environment..."
VENV_DIR="$IPTS_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    python3.12 -m venv "$VENV_DIR"
    echo "  Created virtual environment"
else
    echo "  Virtual environment exists"
fi
source "$VENV_DIR/bin/activate"

echo "  Installing Python dependencies..."
pip install -q \
    web3==6.15.1 \
    py-solc-x==2.0.3 \
    flask==3.0.0 \
    pyjwt==2.8.0 \
    scikit-learn==1.4.0 \
    networkx==3.2.1 \
    cryptography==42.0.2 \
    joblib==1.3.2 \
    imbalanced-learn==0.12.0 \
    xgboost==2.0.3 \
    shap==0.44.0 \
    numpy \
    pandas

echo "  Python dependencies installed"

# --- Step 3: Install Ganache ---
echo ""
echo "[3/6] Checking Ganache..."
if command -v ganache &>/dev/null; then
    echo "  Ganache already installed"
else
    echo "  Installing Ganache..."
    npm install -g ganache
fi

# --- Step 4: Create local deploy script ---
echo ""
echo "[4/6] Patching deploy script for local execution..."

# Patch all /content/ipts paths to local runtime dir
# Patch port 5000 to 5001 (macOS uses 5000 for AirPlay)
# Patch Phase 5 to use the correct frontend path
sed \
    -e "s|/content/ipts|$RUNTIME_DIR|g" \
    -e "s|/content/|$RUNTIME_DIR/|g" \
    -e 's|port=5000|port=5001|g' \
    -e 's|port 5000|port 5001|g' \
    -e 's|:5000|:5001|g' \
    -e 's|"--port", "5000"|"--port", "5001"|g' \
    "$IPTS_DIR/src/ipts_colab_deploy.py" > "/tmp/ipts_local_deploy.py"

# Now patch Phase 5 to hardcode the correct frontend HTML path
# Replace the entire frontend_src line with the absolute path to our HTML
sed -i '' "s|frontend_src = .*|frontend_src = \"$FRONTEND_HTML\"|" "/tmp/ipts_local_deploy.py"

echo "  Patched script created at /tmp/ipts_local_deploy.py"

# --- Step 5: Run ---
echo ""
echo "[5/6] Starting IPTS..."
echo "============================================================"
echo ""
echo "  After startup, open: http://127.0.0.1:5001"
echo ""

cd /tmp
"$VENV_DIR/bin/python3" "/tmp/ipts_local_deploy.py"
