#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$BASE_DIR/runtime"
PID_FILE="$RUNTIME_DIR/ui.pid"
LOG_FILE="$RUNTIME_DIR/watchdog.log"
PORT="${PORT:-18790}"

mkdir -p "$RUNTIME_DIR"
log(){ echo "[$(date -u +'%F %T UTC')] $*" >> "$LOG_FILE"; }

healthy=false
if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    healthy=true
  fi
fi

if ! $healthy; then
  log "ui missing -> restart"
  "$BASE_DIR/scripts/start.sh" >> "$LOG_FILE" 2>&1 || true
  sleep 1
fi

if node -e "fetch('http://127.0.0.1:${PORT}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  log "ui healthy"
else
  log "ui unhealthy -> restart"
  if [[ -f "$PID_FILE" ]]; then
    PID="$(cat "$PID_FILE" || true)"
    [[ -n "${PID:-}" ]] && kill "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  "$BASE_DIR/scripts/start.sh" >> "$LOG_FILE" 2>&1 || true
fi
