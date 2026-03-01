# Host Watchdog for OpenClaw (NAS)

## What it does
- Ensures container `openclaw` is running
- Executes in-container health check
- Auto-restarts container if health check fails
- Re-checks after restart

## Script path (inside container-mounted workspace)
`/home/node/.openclaw/workspace/bin/host_openclaw_watchdog.sh`

## Run once (on NAS host)
```bash
bash /vol1/@appdata/1Panel/1panel/apps/openclaw/openclaw/data/workspace/bin/host_openclaw_watchdog.sh openclaw
```

## Install cron (every 5 min)
```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * bash /vol1/@appdata/1Panel/1panel/apps/openclaw/openclaw/data/workspace/bin/host_openclaw_watchdog.sh openclaw") | crontab -
```

## Verify
```bash
crontab -l
```

## Logs
- Host watchdog: `/tmp/openclaw-host-watchdog.log`
- In-container selfcheck: `/home/node/.openclaw/workspace/ops/openclaw-selfcheck.log`
