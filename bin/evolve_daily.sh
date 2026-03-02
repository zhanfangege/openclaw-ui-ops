#!/usr/bin/env bash
set -euo pipefail
BASE="/home/node/.openclaw/workspace"
EVO="$BASE/evolver"
REPORT_DIR="$BASE/reports"
DATE_UTC="$(date -u +%F)"
TIME_UTC="$(date -u +'%F %T UTC')"
OUT="$REPORT_DIR/evolution-daily-$DATE_UTC.md"
mkdir -p "$REPORT_DIR"

status_line() {
  if "$@" >/tmp/evolve_daily_cmd.out 2>&1; then
    echo "OK"
  else
    echo "FAIL"
  fi
}

E_RUN=$(status_line bash -lc "cd '$EVO' && node index.js run")
E_SOLID=$(status_line bash -lc "cd '$EVO' && node index.js solidify")
E_LOOP=$(if pgrep -af "node .*evolver/index.js --loop" >/dev/null; then echo RUNNING; else echo STOPPED; fi)
M_LOOP=$(if pgrep -af "evomap_agent.py loop" >/dev/null; then echo RUNNING; else echo STOPPED; fi)
OCHK=$(status_line bash -lc "$BASE/bin/openclaw_selfcheck.sh")

cat > "$OUT" <<EOF
# Evolution Daily Report ($DATE_UTC)

- 生成时间: $TIME_UTC
- evolver run: $E_RUN
- evolver solidify: $E_SOLID
- evolver loop: $E_LOOP
- evomap loop: $M_LOOP
- openclaw selfcheck: $OCHK

## 结论
- 若任一项FAIL/STOPPED，优先执行对应拉起与修复，并记录到 memory/$DATE_UTC.md。
EOF

echo "[evolve_daily] report => $OUT"
