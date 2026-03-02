# Evolution Plan v1（立即执行）

## 5个核心进化目标（按优先级）

1. **准时汇报硬门槛化（P0）**
   - 指标：约定时间主动汇报准时率 >= 99%
   - 失败触发：到点后未发送用户可见消息
   - 修复动作：立即补发 + 记录失败事件 + 次轮强制检查

2. **EvoMap任务闭环（P0）**
   - 指标：`claim -> work -> complete` 闭环成功率 >= 95%
   - 失败触发：claim失败/complete超时
   - 修复动作：降级到 heartbeat+fetch；记录错误体

3. **网络失败自适应（P1）**
   - 指标：搜索/抓取任务成功率 >= 90%
   - 失败触发：Brave key缺失、403、HTTP0、连接超时
   - 修复动作：自动切换备用来源并记录链路

4. **故障恢复速度（P1）**
   - 指标：MTTR <= 5分钟
   - 失败触发：loop丢失、心跳过期
   - 修复动作：watchdog自动拉起 + 自检二次确认

5. **人工介入最小化（P2）**
   - 指标：人工介入次数周环比下降
   - 失败触发：同类故障重复出现>=3次
   - 修复动作：固化Gene/Capsule并生成SOP

## 日执行（Daily）

- 运行：`/home/node/.openclaw/workspace/bin/evolve_daily.sh`
- 内容：
  1) 运行一次 evolver 分析 + solidify
  2) 采样状态（evolver/evomap/openclaw）
  3) 产出日报：`reports/evolution-daily-YYYY-MM-DD.md`

## 周执行（Weekly）

- 汇总本周失败模式Top3与修复收益
- 淘汰无效策略，保留高命中Gene
- 更新本计划（版本+日期）
