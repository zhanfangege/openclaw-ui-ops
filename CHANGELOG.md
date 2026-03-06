# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-03-06

### Added
- Interactive terminal mode in "执行输出":
  - Start persistent shell session from UI
  - Real-time keyboard input passthrough (`pty-input`)
  - One-click Ctrl+C signal support
- Command observability panels in UI:
  - command history filters (failed only / slow only)
  - rolling metrics (recent count / avg duration / timeout count)
  - command analytics tables (success rate, avg/max duration, error code breakdown)
- New backend metrics API: `GET /api/metrics` for release-grade runtime analytics.

### Changed
- Hardened PTY command execution with timeout guard (`CMD_TIMEOUT_MS`, default 20000ms).
- Added output size cap (`CMD_MAX_OUTPUT`, default 512KB) to prevent runaway memory growth.
- Added defensive error handling around `/api/board` and `/api/alerts`.
- Added threshold boundary validation for `/api/alerts` query params.
- Enhanced audit events to include `durationMs` for command lifecycle analysis.
- Updated `.env.example` with command safety guard variables.

### Notes
- API compatibility preserved for existing dashboard routes and websocket quick-run flow.
- This release focuses on stability + maintainability + operability for production rollout.

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
