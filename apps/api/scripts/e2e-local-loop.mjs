#!/usr/bin/env node
/**
 * First closed-loop e2e against live local API + Postgres.
 * Exit nonzero on any failure. Writes evidence JSON under /workspace/project/evidence/
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const BASE = process.env.API_BASE || 'http://127.0.0.1:3200';
const EVIDENCE_DIR = '/workspace/project/evidence';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const evidencePath = resolve(EVIDENCE_DIR, `first-loop-${stamp}.json`);

const steps = [];
const evidence = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE,
  ok: false,
  steps,
  honesty: {
    ozonLive: false,
    trackingSource: 'INTERNAL_GENERATED',
    domain: 'provisional Ozon rFBS midplatform',
  },
};

function record(name, ok, detail) {
  const entry = { name, ok, at: new Date().toISOString(), detail };
  steps.push(entry);
  const mark = ok ? 'OK' : 'FAIL';
  console.log(`[${mark}] ${name}`);
  if (!ok) {
    console.error(JSON.stringify(detail, null, 2));
  }
  return entry;
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data };
}

function fail(name, detail) {
  record(name, false, detail);
  evidence.ok = false;
  evidence.finishedAt = new Date().toISOString();
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.error(`Evidence written: ${evidencePath}`);
  process.exit(1);
}

async function main() {
  // 1. health ready
  {
    const r = await req('GET', '/health/ready');
    if (!r.ok || r.data?.status !== 'ready') {
      fail('health.ready', r);
    }
    record('health.ready', true, r.data);
  }

  // 2. login (prefer seeded admin; fallback register)
  let token;
  let user;
  {
    const login = await req('POST', '/auth/login', {
      body: { email: 'admin@local.dev', password: 'Admin123!' },
    });
    if (login.ok && login.data?.accessToken) {
      token = login.data.accessToken;
      user = login.data.user;
      record('auth.login', true, { user });
    } else {
      const email = `e2e-${Date.now()}@local.dev`;
      const reg = await req('POST', '/auth/register', {
        body: { email, password: 'E2eTest123!', role: 'ADMIN' },
      });
      if (!reg.ok || !reg.data?.accessToken) fail('auth.register', reg);
      token = reg.data.accessToken;
      user = reg.data.user;
      record('auth.register', true, { user });
    }
  }

  // 3. create shop
  let shop;
  {
    const r = await req('POST', '/shops', {
      token,
      body: { name: `E2E Shop ${Date.now()}`, platform: 'OZON_RFBS' },
    });
    if (!r.ok) fail('shops.create', r);
    shop = r.data;
    record('shops.create', true, { id: shop.id, name: shop.name });
  }

  // 4. create product (or claim-from-selection)
  let product;
  let listing;
  {
    const sku = `SKU-E2E-${Date.now()}`;
    const r = await req('POST', '/products/claim-from-selection', {
      token,
      body: {
        shopId: shop.id,
        sku,
        title: 'E2E Test Gadget',
        costCny: 45.5,
        weightG: 320,
        titleRu: 'E2E Тестовый гаджет',
      },
    });
    if (!r.ok) fail('products.claim-from-selection', r);
    product = r.data.product;
    listing = r.data.listing;
    record('products.claim-from-selection', true, {
      productId: product.id,
      listingId: listing.id,
      sku: product.sku,
    });
  }

  // 5. advance listing DRAFT -> MAPPING -> READY
  {
    for (const status of ['MAPPING', 'READY']) {
      const r = await req('POST', `/listings/${listing.id}/advance`, {
        token,
        body: { status },
      });
      if (!r.ok) fail(`listings.advance.${status}`, r);
      listing = r.data;
      record(`listings.advance.${status}`, true, { status: listing.status });
    }
  }

  // 6. publish (inventory initial qty 10)
  let inventory;
  {
    const r = await req('POST', `/listings/${listing.id}/publish`, {
      token,
      body: { initialQty: 10, reorderPoint: 2 },
    });
    if (!r.ok) fail('listings.publish', r);
    listing = r.data.listing;
    inventory = r.data.inventory;
    if (listing.status !== 'PUBLISHED') fail('listings.publish.status', r);
    if (inventory.qtyOnHand !== 10) fail('listings.publish.inventory', r);
    record('listings.publish', true, {
      listingStatus: listing.status,
      qtyOnHand: inventory.qtyOnHand,
    });
  }

  // 7. create order
  let order;
  {
    const r = await req('POST', '/orders', {
      token,
      body: {
        shopId: shop.id,
        buyerNote: 'e2e local loop',
        lines: [
          {
            productId: product.id,
            qty: 3,
            unitPrice: 999.0,
          },
        ],
      },
    });
    if (!r.ok) fail('orders.create', r);
    order = r.data;
    record('orders.create', true, {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
    });
  }

  // 8. run-rules
  {
    const r = await req('POST', '/orders/run-rules', { token });
    if (!r.ok) fail('orders.run-rules', r);
    record('orders.run-rules', true, r.data);
    const refreshed = await req('GET', `/orders/${order.id}`, { token });
    if (!refreshed.ok) fail('orders.get.after-rules', refreshed);
    order = refreshed.data;
    record('orders.status.after-rules', true, {
      status: order.status,
      carrier: order.shipment?.carrier ?? null,
    });
  }

  // 9. label
  let shipment;
  {
    const r = await req('POST', `/shipments/${order.id}/label`, {
      token,
      body: {},
    });
    if (!r.ok) fail('shipments.label', r);
    shipment = r.data;
    if (!String(shipment.trackingNo || '').startsWith('INT-MOCK-')) {
      fail('shipments.label.tracking', shipment);
    }
    record('shipments.label', true, {
      trackingNo: shipment.trackingNo,
      carrier: shipment.carrier,
      meta: shipment._meta,
    });
  }

  // 10. ship
  {
    const r = await req('POST', `/shipments/${order.id}/ship`, { token });
    if (!r.ok) fail('shipments.ship', r);
    order = r.data;
    if (order.status !== 'SHIPPED') fail('shipments.ship.status', r);
    record('shipments.ship', true, { status: order.status });
  }

  // 11. verify inventory decremented 10 -> 7
  {
    const r = await req('GET', '/inventory', { token });
    if (!r.ok) fail('inventory.list', r);
    const item = (r.data || []).find((i) => i.productId === product.id);
    if (!item) fail('inventory.find', r.data);
    if (item.qtyOnHand !== 7) {
      fail('inventory.decrement', {
        expected: 7,
        actual: item.qtyOnHand,
        item,
      });
    }
    record('inventory.decrement', true, {
      qtyOnHand: item.qtyOnHand,
      expected: 7,
    });
  }

  // 12. verify audit exists
  {
    const r = await req('GET', '/audit?limit=100', { token });
    if (!r.ok) fail('audit.list', r);
    const actions = (r.data || []).map((a) => a.action);
    const needed = [
      'SHIPMENT_SHIP',
      'INVENTORY_DECREMENT_ON_SHIP',
      'LISTING_PUBLISH',
      'ORDER_CREATE',
    ];
    const missing = needed.filter((a) => !actions.includes(a));
    if (missing.length) fail('audit.required-actions', { missing, actions });
    record('audit.exists', true, {
      count: r.data.length,
      sampleActions: actions.slice(0, 12),
    });
  }

  // 13. integrations honesty
  {
    const r = await req('GET', '/integrations/status', { token });
    if (!r.ok) fail('integrations.status', r);
    const ozon = (r.data.integrations || []).find((i) => i.provider === 'OZON');
    if (!ozon || ozon.status !== 'NOT_CONFIGURED') {
      fail('integrations.ozon', r.data);
    }
    record('integrations.ozon.NOT_CONFIGURED', true, ozon);
  }

  evidence.ok = true;
  evidence.finishedAt = new Date().toISOString();
  evidence.summary = {
    shopId: shop.id,
    productId: product.id,
    listingId: listing.id,
    orderId: order.id,
    orderNo: order.orderNo,
    trackingNo: shipment.trackingNo,
    finalOrderStatus: order.status,
    inventoryAfter: 7,
  };
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(`\nE2E PASSED. Evidence: ${evidencePath}`);
  process.exit(0);
}

main().catch((err) => {
  record('unhandled', false, { message: err?.message, stack: err?.stack });
  evidence.finishedAt = new Date().toISOString();
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.error(err);
  process.exit(1);
});
