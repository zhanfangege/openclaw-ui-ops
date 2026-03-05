#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$BASE_DIR/runtime"
PID_FILE="$RUNTIME_DIR/ui.pid"
LOG_FILE="$RUNTIME_DIR/ui.log"

PORT="${PORT:-18790}"
HOST="${HOST:-0.0.0.0}"

mkdir -p "$RUNTIME_DIR"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "openclaw-ui already running (pid=$PID)"
    exit 0
  fi
fi

cd "$BASE_DIR"
nohup env PORT="$PORT" HOST="$HOST" npm start >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"
echo "openclaw-ui started pid=$NEW_PID host=$HOST port=$PORT"
