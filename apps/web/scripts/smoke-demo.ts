/**
 * Offline closed-loop smoke for demo adapter.
 * Usage: npx tsx scripts/smoke-demo.ts
 */
const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() {
    return mem.size
  },
  clear: () => mem.clear(),
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, String(v))
  },
  removeItem: (k: string) => {
    mem.delete(k)
  },
  key: (i: number) => [...mem.keys()][i] ?? null,
}

async function run() {
  const { resetActiveDataset } = await import('../src/demo/store')
  const { demoRequest } = await import('../src/demo/adapter')

  resetActiveDataset()
  const login = await demoRequest<{ user: { email: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'demo@local.dev', password: 'Demo123!' }),
  })
  console.log('login', login.user.email)

  const shops = await demoRequest<Array<{ id: string; name: string }>>('/shops')
  console.log('shops', shops.length, shops[0]?.name)

  const claim = await demoRequest<{
    product?: { id: string }
    productId?: string
    listing?: { id: string }
    listingId?: string
  }>('/products/claim-from-selection', {
    method: 'POST',
    body: JSON.stringify({
      shopId: shops[0].id,
      sku: 'SMOKE-SKU-1',
      title: 'Smoke item',
      titleRu: 'Smoke',
      costCny: 10,
      weightG: 50,
    }),
  })
  const productId = claim.product?.id || claim.productId!
  const lid = claim.listing?.id || claim.listingId!
  console.log('claim', lid)

  await demoRequest(`/listings/${lid}/advance`, {
    method: 'POST',
    body: JSON.stringify({ status: 'MAPPING' }),
  })
  await demoRequest(`/listings/${lid}/advance`, {
    method: 'POST',
    body: JSON.stringify({ status: 'READY' }),
  })
  await demoRequest(`/listings/${lid}/publish`, {
    method: 'POST',
    body: JSON.stringify({ initialQty: 10, reorderPoint: 2 }),
  })

  const order = await demoRequest<{ id: string; orderNo: string; status: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      shopId: shops[0].id,
      lines: [{ productId, qty: 2, unitPrice: 500 }],
    }),
  })
  console.log('order', order.orderNo, order.status)

  await demoRequest('/orders/run-rules', { method: 'POST' })
  const orders = await demoRequest<Array<{ id: string; status: string; shipment?: { carrier?: string } }>>(
    '/orders',
  )
  const o = orders.find((x) => x.id === order.id)!
  console.log('after rules', o.status, o.shipment?.carrier)

  if (o.status === 'PENDING_REVIEW' || o.status === 'PENDING_PROCUREMENT') {
    await demoRequest(`/orders/${order.id}/approve`, { method: 'POST' })
  }

  const labeled = await demoRequest<{ trackingNo: string }>(`/shipments/${order.id}/label`, {
    method: 'POST',
    body: JSON.stringify({ carrier: 'INTERNAL_MOCK_CARRIER' }),
  })
  console.log('label', labeled.trackingNo)

  const shipped = await demoRequest<{ status: string }>(`/shipments/${order.id}/ship`, {
    method: 'POST',
  })
  console.log('shipped', shipped.status)

  const inv = await demoRequest<Array<{ productId: string; qtyOnHand: number }>>('/inventory')
  const row = inv.find((i) => i.productId === productId)
  console.log('inventory', row?.qtyOnHand)

  const audit = await demoRequest<unknown[]>('/audit?limit=5')
  console.log('audit', audit.length)

  const integ = await demoRequest<{
    integrations: Array<{ status: string }>
    honesty: { ozonLive: boolean }
  }>('/integrations/status')
  console.log('ozon', integ.integrations[0].status, 'live', integ.honesty.ozonLive)

  if (shipped.status !== 'SHIPPED' || row?.qtyOnHand !== 8) {
    console.error('CLOSED_LOOP_FAIL', { status: shipped.status, qty: row?.qtyOnHand })
    process.exit(1)
  }
  console.log('CLOSED_LOOP_OK')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
