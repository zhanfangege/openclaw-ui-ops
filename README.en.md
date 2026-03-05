# openclaw-ui-ops

Operations toolkit and web console for OpenClaw, including a standalone dashboard app: `openclaw-ui`.

> Goal: provide a single visual entrypoint for runtime status, sessions/subagents monitoring, quick ops commands, and audit logs.

---

## What is included

- `openclaw-ui/` — standalone web console (Express + WebSocket + PTY)
- `bin/` — operations scripts (watchdog, recovery, checks, proxy helpers)
- `deploy/` — deployment playbooks
- `ops/` — runtime logs and ops policies
- `memory/` — daily decision and execution records

---

## Key features

- Runtime board: OpenClaw / Gateway / Sessions / Subagents / resource status
- Quick command buttons with real-time terminal streaming
- Audit log output (`openclaw-ui/audit.log`)
- Optional token auth (`UI_TOKEN`)
- Mobile-friendly responsive layout
- Auto-recovery scripts via watchdog

---

## Quick start

```bash
cd openclaw-ui
npm install
PORT=18790 HOST=0.0.0.0 npm start
```

Open:

- Local: `http://localhost:18790`
- LAN: `http://<your-ip>:18790`

---

## Docker (recommended)

Make sure port mapping is enabled:

```bash
-p 18790:18790
```

Example compose snippet:

```yaml
services:
  openclaw-ui:
    image: node:22
    working_dir: /workspace/openclaw-ui
    command: sh -lc "npm ci && PORT=18790 HOST=0.0.0.0 npm start"
    ports:
      - "18790:18790"
    volumes:
      - ./:/workspace
    restart: unless-stopped
```

---

## Security recommendations

1. Enable `UI_TOKEN`
2. Put behind Nginx/Caddy with HTTPS
3. Keep dashboard private (LAN/VPN/IP allowlist)
4. Rotate logs (`ui.log`, `audit.log`)

---

## Auto-recovery scripts

- `bin/openclaw_ui_start.sh`
- `bin/openclaw_ui_watchdog.sh`
- `bin/openclaw_ui_watchdog_loop.sh`

---

## Documentation

- Chinese README: `README.md`
- UI details: `openclaw-ui/README.md`
- Architecture: `docs/ARCHITECTURE.md`
- Deployment guides: `deploy/`

---

## License

MIT License (see `LICENSE`).
