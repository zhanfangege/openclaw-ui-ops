#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$BASE_DIR/runtime"
LOOP_LOG="$RUNTIME_DIR/watchdog-loop.log"
INTERVAL="${WATCHDOG_INTERVAL:-60}"

mkdir -p "$RUNTIME_DIR"
echo "[$(date -u +'%F %T UTC')] watchdog loop started interval=${INTERVAL}s" >> "$LOOP_LOG"

while true; do
  "$BASE_DIR/scripts/watchdog.sh" >> "$LOOP_LOG" 2>&1 || true
  sleep "$INTERVAL"
done
