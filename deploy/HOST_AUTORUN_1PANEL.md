# OpenClaw UI 在 1Panel 的自动运行指南

> EN Summary: 1Panel deployment and autorun guidance for `openclaw-ui`, including compose command recommendations, health checks, and troubleshooting.

> 中文说明：用于 1Panel 场景下的自动运行配置、巡检命令与故障排查。

## 1) 推荐部署配置

在 1Panel 的 Docker/Compose 应用中，确保：

- 映射端口：`18790:18790`
- 工作目录包含 `openclaw-ui`
- 启动命令：

```bash
sh -lc "cd /workspace/openclaw-ui && npm ci && PORT=18790 HOST=0.0.0.0 npm start"
```

- 重启策略：`unless-stopped`

---

## 2) 可选：计划任务巡检

如果你希望双保险，可在 1Panel 计划任务中每 5 分钟执行：

```bash
docker exec -i <openclaw-container> bash -lc 'cd /home/node/.openclaw/workspace/openclaw-ui && ./scripts/watchdog.sh'
```

---

## 3) 常见故障排查

### 页面打不开
1. 看容器状态是否 Running
2. 看端口映射是否为 `18790:18790`
3. 看防火墙是否放通 18790

### 启动报错
1. 进入容器执行 `node -v`、`npm -v`
2. 在 `openclaw-ui` 内执行 `npm ci`
3. 查看日志：`openclaw-ui/runtime/ui.log`
