# Demo Frontend Design Note

**Product:** CBEC Ozon rFBS autodelivery console (Vue 3 + Vite + Arco)  
**Audience:** Ops / 运营工作台演示（非营销落地页）  
**Honesty:** 全部为 **演示数据 / DEMO**。Ozon = `NOT_CONFIGURED`。GitHub Pages 仅托管静态前端，无 Nest API / Postgres。

## Principles

1. **Dense ops workbench** — KPI 卡、待办队列、表格与主操作按钮优先，不做 hero / splash。
2. **Restrained Western enterprise SaaS** — 浅冷灰底、细边框、单一冷蓝强调色；信息密度高但不花哨。
3. **One honesty banner always visible** — 顶栏固定「演示数据 · DEMO · 非 Ozon 实盘」。
4. **Closed-loop offline** — demo adapter 覆盖现有视图调用的全部路径；认领→刊登→出单→审单→面单→发货→库存扣减→审计可在无 API 下走通。
5. **Dataset switcher** — 顶栏可切换 2–3 套场景；`localStorage` 键 `cbec_demo_v1` 持久化当前集与突变。

## Color

| Token | Value | Use |
|---|---|---|
| `--bg-page` | `#f2f4f7` | 页面底 |
| `--bg-surface` | `#ffffff` | 卡片 / 顶栏 |
| `--border` | `#e5e6eb` | 细边框 |
| `--text` | `#1d2129` | 主文 |
| `--text-muted` | `#86909c` | 次文 |
| `--accent` | `#165dff` | 主操作 / 侧栏 / 链接 |
| `--accent-deep` | `#0e42d2` | sider trigger / hover |
| `--demo-amber` | `#ff7d00` | DEMO 徽章 |
| `--danger` | `#f53f3f` | 错误 / 超时风险 |
| `--success` | `#00b42a` | 就绪 / 已发货 |

Avoid rainbow tags; status colors stay semantic and sparse.

## Typography

- Latin UI: **IBM Plex Sans** (fallback Source Sans 3 → system-ui).
- Chinese: `"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`.
- Mono IDs / tracking: `ui-monospace, SFMono-Regular, Menlo, Consolas`.
- Avoid Inter-only “AI slop” stacks.

## Layout

- Left sider 220px (collapsible), dark cool-blue brand strip.
- Topbar 56px: honesty + dataset switcher + user + logout.
- Content padding 20px; cards with 1px `#e5e6eb` border, light shadow optional.
- Tables default pageSize 20; empty states use Arco Empty with short Chinese copy.

## Demo datasets

| Key | Name | Intent |
|---|---|---|
| `yiwu_cold` | 义乌冷启动 | 少店、少 SKU、待认领/草稿为主，适合走完整闭环 |
| `guangzhou_mature` | 广州成熟店 | 多 SKU、在售、待审单与库存预警 |
| `multishop_peak` | 多店峰值 | 多店、超时风险订单、待办队列压力 |

Integrations always expose Ozon as **NOT_CONFIGURED** with an honesty message.

## Build / Pages

- `VITE_DEMO=true` → adapter only (no fetch to Nest).
- `base` = `/cbec-rfbs-autodelivery/` on Pages; router uses **hash history** for reliability.
- Demo login: `demo@local.dev` / `Demo123!`（亦接受本地 admin 凭据便于熟悉）。
