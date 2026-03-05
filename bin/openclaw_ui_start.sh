#!/usr/bin/env bash
set -euo pipefail

BASE="/home/node/.openclaw/workspace"
UI_DIR="$BASE/openclaw-ui"
RUNTIME_DIR="$BASE/openclaw-ui/runtime"
PIDFILE="$RUNTIME_DIR/ui.pid"
LOGFILE="$RUNTIME_DIR/ui.log"
PORT="${OPENCLAW_UI_PORT:-18790}"
HOST="${OPENCLAW_UI_HOST:-0.0.0.0}"

mkdir -p "$RUNTIME_DIR"

if [ -f "$PIDFILE" ]; then
  OLD_PID="$(cat "$PIDFILE" || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "openclaw-ui already running (pid=$OLD_PID)"
    exit 0
  else
    rm -f "$PIDFILE"
  fi
fi

cd "$UI_DIR"
nohup env PORT="$PORT" HOST="$HOST" npm start >> "$LOGFILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PIDFILE"

echo "openclaw-ui started pid=$NEW_PID host=$HOST port=$PORT"
