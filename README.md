# openclaw-ui-ops

OpenClaw 运维与控制台项目（含独立 Web 看板 `openclaw-ui`）。

> 目标：把 OpenClaw 的运行状态、会话执行、快捷运维命令、审计日志集中到一个可视化入口，支持桌面与手机访问。

---

## 1. 项目包含什么

- `openclaw-ui/`：独立 Web 控制台（Express + WebSocket + PTY）
- `bin/`：运维脚本（watchdog、自恢复、巡检、代理开关等）
- `deploy/`：部署说明（宿主机自启、守护建议）
- `ops/`：运行日志与运维策略
- `memory/`：操作记录与每日决策沉淀

---

## 2. 核心能力

- **运行看板**：OpenClaw / Gateway / Sessions / Subagents / 资源状态
- **快捷命令执行**：一键触发常见命令，实时回显输出
- **审计记录**：执行事件记录到 `openclaw-ui/audit.log`
- **安全开关**：支持 `UI_TOKEN` 鉴权
- **手机适配**：响应式布局，支持移动端浏览器访问
- **自恢复**：看板 watchdog 自动检测异常并重启

---

## 3. 快速开始（本地）

### 3.1 环境要求

- Node.js >= 18（推荐 20+）
- npm
- 已安装 `openclaw` CLI（命令可在 shell 中直接调用）

### 3.2 启动步骤

```bash
cd openclaw-ui
npm install
PORT=18790 HOST=0.0.0.0 npm start
```

访问：

- 本机：`http://localhost:18790`
- 局域网：`http://<你的IP>:18790`

---

## 4. Docker 部署（推荐）

如果你把项目跑在容器里，务必做端口映射：

```bash
-p 18790:18790
```

`docker-compose.yml` 示例（核心片段）：

```yaml
services:
  openclaw-ui:
    image: node:22
    working_dir: /workspace/openclaw-ui
    command: sh -lc "npm ci && PORT=18790 HOST=0.0.0.0 npm start"
    ports:
      - "18790:18790"
    volumes:
      - ./:/workspace
    restart: unless-stopped
```

---

## 5. 生产可用建议（强烈推荐）

1. 设置 `UI_TOKEN`，禁止裸奔
2. 通过 Nginx/Caddy 反代并启用 HTTPS
3. 仅开放内网访问或叠加访问白名单
4. 开启日志轮转（`ui.log` / `audit.log`）
5. 配置 watchdog + 宿主机自启

---

## 6. 一键自恢复（已内置脚本）

项目内已提供：

- `bin/openclaw_ui_start.sh`
- `bin/openclaw_ui_watchdog.sh`
- `bin/openclaw_ui_watchdog_loop.sh`

示例：

```bash
# 启动看板
/home/node/.openclaw/workspace/bin/openclaw_ui_start.sh

# 启动循环守护（每60s检查）
nohup /home/node/.openclaw/workspace/bin/openclaw_ui_watchdog_loop.sh \
  >/home/node/.openclaw/workspace/openclaw-ui/runtime/watchdog-loop.nohup.log 2>&1 &
```

---

## 7. 文档入口

- UI 详细说明：`openclaw-ui/README.md`
- 宿主机守护：`deploy/HOST_OPENCLAW_WATCHDOG.md`
- 1Panel 自动运行：`deploy/HOST_AUTORUN_1PANEL.md`

---

## 8. 常见问题（FAQ）

### Q1: 页面打不开？
- 先确认进程在跑
- 再确认端口映射（容器场景最常见）
- 再看防火墙/安全组

### Q2: 手机显示错位？
- 强制刷新缓存（或无痕模式）
- 确认版本已更新到最新提交

### Q3: 为什么 push GitHub 失败？
- 建议用 SSH key 免登录方案（一次配置，长期可用）

---

## 9. License

当前仓库未单独声明许可证；如需开源发布，建议补充 LICENSE 文件后再对外分发。
