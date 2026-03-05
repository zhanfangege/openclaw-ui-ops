# VERIFY - OpenClaw UI Docker 部署验收清单

> 目标：用最少命令确认部署成功、鉴权生效、可对外访问。

## 0) 前置

- 已完成 `docker compose up -d`
- 已在 `deploy/.env` 配置 `UI_TOKEN`

---

## 1) 容器状态检查

```bash
cd deploy
docker compose ps
```

通过标准：
- `openclaw-ui` 状态为 `Up`

---

## 2) 日志健康检查

```bash
cd deploy
docker compose logs --tail=120 openclaw-ui
```

通过标准：
- 无持续报错循环（如 `EADDRINUSE`、模块缺失、语法错误）
- 服务已监听目标端口（默认 18790）

---

## 3) 本机接口鉴权检查

```bash
# 不带 token（应失败）
curl -i http://127.0.0.1:18790/api/quick-commands

# 带 token（应成功）
curl -i -H "x-ui-token: <你的UI_TOKEN>" http://127.0.0.1:18790/api/quick-commands
```

通过标准：
- 第一个请求返回 `401 unauthorized`
- 第二个请求返回 `200` 且 body 包含 `"ok":true`

---

## 4) 局域网访问检查

```bash
# 查看宿主机IP（择一）
hostname -I
ip a
```

浏览器访问：
- `http://<宿主机IP>:18790`

通过标准：
- 页面可打开
- 在页面输入 token 后，可正常加载看板数据

---

## 5) 端口映射确认

```bash
cd deploy
docker compose port openclaw-ui 18790
```

通过标准：
- 输出包含 `0.0.0.0:18790` 或实际对外监听地址

---

## 6) 重启恢复检查（自愈能力）

```bash
cd deploy
docker compose restart openclaw-ui
sleep 3
docker compose ps
curl -i -H "x-ui-token: <你的UI_TOKEN>" http://127.0.0.1:18790/api/quick-commands
```

通过标准：
- 重启后容器恢复为 `Up`
- API 仍返回 `200`

---

## 7) 常见故障快速排查

### A. 页面打不开
```bash
cd deploy
docker compose ps
docker compose logs --tail=200 openclaw-ui
```
检查：容器是否运行、端口是否占用、防火墙是否放行 18790。

### B. 一直 401
检查：
- 页面右上角 token 是否与 `.env` 中 `UI_TOKEN` 完全一致
- 修改 `.env` 后是否已执行 `docker compose up -d`

### C. 启动后立即退出
```bash
cd deploy
docker compose logs --tail=200 openclaw-ui
```
常见原因：依赖安装失败、工作目录错误、端口冲突。

---

## 8) 最终验收（勾选）

- [ ] `docker compose ps` 显示 `openclaw-ui` 为 `Up`
- [ ] 不带 token 请求返回 401
- [ ] 带 token 请求返回 200 且 `ok=true`
- [ ] 局域网地址可访问页面
- [ ] 重启后可自动恢复并保持可用
