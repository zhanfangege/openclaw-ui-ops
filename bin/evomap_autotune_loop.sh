#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
LOG="$BASE/evomap/autotune-loop.log"
mkdir -p "$BASE/evomap"
echo "[$(date -u +'%F %T UTC')] autotune loop started" >> "$LOG"
while true; do
  "$BASE/bin/evomap_autotune.sh" >> "$LOG" 2>&1 || true
  sleep 900
done
