# OpenClaw UI (Web)

OpenClaw 的 Web 管理界面（MVP+）：

- 详细工作状态（gateway/openclaw/system）
- Sessions/Subagents 状态面板
- 可视化命令行（按钮触发常用命令，PTY 实时输出）
- 审计日志（command start/stop/exit）
- 可选 Token 鉴权（`UI_TOKEN`）

## 启动

```bash
cd openclaw-ui
npm install
UI_TOKEN=your-token npm start
```

访问：`http://localhost:4173`

> 若未设置 `UI_TOKEN`，默认不开鉴权（仅建议本机内网使用）。

## API

- `GET /api/dashboard`
- `GET /api/sessions`
- `GET /api/subagents`
- `GET /api/audit`
- `GET /api/quick-commands`
- `WS /ws?token=...`（`quick-run` 按钮命令执行）

## 安全策略（当前）

- 拦截高风险命令关键字：`rm -rf`, `mkfs`, `shutdown`, `reboot`, `dd if=`
- 命令事件写入 `audit.log`

## 下一步建议

- 角色权限（只读/执行/管理员）
- 反向代理 + HTTPS
- 命令白名单/审批流
- 持久化审计（SQLite）
