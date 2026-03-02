#!/usr/bin/env bash
set -euo pipefail

BASE="/home/node/.openclaw/workspace"
AGENT_LOG="$BASE/evomap/agent.log"
STATE="$BASE/evomap/state.json"
RUN_LOG="$BASE/evomap/autotune.log"
REPORT_DIR="$BASE/reports"
STAMP="$(date -u +'%F %T UTC')"
mkdir -p "$BASE/evomap" "$REPORT_DIR"

log(){ echo "[$STAMP] $*" | tee -a "$RUN_LOG" >/dev/null; }

# 1) Ensure loop health (existing watchdog)
"$BASE/bin/evomap_watchdog.sh" || true

# 2) Lightweight signal analysis from recent log lines
recent="$(tail -n 240 "$AGENT_LOG" 2>/dev/null || true)"
count_200=$(printf '%s\n' "$recent" | grep -c "HTTP 200" || true)
count_429=$(printf '%s\n' "$recent" | grep -c "HTTP 429" || true)
count_502=$(printf '%s\n' "$recent" | grep -c "HTTP 502" || true)

# 3) Self-heal action gates (safe, low-risk)
# If upstream instability persists, only restart once per run.
if [ "${count_502:-0}" -ge 8 ]; then
  log "high_502_detected count=$count_502 -> restart evomap loop"
  "$BASE/bin/evomap_start.sh" >> "$RUN_LOG" 2>&1 || true
fi

# If process exists but last successful heartbeat too old, watchdog should fix;
# we add an extra conservative restart trigger (>45 min no 200).
LAST_HB=$(grep -E "heartbeat => HTTP 200" "$AGENT_LOG" 2>/dev/null | tail -n1 | sed -E 's/^\[([^]]+)\].*/\1/' || true)
if [ -n "$LAST_HB" ]; then
  NOW_EPOCH=$(date -u +%s)
  HB_EPOCH=$(date -u -d "$LAST_HB" +%s 2>/dev/null || echo 0)
  AGE=$((NOW_EPOCH-HB_EPOCH))
  if [ "$HB_EPOCH" -eq 0 ] || [ "$AGE" -gt 2700 ]; then
    log "stale_success_heartbeat age=${AGE}s -> restart evomap loop"
    "$BASE/bin/evomap_start.sh" >> "$RUN_LOG" 2>&1 || true
  fi
fi

# 4) Snapshot report (append daily markdown)
DAY=$(date -u +%F)
RPT="$REPORT_DIR/evomap-autotune-$DAY.md"
{
  echo "- [$STAMP] 200=$count_200 429=$count_429 502=$count_502"
  if [ -f "$STATE" ]; then
    lp=$(grep -o '"last_publish"\s*:\s*"[^"]*"' "$STATE" | head -n1 | cut -d'"' -f4 || true)
    lh=$(grep -o '"last_hello"\s*:\s*"[^"]*"' "$STATE" | head -n1 | cut -d'"' -f4 || true)
    echo "  - state.last_hello: ${lh:-n/a}"
    echo "  - state.last_publish: ${lp:-n/a}"
  fi
} >> "$RPT"

# 5) OpenClaw quick selfcheck (best effort)
"$BASE/bin/openclaw_selfcheck.sh" >> "$RUN_LOG" 2>&1 || true

log "autotune_done 200=$count_200 429=$count_429 502=$count_502"
