#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
DATE_UTC="$(date -u +%F)"
OUT="$BASE/reports/evolution-kpi-$DATE_UTC.txt"
mkdir -p "$BASE/reports"

E_LOOP=$(if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then echo 1; else echo 0; fi)
M_LOOP=$(if pgrep -af "evomap_agent.py loop" >/dev/null; then echo 1; else echo 0; fi)

{
  echo "date=$DATE_UTC"
  echo "evolver_loop_running=$E_LOOP"
  echo "evomap_loop_running=$M_LOOP"
} > "$OUT"

echo "$OUT"
