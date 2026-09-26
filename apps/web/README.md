# 跨境自动履约 · Web 控制台

Vue 3 + TypeScript + Vite + Arco Design Vue。仅对接本地 Nest API（`http://127.0.0.1:3200`），无 mock 列表、无假成功提示。

## 前置

- API 已在 `3200` 运行（NestJS + Prisma + 本地 Postgres）
- 种子管理员：`admin@local.dev` / `Admin123!`

## 安装与启动

```bash
cd apps/web
npm install
npm run dev -- --host 127.0.0.1 --port 3201
```

浏览器打开：http://127.0.0.1:3201

也可使用 Vite 代理：请求 `/api/*` 会转发到 `3200`（去掉 `/api` 前缀）。默认前端直接请求 `http://127.0.0.1:3200`（API CORS 已放行 3201）。

## 冒烟（无需浏览器）

```bash
node scripts/smoke-ui-api.mjs
```

登录后依次请求 health / shops / products / listings / orders / shipments / inventory / integrations / audit。

## 重要说明

- **数据在本地 Postgres**，不是 Ozon 实盘。Ozon 集成状态应为 `NOT_CONFIGURED`。
- 面单号为本地 `INTERNAL_GENERATED`，非承运商 API。
- JWT 存在 `localStorage`（`cbec_access_token`）。

## 页面

| 路由 | 说明 |
|------|------|
| `/login` | 登录 |
| `/` | 总览（health + 计数） |
| `/shops` | 店铺列表/创建 |
| `/products` | 选品认领 |
| `/listings` | 刊登推进/发布 |
| `/orders` | 审单/创建/跑规则 |
| `/shipments` | 面单/发货 |
| `/inventory` | 库存调整 |
| `/integrations` | 集成状态 |
| `/audit` | 审计日志 |
