# ENGINE Autodelivery API (`apps/api`)

NestJS 10 + Prisma 5 + local PostgreSQL closed-loop for provisional **Ozon rFBS midplatform** domain.

## Honesty / status

| Concern | Status |
|---|---|
| Local Postgres persistence | **REAL** — `cbec_autodelivery` via Prisma |
| Auth (register/login, JWT, bcrypt) | **REAL** |
| Products → Listings → Inventory → Orders → Label → Ship → Audit | **REAL** local loop |
| Fulfillment rules | **REAL** DB-backed provisional rules (auto-approve, carrier suggest, low-stock procurement flag) |
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

## Key endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health/live` | liveness |
| GET | `/health/ready` | readiness (DB ping) |
| POST | `/auth/register` | `{ email, password, role? }` |
| POST | `/auth/login` | JWT |
| POST | `/shops` | create shop (platform default `OZON_RFBS`) |
| POST | `/products` | CRUD |
| POST | `/products/claim-from-selection` | product + listing DRAFT |
| POST | `/listings/:id/advance` | DRAFT→MAPPING→READY |
| POST | `/listings/:id/publish` | PUBLISHED + inventory upsert |
| POST | `/orders` | create with lines |
| POST | `/orders/run-rules` | apply enabled fulfillment rules |
| POST | `/orders/:id/approve` | manual approve |
| POST | `/shipments/:orderId/label` | internal tracking |
| POST | `/shipments/:orderId/ship` | decrement inventory + SHIPPED + audit |
| GET | `/inventory` | list |
| POST | `/inventory/:productId/adjust` | stock adjust + audit |
| GET | `/integrations/status` | Ozon `NOT_CONFIGURED` |
| GET | `/audit` | recent audit logs |

All authenticated routes (except health + auth) require `Authorization: Bearer <token>`.

## Local e2e closed-loop

```bash
# API must be running on 3200
node scripts/e2e-local-loop.mjs
```

Writes evidence JSON to `/workspace/project/evidence/first-loop-*.json`. Exit nonzero on failure.

## Env vars

See `/workspace/project/.env.example`. Critical:

- `DATABASE_URL`
- `JWT_SECRET`
- `API_PORT` (3200)
- `WEB_ORIGIN` (http://127.0.0.1:3201)
- `OZON_MODE=NOT_CONFIGURED`
