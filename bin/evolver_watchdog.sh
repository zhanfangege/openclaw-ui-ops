#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
LOGDIR="$BASE/evolver-runtime"
LOG="$LOGDIR/watchdog.log"
mkdir -p "$LOGDIR"

log(){ echo "[$(date -u +'%F %T UTC')] $*" >> "$LOG"; }

if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then
  log "evolver loop healthy"
else
  log "evolver loop missing -> restart"
  "$BASE/bin/evolver_start.sh" >> "$LOG" 2>&1 || true
  sleep 1
  if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then
    log "evolver restart ok"
  else
    log "evolver restart failed"
    exit 2
  fi
fi
