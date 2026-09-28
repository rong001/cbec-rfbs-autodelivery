#!/usr/bin/env node
/**
 * Seed rich synthetic demo data via local API (admin login).
 * Does NOT touch .env secrets; skips if a shop named like seed already exists (upsert-by-name).
 * Usage: node apps/api/scripts/seed-demo.mjs
 */
const API = process.env.API_BASE || 'http://127.0.0.1:3200'
const EMAIL = process.env.SEED_EMAIL || 'admin@local.dev'
const PASSWORD = process.env.SEED_PASSWORD || 'Admin123!'
const SHOP_NAME = '义乌演示店（API seed）'

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

async function main() {
  const evidence = {
    at: new Date().toISOString(),
    api: API,
    ok: false,
    steps: [],
  }
  try {
    const health = await req('/health/ready')
    evidence.steps.push({ health })
    const login = await req('/auth/login', {
      method: 'POST',
      body: { email: EMAIL, password: PASSWORD },
    })
    const token = login.accessToken
    evidence.steps.push({ login: login.user?.email })

    const shops = await req('/shops', { token })
    let shop = shops.find((s) => s.name === SHOP_NAME)
    if (shop) {
      evidence.steps.push({ shop: 'exists', id: shop.id })
    } else {
      shop = await req('/shops', {
        method: 'POST',
        token,
        body: {
          name: SHOP_NAME,
          platform: 'OZON_RFBS',
          externalShopId: 'SEED-YW-DEMO',
          status: 'ACTIVE',
        },
      })
      evidence.steps.push({ shop: 'created', id: shop.id })
    }

    const catalog = [
      { sku: 'SEED-USB-01', title: '编织数据线', titleRu: 'Кабель', costCny: 6.5, weightG: 45 },
      { sku: 'SEED-CLIP-02', title: '衣夹套装', titleRu: 'Прищепки', costCny: 8.2, weightG: 180 },
      { sku: 'SEED-HUB-03', title: 'USB 扩展坞', titleRu: 'USB хаб', costCny: 42, weightG: 210 },
    ]
    const products = await req('/products', { token })
    for (const item of catalog) {
      if (products.some((p) => p.sku === item.sku && p.shopId === shop.id)) {
        evidence.steps.push({ claim: 'skip', sku: item.sku })
        continue
      }
      const claimed = await req('/products/claim-from-selection', {
        method: 'POST',
        token,
        body: { shopId: shop.id, ...item },
      })
      const listingId = claimed.listing?.id || claimed.listingId
      if (listingId) {
        await req(`/listings/${listingId}/advance`, {
          method: 'POST',
          token,
          body: { status: 'MAPPING' },
        })
        await req(`/listings/${listingId}/advance`, {
          method: 'POST',
          token,
          body: { status: 'READY' },
        })
        await req(`/listings/${listingId}/publish`, {
          method: 'POST',
          token,
          body: { initialQty: 20, reorderPoint: 5 },
        })
      }
      evidence.steps.push({ claim: 'ok', sku: item.sku, listingId })
    }

    const freshProducts = await req('/products', { token })
    const seedProducts = freshProducts.filter((p) => p.shopId === shop.id)
    const orders = await req('/orders', { token })
    const hasSeedOrder = orders.some((o) => o.orderNo?.startsWith('SEED-ORD-'))
    if (!hasSeedOrder && seedProducts[0]) {
      const order = await req('/orders', {
        method: 'POST',
        token,
        body: {
          shopId: shop.id,
          orderNo: `SEED-ORD-${Date.now().toString(36).toUpperCase()}`,
          buyerNote: 'API seed demo order',
          lines: [
            {
              productId: seedProducts[0].id,
              qty: 2,
              unitPrice: 999,
            },
          ],
        },
      })
      evidence.steps.push({ order: order.orderNo, status: order.status })
    } else {
      evidence.steps.push({ order: 'skip-existing' })
    }

    evidence.ok = true
    evidence.counts = {
      shops: (await req('/shops', { token })).length,
      products: (await req('/products', { token })).length,
      orders: (await req('/orders', { token })).length,
      inventory: (await req('/inventory', { token })).length,
    }
  } catch (e) {
    evidence.error = String(e.message || e)
  }

  const fs = await import('node:fs')
  const path = await import('node:path')
  const outDir = path.resolve(process.cwd().includes('apps/api') ? '../..' : '.', 'evidence')
  fs.mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, `seed-demo-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  // If cwd is project root
  const alt = path.resolve('/workspace/project/evidence', path.basename(out))
  fs.writeFileSync(alt, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
  console.log('wrote', alt)
  process.exit(evidence.ok ? 0 : 1)
}

main()
