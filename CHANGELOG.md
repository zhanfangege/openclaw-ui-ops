# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-05

### Added
- Initial `openclaw-ui` web console (Express + WebSocket + PTY).
- Runtime board for OpenClaw/Gateway/Sessions/Subagents status.
- Quick command execution panel with real-time terminal output.
- Audit logging for command events.
- Mobile responsive UI layout.
- Watchdog scripts for auto-restart:
  - `bin/openclaw_ui_start.sh`
  - `bin/openclaw_ui_watchdog.sh`
  - `bin/openclaw_ui_watchdog_loop.sh`
- Project documentation improvements:
  - Root `README.md`
  - `README.en.md`
  - `openclaw-ui/README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/SHOWCASE.md`
- Added `LICENSE` (MIT).
- Added real desktop/mobile screenshots in `docs/assets/screenshots/`.

### Changed
- Dashboard default service port aligned to `18790` for LAN access.
- README preview section upgraded to real screenshots.

### Removed
- Removed demo placeholder image block from readmes.
