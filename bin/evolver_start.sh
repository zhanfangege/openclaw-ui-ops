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
export EVOLVE_STRATEGY="${EVOLVE_STRATEGY:-harden}"
export A2A_HUB_URL="${A2A_HUB_URL:-https://evomap.ai}"

# Stable device identity for container restarts
DEVICE_FILE="$LOGDIR/evomap_device_id"
if [[ -z "${EVOMAP_DEVICE_ID:-}" ]]; then
  if [[ -f "$DEVICE_FILE" ]]; then
    export EVOMAP_DEVICE_ID="$(cat "$DEVICE_FILE")"
  else
    RAW_ID="$(cat /etc/machine-id 2>/dev/null || hostname || date +%s)"
    export EVOMAP_DEVICE_ID="$(printf '%s' "$RAW_ID" | md5sum | awk '{print $1}')"
    echo "$EVOMAP_DEVICE_ID" > "$DEVICE_FILE"
  fi
fi
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
