# ENGINE Autodelivery API (`apps/api`)

NestJS 10 + Prisma 5 + local PostgreSQL closed-loop for provisional **Ozon rFBS midplatform** domain.

## Honesty / status

| Concern | Status |
|---|---|
| Local Postgres persistence | **REAL** — `cbec_autodelivery` via Prisma |
| Auth (register/login, JWT, bcrypt) | **REAL** |
| Role permissions (ADMIN / MANAGER / OPERATOR) | **REAL** — `JwtAuthGuard` + `RolesGuard`; 403 JSON on deny |
| Products → Listings → Inventory → Orders → Label → Ship → Audit | **REAL** local loop |
| Fulfillment rules CRUD | **REAL** — `GET/POST/PATCH /rules`, `PATCH /rules/:id/enabled` |
| Fulfillment rules run | **REAL** DB-backed provisional rules (auto-approve, carrier suggest, low-stock procurement flag) |
| Shipment tracking numbers | **INTERNAL GENERATED** (`INT-MOCK-…`) — **not** a carrier API |
| Ozon marketplace API | **NOT_CONFIGURED** — no live Client-Id/Api-Key; do not claim Ozon live |
| Company-specific profit formulas | **PLACEHOLDER** — business facts missing; provisional domain only |
| Production deploy | **NOT AUTHORIZED** |

Inspired by `/workspace/ozonflow-rfbs-app` (demo localStorage only). This API replaces that in-memory store with durable Postgres.

## Prerequisites

- Node 20+
- Local Postgres: database `cbec_autodelivery`, user `cbec_engine`
- Root env: `/workspace/project/.env` (copied/symlinked to `apps/api/.env`, gitignored)

## Setup

```bash
cd /workspace/project/apps/api
cp ../../.env .env   # or keep in sync; never commit .env
npm install
npx prisma migrate dev --name init_core --skip-seed
npm run start:dev
```

API listens on `API_PORT` (default **3200**). CORS allows `WEB_ORIGIN` / `http://127.0.0.1:3201`.

## Default admin (seeded on bootstrap if no users)

- Email: `admin@local.dev`
- Password: `Admin123!`

Change immediately outside local-only use.

## RBAC matrix (REQ-RBAC-001)

Roles come from the JWT `role` claim (`ADMIN` | `MANAGER` | `OPERATOR`). Missing/invalid Bearer → **401**. Authenticated but role not allowed → **403** with JSON:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Role OPERATOR cannot access this resource; requires one of: MANAGER, ADMIN",
  "role": "OPERATOR",
  "requiredRoles": ["MANAGER", "ADMIN"]
}
```

| Area / endpoint | OPERATOR | MANAGER | ADMIN |
|---|---|---|---|
| Health `/health/*` (public) | ✓ | ✓ | ✓ |
| Auth register/login (public) | ✓ | ✓ | ✓ |
| Read shops / products / listings / orders / inventory / shipments / audit / integrations / rules | ✓ | ✓ | ✓ |
| Create shop; claim/create/update product; listing advance/publish; create order | ✓ | ✓ | ✓ |
| Label / ship; inventory adjust | ✓ | ✓ | ✓ |
| Order approve; `POST /orders/run-rules` | ✗ | ✓ | ✓ |
| Rules write (`POST/PATCH /rules`, `PATCH /rules/:id/enabled`) | ✗ | ✓ | ✓ |
| Product delete | ✗ | ✓ | ✓ |
| `GET /users` | ✗ | ✗ | ✓ |

Default seed rules (created by name if missing, never duplicated): `auto-approve-pending`, `suggest-carrier-internal`, `mark-procurement-if-low-stock`.

## Key endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/health/live` | public | liveness |
| GET | `/health/ready` | public | readiness (DB ping) |
| POST | `/auth/register` | public | `{ email, password, role? }` |
| POST | `/auth/login` | public | JWT |
| GET | `/users` | ADMIN | list users (id/email/role) |
| POST | `/shops` | OPERATOR+ | create shop (platform default `OZON_RFBS`) |
| POST | `/products` | OPERATOR+ | CRUD |
| POST | `/products/claim-from-selection` | OPERATOR+ | product + listing DRAFT |
| POST | `/listings/:id/advance` | OPERATOR+ | DRAFT→MAPPING→READY |
| POST | `/listings/:id/publish` | OPERATOR+ | PUBLISHED + inventory upsert |
| POST | `/orders` | OPERATOR+ | create with lines |
| POST | `/orders/run-rules` | MANAGER+ | apply enabled fulfillment rules |
| POST | `/orders/:id/approve` | MANAGER+ | manual approve |
| GET | `/rules` | OPERATOR+ | list fulfillment rules |
| POST | `/rules` | MANAGER+ | create validated rule |
| PATCH | `/rules/:id` | MANAGER+ | update rule |
| PATCH | `/rules/:id/enabled` | MANAGER+ | `{ enabled: boolean }` |
| POST | `/shipments/:orderId/label` | OPERATOR+ | internal tracking |
| POST | `/shipments/:orderId/ship` | OPERATOR+ | decrement inventory + SHIPPED + audit |
| GET | `/inventory` | OPERATOR+ | list |
| POST | `/inventory/:productId/adjust` | OPERATOR+ | stock adjust + audit |
| GET | `/integrations/status` | OPERATOR+ | Ozon `NOT_CONFIGURED` |
| POST | `/integrations/ozon/test-read` | MANAGER+ | honest NOT_CONFIGURED / 501 — never fakes live Ozon |
| GET | `/audit` | OPERATOR+ | recent audit logs |

All authenticated routes (except health + auth) require `Authorization: Bearer <token>`.

### Rule JSON shapes (validated against `run-rules`)

`actionJson.type` must be one of:

- `AUTO_APPROVE` — optional `conditionJson.status`
- `SUGGEST_CARRIER` — optional `conditionJson.statusIn: string[]`, optional `actionJson.carrier`
- `MARK_PENDING_PROCUREMENT` — optional `conditionJson.checkInventory: boolean`

## Local e2e

```bash
# API must be running on 3200
node scripts/e2e-local-loop.mjs
node scripts/e2e-rules-rbac.mjs
```

Writes evidence JSON to `/workspace/project/evidence/`. Exit nonzero on failure.

## Env vars

See `/workspace/project/.env.example`. Critical:

- `DATABASE_URL`
- `JWT_SECRET`
- `API_PORT` (3200)
- `WEB_ORIGIN` (http://127.0.0.1:3201)
- `OZON_MODE=NOT_CONFIGURED`
