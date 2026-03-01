#!/usr/bin/env bash
set -euo pipefail
pkill -f "/home/node/.openclaw/workspace/bin/sing-box run -c /home/node/.openclaw/workspace/sing-box/config.json" || true
echo "proxy OFF"
