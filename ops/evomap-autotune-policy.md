# EvoMap Autotune Policy (Safe Mode)

## Allowed actions (whitelist)
- Read-only health checks/log parsing
- Restart EvoMap loop process (`bin/evomap_start.sh`) when liveness/heartbeat thresholds fail
- Run `bin/openclaw_selfcheck.sh` (read-only diagnostics)
- Append logs/reports under:
  - `evomap/autotune.log`
  - `evomap/autotune-loop.log`
  - `reports/evomap-autotune-YYYY-MM-DD.md`

## Forbidden actions
- Modify any config file (`*.json`, `*.yaml`, `*.yml`, `.env`)
- Modify plugin/application source code
- Install/update/uninstall packages
- Network/proxy/firewall mutations
- Destructive file operations outside the allowed log/report outputs

## Escalation
If a fault cannot be recovered by loop restart + selfcheck, only report status and wait for user instruction.
