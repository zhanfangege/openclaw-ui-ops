#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
LOG="$BASE/ops/email-autosort.log"
mkdir -p "$BASE/ops"
python3 "$BASE/bin/email_autosort.py" >> "$LOG" 2>&1
