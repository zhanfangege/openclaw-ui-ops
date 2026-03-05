# openclaw-ui-ops

![license](https://img.shields.io/badge/license-MIT-blue.svg)
![platform](https://img.shields.io/badge/platform-OpenClaw%20Ops-6f42c1.svg)
![ui](https://img.shields.io/badge/UI-Mobile%20Ready-00bcd4.svg)

OpenClaw 运维与控制台项目（含独立 Web 看板 `openclaw-ui`）。

[中文](./README.md) | [English](./README.en.md)

## 项目预览

### 桌面端（真实截图）
<p>
  <img src="./docs/assets/screenshots/desktop-1.png" width="32%" />
  <img src="./docs/assets/screenshots/desktop-2.png" width="32%" />
  <img src="./docs/assets/screenshots/desktop-3.png" width="32%" />
</p>

### 移动端（真实截图）
<p>
  <img src="./docs/assets/screenshots/mobile-1.jpg" width="24%" />
  <img src="./docs/assets/screenshots/mobile-2.jpg" width="24%" />
  <img src="./docs/assets/screenshots/mobile-3.jpg" width="24%" />
  <img src="./docs/assets/screenshots/mobile-4.jpg" width="24%" />
</p>


> 目标：把 OpenClaw 的运行状态、会话执行、快捷运维命令、审计日志集中到一个可视化入口，支持桌面与手机访问。

---

## 1. 项目包含什么

- `openclaw-ui/`：独立 Web 控制台（Express + WebSocket + PTY）
- `openclaw-ui/scripts/`：启动与 watchdog 自恢复脚本
- `deploy/`：部署说明（宿主机自启、1Panel、守护建议）
- `docs/`：架构文档与展示素材

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

### 3.3 Token 鉴权配置（推荐）

方式 A：直接通过环境变量启动

```bash
cd openclaw-ui
UI_TOKEN='replace-with-a-strong-random-token' PORT=18790 HOST=0.0.0.0 npm start
```

方式 B：使用配置文件（推荐长期维护）

```bash
cd openclaw-ui
cp .env.example .env
# 编辑 .env，把 UI_TOKEN 改成你的强随机值
set -a; . ./.env; set +a
npm start
```

说明：
- 参数模板见：`openclaw-ui/.env.example`
- 设置 `UI_TOKEN` 后，请在页面右上角输入相同 token。
- 未携带或错误 token 的 API 请求会返回 `401 unauthorized`。

访问：

- 本机：`http://localhost:18790`
- 局域网：`http://<你的IP>:18790`

---

## 4. Docker 部署（推荐）

如果你把项目跑在容器里，务必做端口映射：

```bash
-p 18790:18790
```

仓库已提供可直接使用的 compose 文件：`deploy/docker-compose.yml`

一键启动：

```bash
cd deploy
cp .env.example .env
# 编辑 .env，至少设置 UI_TOKEN
docker compose up -d
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

- `openclaw-ui/scripts/start.sh`
- `openclaw-ui/scripts/watchdog.sh`
- `openclaw-ui/scripts/watchdog-loop.sh`

示例：

```bash
cd openclaw-ui
./scripts/start.sh
nohup ./scripts/watchdog-loop.sh > runtime/watchdog-loop.nohup.log 2>&1 &
```

---

## 7. 下载发布资产

已提供可直接下载的发布压缩包（仓库 `releases/` 目录）：

- `releases/openclaw-ui-ops-v0.1.0.tar.gz`
- `releases/openclaw-ui-ops-v0.1.0.sha256`

校验示例：

```bash
sha256sum -c releases/openclaw-ui-ops-v0.1.0.sha256
```

---

## 8. 文档入口

- 英文说明：`README.en.md`
- 变更记录：`CHANGELOG.md`
- 版本规划：`ROADMAP.md`
- 首版发布说明：`RELEASE_NOTES_v0.1.0.md`
- 冷启动部署检查单：`DEPLOY_CHECKLIST.md`
- 架构说明：`docs/ARCHITECTURE.md`
- 展示素材规范：`docs/SHOWCASE.md`
- UI 详细说明：`openclaw-ui/README.md`
- 宿主机守护：`deploy/HOST_OPENCLAW_WATCHDOG.md`
- 1Panel 自动运行：`deploy/HOST_AUTORUN_1PANEL.md`
- Docker 部署验收清单：`deploy/VERIFY.md`

---

## 8. 常见问题（FAQ）

### Q1: 页面打不开？
- 先确认进程在跑
- 再确认端口映射（容器场景最常见）
- 再看防火墙/安全组

### Q2: 手机显示错位？
- 强制刷新缓存（或无痕模式）
- 确认版本已更新到最新提交

---

## 9. License

本项目**完全开源**，采用 MIT License 发布，允许个人和商业场景自由使用、修改与分发。
详见仓库根目录 `LICENSE`。
