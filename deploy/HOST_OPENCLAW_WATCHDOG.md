# OpenClaw UI 宿主机守护（通用 Linux）

> EN Summary: Host-level watchdog strategy for Linux, with Docker restart policy first and script-based checks as fallback.

> 中文说明：Linux 宿主机守护方案，优先 Docker 重启策略，脚本巡检作为补充。

> 目标：确保 `openclaw-ui` 持续可用，异常时自动拉起。

## 方案 A（推荐）：Docker 自带重启策略

如果你用 Docker/1Panel 部署，优先使用：

- `restart: unless-stopped`（compose）
- 或 `--restart unless-stopped`（docker run）

这通常就足够应对进程退出与宿主机重启。

---

## 方案 B：脚本健康检查（补充）

项目内置脚本（仓库内）：

- `openclaw-ui/scripts/start.sh`
- `openclaw-ui/scripts/watchdog.sh`
- `openclaw-ui/scripts/watchdog-loop.sh`

手动启动：

```bash
cd openclaw-ui
./scripts/start.sh
nohup ./scripts/watchdog-loop.sh > runtime/watchdog-loop.nohup.log 2>&1 &
```

---

## crontab（可选）

每 5 分钟执行一次单次巡检：

```bash
*/5 * * * * cd /path/to/openclaw-ui && ./scripts/watchdog.sh >> runtime/cron-watchdog.log 2>&1
```

---

## 验证

```bash
curl -I http://127.0.0.1:18790
```

返回 `HTTP/1.1 200 OK` 代表 UI 服务可用。
