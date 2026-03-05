#!/usr/bin/env bash
set -euo pipefail

BASE="/home/node/.openclaw/workspace"
RUNTIME_DIR="$BASE/openclaw-ui/runtime"
PIDFILE="$RUNTIME_DIR/ui.pid"
LOGFILE="$RUNTIME_DIR/watchdog.log"
PORT="${OPENCLAW_UI_PORT:-18790}"

mkdir -p "$RUNTIME_DIR"
log(){ echo "[$(date -u +'%F %T UTC')] $*" >> "$LOGFILE"; }

healthy=false
if [ -f "$PIDFILE" ]; then
  PID="$(cat "$PIDFILE" || true)"
  if [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then
    healthy=true
  fi
fi

if ! $healthy; then
  log "ui missing -> restart"
  "$BASE/bin/openclaw_ui_start.sh" >> "$LOGFILE" 2>&1 || true
  sleep 1
fi

if node -e "fetch('http://127.0.0.1:${PORT}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  log "ui healthy"
else
  log "ui unhealthy -> restart"
  if [ -f "$PIDFILE" ]; then
    PID="$(cat "$PIDFILE" || true)"
    [ -n "${PID:-}" ] && kill "$PID" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
  "$BASE/bin/openclaw_ui_start.sh" >> "$LOGFILE" 2>&1 || true
fi
