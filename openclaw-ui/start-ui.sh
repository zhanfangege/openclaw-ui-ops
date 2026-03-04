#!/usr/bin/env bash
set -euo pipefail
cd /home/node/.openclaw/workspace/openclaw-ui
export HOST=0.0.0.0
export PORT=18790
export UI_TOKEN=zf20131414
export SSL_KEY_PATH=/home/node/.openclaw/workspace/openclaw-ui/certs/ui.key
export SSL_CERT_PATH=/home/node/.openclaw/workspace/openclaw-ui/certs/ui.crt
nohup npm start >> /home/node/.openclaw/workspace/openclaw-ui/ui.log 2>&1 &
