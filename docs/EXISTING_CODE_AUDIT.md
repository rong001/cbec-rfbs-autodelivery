# Existing Code Audit — OzonFlow rFBS App

**Audit date:** 2026-09-26  
**Scope:** `/workspace/ozonflow-rfbs-app`, with a brief comparison to `/workspace/ozon-rfbs-prototype`  
**Change policy followed:** no files under either application were modified. This report is the only file created.

## Executive decision

**Recommendation: build a new NestJS + PostgreSQL production foundation under `/workspace/project/app`, while evolving/reusing the OzonFlow app as the UI/demo reference.**

The app is a good product-flow prototype and a useful acceptance-test fixture, but it is not a production engine that can safely be incrementally wired to marketplace APIs. Its state model is a browser-local mutable object, its IDs and external results are fabricated, and there is no server boundary, authentication, durable database, job processing, or integration adapter. Adding those concerns directly into `store.js` would make security, concurrency, retry, and reconciliation behavior difficult to control.

Use a hybrid migration: keep this app for product discovery/demo and port the proven screens and workflows to an API-backed frontend once the NestJS domain/API contracts exist. Do not treat the current localStorage state as the production source of truth.

## 1. Repository/file inventory

### Application tree (all non-VCS files)

| Path | Bytes | Role |
|---|---:|---|
| `index.html` | 16,133 | Static SPA shell and six views |
| `css/styles.css` | 26,418 | UI styles |
| `js/store.js` | 20,089 | Shared state, persistence, selectors, mutations, rule execution |
| `js/demo-seeds.js` | 30,680 | Three complete mock datasets and base rules/channels |
| `js/app.js` | 32,713 | Rendering, navigation, delegated events, UI actions |
| `README.md` | 2,563 | Run/module/architecture notes |
| `DEMO.md` | 3,416 | Three demo scripts and acceptance checklist |
| `verify-dashboard.png` | 117,649 | Verification screenshot (untracked) |
| `verify-guangzhou.png` | 117,653 | Verification screenshot (untracked) |
| `verify-listing-after-claim.png` | 130,600 | Verification screenshot (untracked) |

Non-VCS files total **497,914 bytes**. `.git/` is approximately **288K**; `du -sh .` reports approximately **796K** for the working tree.

There is no `package.json`, lockfile, build configuration, test directory, migration directory, server directory, or adapter directory. The app is intentionally vanilla HTML/CSS/JS with no build step.

### Git state

- Branch: `main`
- `HEAD`: `704447a23dac5b11aa4763047dab2f0df9900441`
- Commit: `feat: OzonFlow rFBS full demo app with shared state and 3 datasets`
- Remote: `origin = https://github.com/rong001/ozonflow-rfbs-app.git` (fetch/push)
- `main` and `origin/main` point to the same commit.
- Dirty worktree: only three untracked PNG verification screenshots listed above; no tracked-file modifications.
- No reset, checkout, discard, or destructive Git operation was performed.

JavaScript syntax checks passed for `js/store.js`, `js/demo-seeds.js`, `js/app.js`, and the prototype `app.js`.

## 2. Architecture summary

1. `index.html` loads `js/demo-seeds.js`, then `js/store.js`, then `js/app.js`.
2. `OzonFlowSeeds` constructs one of three in-memory datasets: `yiwu`, `guangzhou`, or `pressure`.
3. `OzonFlowStore` is an IIFE singleton holding a mutable `state` object and a `Set` of render listeners. Mutations modify the object in place, persist it, and emit a reason to subscribers.
4. `app.js` is a renderer/event layer for six views: dashboard, selection, listing, orders, rules, and logistics/inventory. It calls Store mutations directly; there is no API client or service boundary.
5. CSS and HTML provide the complete presentation. GitHub Pages/static hosting is sufficient for the current behavior.

The result is a coherent offline stateful demo, not a distributed application. “Full loop” means a simulated state transition within one browser origin.

## 3. State and mutation audit

### Persistence

