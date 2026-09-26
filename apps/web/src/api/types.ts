export type ShopPlatform = 'OZON_RFBS' | 'OTHER'
export type ShopStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type ListingStatus = 'DRAFT' | 'MAPPING' | 'READY' | 'PUBLISHED' | 'FAILED'
export type OrderStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PENDING_PROCUREMENT'
  | 'AWAITING_SHIPMENT'
  | 'SHIPPED'
  | 'CANCELLED'
export type IntegrationStatus =
  | 'NOT_CONFIGURED'
  | 'AUTHORIZED_UNTESTED'
  | 'MOCK_ONLY'
  | 'SANDBOX_VERIFIED'
  | 'LIVE_READ_VERIFIED'
  | 'LIVE_WRITE_VERIFIED'
  | 'BLOCKED'

export interface UserInfo {
  id: string
  email: string
  role: string
}

export interface LoginResponse {
  accessToken: string
  user: UserInfo
}

export interface Shop {
  id: string
  name: string
  platform: ShopPlatform
  externalShopId: string | null
  status: ShopStatus
  createdAt: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  productId: string
  qtyOnHand: number
  reorderPoint: number
  createdAt: string
  updatedAt: string
  product?: Product
}

export interface Listing {
  id: string
  productId: string
  titleRu: string
  status: ListingStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  product?: Product
}

export interface Product {
  id: string
  shopId: string
  sku: string
  title: string
  costCny: string | number
  weightG: number
  status: ProductStatus
  createdAt: string
  updatedAt: string
  inventory?: InventoryItem | null
  listings?: Listing[]
}

export interface OrderLine {
  id: string
  orderId: string
  productId: string
  sku: string
  qty: number
  unitPrice: string | number
}

export interface Shipment {
  id: string
  orderId: string
  trackingNo: string | null
  carrier: string | null
  labeledAt: string | null
  shippedAt: string | null
  createdAt: string
  updatedAt: string
  order?: Order
}

export interface Order {
  id: string
  shopId: string
  orderNo: string
  status: OrderStatus
  totalAmount: string | number
  currency: string
  buyerNote: string | null
  etaHours: number | null
  createdAt: string
  updatedAt: string
  lines?: OrderLine[]
  shipment?: Shipment | null
  shop?: Shop
}

export interface FulfillmentRule {
  id: string
  name: string
  enabled: boolean
  priority: number
  conditionJson: Record<string, unknown>
  actionJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface IntegrationEntry {
  provider: string
  status: IntegrationStatus
  meta?: Record<string, unknown>
  updatedAt: string
}

export interface IntegrationsStatus {
  integrations: IntegrationEntry[]
  honesty: {
    ozonLive: boolean
    secretsInDb: boolean
    message: string
  }
}

export interface AuditLog {
  id: string
  actorUserId: string | null
  action: string
  entityType: string
  entityId: string
  beforeJson: unknown
  afterJson: unknown
  createdAt: string
}

export interface HealthReady {
  status: string
  db: string
  ts: string
}

export interface ClaimResult {
  productId?: string
  listingId?: string
  sku?: string
  product?: Product
  listing?: Listing
  [key: string]: unknown
}

export interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
}
