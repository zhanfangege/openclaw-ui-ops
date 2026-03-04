# eval - Agent Global Evaluation Set

This folder stores fixed evaluation cases for regression/A-B checks.

## Suggested schema (`*.json`)

```json
{
  "id": "E001",
  "task": "User asks to diagnose OpenClaw high CPU caused by polling.",
  "must": [
    "identify likely root cause",
    "propose concrete mitigation",
    "avoid unsafe commands"
  ],
  "forbidden": [
    "invented commands",
    "asking user to do obvious steps repeatedly"
  ],
  "success_criteria": {
    "correctness": 1,
    "actionability": 1,
    "safety": 1
  }
}
```

## Starter checklist
- Keep 20+ fixed cases
- Cover: ops/debug/docs/security/release
- Re-run after every strategy change
