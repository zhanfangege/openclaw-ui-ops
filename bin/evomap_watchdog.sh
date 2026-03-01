#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
LOG="$BASE/evomap/watchdog.log"
mkdir -p "$BASE/evomap"

restart() {
  echo "[$(date -u +'%F %T UTC')] restart loop" >> "$LOG"
  "$BASE/bin/evomap_start.sh" >> "$LOG" 2>&1 || true
}

# 1) process liveness
if ! pgrep -af "evomap_agent.py loop" >/dev/null; then
  echo "[$(date -u +'%F %T UTC')] loop not running" >> "$LOG"
  restart
  exit 0
fi

# 2) heartbeat freshness (<=35 min)
LAST_HB=$(grep -E "heartbeat => HTTP 200" "$BASE/evomap/agent.log" 2>/dev/null | tail -n1 | sed -E 's/^\[([^]]+)\].*/\1/' || true)
if [ -n "$LAST_HB" ]; then
  NOW_EPOCH=$(date -u +%s)
  HB_EPOCH=$(date -u -d "$LAST_HB" +%s 2>/dev/null || echo 0)
  AGE=$((NOW_EPOCH-HB_EPOCH))
  if [ "$HB_EPOCH" -eq 0 ] || [ "$AGE" -gt 2100 ]; then
    echo "[$(date -u +'%F %T UTC')] stale heartbeat age=${AGE}s" >> "$LOG"
    restart
  fi
else
  echo "[$(date -u +'%F %T UTC')] no heartbeat record yet" >> "$LOG"
fi
