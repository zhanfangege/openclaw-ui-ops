#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
EVO="$BASE/evolver"
LOGDIR="$BASE/evolver-runtime"
PIDFILE="$LOGDIR/evolver.pid"
LOGFILE="$LOGDIR/evolver.log"
mkdir -p "$LOGDIR"

if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then
  echo "[evolver] already running"
  exit 0
fi

cd "$BASE"
nohup node "$EVO/index.js" --loop >> "$LOGFILE" 2>&1 &
PID=$!
echo "$PID" > "$PIDFILE"
sleep 1
if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then
  echo "[evolver] started pid=$PID"
  exit 0
fi

echo "[evolver] failed to start"
exit 2
