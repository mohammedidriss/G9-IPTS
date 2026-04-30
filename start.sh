#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# IPTS — Quick Start Script
# Run this once after cloning. Re-run any time to restart the server.
# ─────────────────────────────────────────────────────────────────────────────
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   IPTS — Integrated Payment Transformation System        ║"
echo "║   Blockchain · AI · Cybersecurity                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Python check ──────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 not found. Install Python 3.10+ from https://python.org"
  exit 1
fi
PYTHON=$(command -v python3)
echo "✅  Python: $($PYTHON --version)"

# ── 2. Virtual environment ───────────────────────────────────
if [ ! -d ".venv" ]; then
  echo "📦  Creating virtual environment..."
  $PYTHON -m venv .venv
fi
source .venv/bin/activate
echo "✅  Virtual environment active"

# ── 3. Install dependencies ──────────────────────────────────
echo "📦  Installing dependencies (first run may take a few minutes)..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "✅  Dependencies installed"

# ── 4. Sync runtime directory ────────────────────────────────
echo "🔄  Syncing runtime files..."
mkdir -p .runtime/templates .runtime/static
cp app.py .runtime/app.py
cp -r templates/. .runtime/templates/
cp -r static/. .runtime/static/
echo "✅  Runtime directory ready"

# ── 5. Start the server ──────────────────────────────────────
echo ""
echo "🚀  Starting IPTS on http://localhost:5001"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Open browser → http://localhost:5001"
echo ""
echo "  STAFF LOGINS:"
echo "  mohamad  / Mohamad@2026!   Admin"
echo "  rohit    / Rohit@2026!     Compliance"
echo "  sriram   / Sriram@2026!    Operator"
echo "  ali      / Ali@2026!       Auditor"
echo "  vibin    / Vibin@2026!     Data Scientist"
echo ""
echo "  CLIENT LOGINS:"
echo "  walid    / Walid@2026!     Walid ElMahdy"
echo "  lena     / Lena@2026!      Lena Novak"
echo "  james    / James@2026!     James Okafor"
echo "  mei      / Mei@2026!       Mei Lin"
echo "  carlos   / Carlos@2026!    Carlos Mendez"
echo "  aisha    / Aisha@2026!     Aisha Al-Rashid"
echo "  henrik   / Henrik@2026!    Henrik Svensson"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

.venv/bin/python3 .runtime/app.py --port 5001
