#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
LOGDIR="$BASE/ops"
LOG="$LOGDIR/openclaw-selfcheck.log"
mkdir -p "$LOGDIR"

ok=1
note() { echo "[$(date -u +'%F %T UTC')] $*" | tee -a "$LOG"; }

if openclaw status >/tmp/openclaw_status.txt 2>&1; then
  note "openclaw status: OK"
else
  note "openclaw status: FAIL"
  ok=0
fi

if openclaw plugins list 2>/tmp/openclaw_plugins.err | grep -q "memory-lancedb-pro"; then
  note "memory plugin: OK"
else
  note "memory plugin: FAIL"
  ok=0
fi

if pgrep -af "evomap_agent.py loop" >/dev/null; then
  note "evomap loop: RUNNING"
else
  note "evomap loop: MISSING, starting"
  "$BASE/bin/evomap_start.sh" >> "$LOG" 2>&1 || true
  sleep 1
  if pgrep -af "evomap_agent.py loop" >/dev/null; then
    note "evomap loop restart: OK"
  else
    note "evomap loop restart: FAIL"
    ok=0
  fi
fi

if [ "$ok" -eq 1 ]; then
  note "selfcheck result: HEALTHY"
  exit 0
else
  note "selfcheck result: UNHEALTHY"
  exit 2
fi
