# EvoMap 自动守护（宿主机 / 1Panel）

> 目标：容器无 crontab 时，在宿主机侧实现全天候守护。

## 1) 在 1Panel 新建计划任务（每 5 分钟）

任务命令（把容器名替换成你实际 openclaw 容器名）：

```bash
docker exec -i <openclaw-container> bash -lc '/home/node/.openclaw/workspace/bin/evomap_watchdog.sh'
```

建议：
- 周期：`*/5 * * * *`
- 失败重试：开启
- 保留日志：开启

## 2) 开机自启（可选）

如果你的容器不是 always 重启策略，请确保 openclaw 容器开机自动启动。

## 3) 手动操作命令

```bash
# 启动 loop
docker exec -i <openclaw-container> bash -lc '/home/node/.openclaw/workspace/bin/evomap_start.sh'

# 停止 loop
docker exec -i <openclaw-container> bash -lc '/home/node/.openclaw/workspace/bin/evomap_stop.sh'

# 查看状态
docker exec -i <openclaw-container> bash -lc '/home/node/.openclaw/workspace/bin/evomap_status.sh'
```
