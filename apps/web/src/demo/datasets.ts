import type {
  AuditLog,
  FulfillmentRule,
  InventoryItem,
  Listing,
  Order,
  Product,
  Shipment,
  Shop,
} from '../api/types'
import type { DatasetKey, DemoDatasetMeta, DemoState } from './types'

export const DATASET_META: DemoDatasetMeta[] = [
  {
    key: 'yiwu_cold',
    name: '义乌冷启动',
    description: '单店冷启动：少量草稿刊登，适合走完整认领→发货闭环',
  },
  {
    key: 'guangzhou_mature',
    name: '广州成熟店',
    description: '成熟单店：在售 SKU、待审单与库存预警',
  },
  {
    key: 'multishop_peak',
    name: '多店峰值',
    description: '多店高峰：超时风险订单与待办队列压力',
  },
]

function iso(offsetHours = 0): string {
  return new Date(Date.now() + offsetHours * 3600_000).toISOString()
}

function baseRules(prefix: string): FulfillmentRule[] {
  const t = iso(-24)
  return [
    {
      id: `${prefix}-rule-1`,
      name: 'auto-approve-pending',
      enabled: true,
      priority: 10,
      conditionJson: { status: 'PENDING_REVIEW' },
      actionJson: { type: 'AUTO_APPROVE' },
      createdAt: t,
      updatedAt: t,
    },
    {
      id: `${prefix}-rule-2`,
      name: 'suggest-internal-carrier',
      enabled: true,
      priority: 20,
      conditionJson: { statusIn: ['APPROVED', 'AWAITING_SHIPMENT', 'PENDING_PROCUREMENT'] },
      actionJson: { type: 'SUGGEST_CARRIER', carrier: 'INTERNAL_MOCK_CARRIER' },
      createdAt: t,
      updatedAt: t,
    },
    {
      id: `${prefix}-rule-3`,
      name: 'mark-low-stock-procurement',
      enabled: true,
      priority: 15,
      conditionJson: { checkInventory: true },
      actionJson: { type: 'MARK_PENDING_PROCUREMENT' },
      createdAt: t,
      updatedAt: t,
    },
  ]
}

function seedAudit(prefix: string, lines: Array<[string, string, string]>): AuditLog[] {
  return lines.map(([action, entityType, entityId], i) => ({
    id: `${prefix}-audit-${i + 1}`,
    actorUserId: 'user-demo-admin',
    action,
    entityType,
    entityId,
    beforeJson: null,
    afterJson: { demo: true },
    createdAt: iso(-(lines.length - i)),
  }))
}

function yiwu(): DemoState {
  const p = 'yw'
  const shop: Shop = {
    id: `${p}-shop-1`,
    name: '义乌小商品 rFBS',
    platform: 'OZON_RFBS',
    externalShopId: 'DEMO-YW-001',
    status: 'ACTIVE',
    createdAt: iso(-720),
    updatedAt: iso(-24),
  }
  const products: Product[] = [
    {
      id: `${p}-prod-1`,
      shopId: shop.id,
      sku: 'YW-USB-C-01',
      title: 'Type-C 编织数据线 1m',
      costCny: '6.50',
      weightG: 45,
      status: 'ACTIVE',
      createdAt: iso(-200),
      updatedAt: iso(-48),
    },
    {
      id: `${p}-prod-2`,
      shopId: shop.id,
      sku: 'YW-CLIP-02',
      title: '不锈钢衣夹 20 只装',
      costCny: '8.20',
      weightG: 180,
      status: 'DRAFT',
      createdAt: iso(-10),
      updatedAt: iso(-10),
    },
  ]
  const listings: Listing[] = [
    {
      id: `${p}-list-1`,
      productId: products[0].id,
      titleRu: 'Кабель Type-C 1м тканевый',
      status: 'PUBLISHED',
      publishedAt: iso(-48),
      createdAt: iso(-200),
      updatedAt: iso(-48),
      product: products[0],
    },
    {
      id: `${p}-list-2`,
      productId: products[1].id,
      titleRu: 'Прищепки нержавеющие 20 шт',
      status: 'DRAFT',
      publishedAt: null,
      createdAt: iso(-10),
      updatedAt: iso(-10),
      product: products[1],
    },
  ]
  const inventory: InventoryItem[] = [
    {
      id: `${p}-inv-1`,
      productId: products[0].id,
      qtyOnHand: 48,
      reorderPoint: 10,
      createdAt: iso(-48),
      updatedAt: iso(-12),
      product: products[0],
    },
  ]
  const orders: Order[] = [
    {
      id: `${p}-ord-1`,
      shopId: shop.id,
      orderNo: 'YW-DEMO-1001',
      status: 'PENDING_REVIEW',
      totalAmount: '1299.00',
      currency: 'RUB',
      buyerNote: 'デモ · 请尽快发货',
      etaHours: 36,
      createdAt: iso(-6),
      updatedAt: iso(-6),
      lines: [
        {
          id: `${p}-line-1`,
          orderId: `${p}-ord-1`,
          productId: products[0].id,
          sku: products[0].sku,
          qty: 2,
          unitPrice: '649.50',
        },
      ],
      shipment: null,
      shop,
    },
  ]
  return {
    datasetKey: 'yiwu_cold',
    shops: [shop],
    products,
    listings,
    orders,
    shipments: [],
    inventory,
    rules: baseRules(p),
    audit: seedAudit(p, [
      ['SHOP_CREATE', 'Shop', shop.id],
      ['PRODUCT_CLAIM_FROM_SELECTION', 'Product', products[0].id],
      ['LISTING_PUBLISH', 'Listing', listings[0].id],
      ['ORDER_CREATE', 'Order', orders[0].id],
    ]),
    seq: 100,
  }
}

