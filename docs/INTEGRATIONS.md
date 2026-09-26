# Integrations Register — Provisional

**Version:** 0.1-provisional  
**Date:** 2026-09-26  
**Global posture:** local-only; no live credentials or external write authorization recorded

## Honesty rules

These rules follow `ENGINE_AUTODELIVERY_MASTER.md` §8:

- Use an official, authorized API first; do not bypass platform restrictions with account pools, proxy rotation, CAPTCHA bypass, or hidden identity.
- An import is not real-time synchronization unless explicitly approved and labeled with source, import time, and freshness.
- `NOT_CONFIGURED`, `AUTHORIZED_UNTESTED`, `MOCK_ONLY`, `SANDBOX_VERIFIED`, `LIVE_READ_VERIFIED`, `LIVE_WRITE_VERIFIED`, and `BLOCKED` are distinct states. Code or a connector is not evidence of connection.
- Read verification does not prove write verification; sandbox verification does not prove production verification.
- Synthetic data must be clearly marked and cannot be presented as customer/platform data. Unknown, stale, zero, and not-authorized are different states.
- Record source, timestamps, mappings, pagination/incremental strategy, limits, retry/replay/deduplication behavior, and actual verification evidence before claiming an integration.
- Side-effecting calls require authorization, idempotency or a checked deduplication mechanism, bounded retries, and reconciliation. Credentials are never pasted into chat or committed.

## Register

### Ozon Russia rFBS

| Field | Record |
|---|---|
| Provider / scope | Ozon Russia rFBS/self-fulfillment; shop/account scope is not supplied |
| Requirement IDs | REQ-SHOP-001, REQ-LIST-001, REQ-ORD-001, REQ-SHIP-001, REQ-INV-001, REQ-INT-001 |
| Status | **NOT_CONFIGURED** |
| Credentials / authorization | No Ozon Client-Id or Api-Key injected; live reads and writes blocked. No live credential is documented. |
| Environment | Local development only; no sandbox/live environment confirmed |
| Data source / mapping | Local PostgreSQL records and synthetic first-loop payloads only; no authoritative Ozon IDs, cursor, webhook, or field mapping confirmed |
| Intended future capabilities | Catalog/listing, order ingestion, inventory, and shipment flows behind an adapter; scope must be separately authorized |
| Reliability requirements | Future adapter must specify pagination/cursors, rate limits, timeout, bounded retries, idempotency, reconciliation, and manual-review paths |
| Verification | `/integrations/status` reports the DB `IntegrationCredential` row; without both env keys it is forced to `NOT_CONFIGURED` with `ozonLive: false`. Credentials alone only yield `AUTHORIZED_UNTESTED` |
| Evidence | [`first-loop-2026-09-26T06-10-54-946Z.json`](../evidence/first-loop-2026-09-26T06-10-54-946Z.json); [`ozon-skeleton-not-configured.json`](../evidence/ozon-skeleton-not-configured.json) |
| Not claimed | No Ozon listing publication, order sync, inventory sync, real label, shipment confirmation, or live account connection |

The adapter skeleton is at `apps/api/src/integrations/ozon/ozon.adapter.ts`. `POST /integrations/ozon/test-read` returns `400 NOT_CONFIGURED` without both keys and `501 Not Implemented` when keys exist, until the current read endpoint/response contract is verified. It never returns synthetic orders.

### 1688

| Field | Record |
|---|---|
| Provider / scope | 1688 supplier/procurement; account and supplier scope are not supplied |
| Requirement IDs | No live 1688 requirement is authorized in this phase; local procurement marker is out of scope |
| Status | **NOT_CONFIGURED** |
| Credentials / authorization | No 1688 credentials, API authorization, supplier login, or purchase authorization recorded |
| Environment | Local development only; no sandbox/live environment confirmed |
| Data source / mapping | No 1688 data source, supplier/SKU mapping, import timestamp, or freshness contract |
| Intended future capabilities | Search/detail/SKU/media, supplier mapping, price/stock refresh, purchase-order and receiving flows only after explicit authorization |
| Reliability requirements | Must define source freshness, pagination, rate limits, retries, deduplication, payment/fulfillment exception handling, and reconciliation before implementation |
| Verification | No 1688 call or authorized sample was performed |
| Evidence | **None**; absence is intentional and must not be read as connected |
| Not claimed | Local product cost or a simulated procurement marker is not a 1688 product, order, payment, or fulfillment result |

## State transition gate

A future state change requires the least privilege needed, named environment, authorization scope and expiry, safe secret injection, a real verification record, and evidence for the specific operation. Credentials alone cannot advance a state. No state is advanced by this document.
