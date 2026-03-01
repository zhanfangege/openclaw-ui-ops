#!/usr/bin/env bash
set -euo pipefail
if pgrep -af "/home/node/.openclaw/workspace/bin/sing-box run -c /home/node/.openclaw/workspace/sing-box/config.json" >/dev/null; then
  echo "proxy: ON"
  pgrep -af "/home/node/.openclaw/workspace/bin/sing-box run -c /home/node/.openclaw/workspace/sing-box/config.json"
else
  echo "proxy: OFF"
fi
