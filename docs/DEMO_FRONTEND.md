# Demo Frontend Design Note

**Product:** CBEC Ozon rFBS autodelivery console (Vue 3 + Vite + Arco)  
**Audience:** ToC-feeling product demo — premium consumer polish on an ops console  
**Honesty:** 全部为 **演示数据 / DEMO**。Ozon = `NOT_CONFIGURED`。GitHub Pages 仅托管静态前端，无 Nest API / Postgres。

## Principles

1. **ToC premium product shell** — Linear / Arc / Apple Music / Stripe consumer polish, NOT dull gray admin chrome.
2. **2–3 brand hues only** — deep indigo ink + electric blue + soft cyan ice; semantic success/warn/danger stay muted, never a 4th brand.
3. **Breathing atmosphere** — ambient gradient mesh, soft glow on brand / primary CTA / KPI heroes; respect `prefers-reduced-motion`.
4. **Strong interaction** — hover / focus / active / press on every control; sticky elegant tables; skeleton pulse loading; empty states with one CTA.
5. **One honesty banner always visible** — elegant amber/ice chip in topbar; never hide that this is 演示数据 / Ozon NOT_CONFIGURED.
6. **Closed-loop offline** — demo adapter covers all view paths; claim → list → order → review → label → ship → inventory → audit works without API.
7. **Dataset switcher as product control** — topbar segment, not a raw select.

## Color (exactly 3 brand hues + neutrals)

| Token | Value | Use |
|---|---|---|
| `--ink` / `--bg-shell` | `#0B1220` | Sidebar shell, brand text weight |
| `--ink-elevated` | `#121A2B` | Sidebar hover wells |
| `--electric` | `#3B82F6` | Primary actions, links, active glow |
| `--electric-soft` | `#60A5FA` | Hover / bloom |
| `--ice` | `#22D3EE` | Gradient tip, breathing highlights |
| `--ice-mist` | `#93C5FD` | Soft aurora wash |
| `--bg-page` | `#F4F7FB` | Content canvas |
| `--bg-surface` | `rgba(255,255,255,0.78)` | Glass cards |
| `--bg-solid` | `#FFFFFF` | Dense tables / forms |
| `--border` | `rgba(15, 23, 42, 0.08)` | Hairline |
| `--border-glow` | `rgba(59, 130, 246, 0.35)` | Hero card edge |
| `--text` | `#0F172A` | Primary copy |
| `--text-muted` | `#64748B` | Secondary |
| `--demo-amber` | `#F59E0B` | DEMO honesty chip (semantic, not brand) |
| `--success` | `#10B981` | Ready / shipped (muted) |
| `--warn` | `#F59E0B` | Stock risk |
| `--danger` | `#EF4444` | ETA risk |

Gradients stay intentional: `indigo → electric → ice` only. No rainbow, no cream+terracotta, no acid neon.

## Typography

- Latin UI: **Plus Jakarta Sans** (weights 400–700). Fallback: Outfit → system-ui. **Do not use Inter as primary.**
- Chinese: `"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`.
- Mono IDs / tracking: `ui-monospace, SFMono-Regular, Menlo, Consolas`.
- Page titles ~22px / 650; KPI values ~28–32px / 700; body 14px.

## Layout

- Sidebar 232px (collapsible): deep ink shell, gradient active pill + soft blue bloom.
- Glass topbar 60px: honesty chip + product dataset control + user + logout.
- Content: ambient aurora mesh behind; padding 24px; max readable width optional on forms, full-bleed for tables/KPI.
- Cards: glass or solid white, 14–16px radius, soft shadow + optional gradient border on heroes.
- Tables: sticky header, denser row height, row hover wash in electric/8%.

## Motion & atmosphere (required)

| Motion | Spec |
|---|---|
| Ambient aurora | Fixed soft radial blobs (blue/cyan/indigo), very low opacity behind content |
| Breathing glow | `@keyframes breathe` 5s ease-in-out infinite on brand mark, primary CTA, KPI heroes (box-shadow opacity 0.25↔0.55) |
| Page enter | `fadeRise` 160ms ease-out on route change (opacity + 8px translateY) |
| Hover lift | Cards/buttons: translateY(-2px) + shadow deepen, 160ms |
| Press | Primary: scale(0.98) on `:active` |
| Sidebar active | Gradient pill (`electric → ice`) + blue bloom |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` → disable infinite breathe; keep short fades optional |

Prefer CSS / Vue `<Transition>`; no Framer Motion / heavy libs.

## Interaction strength

- All controls: clear hover / focus-visible ring (electric soft) / active / disabled opacity.
- Loading: soft pulse skeleton on KPI strip when fetching; not blank.
- Empty: icon + short Chinese copy + one primary CTA where relevant.
- Login: gradient stage + glass card + breathing logo — memorable hero #1.
- Dashboard: hero KPI strip with gradient borders/glow — memorable hero #2; queue cards clickable with micro-motion.
- Dataset switcher: segmented product control in topbar.

## Demo datasets

| Key | Name | Intent |
|---|---|---|
| `yiwu_cold` | 义乌冷启动 | 少店、少 SKU、待认领/草稿为主，适合走完整闭环 |
| `guangzhou_mature` | 广州成熟店 | 多 SKU、在售、待审单与库存预警 |
| `multishop_peak` | 多店峰值 | 多店、超时风险订单、待办队列压力 |

Integrations always expose Ozon as **NOT_CONFIGURED** with an honesty message.

## Build / Pages

- `VITE_DEMO=true` → adapter only (no fetch to Nest).
- `base` = `/cbec-rfbs-autodelivery/` on Pages; router uses **hash history**.
- Demo login: `demo@local.dev` / `Demo123!`（亦接受本地 admin 凭据便于熟悉）.
- Deploy: `gh-pages` branch static dist (Actions workflow optional — OAuth may lack `workflow` scope).

## Self-critique

- Risk of over-animating: keep breathe low-opacity and disable under reduced motion.
- Glass + aurora can wash contrast — keep text on solid ink/white, never on busy mesh alone.
- Ops density vs ToC polish: tables stay dense; polish lives in chrome, KPI, login — not in decorative fluff on every row.
- Honesty chip must remain readable (amber/ice), never camouflaged into brand blue.
