import { buildDataset, listDatasets } from './datasets'
import type { DatasetKey, DemoPersist, DemoState } from './types'
import { STORAGE_KEY } from './types'
import type { AuditLog } from '../api/types'

let memory: DemoPersist | null = null
const listeners = new Set<() => void>()

function defaultPersist(): DemoPersist {
  const states = {} as DemoPersist['states']
  for (const meta of listDatasets()) {
    states[meta.key] = buildDataset(meta.key)
  }
  return { version: 1, activeKey: 'yiwu_cold', states }
}

function load(): DemoPersist {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoPersist
      if (parsed?.version === 1 && parsed.states) {
        for (const meta of listDatasets()) {
          if (!parsed.states[meta.key]) {
            parsed.states[meta.key] = buildDataset(meta.key)
          }
        }
        memory = parsed
        return memory
      }
    }
  } catch {
    /* ignore corrupt */
  }
  memory = defaultPersist()
  persist()
  return memory
}

function persist() {
  if (!memory) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    /* quota */
  }
  listeners.forEach((fn) => fn())
}

export function subscribeDemo(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getActiveKey(): DatasetKey {
  return load().activeKey
}

export function getState(): DemoState {
  const p = load()
  const state = p.states[p.activeKey]
  if (!state) {
    const fresh = buildDataset(p.activeKey)
    p.states[p.activeKey] = fresh
    persist()
    return fresh
  }
  return state
}

export function setActiveDataset(key: DatasetKey, reset = false): DemoState {
  const p = load()
  p.activeKey = key
  if (reset || !p.states[key]) {
    p.states[key] = buildDataset(key)
  }
  persist()
  return p.states[key]!
}

export function resetActiveDataset(): DemoState {
  const p = load()
  p.states[p.activeKey] = buildDataset(p.activeKey)
  persist()
  return p.states[p.activeKey]!
}

export function mutateState(mutator: (s: DemoState) => void): DemoState {
  const p = load()
  const state = p.states[p.activeKey]!
  mutator(state)
  persist()
  return state
}

export function nextId(prefix: string): string {
  const state = getState()
  state.seq += 1
  const id = `${prefix}-${state.datasetKey}-${state.seq}`
  persist()
  return id
}

export function pushAudit(
  action: string,
  entityType: string,
  entityId: string,
  beforeJson: unknown = null,
  afterJson: unknown = null,
): void {
  mutateState((s) => {
    const entry: AuditLog = {
      id: `audit-${s.datasetKey}-${s.seq + 1}-${Date.now()}`,
      actorUserId: 'user-demo-admin',
      action,
      entityType,
      entityId,
      beforeJson,
      afterJson,
      createdAt: new Date().toISOString(),
    }
    s.seq += 1
    s.audit.unshift(entry)
    if (s.audit.length > 200) s.audit.length = 200
  })
}

export function hydrateRelations(state: DemoState = getState()): DemoState {
  const productMap = new Map(state.products.map((p) => [p.id, p]))
  const shopMap = new Map(state.shops.map((s) => [s.id, s]))
  for (const inv of state.inventory) {
    inv.product = productMap.get(inv.productId)
  }
  for (const listing of state.listings) {
    listing.product = productMap.get(listing.productId)
  }
  for (const order of state.orders) {
    order.shop = shopMap.get(order.shopId)
    const ship = state.shipments.find((s) => s.orderId === order.id)
    order.shipment = ship ?? order.shipment ?? null
  }
  for (const ship of state.shipments) {
    ship.order = state.orders.find((o) => o.id === ship.orderId)
  }
  return state
}

export { listDatasets }
