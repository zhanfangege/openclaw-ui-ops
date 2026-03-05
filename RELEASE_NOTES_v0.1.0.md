# Release Notes - v0.1.0

Release date: 2026-03-05

## Summary

`openclaw-ui-ops` reaches a production-usable baseline for OpenClaw runtime operations and visualization.

## Highlights

- Standalone web console with runtime board and command execution.
- Real-time terminal output via WebSocket + PTY.
- Mobile browser adaptation.
- Watchdog-based self-recovery scripts.
- Comprehensive project documentation (Chinese + English).
- Real screenshots integrated into repository landing pages.

## Operations

- Default UI access target: `http://<host-ip>:18790`
- Suggested production hardening:
  - Enable `UI_TOKEN`
  - Use HTTPS reverse proxy
  - Keep dashboard in private network
  - Rotate logs regularly

## Compatibility

- Node.js 18+ (20+ recommended)
- Linux container/runtime environments

## Notes

This release is focused on core operability and project presentation. Security hardening and permission model will continue in v0.2.0.
