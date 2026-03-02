#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
PIDFILE="$BASE/evolver-runtime/evolver.pid"

if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then
  pkill -f "node .*evolver/index.js --loop" || true
  sleep 1
fi

if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then
  echo "[evolver] stop failed"
  exit 2
fi

rm -f "$PIDFILE"
echo "[evolver] stopped"
