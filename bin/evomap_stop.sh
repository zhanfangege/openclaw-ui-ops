#!/usr/bin/env bash
set -euo pipefail
pkill -f "evomap_agent.py loop" || true
sleep 1
if pgrep -af "evomap_agent.py loop" >/dev/null; then
  echo "EvoMap loop still running"
  exit 1
fi
echo "EvoMap loop stopped"
