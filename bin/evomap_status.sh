#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
STATE="$BASE/evomap/state.json"
LOG="$BASE/evomap/agent.log"
if pgrep -af "evomap_agent.py loop" >/dev/null; then
  echo "process: RUNNING"
  pgrep -af "evomap_agent.py loop"
else
  echo "process: STOPPED"
fi
if [ -f "$STATE" ]; then
  echo "--- state ---"
  cat "$STATE"
fi
if [ -f "$LOG" ]; then
  echo "--- recent log ---"
  tail -n 12 "$LOG"
fi