`js/store.js` defines exactly two localStorage keys:

- `ozonflow_rfbs_v1`: JSON serialization of the entire current state.
- `ozonflow_rfbs_demo_id`: current seed ID (`yiwu`, `guangzhou`, or `pressure`).

Initialization defaults to `guangzhou`. With no explicit demo ID, a stored JSON state is reused only when its `meta.id` matches the stored/current demo ID; otherwise a seed is built. Switching or resetting replaces the whole state with a fresh seed and persists it.

Persistence is browser-origin-local, unauthenticated, non-transactional, and not shared across users, tabs, devices, or operators. `persist()` catches storage errors and only logs a warning. There is no schema version/migration mechanism, optimistic concurrency, audit log, or server backup.

The shop dropdown mutates `state.meta.shopName` and re-renders directly; it does not call `emit()`, so that cosmetic selection is not immediately persisted until a later emitting mutation.

### Main state shape

Every seed contains:

- `meta`: demo/shop identity and description.
- `settings`: fixed FX, commission, payment fee, and shipping assumptions.
- `shops`: mock shop list/statuses.
- `catalog`: opportunity products with sales, match score, cost, price, and weight.
- `listings`: listing drafts and mapping/publish states.
- `products`: active products with generated/seeded Ozon SKU values.
- `inventory`: local and “Ozon” quantities, safety stock, and a sync marker.
- `orders`: mock orders, status, buyer/city, logistics, tracking number, automation tags, and timeline.
- `rules`: six seeded IF/THEN-style rules with on/hits/today counters.
- `channels`: mock logistics channels and connection flags.
- `trend`, `claimedIds`, `nextOrderSeq`, and `syncAgoMin`.

### Mutations and behavior

- `claimProduct`: creates a listing draft from a catalog row.
- `advanceListing`: moves draft → mapping → ready; also “fixes” a failed listing.
- `publishListing` / `publishReadyBatch`: changes listing to published, creates a local product, generates a random-looking Ozon SKU, and creates a local inventory row.
- `syncOrders`: selects active products at random, fabricates orders, increments sales, decrements inventory, and labels the timeline “synced from Ozon.” It performs no network operation.
- `runAutoAudit` / `runAllRules` / `applyRulesToOrder`: execute local audit, logistics, purchase-marker, inventory-warning, and waybill rules.
- `auditOrder` / `assignLogistics`: local status/channel changes.
- `markPurchased`: labels a purchase complete, adds five inventory units, and explicitly records `1688 采购下单完成（模拟）`.
- `applyWaybill` / `applyWaybillBatch`: fabricate tracking numbers using a fixed `240926` date fragment plus randomness.
- `shipOrder`: changes status to shipped and appends a local timeline entry; no platform call is made.
- `syncInventory`: copies `local` quantity into the field displayed as `ozon`; it does not reconcile with Ozon.
- `restock`: increments both local and displayed Ozon quantities.
- `connectChannel`: flips a local boolean.
- `calcProfit`, `kpi`, and `badges`: local selectors/calculation helpers.

## 4. HTTP/API/backend/DB findings

No real marketplace, supplier, logistics, backend, WebSocket, database, ORM, or HTTP client was found. Searches covered `fetch`, `axios`, `XMLHttpRequest`, `WebSocket`, socket libraries, PostgreSQL/MySQL/SQLite/MongoDB/Prisma/Drizzle/Supabase/Firebase, GraphQL, and API/server/database markers.

The only external network reference in the app is the Google Fonts stylesheet/preconnect in `index.html`; it is not a business integration. The README's GitHub Pages URL and proposed future adapter names are documentation only.

There is therefore no:

- Ozon credential/token flow or OAuth/service-account storage;
- 1688 client, supplier login, product import, or purchase API;
- backend endpoint, webhook receiver, scheduler, queue, worker, or retry policy;
- database schema, durable order/inventory history, or transaction boundary;
- real response validation, rate limiting, idempotency, reconciliation, or observability.

## 5. Business objects currently present