function guangzhou(): DemoState {
  const p = 'gz'
  const shop: Shop = {
    id: `${p}-shop-1`,
    name: '广州数码专营',
    platform: 'OZON_RFBS',
    externalShopId: 'DEMO-GZ-88',
    status: 'ACTIVE',
    createdAt: iso(-2000),
    updatedAt: iso(-2),
  }
  const products: Product[] = [
    {
      id: `${p}-prod-1`,
      shopId: shop.id,
      sku: 'GZ-GAN-65W',
      title: 'GaN 65W 多口快充头',
      costCny: '48.00',
      weightG: 120,
      status: 'ACTIVE',
      createdAt: iso(-900),
      updatedAt: iso(-30),
    },
    {
      id: `${p}-prod-2`,
      shopId: shop.id,
      sku: 'GZ-MOUSE-PRO',
      title: '静音办公鼠标',
      costCny: '22.50',
      weightG: 95,
      status: 'ACTIVE',
      createdAt: iso(-800),
      updatedAt: iso(-20),
    },
    {
      id: `${p}-prod-3`,
      shopId: shop.id,
      sku: 'GZ-HUB-7IN1',
      title: 'USB-C 七合一扩展坞',
      costCny: '86.00',
      weightG: 210,
      status: 'ACTIVE',
      createdAt: iso(-700),
      updatedAt: iso(-5),
    },
    {
      id: `${p}-prod-4`,
      shopId: shop.id,
      sku: 'GZ-PAD-DESK',
      title: '大号皮质桌垫',
      costCny: '35.00',
      weightG: 520,
      status: 'DRAFT',
      createdAt: iso(-3),
      updatedAt: iso(-3),
    },
  ]
  const listings: Listing[] = [
    {
      id: `${p}-list-1`,
      productId: products[0].id,
      titleRu: 'Зарядка GaN 65W',
      status: 'PUBLISHED',
      publishedAt: iso(-30),
      createdAt: iso(-900),
      updatedAt: iso(-30),
      product: products[0],
    },
    {
      id: `${p}-list-2`,
      productId: products[1].id,
      titleRu: 'Мышь бесшумная офисная',
      status: 'PUBLISHED',
      publishedAt: iso(-20),
      createdAt: iso(-800),
      updatedAt: iso(-20),
      product: products[1],
    },
    {
      id: `${p}-list-3`,
      productId: products[2].id,
      titleRu: 'USB-C хаб 7в1',
      status: 'PUBLISHED',
      publishedAt: iso(-5),
      createdAt: iso(-700),
      updatedAt: iso(-5),
      product: products[2],
    },
    {
      id: `${p}-list-4`,
      productId: products[3].id,
      titleRu: 'Коврик на стол большой',
      status: 'READY',
      publishedAt: null,
      createdAt: iso(-3),
      updatedAt: iso(-1),
      product: products[3],
    },
  ]
  const inventory: InventoryItem[] = [
    {
      id: `${p}-inv-1`,
      productId: products[0].id,
      qtyOnHand: 4,
      reorderPoint: 8,
      createdAt: iso(-30),
      updatedAt: iso(-2),
      product: products[0],
    },
    {
      id: `${p}-inv-2`,
      productId: products[1].id,
      qtyOnHand: 3,
      reorderPoint: 5,
      createdAt: iso(-20),
      updatedAt: iso(-2),
      product: products[1],
    },
    {
      id: `${p}-inv-3`,
      productId: products[2].id,
      qtyOnHand: 26,
      reorderPoint: 6,
      createdAt: iso(-5),
      updatedAt: iso(-1),
      product: products[2],
    },
  ]
  const orders: Order[] = [
    {
      id: `${p}-ord-1`,
      shopId: shop.id,
      orderNo: 'GZ-2026-8801',
      status: 'PENDING_REVIEW',
      totalAmount: '2490.00',
      currency: 'RUB',
      buyerNote: null,
      etaHours: 18,
      createdAt: iso(-8),
      updatedAt: iso(-8),
      lines: [
        {
          id: `${p}-line-1`,
          orderId: `${p}-ord-1`,
          productId: products[0].id,
          sku: products[0].sku,
          qty: 1,
          unitPrice: '2490.00',
        },
      ],
      shipment: null,
      shop,
    },
    {
      id: `${p}-ord-2`,
      shopId: shop.id,
      orderNo: 'GZ-2026-8802',
      status: 'PENDING_REVIEW',
      totalAmount: '1580.00',
      currency: 'RUB',
      buyerNote: 'подарок',
      etaHours: 24,
      createdAt: iso(-5),
      updatedAt: iso(-5),
      lines: [
        {
          id: `${p}-line-2`,
          orderId: `${p}-ord-2`,
          productId: products[1].id,
          sku: products[1].sku,
          qty: 2,
          unitPrice: '790.00',
        },
      ],
      shipment: null,
      shop,
    },
    {
      id: `${p}-ord-3`,
      shopId: shop.id,
      orderNo: 'GZ-2026-8803',
      status: 'APPROVED',
      totalAmount: '4290.00',
      currency: 'RUB',
      buyerNote: null,
      etaHours: 40,
      createdAt: iso(-20),
      updatedAt: iso(-4),
      lines: [
        {
          id: `${p}-line-3`,
          orderId: `${p}-ord-3`,
          productId: products[2].id,
          sku: products[2].sku,
          qty: 1,
          unitPrice: '4290.00',
        },
      ],
      shipment: {
        id: `${p}-ship-draft-3`,
        orderId: `${p}-ord-3`,
        trackingNo: null,
        carrier: 'INTERNAL_MOCK_CARRIER',
        labeledAt: null,
        shippedAt: null,
        createdAt: iso(-4),
        updatedAt: iso(-4),
      },
      shop,
    },
    {
      id: `${p}-ord-4`,
      shopId: shop.id,
      orderNo: 'GZ-2026-8790',
      status: 'SHIPPED',
      totalAmount: '990.00',
      currency: 'RUB',
      buyerNote: null,
      etaHours: 0,
      createdAt: iso(-72),
      updatedAt: iso(-48),
      lines: [
        {
          id: `${p}-line-4`,
          orderId: `${p}-ord-4`,
          productId: products[1].id,
          sku: products[1].sku,
          qty: 1,
          unitPrice: '990.00',
        },
      ],
      shipment: {
        id: `${p}-ship-4`,
        orderId: `${p}-ord-4`,
        trackingNo: 'INT-MOCK-GZ8790',
        carrier: 'INTERNAL_MOCK_CARRIER',
        labeledAt: iso(-50),
        shippedAt: iso(-48),
        createdAt: iso(-50),
        updatedAt: iso(-48),
      },
      shop,
    },
  ]
  const shipments: Shipment[] = orders
    .filter((o) => o.shipment)
    .map((o) => ({ ...o.shipment!, order: o }))
  return {
    datasetKey: 'guangzhou_mature',
    shops: [shop],
    products,
    listings,
    orders,
    shipments,
    inventory,
    rules: baseRules(p),
    audit: seedAudit(p, [
      ['LISTING_PUBLISH', 'Listing', listings[0].id],
      ['ORDER_CREATE', 'Order', orders[0].id],
      ['ORDER_APPROVE', 'Order', orders[2].id],
      ['SHIPMENT_SHIP', 'Order', orders[3].id],
    ]),
    seq: 200,
  }
}

