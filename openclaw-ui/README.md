# OpenClaw UI

OpenClaw 的独立 Web 运维看板（MVP+）。

- 运行状态总览（OpenClaw / Gateway / Sessions / Subagents）
- 快捷命令一键执行 + 实时终端输出
- 告警与成功率统计
- 审计日志留存
- 可选 Token 鉴权
- 移动端响应式适配

---

## 1) 技术栈

- Node.js
- Express
- WebSocket (`ws`)
- `node-pty`（命令执行实时输出）
- 前端原生 HTML/CSS/JS

---

## 2) 目录结构

```text
openclaw-ui/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── scripts/
│   ├── start.sh
│   ├── watchdog.sh
│   └── watchdog-loop.sh
├── server.js
├── package.json
├── audit.log
├── ui.log
└── runtime/
    ├── ui.pid
    ├── ui.log
    ├── watchdog.log
    └── watchdog-loop.log
```

---

## 3) 启动方式

### 3.1 直接启动

```bash
cd openclaw-ui
npm install
PORT=18790 HOST=0.0.0.0 npm start
```

默认参数：

- `PORT=4173`
- `HOST=0.0.0.0`
- `UI_TOKEN=''`（空表示不鉴权，不建议公网使用）

### 3.2 带鉴权启动

```bash
cd openclaw-ui
UI_TOKEN='your-strong-token' PORT=18790 HOST=0.0.0.0 npm start
```

或使用配置文件：

```bash
cd openclaw-ui
cp .env.example .env
# 编辑 UI_TOKEN
set -a; . ./.env; set +a
npm start
```

前端请求会带 `x-ui-token` 请求头。

---

## 4) API / WS

### HTTP API

- `GET /api/quick-commands`
- `GET /api/board`
- `GET /api/dashboard`（兼容接口）
- `GET /api/sessions`
- `GET /api/subagents`
- `GET /api/audit`
- `GET /api/alerts?loadWarn=8&memWarn=85`

### WebSocket

- `WS /ws?token=...`
- 前端通过 `quick-run` 触发后端命令，实时接收 stdout / exit / error 事件

---

## 5) 安全说明

当前实现包含：

- 可选 `UI_TOKEN` 鉴权
- 命令执行事件审计（`audit.log`）
- 关键高风险命令关键字拦截（基础防护）

建议补强：

1. 强制启用 `UI_TOKEN`
2. 反向代理 + HTTPS
3. 仅内网访问 / IP 白名单
4. 细分角色权限（只读 / 执行 / 管理）

---

## 6) 自恢复运维

项目内脚本（推荐）：

- `scripts/start.sh`：启动 UI 并写 PID
- `scripts/watchdog.sh`：单次健康检查与拉起
- `scripts/watchdog-loop.sh`：循环守护（默认 60 秒）

示例：

```bash
cd openclaw-ui
./scripts/start.sh
nohup ./scripts/watchdog-loop.sh > runtime/watchdog-loop.nohup.log 2>&1 &
```

---

## 7) 手机端访问说明

已支持响应式布局（1200 / 768 / 420 断点）。
如果手机端样式异常：

1. 强制刷新页面
2. 或用无痕模式重开
3. 再确认是否已拉取最新代码

---

## 8) 常见问题

### Q: 能访问容器内地址，宿主机访问不到？
A: 检查 Docker 端口映射（如 `18790:18790`）。

### Q: 执行命令没有输出？
A: 检查 `openclaw` 命令在服务进程环境中是否可用，及 `node-pty` 是否安装成功。

### Q: 日志越来越大怎么办？
A: 给 `audit.log/ui.log/runtime/*.log` 加日志轮转（logrotate 或脚本清理）。

---

## 9) 后续规划（建议）

- 命令白名单 + 审批流
- 多用户与权限模型
- 告警推送（Feishu/Telegram）
- 审计持久化（SQLite/PG）与可检索查询
