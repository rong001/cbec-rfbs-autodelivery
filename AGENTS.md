# AGENTS.md — 跨境定制 / Engine Autodelivery

## 项目根
`/workspace/project`

## 目标
交付真实可运营业务系统（输入→处理→持久化→权限→结果→反馈→异常→审计），不是演示站或自动开发平台。

## 关键命令（落地后更新）
- 后端：`cd apps/api && npm run start:dev`
- 前端：`cd apps/web && npm run dev`
- 测试：`npm test`（根或各包）
- 迁移：`cd apps/api && npm run migration:run`

## 数据库（本地）
- DB: `cbec_autodelivery` · Role: `cbec_engine`
- 连接串见 `.env`（勿提交）；示例见 `.env.example`

## 禁止
- 用固定数组/随机数/假 toast 冒充功能完成
- 无授权时伪造第三方“已接通”
- 生产写、付费、破坏性操作、扩大网络暴露未经授权
- 覆盖用户未提交改动；不得 `git reset --hard` 掩盖冲突
- 在对话中粘贴真实密钥

## 候选既有资产（只读参考，勿直接覆盖对方仓库未提交文件）
- `/workspace/ozonflow-rfbs-app`（演示 SPA，可复用领域模型与 UI 流程）
- `/workspace/ozon-rfbs-prototype`
- `/workspace/crossborder-ai-midplatform-repo`

## 恢复
见 `DELIVERY_STATE.json` 的 `next_action` 与 `TASKS.yaml`。
