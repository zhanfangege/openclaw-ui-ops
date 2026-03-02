#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
LOG="$BASE/evolver/hourly-health-loop.log"
mkdir -p "$BASE/evolver"
echo "[$(date -u +'%F %T UTC')] hourly health loop started" >> "$LOG"
while true; do
  "$BASE/bin/evolver_hourly_health.sh" >> "$LOG" 2>&1 || true
  sleep 3600
done
