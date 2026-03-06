# DEPLOY_CHECKLIST

> EN Summary: A cold-start deployment checklist for first-time setup, covering prerequisites, install/start steps, token hardening, verification, and acceptance criteria.

> 中文说明：面向首次部署的冷启动清单，包含环境检查、启动、鉴权加固、验证与验收标准。

面向首次访问者的“冷启动部署检查单”（按顺序执行）。

## 0) 前置条件

- Node.js >= 18（推荐 20+）
- npm 可用
- 端口 18790 可用

检查：

```bash
node -v
npm -v
```

---

## 1) 拉取代码

```bash
git clone https://github.com/zhanfangege/openclaw-ui-ops.git
cd openclaw-ui-ops
```

---

## 2) 安装依赖

```bash
cd openclaw-ui
npm ci
```

---

## 3) 配置 Token（强烈建议）

### Linux/macOS（环境变量方式）

```bash
export UI_TOKEN='replace-with-a-strong-random-token'
export PORT=18790
export HOST=0.0.0.0
npm start
```

### Linux/macOS（配置文件方式）

```bash
cp .env.example .env
# 编辑 .env
set -a; . ./.env; set +a
npm start
```

### Windows PowerShell

```powershell
$env:UI_TOKEN="replace-with-a-strong-random-token"
$env:PORT="18790"
$env:HOST="0.0.0.0"
npm start
```

> 未设置 `UI_TOKEN` 也能启动，但不建议在公网或不可信网络中使用。

---

## 4) 访问验证

- 浏览器打开：`http://localhost:18790`
- 局域网访问：`http://<主机IP>:18790`

接口检查：

```bash
curl -s http://127.0.0.1:18790/api/quick-commands
```

返回 `{"ok":true,...}` 代表服务正常。

---

## 5) Docker 部署（推荐）

```bash
cd deploy
cp .env.example .env
# 编辑 UI_TOKEN
docker compose up -d
```

核对项：
- 端口映射为 `18790:18790`
- 重启策略 `unless-stopped`
- `UI_TOKEN` 已设置

---

## 6) 自恢复（可选）

```bash
cd openclaw-ui
./scripts/start.sh
nohup ./scripts/watchdog-loop.sh > runtime/watchdog-loop.nohup.log 2>&1 &
```

---

## 7) 常见失败点排查

1. 页面打不开：端口没映射 / 防火墙未放行
2. 命令无输出：环境里 `openclaw` 命令不可用
3. 样式异常：浏览器缓存，强刷页面
4. 鉴权失败：前端未填写正确 `UI_TOKEN`

---

## 8) 验收标准

- [ ] 首页可访问
- [ ] `/api/quick-commands` 返回 ok=true
- [ ] 快捷命令可执行并有实时输出
- [ ] 设置 token 后，未携带 token 请求返回 401

详细验收步骤见：`deploy/VERIFY.md`
