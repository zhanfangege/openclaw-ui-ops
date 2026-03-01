#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
"$BASE/bin/refresh-singbox.sh"
echo "proxy ON at 127.0.0.1:7890"
