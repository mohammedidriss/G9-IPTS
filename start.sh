#!/bin/bash
# ============================================================
# IPTS Server Startup Script
# Run this to start the platform: ./start.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python3"
APP="$SCRIPT_DIR/.runtime/app.py"
LOG="$SCRIPT_DIR/.runtime/logs/ipts_api.log"

echo "Starting IPTS Platform..."
echo "  App:    $APP"
echo "  Python: $VENV_PYTHON"
echo "  Log:    $LOG"
echo ""

# Kill any existing instance on port 5001
if lsof -ti:5001 >/dev/null 2>&1; then
  echo "Stopping existing server on port 5001..."
  kill $(lsof -ti:5001) 2>/dev/null
  sleep 1
fi

cd "$SCRIPT_DIR/.runtime"
"$VENV_PYTHON" app.py
