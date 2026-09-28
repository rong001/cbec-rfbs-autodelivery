import type {
  ClaimResult,
  FulfillmentRule,
  HealthReady,
  IntegrationsStatus,
  InventoryItem,
  Listing,
  ListingStatus,
  LoginResponse,
  Order,
  Product,
  Shipment,
  Shop,
} from '../api/types'
import { ApiError } from '../api/errors'
import {
  getState,
  hydrateRelations,
  mutateState,
  nextId,
  pushAudit,
} from './store'
import { DEMO_TOKEN, DEMO_USER } from './types'

const ADVANCE_MAP: Partial<Record<ListingStatus, ListingStatus[]>> = {
  DRAFT: ['MAPPING', 'FAILED'],
  MAPPING: ['READY', 'FAILED', 'DRAFT'],
  READY: ['PUBLISHED', 'FAILED', 'MAPPING'],
  FAILED: ['DRAFT', 'MAPPING'],
  PUBLISHED: [],
}

function ok<T>(data: T): T {
  return structuredClone(data)
}

function fail(status: number, message: string): never {
  throw new ApiError(status, { statusCode: status, message, error: 'DemoError' })
}

function parseBody(body?: BodyInit | null): Record<string, unknown> {
  if (body == null || body === '') return {}
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

function matchPath(path: string, pattern: string): Record<string, string> | null {
  const pathOnly = path.split('?')[0]
  const pp = pattern.split('/').filter(Boolean)
  const tp = pathOnly.split('/').filter(Boolean)
  if (pp.length !== tp.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(tp[i])
    else if (pp[i] !== tp[i]) return null
  }
  return params
}

function withProduct(listing: Listing): Listing {
  const state = hydrateRelations()
  const product = state.products.find((p) => p.id === listing.productId)
  return { ...listing, product }
}

function withOrderExtras(order: Order): Order {
  const state = hydrateRelations()
  const shop = state.shops.find((s) => s.id === order.shopId)
  const shipment = state.shipments.find((s) => s.orderId === order.id) ?? order.shipment ?? null
  return { ...order, shop, shipment, lines: order.lines ? [...order.lines] : [] }
}

async function handleLogin(body: Record<string, unknown>): Promise<LoginResponse> {
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const allowed =
    (email === 'demo@local.dev' && password === 'Demo123!') ||
    (email === 'admin@local.dev' && password === 'Admin123!')
  if (!allowed) fail(401, '演示账号无效。请使用 demo@local.dev / Demo123!')
  const user =
    email === 'admin@local.dev'
      ? { ...DEMO_USER, email: 'admin@local.dev', id: 'user-demo-admin-local' }
      : DEMO_USER
  return ok({ accessToken: DEMO_TOKEN, user })
}

function listShops(): Shop[] {
  return ok(hydrateRelations().shops)
}

function createShop(body: Record<string, unknown>): Shop {
  const name = String(body.name || '').trim()
  if (!name) fail(400, 'name required')
  const shop: Shop = {
    id: nextId('shop'),
    name,
    platform: (body.platform as Shop['platform']) || 'OZON_RFBS',
    externalShopId: body.externalShopId ? String(body.externalShopId) : null,
    status: (body.status as Shop['status']) || 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  mutateState((s) => {
    s.shops.unshift(shop)
  })
  pushAudit('SHOP_CREATE', 'Shop', shop.id, null, shop)
  return ok(shop)
}

function listProducts(): Product[] {
  return ok(hydrateRelations().products)
}

function claimProduct(body: Record<string, unknown>): ClaimResult {
  const shopId = String(body.shopId || '')
  const sku = String(body.sku || '').trim()
  const title = String(body.title || '').trim()
  if (!shopId || !sku || !title) fail(400, 'shopId, sku, title required')
  const state = getState()
  if (!state.shops.find((s) => s.id === shopId)) fail(404, 'Shop not found')
  if (state.products.some((p) => p.sku === sku && p.shopId === shopId)) {
    fail(400, `SKU already exists: ${sku}`)
  }
  const product: Product = {
    id: nextId('prod'),
    shopId,
    sku,
    title,
    costCny: Number(body.costCny ?? 0),
    weightG: Number(body.weightG ?? 0),
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const listing: Listing = {
    id: nextId('list'),
    productId: product.id,
    titleRu: String(body.titleRu || title),
    status: 'DRAFT',
    publishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    product,
  }
  mutateState((s) => {
    s.products.unshift(product)
    s.listings.unshift(listing)
  })
  pushAudit('PRODUCT_CLAIM_FROM_SELECTION', 'Product', product.id, null, { product, listing })
  return ok({ product, listing, productId: product.id, listingId: listing.id, sku })
}

function listListings(): Listing[] {
  hydrateRelations()
  return ok(getState().listings.map(withProduct))
}

function advanceListing(id: string, body: Record<string, unknown>): Listing {
  const state = getState()
  const listing = state.listings.find((l) => l.id === id)
  if (!listing) fail(404, 'Listing not found')
  const next = body.status as ListingStatus
  if (next === 'PUBLISHED') fail(400, 'Use POST /listings/:id/publish to publish')
  const allowed = ADVANCE_MAP[listing.status] ?? []
  if (!allowed.includes(next)) {
    fail(400, `Cannot advance from ${listing.status} to ${next}`)
  }
  const before = listing.status
  mutateState((s) => {
    const row = s.listings.find((l) => l.id === id)!
    row.status = next
    row.updatedAt = new Date().toISOString()
  })
  pushAudit('LISTING_ADVANCE', 'Listing', id, { status: before }, { status: next })
  return ok(withProduct(getState().listings.find((l) => l.id === id)!))
}

function publishListing(id: string, body: Record<string, unknown>): Listing {
  const state = getState()
  const listing = state.listings.find((l) => l.id === id)
  if (!listing) fail(404, 'Listing not found')
  if (listing.status === 'PUBLISHED') fail(400, 'Already published')
  if (!['READY', 'DRAFT', 'MAPPING'].includes(listing.status)) {
    fail(400, `Cannot publish from status ${listing.status}`)
  }
  const initialQty = Number(body.initialQty ?? 10)
  const reorderPoint = Number(body.reorderPoint ?? 2)
  const now = new Date().toISOString()
  const invId = nextId('inv')
  mutateState((s) => {
    const row = s.listings.find((l) => l.id === id)!
    row.status = 'PUBLISHED'
    row.publishedAt = now
    row.updatedAt = now
    const prod = s.products.find((p) => p.id === row.productId)
    if (prod) {
      prod.status = 'ACTIVE'
      prod.updatedAt = now
    }
    const existing = s.inventory.find((i) => i.productId === row.productId)
    if (!existing) {
      s.inventory.unshift({
        id: invId,
        productId: row.productId,
        qtyOnHand: initialQty,
        reorderPoint,
        createdAt: now,
        updatedAt: now,
        product: prod,
      })
    }
  })
  pushAudit('LISTING_PUBLISH', 'Listing', id, { status: listing.status }, { status: 'PUBLISHED' })
  return ok(withProduct(getState().listings.find((l) => l.id === id)!))
}

function listOrders(): Order[] {
  hydrateRelations()
  return ok(getState().orders.map(withOrderExtras))
}

function createOrder(body: Record<string, unknown>): Order {
  const shopId = String(body.shopId || '')
  const linesIn = (body.lines as Array<Record<string, unknown>>) || []
  if (!shopId || !linesIn.length) fail(400, 'shopId and lines required')
  const state = getState()
  const shop = state.shops.find((s) => s.id === shopId)
  if (!shop) fail(404, 'Shop not found')
  const orderId = nextId('ord')
  const lines = linesIn.map((line, i) => {
    const productId = String(line.productId || '')
    const product = state.products.find((p) => p.id === productId)
    if (!product) fail(404, `Product not found: ${productId}`)
    return {
      id: `${orderId}-line-${i + 1}`,
      orderId,
      productId,
      sku: product.sku,
      qty: Number(line.qty ?? 1),
      unitPrice: Number(line.unitPrice ?? 0),
    }
  })
  const total = lines.reduce((sum, l) => sum + Number(l.unitPrice) * l.qty, 0)
  const order: Order = {
    id: orderId,
    shopId,
    orderNo: String(body.orderNo || `DEMO-${Date.now().toString(36).toUpperCase()}`),
    status: 'PENDING_REVIEW',
    totalAmount: total.toFixed(2),
    currency: 'RUB',
    buyerNote: body.buyerNote ? String(body.buyerNote) : null,
    etaHours: 48,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines,
    shipment: null,
    shop,
  }
  mutateState((s) => {
    s.orders.unshift(order)
  })
  pushAudit('ORDER_CREATE', 'Order', order.id, null, order)
  return ok(withOrderExtras(order))
}

function approveOrder(id: string): Order {
  const order = getState().orders.find((o) => o.id === id)
  if (!order) fail(404, 'Order not found')
  if (order.status !== 'PENDING_REVIEW' && order.status !== 'PENDING_PROCUREMENT') {
    fail(400, `Cannot approve from status ${order.status}`)
  }
  const before = order.status
  mutateState((s) => {
    const row = s.orders.find((o) => o.id === id)!
    row.status = 'APPROVED'
    row.updatedAt = new Date().toISOString()
  })
  pushAudit('ORDER_APPROVE', 'Order', id, { status: before }, { status: 'APPROVED' })
  return ok(withOrderExtras(getState().orders.find((o) => o.id === id)!))
}

function runRules(): Record<string, unknown> {
  const applied: Array<{ orderId: string; actions: string[] }> = []
  mutateState((s) => {
    const rules = s.rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority)
    const pending = s.orders.filter((o) =>
      ['PENDING_REVIEW', 'APPROVED', 'PENDING_PROCUREMENT', 'AWAITING_SHIPMENT'].includes(o.status),
    )
    for (const order of pending) {
      const actions: string[] = []
      for (const rule of rules) {
        const cond = rule.conditionJson
        const action = rule.actionJson
        if (action.type === 'AUTO_APPROVE') {
          if (
            order.status === 'PENDING_REVIEW' &&
            (cond.status === 'PENDING_REVIEW' || !cond.status)
          ) {
            order.status = 'APPROVED'
            order.updatedAt = new Date().toISOString()
            actions.push(`AUTO_APPROVE:${rule.name}`)
          }
        }
        if (action.type === 'MARK_PENDING_PROCUREMENT' && cond.checkInventory) {
          let low = false
          for (const line of order.lines || []) {
            const inv = s.inventory.find((i) => i.productId === line.productId)
            if (!inv || inv.qtyOnHand < inv.reorderPoint || inv.qtyOnHand < line.qty) {
              low = true
              break
            }
          }
          if (low && (order.status === 'APPROVED' || order.status === 'PENDING_REVIEW')) {
            order.status = 'PENDING_PROCUREMENT'
            order.updatedAt = new Date().toISOString()
            actions.push(`MARK_PENDING_PROCUREMENT:${rule.name}`)
          }
        }
        if (action.type === 'SUGGEST_CARRIER') {
          const statusIn = (cond.statusIn as string[] | undefined) ?? [
            'APPROVED',
            'AWAITING_SHIPMENT',
            'PENDING_PROCUREMENT',
          ]
          if (statusIn.includes(order.status)) {
            const carrier = String(action.carrier || 'INTERNAL_MOCK_CARRIER')
            let ship = s.shipments.find((x) => x.orderId === order.id)
            if (!ship) {
              s.seq += 1
              ship = {
                id: `ship-${s.datasetKey}-${s.seq}`,
                orderId: order.id,
                trackingNo: null,
                carrier,
                labeledAt: null,
                shippedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              s.shipments.unshift(ship)
              order.shipment = ship
              actions.push(`SUGGEST_CARRIER:${rule.name}:${carrier}`)
            } else if (!ship.carrier) {
              ship.carrier = carrier
              ship.updatedAt = new Date().toISOString()
              order.shipment = ship
              actions.push(`SUGGEST_CARRIER:${rule.name}:${carrier}`)
            }
          }
        }
      }
      if (actions.length) applied.push({ orderId: order.id, actions })
    }
  })
  pushAudit('ORDERS_RUN_RULES', 'Order', 'batch', null, { applied })
  return ok({ applied, count: applied.length, demo: true })
}

function listShipments(): Shipment[] {
  hydrateRelations()
  return ok(getState().shipments.map((s) => ({ ...s })))
}

function labelShipment(orderId: string, body: Record<string, unknown>): Shipment {
  const state = getState()
  const order = state.orders.find((o) => o.id === orderId)
  if (!order) fail(404, 'Order not found')
  if (!['APPROVED', 'AWAITING_SHIPMENT', 'PENDING_PROCUREMENT'].includes(order.status)) {
    fail(400, `Cannot label order in status ${order.status}`)
  }
  const trackingNo = `INT-MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const carrier =
    String(body.carrier || '') ||
    order.shipment?.carrier ||
    state.shipments.find((s) => s.orderId === orderId)?.carrier ||
    'INTERNAL_MOCK_CARRIER'
  const now = new Date().toISOString()
  const newShipId = nextId('ship')
  let shipmentId = ''
  mutateState((s) => {
    let ship = s.shipments.find((x) => x.orderId === orderId)
    if (!ship) {
      ship = {
        id: newShipId,
        orderId,
        trackingNo,
        carrier,
        labeledAt: now,
        shippedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      s.shipments.unshift(ship)
    } else {
      ship.trackingNo = trackingNo
      ship.carrier = carrier
      ship.labeledAt = now
      ship.updatedAt = now
    }
    shipmentId = ship.id
    const ord = s.orders.find((o) => o.id === orderId)!
    ord.status = 'AWAITING_SHIPMENT'
    ord.shipment = ship
    ord.updatedAt = now
  })
  pushAudit('SHIPMENT_LABEL', 'Shipment', shipmentId, null, {
    trackingNo,
    carrier,
    note: 'INTERNAL tracking — not a live carrier API',
  })
  const ship = getState().shipments.find((s) => s.id === shipmentId)!
  return ok({
    ...ship,
    _meta: {
      trackingSource: 'INTERNAL_GENERATED',
      carrierApi: false,
      honesty:
        'Tracking number is generated locally for closed-loop demo. Ozon/carrier APIs are NOT_CONFIGURED.',
    },
  } as Shipment)
}

function shipOrder(orderId: string): Order {
  const state = getState()
  const order = state.orders.find((o) => o.id === orderId)
  if (!order) fail(404, 'Order not found')
  const ship = state.shipments.find((s) => s.orderId === orderId) ?? order.shipment
  if (!ship?.trackingNo || !ship.labeledAt) fail(400, 'Label shipment before shipping')
  if (order.status === 'SHIPPED') fail(400, 'Already shipped')
  if (order.status !== 'AWAITING_SHIPMENT' && order.status !== 'APPROVED') {
    fail(400, `Cannot ship order in status ${order.status}`)
  }
  const now = new Date().toISOString()
  mutateState((s) => {
    const ord = s.orders.find((o) => o.id === orderId)!
    for (const line of ord.lines || []) {
      const inv = s.inventory.find((i) => i.productId === line.productId)
      if (!inv) fail(400, `No inventory for product ${line.productId}`)
      if (inv.qtyOnHand < line.qty) {
        fail(400, `Insufficient stock for SKU ${line.sku}: have ${inv.qtyOnHand}, need ${line.qty}`)
      }
      const beforeQty = inv.qtyOnHand
      inv.qtyOnHand -= line.qty
      inv.updatedAt = now
      s.audit.unshift({
        id: `audit-${s.datasetKey}-${++s.seq}-${Date.now()}`,
        actorUserId: 'user-demo-admin',
        action: 'INVENTORY_DECREMENT_ON_SHIP',
        entityType: 'InventoryItem',
        entityId: inv.id,
        beforeJson: { qtyOnHand: beforeQty },
        afterJson: { qtyOnHand: inv.qtyOnHand, delta: -line.qty },
        createdAt: now,
      })
    }
    const shipment = s.shipments.find((x) => x.orderId === orderId)!
    shipment.shippedAt = now
    shipment.updatedAt = now
    ord.status = 'SHIPPED'
    ord.shipment = shipment
    ord.updatedAt = now
    s.audit.unshift({
      id: `audit-${s.datasetKey}-${++s.seq}-${Date.now()}`,
      actorUserId: 'user-demo-admin',
      action: 'SHIPMENT_SHIP',
      entityType: 'Order',
      entityId: orderId,
      beforeJson: { status: order.status },
      afterJson: { status: 'SHIPPED', trackingNo: shipment.trackingNo, shippedAt: now },
      createdAt: now,
    })
  })
  return ok(withOrderExtras(getState().orders.find((o) => o.id === orderId)!))
}

function listInventory(): InventoryItem[] {
  hydrateRelations()
  return ok(getState().inventory.map((i) => ({ ...i })))
}

function adjustInventory(productId: string, body: Record<string, unknown>): InventoryItem {
  const state = getState()
  const inv = state.inventory.find((i) => i.productId === productId)
  if (!inv) fail(404, 'Inventory not found')
  const delta = Number(body.delta ?? 0)
  const nextQty = inv.qtyOnHand + delta
  if (nextQty < 0) fail(400, 'Insufficient stock for adjustment')
  const now = new Date().toISOString()
  mutateState((s) => {
    const row = s.inventory.find((i) => i.productId === productId)!
    row.qtyOnHand = nextQty
    if (body.reorderPoint !== undefined && body.reorderPoint !== null) {
      row.reorderPoint = Number(body.reorderPoint)
    }
    row.updatedAt = now
  })
  pushAudit(
    'INVENTORY_ADJUST',
    'InventoryItem',
    inv.id,
    { qtyOnHand: inv.qtyOnHand },
    { qtyOnHand: nextQty, delta, reason: body.reason || null },
  )
  return ok(getState().inventory.find((i) => i.productId === productId)!)
}

function listRules(): FulfillmentRule[] {
  return ok(getState().rules)
}

function createRule(body: Record<string, unknown>): FulfillmentRule {
  const name = String(body.name || '').trim()
  if (!name) fail(400, 'name required')
  const rule: FulfillmentRule = {
    id: nextId('rule'),
    name,
    enabled: body.enabled === undefined ? true : Boolean(body.enabled),
    priority: Number(body.priority ?? 100),
    conditionJson: (body.conditionJson as Record<string, unknown>) || {},
    actionJson: (body.actionJson as Record<string, unknown>) || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  mutateState((s) => {
    s.rules.unshift(rule)
  })
  pushAudit('RULE_CREATE', 'FulfillmentRule', rule.id, null, rule)
  return ok(rule)
}

function patchRuleEnabled(id: string, body: Record<string, unknown>): FulfillmentRule {
  const rule = getState().rules.find((r) => r.id === id)
  if (!rule) fail(404, 'Rule not found')
  const enabled = Boolean(body.enabled)
  mutateState((s) => {
    const row = s.rules.find((r) => r.id === id)!
    row.enabled = enabled
    row.updatedAt = new Date().toISOString()
  })
  pushAudit('RULE_TOGGLE', 'FulfillmentRule', id, { enabled: rule.enabled }, { enabled })
  return ok(getState().rules.find((r) => r.id === id)!)
}

function listAudit(path: string): unknown {
  const q = path.includes('?') ? new URLSearchParams(path.split('?')[1]) : new URLSearchParams()
  const limit = Math.min(200, Math.max(1, Number(q.get('limit') || 50)))
  return ok(getState().audit.slice(0, limit))
}

function integrationsStatus(): IntegrationsStatus {
  return ok({
    integrations: [
      {
        provider: 'OZON',
        status: 'NOT_CONFIGURED',
        meta: {
          note: '演示模式：未配置 Ozon Client-Id / Api-Key，禁止宣称已接通实盘。',
        },
        updatedAt: new Date().toISOString(),
      },
      {
        provider: '1688',
        status: 'NOT_CONFIGURED',
        meta: { note: '未配置' },
        updatedAt: new Date().toISOString(),
      },
    ],
    honesty: {
      ozonLive: false,
      secretsInDb: false,
      message:
        '本页为静态演示数据（DEMO）。Nest API / Postgres 未连接；Ozon = NOT_CONFIGURED；面单号为 INTERNAL_GENERATED。',
    },
  })
}

function healthReady(): HealthReady {
  return ok({
    status: 'ready',
    db: 'demo-memory',
    ts: new Date().toISOString(),
  })
}

/** Route a request through the in-browser demo adapter. */
export async function demoRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Simulate tiny latency so loading states are visible
  await new Promise((r) => setTimeout(r, 40 + Math.random() * 80))
  const method = (options.method || 'GET').toUpperCase()
  const body = parseBody(options.body as BodyInit | null)
  const pathOnly = path.split('?')[0]

  if (method === 'POST' && pathOnly === '/auth/login') return handleLogin(body) as T
  if (method === 'GET' && pathOnly === '/health/ready') return healthReady() as T
  if (method === 'GET' && pathOnly === '/shops') return listShops() as T
  if (method === 'POST' && pathOnly === '/shops') return createShop(body) as T
  if (method === 'GET' && pathOnly === '/products') return listProducts() as T
  if (method === 'POST' && pathOnly === '/products/claim-from-selection') {
    return claimProduct(body) as T
  }
  if (method === 'GET' && pathOnly === '/listings') return listListings() as T
  {
    const m = matchPath(pathOnly, '/listings/:id/advance')
    if (m && method === 'POST') return advanceListing(m.id, body) as T
  }
  {
    const m = matchPath(pathOnly, '/listings/:id/publish')
    if (m && method === 'POST') return publishListing(m.id, body) as T
  }
  if (method === 'GET' && pathOnly === '/orders') return listOrders() as T
  if (method === 'POST' && pathOnly === '/orders') return createOrder(body) as T
  if (method === 'POST' && pathOnly === '/orders/run-rules') return runRules() as T
  {
    const m = matchPath(pathOnly, '/orders/:id/approve')
    if (m && method === 'POST') return approveOrder(m.id) as T
  }
  if (method === 'GET' && pathOnly === '/shipments') return listShipments() as T
  {
    const m = matchPath(pathOnly, '/shipments/:orderId/label')
    if (m && method === 'POST') return labelShipment(m.orderId, body) as T
  }
  {
    const m = matchPath(pathOnly, '/shipments/:orderId/ship')
    if (m && method === 'POST') return shipOrder(m.orderId) as T
  }
  if (method === 'GET' && pathOnly === '/inventory') return listInventory() as T
  {
    const m = matchPath(pathOnly, '/inventory/:productId/adjust')
    if (m && method === 'POST') return adjustInventory(m.productId, body) as T
  }
  if (method === 'GET' && pathOnly === '/rules') return listRules() as T
  if (method === 'POST' && pathOnly === '/rules') return createRule(body) as T
  {
    const m = matchPath(pathOnly, '/rules/:id/enabled')
    if (m && method === 'PATCH') return patchRuleEnabled(m.id, body) as T
  }
  if (method === 'GET' && pathOnly.startsWith('/audit')) return listAudit(path) as T
  if (method === 'GET' && (pathOnly === '/integrations/status' || pathOnly === '/integrations/ozon/status')) {
    return integrationsStatus() as T
  }

  fail(404, `Demo adapter: no handler for ${method} ${pathOnly}`)
}
