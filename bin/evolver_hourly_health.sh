#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
OUT_DIR="$BASE/reports"
LOG="$BASE/evolver/hourly-health.log"
DAY="$(date -u +%F)"
TS="$(date -u +'%F %T UTC')"
OUT="$OUT_DIR/hourly-health-$DAY.md"
mkdir -p "$OUT_DIR" "$BASE/evolver"

ok(){ "$@" >/tmp/evolver_hourly.out 2>&1; }

SELF="FAIL"; ok "$BASE/bin/openclaw_selfcheck.sh" && SELF="OK"
GW="FAIL"; ok openclaw gateway status && GW="OK"
MEM="FAIL"; openclaw plugins info memory-lancedb-pro 2>/tmp/evolver_mem.out | grep -q "Status: loaded" && MEM="OK"

{
  echo "- [$TS] selfcheck=$SELF gateway=$GW memory_plugin=$MEM"
} >> "$OUT"

if [[ "$SELF" == "OK" && "$GW" == "OK" && "$MEM" == "OK" ]]; then
  echo "[$TS] hourly-health OK" >> "$LOG"
else
  echo "[$TS] hourly-health DEGRADED selfcheck=$SELF gateway=$GW memory=$MEM" >> "$LOG"
fi
