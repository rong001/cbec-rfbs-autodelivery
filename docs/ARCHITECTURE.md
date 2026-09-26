# Architecture — Provisional Local Foundation

**Status:** PROVISIONAL  
**Version:** 0.1-provisional  
**Deployment posture:** local-only; no staging/production deployment is authorized

## 1. System shape

The implementation is a modular NestJS monolith in `apps/api`, using Prisma ORM and PostgreSQL. A Vue 3 + TypeScript + Vite app exists in `apps/web` as a scaffold. The intended first-phase console calls the API; it must not make browser localStorage the source of truth.

Current runtime evidence records the API at `http://127.0.0.1:3200` and PostgreSQL database `cbec_autodelivery@127.0.0.1`. The first-loop evidence is local/synthetic.

## 2. Module boundaries

- **Health:** liveness/readiness and DB probe.
- **Auth:** registration/login, bcrypt password hashes, JWT issuance and Bearer validation. Roles are `ADMIN`, `MANAGER`, `OPERATOR`; server-side role enforcement is still required.
- **Shops:** local shop records and platform/status fields.
- **Products:** product records and selection claim.
- **Listings:** draft → mapping → ready → published state transitions.
- **Orders:** local orders, approval, and rule execution.
- **Shipments:** internal label generation, shipment transition, and stock decrement transaction.
- **Inventory:** local quantity and reorder-point adjustment.
- **Audit:** append-style action records and recent listing.
- **Integrations:** persisted Ozon status and honesty metadata; no live adapter call.
- **Prisma:** database client boundary and schema.

There is no queue/worker or external adapter implementation in the current source. In-process synchronous work is the current local approach.

## 3. Persistence model

The Prisma schema defines `User`, `Shop`, `Product`, `Listing`, `InventoryItem`, `Order`, `OrderLine`, `FulfillmentRule`, `Shipment`, `AuditLog`, and `IntegrationCredential`. PostgreSQL schema application was recorded as `prisma db push` plus `prisma migrate resolve --applied` for `20260926060000_init_core`; the environment note records the shadow-database permission limitation.

Material local transitions use Prisma transactions where implemented (claim, listing publish, label, shipment). Shipment checks inventory before decrementing and writes audit records. This is a local transaction boundary, not an external exactly-once guarantee.

## 4. Trust boundaries

1. **Browser/web console → API:** untrusted client input; DTO validation and JWT authentication are required. The browser cannot be trusted to enforce roles.
2. **API → PostgreSQL:** application service boundary; credentials stay in environment injection and are not documentation data. Database constraints and transactions protect local state.
3. **API → Ozon/1688/carriers:** not connected. Any future adapter must be an explicit, least-privilege boundary with status, timeout, retry, idempotency, reconciliation, and audit controls.
4. **Synthetic/local data → business data:** synthetic data is labeled and confined to local development/evidence; it must not be presented as marketplace truth.

## 5. Authentication and authorization

JWT authentication is implemented for protected controllers. The default local JWT fallback (`local-dev-jwt-not-for-prod`) and seeded local admin are development conveniences, not production security. The target first-phase role policy is:

| Role | Intended local capability | Current truth |
|---|---|---|
| `ADMIN` | users, shops, integrations, rules, all local operations, audit read | role exists; enforcement not proven |
| `MANAGER` | catalog/listing/order review/rules according to approved policy | role exists; enforcement not proven |
| `OPERATOR` | day-to-day order/shipment/inventory operations within assigned scope | role exists; enforcement not proven |

No tenant/shop assignment model is currently present. Cross-shop isolation and role enforcement are therefore first-phase work, not completed capabilities.

## 6. Failure handling

Implemented local behavior includes DTO validation, not-found/conflict/bad-request responses, invalid listing transitions, missing labels, insufficient stock checks, and transactional local updates. Health readiness reports database failure.

Required before a real integration: bounded timeout, jittered retry, error classification, failure/dead-letter handling, idempotency keys, cursor/replay strategy, reconciliation, and operator-visible manual recovery. A live authorization error must not be retried indefinitely. Long-running work must return a task state rather than claim success while processing.

## 7. Ozon adapter boundary

Ozon is deliberately `NOT_CONFIGURED`. The intended boundary is an adapter interface outside domain services for catalog/listing, orders, inventory, and shipment operations. Until credentials, scope, environment, mapping, and verification are authorized, the adapter must return an explicit not-configured/blocking state and must not issue live requests. Internal tracking is not an Ozon tracking number.

1688 and carrier adapters are likewise outside the current implementation boundary and remain unconfigured.

## 8. Capacity assumptions — ESTIMATE, not measured

No load test or external quota test was performed. The following are design estimates only: one local API process, one PostgreSQL instance, synchronous short local transactions, and a small development dataset. They are not claims about supported users, shops, SKUs, orders per day, throughput, or concurrency. Capacity planning requires confirmed scale inputs and authorized isolated testing; external-platform capacity cannot be inferred from this local loop.

## 9. Deployment and security posture

Deployment remains local-only. No paid resource, domain, production database, staging environment, public exposure, or production schema/business write is authorized. Secrets must be injected through the environment/secret mechanism; no Ozon credentials are present in the docs or evidence. Before any non-local deployment, add environment-specific secrets, TLS, backups/restore verification, migrations, observability, rate limits, isolation, role tests, and an explicit release authorization.