| Object | Present form | Reality/limitations |
|---|---|---|
| Products/catalog | Ten seeded opportunities; active products with price/cost/weight/margin and `ozonSku` | Mock data; no authoritative marketplace product record, variants, media, barcodes, or attribute payload |
| Listings | Draft/mapping/ready/failed/published rows with Russian title/category/progress | Local status machine; failed reason and mapping are hard-coded/simple SKU heuristics |
| Orders | Audit/purchase/ship/shipped rows with buyer/city/amount/SKU/logistics/tracking/timeline | Seeded or randomly generated; no full address, items/quantities, payment, platform timestamps, cancellations, returns, or reconciliation keys |
| Rules | Six local rule cards: audit, light/heavy logistics, purchase marker, inventory alert, waybill | Executed synchronously in browser; counters are mutable demo values; no durable execution/audit/event history |
| Inventory | Local quantity, displayed Ozon quantity, safety quantity, sync marker | No warehouse/location/lot/reservation/stock-movement model; “sync” is a local copy |
| Shops | Seeded shop names/statuses and a current shop name | Dropdown is largely cosmetic; no account binding or real shop credentials |
| Channels | Mock logistics/OGL/warehouse cards and connected flags | No carrier API, label request, package validation, tracking callback, or rate/route contract |
| Procurement | Only `purchase` order status and `markPurchased` | No purchase-order, supplier, payment, receiving, cost, or 1688 object |

## 6. What is real versus mock

### Real within the demo

- The browser loads and renders a static SPA.
- Navigation, filters, drawers, toasts, calculations, and event wiring work client-side.
- Store mutations genuinely change the in-memory object and, on emitting actions, persist JSON to localStorage.
- The six-module workflow can be demonstrated end to end in one browser: claim → listing progression → local publish → simulated order → local rules → fabricated waybill → shipped status → local inventory update.
- The JavaScript parses successfully.

### Mock or not production-real

- All three datasets, catalog metrics, orders, shops, inventory, channel statuses, and seeded IDs are fixtures.
- “Ozon sync,” product publication, inventory sync, order sync, shipment confirmation, and OGL/channel connection are local functions only.
- Ozon SKUs and tracking numbers are generated or hard-coded; no external identifier is confirmed.
- 1688 is represented by cost/match fields and a simulated purchase marker; no supplier interaction occurs.
- The rule engine is useful as a UX/domain sketch but has no server-side execution guarantees.
- The displayed “Ozon” inventory is directly overwritten from local inventory.
- There is no identity, authorization, tenant isolation, secrets handling, or cross-user durability.

## 7. Reusable modules and recommended reuse paths

### Reuse directly or with light refactoring

- The six-module information architecture and workflow vocabulary.
- HTML/CSS visual system, sidebar/topbar, cards, tables, filters, drawer, status tags, and responsive layout.
- `DEMO.md` as a manual acceptance script and seed scenarios for automated integration tests.
- `demo-seeds.js` as development fixtures and test data only.
- The pure profit calculation concept (`calcProfit`) after moving rates/configuration server-side and adding currency/rounding/tax validation.
- Status labels, rule categories, and selectors such as KPI/badge definitions as initial product/domain specifications.
- Render functions in `app.js` only after replacing direct Store mutation calls with typed API/query state and adding output escaping.

### Do not reuse as production foundations

- `localStorage` as a source of truth.
- The mutable singleton Store as a multi-user backend.
- Random ID/waybill generation and seeded Ozon identifiers.
- Synchronous browser rule execution for order/inventory side effects.
- `connectChannel`, `syncOrders`, `syncInventory`, `markPurchased`, and `shipOrder` implementations as integrations.

## 8. Production closed-loop work required

