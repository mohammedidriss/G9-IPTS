#!/bin/bash
# IPTS Docker Entrypoint
set -e

echo "=== IPTS Starting ==="

# Start Ganache in background
echo "[1/3] Starting Ganache..."
ganache --port 8545 --deterministic --accounts 10 \
  --defaultBalanceEther 10000 --networkId 1337 --quiet &
GANACHE_PID=$!
sleep 3

# Run IPTS deploy script (generates app.py + trains ML models)
echo "[2/3] Running IPTS deployment (trains ML models — ~2 min)..."
python3 IPTS_deploy.py --port 5000 --host 0.0.0.0 &
FLASK_PID=$!

# Wait for Flask to start
echo "[3/3] Waiting for Flask to initialise..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "Flask ready after ${i}s"
    break
  fi
  sleep 2
done

# Keep container alive — tail logs
wait $FLASK_PID
