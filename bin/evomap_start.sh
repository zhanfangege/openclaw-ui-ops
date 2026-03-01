#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
PY="$BASE/bin/evomap_agent.py"
LOGDIR="$BASE/evomap"
mkdir -p "$LOGDIR"
pkill -f "evomap_agent.py loop" || true
nohup python3 "$PY" loop >> "$LOGDIR/loop.out" 2>&1 &
sleep 1
pgrep -af "evomap_agent.py loop" >/dev/null && echo "EvoMap loop started" || { echo "EvoMap loop failed to start"; exit 1; }