1. **Identity and tenancy:** user/org/shop entities, login, session/token handling, RBAC, shop-level permissions, encrypted marketplace/supplier credentials, secret rotation, and audit events.
2. **NestJS API boundary:** versioned REST (or GraphQL) contracts, request validation, consistent errors, idempotency keys, pagination/filtering, rate limits, and authorization on every shop-scoped operation.
3. **PostgreSQL model:** tenants/users/shops; encrypted connections; products/variants/listings and external IDs; orders/order items/status history; warehouse locations, stock movements and reservations; procurement POs/receipts; shipments/labels/events; rules and rule executions; sync cursors, outbox/idempotency records, and audit logs.
4. **Async execution:** queue/workers for polling, webhook handling, publication, inventory updates, labels, procurement, retries/backoff, dead-letter handling, and reconciliation. Marketplace side effects must not be performed inside a browser click transaction.
5. **Ozon adapter:** account connectivity, product/category/attribute mapping, listing create/update/status polling, order ingestion and acknowledgement, stock/price updates, shipment/label flows, shipment confirmation, cancellation/return handling, cursor persistence, rate-limit handling, retries, idempotency, and webhook/poll fallback.
6. **1688 adapter:** permitted account/API access, search/detail/SKU/media extraction, supplier and external-SKU mapping, translation/normalization, price/stock refresh, purchase-order creation, payment/fulfillment tracking, receiving, and failure/manual-review paths.
7. **Logistics adapters:** real channel rate/label/tracking contracts, package dimensions/address validation, carrier callbacks, and shipment-state reconciliation.
8. **Operational controls:** structured logs, metrics/traces, alerting, data retention/privacy policy, secrets management, backups, migrations, CI, unit/contract/integration tests, and a sandbox/replay harness before live writes.
9. **Frontend migration:** preserve the current screens where useful, but make them consume server state and explicit command responses. Replace optimistic local mutations with loading/error/conflict states and server-generated IDs.

## 9. Prototype comparison

`/workspace/ozon-rfbs-prototype` is the earlier visual prototype:

- 5 source files plus README/screenshots, approximately 692K including its images; no Git metadata was found.
- Its `app.js` holds independent constants (`SEL_PRODUCTS`, `LISTINGS`, `ORDERS`, `RULES`) and renders them directly.
- Actions are mostly toasts, cosmetic toggles, or fixed `setTimeout` demonstrations. It has no localStorage and no shared mutable domain store.
- Its README explicitly says all data is Mock with no external paid API.

The audited app is a meaningful second iteration: it introduces a shared store, three datasets, localStorage persistence, actual in-browser state transitions, a richer listing/order/rule/inventory workflow, and a demo acceptance script. It is still static/mock; the improvement is demo realism, not production connectivity. The app should replace the prototype for product demos, while both remain references rather than integration code.

## 10. LIVE Ozon integration blockers

The following are hard blockers before any live Ozon write or operational claim:

- No Ozon API credentials, account onboarding, credential encryption, or server-side secret boundary.
- No network adapter or backend endpoint; the UI cannot call or securely sign marketplace requests.
- No authoritative mapping among internal SKU, Ozon product/offer IDs, shop/account, and listing versions.
- No real category/attribute/variant/image/brand validation; the current mapping is a few SKU-name heuristics.
- No real order payload model (items, quantities, recipient/address, deadlines, payment/status history) or idempotent ingestion.
- No polling/webhook/cursor/retry/rate-limit/reconciliation machinery; duplicate or missed events would be likely.
- No atomic inventory reservation and no conflict-safe stock update; current sync can overwrite displayed platform stock from local demo state.
- No real label/waybill or shipment-confirmation contract; generated tracking numbers cannot be used for fulfillment.
- No cancellation, return, refund, exception, or manual-review workflows.
- No real 1688 purchase path to supply orders that have been marked `purchase`.
- No carrier/OGL integration despite channel cards being displayed.
- No production security, tenant isolation, auditability, monitoring, backup, migration, test, or rollback posture.

**Bottom line:** ship the current repository as a demo/reference only. Start the live engine in `/workspace/project/app` with NestJS + PostgreSQL and explicit Ozon/1688/logistics adapters; reuse this repository's UX, fixtures, calculations, and workflow specifications rather than its local state and side-effect implementations.