function multishop(): DemoState {
  const p = 'ms'
  const shops: Shop[] = [
    {
      id: `${p}-shop-gz`,
      name: '广州数码专营',
      platform: 'OZON_RFBS',
      externalShopId: 'DEMO-MS-GZ',
      status: 'ACTIVE',
      createdAt: iso(-3000),
      updatedAt: iso(-1),
    },
    {
      id: `${p}-shop-sz`,
      name: '深圳家居馆',
      platform: 'OZON_RFBS',
      externalShopId: 'DEMO-MS-SZ',
      status: 'ACTIVE',
      createdAt: iso(-2800),
      updatedAt: iso(-1),
    },
  ]
  const products: Product[] = [
    {
      id: `${p}-prod-1`,
      shopId: shops[0].id,
      sku: 'MS-MAGSAFE',
      title: 'MagSafe 磁吸支架',
      costCny: '28.00',
      weightG: 85,
      status: 'ACTIVE',
      createdAt: iso(-400),
      updatedAt: iso(-10),
    },
    {
      id: `${p}-prod-2`,
      shopId: shops[1].id,
      sku: 'MS-LAMP-LED',
      title: '护眼 LED 台灯',
      costCny: '55.00',
      weightG: 780,
      status: 'ACTIVE',
      createdAt: iso(-380),
      updatedAt: iso(-8),
    },
    {
      id: `${p}-prod-3`,
      shopId: shops[0].id,
      sku: 'MS-CASE-CLR',
      title: '透明防摔壳',
      costCny: '9.80',
      weightG: 35,
      status: 'ACTIVE',
      createdAt: iso(-360),
      updatedAt: iso(-6),
    },
  ]
  const listings: Listing[] = products.map((prod, i) => ({
    id: `${p}-list-${i + 1}`,
    productId: prod.id,
    titleRu: `Демо ${prod.sku}`,
    status: 'PUBLISHED' as const,
    publishedAt: iso(-20 + i),
    createdAt: prod.createdAt,
    updatedAt: prod.updatedAt,
    product: prod,
  }))
  const inventory: InventoryItem[] = [
    {
      id: `${p}-inv-1`,
      productId: products[0].id,
      qtyOnHand: 1,
      reorderPoint: 5,
      createdAt: iso(-10),
      updatedAt: iso(-1),
      product: products[0],
    },
    {
      id: `${p}-inv-2`,
      productId: products[1].id,
      qtyOnHand: 2,
      reorderPoint: 4,
      createdAt: iso(-8),
      updatedAt: iso(-1),
      product: products[1],
    },
    {
      id: `${p}-inv-3`,
      productId: products[2].id,
      qtyOnHand: 80,
      reorderPoint: 15,
      createdAt: iso(-6),
      updatedAt: iso(-1),
      product: products[2],
    },
  ]
  const makeOrder = (
    idx: number,
    shop: Shop,
    product: Product,
    status: Order['status'],
    etaHours: number | null,
    hoursAgo: number,
  ): Order => ({
    id: `${p}-ord-${idx}`,
    shopId: shop.id,
    orderNo: `MS-PEAK-${2100 + idx}`,
    status,
    totalAmount: String((900 + idx * 110).toFixed(2)),
    currency: 'RUB',
    buyerNote: etaHours !== null && etaHours <= 6 ? '超时风险演示' : null,
    etaHours,
    createdAt: iso(-hoursAgo),
    updatedAt: iso(-hoursAgo / 2),
    lines: [
      {
        id: `${p}-line-${idx}`,
        orderId: `${p}-ord-${idx}`,
        productId: product.id,
        sku: product.sku,
        qty: 1,
        unitPrice: String((900 + idx * 110).toFixed(2)),
      },
    ],
    shipment: null,
    shop,
  })
  const orders: Order[] = [
    makeOrder(1, shops[0], products[0], 'PENDING_REVIEW', 4, 10),
    makeOrder(2, shops[0], products[2], 'PENDING_REVIEW', 5, 9),
    makeOrder(3, shops[1], products[1], 'PENDING_REVIEW', 6, 8),
    makeOrder(4, shops[0], products[2], 'APPROVED', 12, 14),
    makeOrder(5, shops[1], products[1], 'AWAITING_SHIPMENT', 3, 16),
    makeOrder(6, shops[0], products[0], 'PENDING_PROCUREMENT', 8, 18),
  ]
  // seed labeled shipment for AWAITING_SHIPMENT
  orders[4].shipment = {
    id: `${p}-ship-5`,
    orderId: orders[4].id,
    trackingNo: 'INT-MOCK-MS2105',
    carrier: 'INTERNAL_MOCK_CARRIER',
    labeledAt: iso(-4),
    shippedAt: null,
    createdAt: iso(-4),
    updatedAt: iso(-4),
  }
  const shipments: Shipment[] = orders
    .filter((o) => o.shipment)
    .map((o) => ({ ...o.shipment!, order: o }))
  return {
    datasetKey: 'multishop_peak',
    shops,
    products,
    listings,
    orders,
    shipments,
    inventory,
    rules: baseRules(p),
    audit: seedAudit(p, [
      ['ORDER_CREATE', 'Order', orders[0].id],
      ['ORDER_CREATE', 'Order', orders[1].id],
      ['SHIPMENT_LABEL', 'Shipment', orders[4].shipment!.id],
      ['ORDER_CREATE', 'Order', orders[5].id],
    ]),
    seq: 300,
  }
}

const builders: Record<DatasetKey, () => DemoState> = {
  yiwu_cold: yiwu,
  guangzhou_mature: guangzhou,
  multishop_peak: multishop,
}

export function buildDataset(key: DatasetKey): DemoState {
  return structuredClone(builders[key]())
}

export function listDatasets(): DemoDatasetMeta[] {
  return DATASET_META
}
