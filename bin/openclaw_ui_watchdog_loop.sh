#!/usr/bin/env bash
set -euo pipefail

BASE="/home/node/.openclaw/workspace"
RUNTIME_DIR="$BASE/openclaw-ui/runtime"
LOOP_LOG="$RUNTIME_DIR/watchdog-loop.log"
INTERVAL="${OPENCLAW_UI_WATCHDOG_INTERVAL:-60}"

mkdir -p "$RUNTIME_DIR"
echo "[$(date -u +'%F %T UTC')] ui watchdog loop started interval=${INTERVAL}s" >> "$LOOP_LOG"

while true; do
  "$BASE/bin/openclaw_ui_watchdog.sh" >> "$LOOP_LOG" 2>&1 || true
  sleep "$INTERVAL"
done
