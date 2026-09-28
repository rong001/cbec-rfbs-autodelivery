# 跨境自动履约控制台 · CBEC Ozon rFBS

> **演示数据 / DEMO** — 非 Ozon 实盘、非生产环境。  
> Ozon 集成状态恒为 **NOT_CONFIGURED**。禁止宣称 LIVE_READ / LIVE_WRITE。

Vue 3 + Vite + Arco Design 运营工作台；本地可接 NestJS + Prisma + Postgres 做闭环。  
GitHub Pages 仅托管 **静态前端 + 浏览器内演示适配器**（无 API / 无数据库）。

## Live Demo（GitHub Pages）

**https://rong001.github.io/cbec-rfbs-autodelivery/**

| | |
|---|---|
| Demo 登录 | `demo@local.dev` / `Demo123!` |
| 亦接受 | `admin@local.dev` / `Admin123!`（演示适配器内） |
| 演示集 | 义乌冷启动 / 广州成熟店 / 多店峰值（顶栏切换，localStorage `cbec_demo_v1`） |

### 什么是假的 / 什么是真的

| 项 | 状态 |
|---|---|
| 店铺 / 商品 / 刊登 / 订单 / 面单 / 库存 / 规则 / 审计 UI | **演示数据**（可点击闭环） |
| 面单运单号 | **INTERNAL_GENERATED**（非承运商 API） |
| Ozon / 1688 | **NOT_CONFIGURED** |
| Nest API + Postgres | **仅本地**；Pages 站点不连接 |
| 生产密钥 / `.env` | **不进仓库** |

姊妹公共演示（vanilla SPA）：https://rong001.github.io/ozonflow-rfbs-app/

## 本地运行

### 前置

- Node 22+
- Postgres（本地 API 需要）
- 复制 `.env.example` → `.env`（勿提交）

### API（:3200）

```bash
cd apps/api
npm ci
npx prisma migrate deploy   # 或按项目文档
npm run start:dev
# 可选：灌演示数据
node scripts/seed-demo.mjs
```

默认种子账号：`admin@local.dev` / `Admin123!`

### Web（:3201）接真实 API

```bash
cd apps/web
npm ci
npm run dev
```

### Web 纯演示模式（不启 API）

```bash
cd apps/web
npm run dev:demo
# 或构建
npm run build:demo
npm run preview:demo
```

环境变量：

| 变量 | 含义 |
|---|---|
| `VITE_DEMO=true` | 强制走演示适配器 |
| `VITE_API_BASE` | 非 demo 时的 API 根（默认 `http://127.0.0.1:3200`） |
| `VITE_BASE` | Vite `base`（Pages 构建为 `/cbec-rfbs-autodelivery/`） |
| `localStorage cbec_force_demo=1` | 运行时强制 demo |

路由使用 **hash history**（`#/...`），便于 GitHub Pages。

## 文档

- `docs/DEMO_FRONTEND.md` — 演示前端设计说明
- `docs/DELIVERY_REPORT.md` — 交付报告
- `docs/PRD.md` / `ACCEPTANCE.md` — 业务需求仍为 provisional
- `ENGINE_AUTODELIVERY_MASTER.md` — 总控

## 授权说明

- 用户于 **2026-09-28** 授权：完善前端演示 + 发布到 GitHub Pages（静态公开 URL）。
- **未授权**：staging / production 服务器部署、Ozon 实盘密钥写入、生产库变更。

## License

私有演示仓库约定以账号策略为准；本仓库按 public demo 发布时仅含合成数据与脚手架。
