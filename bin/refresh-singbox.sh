#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
PY="$BASE/bin/refresh-singbox.py"
SB="$BASE/bin/sing-box"
CFG="$BASE/sing-box/config.json"
LOG="$BASE/sing-box/refresh.log"
mkdir -p "$BASE/sing-box"
{
  echo "[$(date -u +'%F %T UTC')] refresh start"
  "$PY"
  "$SB" check -c "$CFG"
  pkill -f "$SB run -c $CFG" || true
  nohup "$SB" run -c "$CFG" > "$BASE/sing-box/run.log" 2>&1 &
  sleep 2
  curl -I --proxy http://127.0.0.1:7890 --connect-timeout 8 --max-time 20 https://www.gstatic.com/generate_204 >/dev/null
  echo "[$(date -u +'%F %T UTC')] refresh ok"
} >> "$LOG" 2>&1
