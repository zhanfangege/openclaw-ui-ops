# GitHub Packages (GHCR) 使用说明

> EN Summary: GHCR package usage guide including tags, visibility policy, pull/run examples, and publish triggers.

> 中文说明：GHCR 镜像使用说明，含标签策略、可见性建议、拉取运行示例与发布触发方式。

## 1) 镜像地址

- `ghcr.io/zhanfangege/openclaw-ui-ops:latest`
- `ghcr.io/zhanfangege/openclaw-ui-ops:v0.1.1`

---

## 2) 标签策略（建议）

- `latest`：默认最新稳定版本
- `vX.Y.Z`：精确版本标签（如 `v0.1.1`）

建议生产环境固定使用版本标签，避免 `latest` 漂移。

---

## 3) 包可见性建议

- 开源项目建议将包设为 **Public**，降低拉取门槛
- 若暂时内测可先 Private，稳定后切 Public

在 GitHub 页面操作：
- 仓库右侧 `Packages` -> 进入包详情 -> `Package settings` -> 修改 visibility

---

## 4) 拉取与运行示例

### 4.1 直接运行

```bash
docker run -d \
  --name openclaw-ui \
  -p 18790:18790 \
  -e PORT=18790 \
  -e HOST=0.0.0.0 \
  -e UI_TOKEN=replace-with-a-strong-random-token \
  --restart unless-stopped \
  ghcr.io/zhanfangege/openclaw-ui-ops:latest
```

### 4.2 验证

```bash
curl -i http://127.0.0.1:18790/api/quick-commands
curl -i -H "x-ui-token: replace-with-a-strong-random-token" http://127.0.0.1:18790/api/quick-commands
```

预期：
- 第一条 401
- 第二条 200 且 `ok=true`

---

## 5) 发布触发

已配置工作流：`.github/workflows/publish-ghcr.yml`

触发方式：
- 推送标签：`git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`
- GitHub Actions 手动触发（workflow_dispatch）
