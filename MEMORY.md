# MEMORY.md

## User collaboration preferences

- Prefer execution-first workflow: do the work, then report clear result/status/next step.
- Strong rule-discipline expectation ("铁律"): follow agreed process strictly.
- In restricted-network scenarios, temporary proxy use is acceptable only when default-off, on-demand, and turned off after use.
- Dislikes repeated interruptions for approvals when a practical autonomous path exists.

## Cross-channel continuity rules

- Feishu and webchat context is not guaranteed to be fully shared in real time; key decisions must be written into memory files.
- **Hard rule (highest priority):** after finishing any meaningful task in either Feishu or webchat, must persist a unified summary before final completion reply.
- Unified summary template (mandatory): `Decision / Current status / Next step / Blockers`.
- After major troubleshooting or decisions, append a concise durable summary to `memory/YYYY-MM-DD.md`.
- Keep this file as long-term distilled memory; keep day files as detailed operational logs.

## Recent durable decisions (2026-03-02)

- User approved cross-channel consolidation (Feishu + webchat).
- Primary operational focus: OpenClaw stability, install/update path consistency, and recoverability.
- For Windows recovery, prioritize stable user-level install/PATH consistency over ad-hoc mixed install methods.

## LanceDB / memory-lancedb-pro operating rules (adopted)

- On pitfall handling, use dual-memory write + verification before moving on.
- Keep LanceDB entries short, atomic, structured, and non-duplicative.
- Always perform `memory_recall` before retrying repeated/failed operations.
- Confirm target plugin repo/package before editing memory plugin code.
- After any `plugins/**/*.ts` code change, clear `/tmp/jiti/` before `openclaw gateway restart`.
