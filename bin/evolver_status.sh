#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
LOGFILE="$BASE/evolver-runtime/evolver.log"

if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then
  echo "RUNNING"
  pgrep -af "node .*evolver/index.js --loop" | sed -n '1,5p'
  [ -f "$LOGFILE" ] && tail -n 5 "$LOGFILE" || true
  exit 0
else
  echo "STOPPED"
  exit 1
fi
