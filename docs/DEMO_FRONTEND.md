# Demo Frontend Design Note

**Product:** CBEC Ozon rFBS autodelivery console (Vue 3 + Vite + Arco)  
**Audience:** Professional CBEC ops operators (calm confidence) with a premium ToC product shell  
**Honesty:** 全部为 **演示数据 / DEMO**。Ozon = `NOT_CONFIGURED`。GitHub Pages 仅托管静态前端，无 Nest API / Postgres。

## Principles

1. **Pro-ops first, ToC chrome second** — information hierarchy and dense work queues win on ops pages; brand atmosphere stays on login + dashboard.
2. **2–3 brand hues only** — deep indigo ink + electric blue + soft cyan ice; semantic success/warn/danger stay muted, never a 4th brand.
3. **One accent blue for primary only** — primary CTA / active nav / dataset pill; status tags use muted semantic colors, not neon.
4. **Breathing atmosphere (restrained)** — ambient aurora dialled down on ops (`is-ops`); brand breathe limited to login CTA, brand mark on dashboard, one KPI hero.
5. **Strong but adult interaction** — hover / focus / active / press; no toy-like bounce on work tables.
6. **One honesty banner always visible** — amber chip in topbar; never hide 演示数据 / Ozon NOT_CONFIGURED.
7. **Closed-loop offline** — demo adapter covers all view paths without Nest API.
8. **Dataset switcher as product control** — topbar segment, not a raw select.

## Pro-ops pass (2026-09-28)

Elevated visual craft for a CBEC ops pro at a glance:

| Area | Change |
|---|---|
| **Information hierarchy** | Page header = title (20px/650) + meta line + primary action; forms/cards/tables layered; competing glow reduced |
| **Density** | Table row ~40px, sticky header 36px, tabular-nums, zebra wash, hairline separators; card padding tightened |
| **State language** | Shared `StatusTag` + `utils/status.ts` — 待审/已审/待发/已发/失败/未配置等 Chinese labels with muted tone tokens |
| **Chrome restraint** | `.app-shell.is-ops` lowers aurora opacity; sidebar active = flat electric (no bloom); primary btn solid blue (gradient reserved for login/dashboard hero) |
| **Empty / loading / error** | `OpsEmpty` + `TableSkeleton` on shops/products/listings/orders/shipments/inventory/rules/audit/integrations |
| **Micro-interaction** | Keep hover/press; remove card lift on ops; queues/KPI keep restrained lift on dashboard only |

Shared components: `components/StatusTag.vue`, `OpsEmpty.vue`, `TableSkeleton.vue`.

## Color (exactly 3 brand hues + neutrals + muted semantics)

| Token | Value | Use |
|---|---|---|
| `--ink` / `--bg-shell` | `#0B1220` | Sidebar shell |
| `--ink-elevated` | `#121A2B` | Sidebar wells |
| `--electric` | `#3B82F6` | Primary actions, links, active |
| `--electric-soft` | `#60A5FA` | Hover / focus ring |
| `--ice` | `#22D3EE` | Gradient tip (login/KPI accent only) |
| `--bg-page` | `#F1F5F9` | Content canvas |
| `--bg-solid` | `#FFFFFF` | Cards / tables |
| `--border` | `rgba(15, 23, 42, 0.07)` | Hairline |
| `--text` | `#0F172A` | Primary copy |
| `--text-muted` | `#64748B` | Secondary / meta |
| `--demo-amber` | `#F59E0B` | DEMO honesty chip |
| `--success` | `#059669` | 已发 / 启用 / 正常 |
| `--warn` / `--pending` | `#D97706` / `#B45309` | 预警 / 待审 / 未配置 |
| `--danger` | `#DC2626` | 失败 / 阻断 |
| `--info` | `#0369A1` | 已审 / 就绪 |

No rainbow, no Inter-only, no bigger neon. Professional = calm confidence + blue accent.

## Typography

- Latin UI: **Plus Jakarta Sans** (400–700). Fallback: system-ui. **Do not use Inter as primary.**
- Chinese: `"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`.
- Mono IDs / tracking: `ui-monospace, SFMono-Regular, Menlo, Consolas` + tabular-nums.
- Page titles 20px / 650; KPI ~28px / 700; body 13px; table header 11.5px.

## Layout

- Sidebar 224px: deep ink, flat electric active pill (no bloom on ops).
- Topbar 52px: honesty chip + dataset segment + user.
- Content padding 18–20px; cards radius 12px; tables dense.
- Ops pages: solid white cards, quiet aurora; login/dashboard may keep richer glass/aurora.

## Motion (restrained)

| Motion | Spec |
|---|---|
| Ambient aurora | Low opacity; further reduced under `.is-ops` |
| Breathing glow | Login CTA + dashboard brand/KPI only; disabled under reduced motion |
| Page enter | `fadeRise` 140ms |
| Hover | Buttons translateY(-1px); ops cards do **not** lift |
| Press | Primary scale(0.98) |

## Status map (Chinese)

| Code | Label | Tone |
|---|---|---|
| PENDING_REVIEW | 待审 | pending |
| APPROVED | 已审 | info |
| PENDING_PROCUREMENT | 待采 | warn |
| AWAITING_SHIPMENT | 待发 | accent |
| SHIPPED | 已发 | success |
| CANCELLED | 已取消 | neutral |
| DRAFT / MAPPING / READY / PUBLISHED / FAILED | 草稿 / 映射中 / 就绪 / 已发布 / 失败 | … |
| NOT_CONFIGURED | 未配置 | warn |

## Demo datasets

| Key | Name | Intent |
|---|---|---|
| `yiwu_cold` | 义乌冷启动 | 少店、少 SKU、待认领/草稿为主 |
| `guangzhou_mature` | 广州成熟店 | 多 SKU、在售、待审与库存预警 |
| `multishop_peak` | 多店峰值 | 多店、超时风险、待办压力 |

Integrations always expose Ozon as **NOT_CONFIGURED**.

## Build / Pages

- `VITE_DEMO=true` → adapter only.
- `base` = `/cbec-rfbs-autodelivery/` on Pages; router **hash history**.
- Demo login: `demo@local.dev` / `Demo123!`
- Deploy: `gh-pages` branch static dist.

## Self-critique

- Ops density vs ToC polish: polish lives in login/dashboard chrome; work pages stay calm and dense.
- Status tags must stay muted — never compete with the single primary blue.
- Honesty chip remains amber, never camouflaged into brand blue.
- Skeletons only on first empty load; subsequent refresh uses Arco table loading.
