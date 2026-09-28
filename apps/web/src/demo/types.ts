import type {
  AuditLog,
  FulfillmentRule,
  InventoryItem,
  Listing,
  Order,
  Product,
  Shipment,
  Shop,
  UserInfo,
} from '../api/types'

export type DatasetKey = 'yiwu_cold' | 'guangzhou_mature' | 'multishop_peak'

export interface DemoDatasetMeta {
  key: DatasetKey
  name: string
  description: string
}

export interface DemoState {
  datasetKey: DatasetKey
  shops: Shop[]
  products: Product[]
  listings: Listing[]
  orders: Order[]
  shipments: Shipment[]
  inventory: InventoryItem[]
  rules: FulfillmentRule[]
  audit: AuditLog[]
  seq: number
}

export interface DemoPersist {
  version: 1
  activeKey: DatasetKey
  states: Partial<Record<DatasetKey, DemoState>>
}

export const DEMO_USER: UserInfo = {
  id: 'user-demo-admin',
  email: 'demo@local.dev',
  role: 'ADMIN',
}

export const DEMO_TOKEN = 'demo-jwt-not-real'

export const STORAGE_KEY = 'cbec_demo_v1'
export const FORCE_DEMO_KEY = 'cbec_force_demo'
