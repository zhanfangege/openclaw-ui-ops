# Release Notes - v0.2.0

Release date: 2026-03-06

## Summary

This release upgrades `openclaw-ui-ops` from baseline console to production-friendly operations cockpit with stronger runtime safety and observability.

## Highlights

- Interactive terminal in web UI:
  - Start shell session directly in dashboard
  - Keyboard input passthrough to PTY
  - Ctrl+C signal button for interruption
- Reliability hardening:
  - Command timeout guard (`CMD_TIMEOUT_MS`)
  - Output cap (`CMD_MAX_OUTPUT`) to avoid memory blow-up
  - Defensive API error handling for board/alerts endpoints
  - Alert threshold input clamping
- Operability analytics:
  - Command history filters (failed-only / slow-only)
  - Runtime metrics panel (avg duration, timeout count)
  - Per-command success rate and duration tables
  - Slow-command top list
  - Error exit-code aggregation
  - New `GET /api/metrics` endpoint

## Operations

- Access: `http://<host-ip>:18790`
- Recommended env hardening:
  - `UI_TOKEN=<strong-random-token>`
  - `CMD_TIMEOUT_MS=20000` (tune as needed)
  - `CMD_MAX_OUTPUT=512000` (tune as needed)
- Continue using reverse proxy + HTTPS in internet-exposed environments.

## Compatibility

- Node.js 18+ (20+ recommended)
- Existing quick command websocket flow remains backward-compatible.

## Assets

- `releases/openclaw-ui-ops-v0.2.0.tar.gz`
- `releases/openclaw-ui-ops-v0.2.0.sha256`
