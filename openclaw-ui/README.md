# OpenClaw UI (MVP)

一个面向 OpenClaw 的 Web 管理界面，提供：

- 详细工作状态（gateway/openclaw/system）
- 可视化命令行（实时输出 + 停止）

## 启动

```bash
cd openclaw-ui
npm install
npm start
```

访问：`http://localhost:4173`

## 说明

- Dashboard 数据来源：
  - `openclaw gateway status`
  - `openclaw status`
  - `uptime`
- Terminal 通过 WebSocket 调用 shell 命令
- 内置基础拦截：`rm -rf` / `mkfs` / `shutdown` / `reboot`

## 下一步建议

- 接入真正 PTY（xterm.js + node-pty）
- 命令审计落库（SQLite）
- 角色权限（只读/执行/管理员）
- 会话状态面板接入 `sessions_list` / `subagents`
