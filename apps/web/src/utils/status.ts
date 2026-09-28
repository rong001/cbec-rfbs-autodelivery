/** Professional CBEC ops status language — muted semantic tones, Chinese labels. */

export type StatusTone = 'neutral' | 'info' | 'pending' | 'success' | 'warn' | 'danger' | 'accent'

export interface StatusMeta {
  label: string
  tone: StatusTone
}

const MAP: Record<string, StatusMeta> = {
  // Orders
  PENDING_REVIEW: { label: '待审', tone: 'pending' },
  APPROVED: { label: '已审', tone: 'info' },
  PENDING_PROCUREMENT: { label: '待采', tone: 'warn' },
  AWAITING_SHIPMENT: { label: '待发', tone: 'accent' },
  SHIPPED: { label: '已发', tone: 'success' },
  CANCELLED: { label: '已取消', tone: 'neutral' },
  // Listings
  DRAFT: { label: '草稿', tone: 'neutral' },
  MAPPING: { label: '映射中', tone: 'pending' },
  READY: { label: '就绪', tone: 'info' },
  PUBLISHED: { label: '已发布', tone: 'success' },
  FAILED: { label: '失败', tone: 'danger' },
  // Products / shops
  ACTIVE: { label: '启用', tone: 'success' },
  INACTIVE: { label: '停用', tone: 'neutral' },
  SUSPENDED: { label: '暂停', tone: 'warn' },
  ARCHIVED: { label: '归档', tone: 'neutral' },
  // Integrations
  NOT_CONFIGURED: { label: '未配置', tone: 'warn' },
  AUTHORIZED_UNTESTED: { label: '已授权未测', tone: 'pending' },
  MOCK_ONLY: { label: '仅模拟', tone: 'neutral' },
  SANDBOX_VERIFIED: { label: '沙箱已验', tone: 'info' },
  LIVE_READ_VERIFIED: { label: '实盘读已验', tone: 'success' },
  LIVE_WRITE_VERIFIED: { label: '实盘写已验', tone: 'success' },
  BLOCKED: { label: '已阻断', tone: 'danger' },
  // Health
  ready: { label: '就绪', tone: 'success' },
  not_ready: { label: '未就绪', tone: 'danger' },
  up: { label: '正常', tone: 'success' },
  down: { label: '异常', tone: 'danger' },
  'demo-memory': { label: '演示内存', tone: 'info' },
}

export function resolveStatus(raw: string | null | undefined): StatusMeta {
  if (!raw) return { label: '—', tone: 'neutral' }
  return MAP[raw] ?? { label: raw, tone: 'neutral' }
}
