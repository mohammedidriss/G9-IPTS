#!/usr/bin/env bash
# ============================================================
# IPTS — One-command setup for a fresh machine
# Usage: bash setup.sh [--port PORT]
#        IPTS_PORT=5002 bash setup.sh
# ============================================================
set -e

# ── Parse --port argument ─────────────────────────────────────
PORT=${IPTS_PORT:-5001}
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

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

# ── 4. Restore database from backup (if no live DB exists) ───
echo "[4/6] Checking database..."
if [ ! -f "ipts_vault.db" ]; then
    # Find the most recent backup SQL file
    BACKUP_FILE=$(ls -t backup/ipts_vault_*.sql 2>/dev/null | head -1)
    if [ -n "$BACKUP_FILE" ]; then
        echo "  ℹ No database found. Restoring from backup: $BACKUP_FILE"
        sqlite3 ipts_vault.db < "$BACKUP_FILE"
        echo "  ✓ Database restored from $BACKUP_FILE"
    else
        echo "  ℹ No database or backup found — a fresh database will be created on first run"
    fi
else
    echo "  ✓ Existing database found — keeping current data"
    echo "    (To restore from backup, delete ipts_vault.db and re-run setup.sh)"
fi

# ── 5. Train ML models ────────────────────────────────────────
echo "[5/6] Training ML models on real data..."
echo "      (downloads 144 MB dataset on first run — takes ~90 seconds)"
python3 train_on_real_data.py
echo "  ✓ Models trained and saved to models/"

# ── 6. Start server ───────────────────────────────────────────
echo "[6/6] Starting IPTS server..."
echo ""
echo "  ✓ Setup complete! (6/6 steps done)"
echo ""
echo "  ┌─────────────────────────────────────────────────┐"
echo "  │  Server starting at: http://localhost:${PORT}      │"
echo "  │  Press Ctrl+C to stop                           │"
echo "  └─────────────────────────────────────────────────┘"
echo ""
python3 app.py --port "$PORT"
