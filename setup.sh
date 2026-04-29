#!/usr/bin/env bash
# ============================================================
# IPTS — One-command setup for a fresh machine
# Usage: bash setup.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          IPTS — Enterprise Settlement Platform           ║"
echo "║                   Setup & Deploy                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Python check ───────────────────────────────────────────
echo "[1/5] Checking Python..."
if ! command -v python3 &>/dev/null; then
    echo "  ✗ Python 3 not found. Install Python 3.10+ and retry."
    exit 1
fi
PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "  ✓ Python $PYTHON_VER found"

# ── 2. Virtual environment ────────────────────────────────────
echo "[2/5] Setting up virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "  ✓ .venv created"
else
    echo "  ✓ .venv already exists"
fi

source .venv/bin/activate

# ── 3. Install dependencies ───────────────────────────────────
echo "[3/5] Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "  ✓ All packages installed"

# ── 4. Train ML models ────────────────────────────────────────
echo "[4/5] Training ML models on real data..."
echo "      (downloads 144 MB dataset on first run — takes ~90 seconds)"
cd .runtime
python3 train_on_real_data.py
cd ..
echo "  ✓ Models trained and saved to .runtime/models/"

# ── 5. Start server ───────────────────────────────────────────
echo "[5/5] Starting IPTS server..."
echo ""
echo "  ✓ Setup complete!"
echo ""
echo "  ┌─────────────────────────────────────────────────┐"
echo "  │  Server starting at: http://localhost:5001      │"
echo "  │  Press Ctrl+C to stop                           │"
echo "  └─────────────────────────────────────────────────┘"
echo ""
cd .runtime
python3 app.py
