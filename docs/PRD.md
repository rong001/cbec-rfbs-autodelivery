# PRD — Ozon Russia rFBS Midplatform

**Status:** PROVISIONAL — user business placeholders are missing  
**Version:** 0.1-provisional  
**Date:** 2026-09-26  
**Domain:** candidate Ozon Russia rFBS/self-fulfillment midplatform for China sellers

## 1. Truth boundary

This document is a reversible product hypothesis derived from the repository, the local API, and the first-loop evidence. `PROJECT_INPUT.yaml` records company, problem, users, scale, business rules, success criteria, budget, and deployment destination as missing or unknown. No company metric, ROI, live Ozon credential, or production authorization is asserted here.

The first-loop is real local execution against local PostgreSQL with synthetic/local records. It is not an Ozon or carrier call. The current web application is a Vue/Vite scaffold, not yet an operations console.

## 2. Candidate domain and chain

Candidate chain: selection/claim → listing draft and mapping → internal publish → order creation/review → rule evaluation → internal label → shipment state → inventory decrement → audit log. The implementation uses a NestJS modular monolith, Prisma, and PostgreSQL. Ozon and 1688 remain unconfigured.

## 3. Frozen first-phase MUST

The first phase is frozen to:

1. The proven local loop in §4.
2. A web console backed by the local API for the loop (no browser-local source of truth).
3. Fulfillment-rule CRUD with validation, enable/disable, priority, and auditability.
4. Role permissions for the existing `ADMIN`, `MANAGER`, and `OPERATOR` roles; route-level JWT authentication alone is not sufficient.
5. Honest integration states and empty/unconfigured states; no simulated success presented as a platform result.

These are phase requirements, not claims that every item is already complete. At this snapshot, the first loop is proven; the web console, rules CRUD, and enforced role permissions are still work to do.

## 4. What the first-loop evidence proves

Evidence file: [`../evidence/first-loop-2026-09-26T06-10-54-946Z.json`](../evidence/first-loop-2026-09-26T06-10-54-946Z.json)

- API health/readiness returned ready with the local database up.
- Local admin authentication succeeded and returned role `ADMIN`.
- A shop was created.
- A product/listing was claimed, advanced through `MAPPING` and `READY`, and published internally.
- An order was created, rules were run, and the order reached `AWAITING_SHIPMENT` with `INTERNAL_MOCK_CARRIER`.
- An internally generated label was created, then the order shipped.
- Inventory changed from 10 to 7 and audit records existed (10 records in the run).
- The integration status explicitly reported Ozon `NOT_CONFIGURED`; `ozonLive` was false.

## 5. Requirements

| ID | Requirement | Phase status | Evidence/implementation truth |
|---|---|---|---|
| REQ-AUTH-001 | Users can register/login and receive a JWT; authenticated API operations require a Bearer token. | PARTLY PROVEN | `auth.login` passes in first-loop; JWT guard is present. |
| REQ-SHOP-001 | An authenticated user can create and list an Ozon rFBS shop record without claiming a live account binding. | PROVEN LOCALLY | `shops.create` passes; shop is a local record. |
| REQ-PROD-001 | An authenticated user can claim a product from selection into a local product and listing draft. | PROVEN LOCALLY | `products.claim-from-selection` passes. |
| REQ-LIST-001 | A listing can advance through local mapping/readiness and publish to the internal catalog/inventory. | PROVEN LOCALLY | `MAPPING` → `READY` → `PUBLISHED` passes. |
| REQ-ORD-001 | An authenticated user can create and inspect a local order with product lines and a review status. | PROVEN LOCALLY | `orders.create` passes with `PENDING_REVIEW`. |
| REQ-SHIP-001 | A locally approved order can receive an explicitly internal label and transition to shipped. | PROVEN LOCALLY | `INTERNAL_GENERATED` label and `shipments.ship` pass; no carrier call. |
| REQ-INV-001 | Shipment processing decrements local on-hand inventory transactionally and rejects insufficient stock. | PROVEN LOCALLY | Evidence records 10 → 7; service checks stock. |
| REQ-RULE-001 | Authorized users can CRUD validated fulfillment rules and run enabled rules by priority with audit records. | RUNNING / NOT YET PROVEN | Schema/default rules and `orders.run-rules` exist; CRUD endpoint and role policy do not yet exist. |
| REQ-AUD-001 | Material local actions record actor, entity, action, and before/after data where available. | PROVEN LOCALLY | First loop records audit actions and `/audit` exists. |
| REQ-INT-001 | Integration status distinguishes unconfigured, mock/internal, sandbox, live-read, and live-write states; unconfigured integrations cannot be called. | PROVEN LOCALLY FOR OZON STATE | Ozon status is `NOT_CONFIGURED`; no live call is claimed. 1688 is not configured. |
| REQ-WEB-001 | A web console exposes the first-phase local workflow, loading/error/empty states, and integration honesty labels. | RUNNING | `apps/web` is a Vue/Vite scaffold; no console evidence yet. |
| REQ-RBAC-001 | `ADMIN`, `MANAGER`, and `OPERATOR` permissions are enforced server-side and reflected in the console. | RUNNING / NOT YET PROVEN | Role enum and JWT claim exist; no role guard/policy evidence exists. |

## 6. Explicitly out of scope until separately authorized

- Ozon live reads or writes, including listing publication, order synchronization, inventory synchronization, and shipment confirmation.
- Paid deployment, cloud resources, domain/TLS provisioning, or production release.
- Carrier/OGL APIs or real label/tracking calls.
- 1688 browsing, supplier authentication, purchasing, payment, or procurement writes.
- Company-specific pricing, approval, profit, ROI, SLA, volume, or staffing commitments.

## 7. Open business decisions

The owner must provide or explicitly leave unknown: company/business, problem statement, users and roles, shop/SKU/order scale, first-phase business scope, later scope, price/inventory approval rules, success criteria, budget, deployment target, and authorized Ozon/1688 environments. Until then this PRD remains provisional and cannot authorize irreversible business actions.
