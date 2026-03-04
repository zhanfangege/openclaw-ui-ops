# AGENT_OPTIMIZATION.md

全局 Agent 自优化落地说明（已进入实战流程）。

## 每次任务完成后（强制）
执行 closeout 记录：

```bash
node scripts/closeout.js \
  --task "任务标题" \
  --taskType ops \
  --context "关键上下文" \
  --result success \
  --errorType none \
  --fix "本次有效做法" \
  --reuse "适用条件" \
  --confidence 0.9 \
  --decision "关键决策" \
  --status "当前状态" \
  --next "下一步" \
  --blockers "无"
```

作用：
1. 自动追加 `memory/lessons.jsonl`（向量化经验源）
2. 自动追加 `memory/YYYY-MM-DD.md`（人类可读复盘）

## 每周复盘

```bash
node scripts/weekly-kpi.js
```

将输出填入 `weekly-review.md`，并产出最多 3 条策略改动。

## 运行边界
- 可以自动优化：模板、工具调用顺序、缓存/轮询参数
- 禁止自动优化：安全策略、权限边界、外发行为
