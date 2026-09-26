#!/usr/bin/env node
/**
 * REQ-RULE-001 + REQ-RBAC-001 evidence against live local API.
 * - ADMIN/MANAGER: create rule, toggle enabled, run-rules hits it
 * - OPERATOR: forbidden on rules write / run-rules / approve
 * Exit nonzero on failure. Writes evidence under /workspace/project/evidence/
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const BASE = process.env.API_BASE || 'http://127.0.0.1:3200';
const EVIDENCE_DIR = '/workspace/project/evidence';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const evidencePath = resolve(EVIDENCE_DIR, `rules-rbac-${stamp}.json`);

const steps = [];
const evidence = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE,
  ok: false,
  reqIds: ['REQ-RULE-001', 'REQ-RBAC-001'],
  steps,
  honesty: {
    ozonLive: false,
    domain: 'provisional Ozon rFBS midplatform',
  },
};

function record(name, ok, detail) {
  const entry = { name, ok, at: new Date().toISOString(), detail };
  steps.push(entry);
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${name}`);
  if (!ok) console.error(JSON.stringify(detail, null, 2));
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
  {
    const r = await req('GET', '/health/ready');
    if (!r.ok || r.data?.status !== 'ready') fail('health.ready', r);
    record('health.ready', true, r.data);
  }

  let adminToken;
  {
    const login = await req('POST', '/auth/login', {
      body: { email: 'admin@local.dev', password: 'Admin123!' },
    });
    if (!login.ok || !login.data?.accessToken) fail('auth.admin.login', login);
    adminToken = login.data.accessToken;
    if (login.data.user?.role !== 'ADMIN') fail('auth.admin.role', login.data);
    record('auth.admin.login', true, { role: login.data.user.role });
  }

  // List existing rules (seeded defaults)
  {
    const r = await req('GET', '/rules', { token: adminToken });
    if (!r.ok) fail('rules.list', r);
    const names = (r.data || []).map((x) => x.name);
    const needed = ['auto-approve-pending', 'suggest-carrier-internal'];
    const missing = needed.filter((n) => !names.includes(n));
    if (missing.length) fail('rules.defaults', { missing, names });
    record('rules.list.defaults', true, { count: r.data.length, names });
  }

  // Create a distinctive rule that tags carrier when PENDING_REVIEW path runs SUGGEST after approve
  const ruleName = `e2e-force-carrier-${Date.now()}`;
  let rule;
  {
    const r = await req('POST', '/rules', {
      token: adminToken,
      body: {
        name: ruleName,
        enabled: true,
        priority: 12,
        conditionJson: {
          statusIn: ['APPROVED', 'AWAITING_SHIPMENT', 'PENDING_PROCUREMENT'],
        },
        actionJson: {
          type: 'SUGGEST_CARRIER',
          carrier: 'E2E_RULES_CARRIER',
        },
      },
    });
    if (!r.ok) fail('rules.create', r);
    rule = r.data;
    if (rule.name !== ruleName || !rule.enabled) fail('rules.create.shape', r);
    record('rules.create', true, { id: rule.id, name: rule.name, priority: rule.priority });
  }

  // Toggle disabled then re-enable
  {
    const off = await req('PATCH', `/rules/${rule.id}/enabled`, {
      token: adminToken,
      body: { enabled: false },
    });
    if (!off.ok || off.data?.enabled !== false) fail('rules.disable', off);
    record('rules.disable', true, { enabled: off.data.enabled });

    const on = await req('PATCH', `/rules/${rule.id}/enabled`, {
      token: adminToken,
      body: { enabled: true },
    });
    if (!on.ok || on.data?.enabled !== true) fail('rules.enable', on);
    rule = on.data;
    record('rules.enable', true, { enabled: rule.enabled });
  }

  // Minimal order path so run-rules can hit the new carrier rule
  let shop;
  let product;
  let order;
  {
    const s = await req('POST', '/shops', {
      token: adminToken,
      body: { name: `RBAC Shop ${Date.now()}`, platform: 'OZON_RFBS' },
    });
    if (!s.ok) fail('shops.create', s);
    shop = s.data;

    const sku = `SKU-RBAC-${Date.now()}`;
    const p = await req('POST', '/products/claim-from-selection', {
      token: adminToken,
      body: {
        shopId: shop.id,
        sku,
        title: 'RBAC Gadget',
        costCny: 10,
        weightG: 100,
        titleRu: 'RBAC гаджет',
      },
    });
    if (!p.ok) fail('products.claim', p);
    product = p.data.product;
    let listing = p.data.listing;
    for (const status of ['MAPPING', 'READY']) {
      const adv = await req('POST', `/listings/${listing.id}/advance`, {
        token: adminToken,
        body: { status },
      });
      if (!adv.ok) fail(`listings.advance.${status}`, adv);
      listing = adv.data;
    }
    const pub = await req('POST', `/listings/${listing.id}/publish`, {
      token: adminToken,
      body: { initialQty: 5, reorderPoint: 0 },
    });
    if (!pub.ok) fail('listings.publish', pub);

    const o = await req('POST', '/orders', {
      token: adminToken,
      body: {
        shopId: shop.id,
        lines: [{ productId: product.id, qty: 1, unitPrice: 100 }],
      },
    });
    if (!o.ok) fail('orders.create', o);
    order = o.data;
    record('orders.create.for-rules', true, {
      orderId: order.id,
      status: order.status,
    });
  }

  // run-rules should apply AUTO_APPROVE then our E2E_RULES_CARRIER
  {
    const r = await req('POST', '/orders/run-rules', { token: adminToken });
    if (!r.ok) fail('orders.run-rules', r);
    const hit = (r.data.applied || []).some(
      (a) =>
        a.orderId === order.id &&
        (a.actions || []).some((x) => String(x).includes(ruleName)),
    );
    if (!hit) fail('orders.run-rules.hit-new-rule', r.data);
    record('orders.run-rules.hit-new-rule', true, {
      appliedForOrder: (r.data.applied || []).find((a) => a.orderId === order.id),
    });

    const refreshed = await req('GET', `/orders/${order.id}`, {
      token: adminToken,
    });
    if (!refreshed.ok) fail('orders.get.after-rules', refreshed);
    const carrier = refreshed.data?.shipment?.carrier;
    if (carrier !== 'E2E_RULES_CARRIER') {
      fail('orders.carrier.from-rule', {
        expected: 'E2E_RULES_CARRIER',
        actual: carrier,
        order: refreshed.data,
      });
    }
    record('orders.carrier.from-rule', true, {
      status: refreshed.data.status,
      carrier,
    });
  }

  // Register OPERATOR and prove write forbidden
  let opToken;
  {
    const email = `operator-${Date.now()}@local.dev`;
    const reg = await req('POST', '/auth/register', {
      body: { email, password: 'OpTest123!', role: 'OPERATOR' },
    });
    if (!reg.ok || !reg.data?.accessToken) fail('auth.operator.register', reg);
    if (reg.data.user?.role !== 'OPERATOR') fail('auth.operator.role', reg.data);
    opToken = reg.data.accessToken;
    record('auth.operator.register', true, {
      email,
      role: reg.data.user.role,
    });
  }

  {
    const r = await req('POST', '/rules', {
      token: opToken,
      body: {
        name: `op-forbidden-${Date.now()}`,
        enabled: true,
        priority: 99,
        conditionJson: { status: 'PENDING_REVIEW' },
        actionJson: { type: 'AUTO_APPROVE' },
      },
    });
    if (r.status !== 403) fail('rbac.operator.rules.create.expected-403', r);
    record('rbac.operator.rules.create.403', true, {
      status: r.status,
      message: r.data?.message,
      requiredRoles: r.data?.requiredRoles,
    });
  }

  {
    const r = await req('PATCH', `/rules/${rule.id}/enabled`, {
      token: opToken,
      body: { enabled: false },
    });
    if (r.status !== 403) fail('rbac.operator.rules.enabled.expected-403', r);
    record('rbac.operator.rules.enabled.403', true, {
      status: r.status,
      message: r.data?.message,
    });
  }

  {
    const r = await req('POST', '/orders/run-rules', { token: opToken });
    if (r.status !== 403) fail('rbac.operator.run-rules.expected-403', r);
    record('rbac.operator.run-rules.403', true, {
      status: r.status,
      message: r.data?.message,
    });
  }

  {
    const r = await req('GET', '/rules', { token: opToken });
    if (!r.ok) fail('rbac.operator.rules.read.allowed', r);
    record('rbac.operator.rules.read.allowed', true, {
      count: (r.data || []).length,
    });
  }

  {
    const r = await req('GET', '/users', { token: opToken });
    if (r.status !== 403) fail('rbac.operator.users.expected-403', r);
    record('rbac.operator.users.403', true, {
      status: r.status,
      message: r.data?.message,
    });
  }

  {
    const r = await req('GET', '/users', { token: adminToken });
    if (!r.ok) fail('rbac.admin.users.list', r);
    record('rbac.admin.users.list', true, {
      count: (r.data || []).length,
    });
  }

  // Disable e2e rule so it does not pollute later loops with E2E_RULES_CARRIER
  {
    const r = await req('PATCH', `/rules/${rule.id}/enabled`, {
      token: adminToken,
      body: { enabled: false },
    });
    if (!r.ok) fail('rules.cleanup.disable', r);
    record('rules.cleanup.disable', true, { id: rule.id, enabled: r.data.enabled });
  }

  evidence.ok = true;
  evidence.finishedAt = new Date().toISOString();
  evidence.summary = {
    ruleId: rule.id,
    ruleName,
    orderId: order.id,
    carrierFromRule: 'E2E_RULES_CARRIER',
    operatorForbiddenOnRulesWrite: true,
  };
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(`\nRULES+RBAC E2E PASSED. Evidence: ${evidencePath}`);
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
