#!/usr/bin/env bash
# Run this on NAS host (not inside container)
set -euo pipefail
CNAME="${1:-openclaw}"
WLOG="/tmp/openclaw-host-watchdog.log"

log(){ echo "[$(date -u +'%F %T UTC')] $*" | tee -a "$WLOG"; }

if ! docker ps --format '{{.Names}}' | grep -qx "$CNAME"; then
  log "container $CNAME not running -> docker start"
  docker start "$CNAME" >/dev/null || true
  sleep 6
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CNAME"; then
  log "container $CNAME still down"
  exit 2
fi

# run in-container selfcheck
if docker exec -i "$CNAME" bash -lc '/home/node/.openclaw/workspace/bin/openclaw_selfcheck.sh'; then
  log "selfcheck OK"
  exit 0
else
  log "selfcheck failed -> docker restart"
  docker restart "$CNAME" >/dev/null || true
  sleep 10
  if docker exec -i "$CNAME" bash -lc '/home/node/.openclaw/workspace/bin/openclaw_selfcheck.sh'; then
    log "post-restart selfcheck OK"
    exit 0
  fi
  log "post-restart selfcheck FAILED"
  exit 3
fi
