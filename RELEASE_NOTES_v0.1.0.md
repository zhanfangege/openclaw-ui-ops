# Release Notes - v0.1.0

## 中文摘要

`v0.1.0` 是 `openclaw-ui-ops` 的首个可用基线版本，提供运行看板、快捷命令执行、实时终端输出、移动端适配与基础守护脚本。

## English Summary

`v0.1.0` is the first production-usable baseline of `openclaw-ui-ops`, including runtime board, quick commands, real-time terminal streaming, mobile responsiveness, and watchdog scripts.


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
