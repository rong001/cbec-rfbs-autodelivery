<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiGet, ApiError, formatErrorBody } from '../api/client'
import type { HealthReady, InventoryItem, Order, Product, Shop } from '../api/types'
import { isDemoMode, listDatasets, getActiveKey } from '../demo'
import StatusTag from '../components/StatusTag.vue'

const ready = ref<HealthReady | null>(null)
const shops = ref<Shop[]>([])
const products = ref<Product[]>([])
const orders = ref<Order[]>([])
const inventory = ref<InventoryItem[]>([])
const error = ref<string | null>(null)
const loading = ref(false)
const demo = isDemoMode()
const router = useRouter()

const counts = computed(() => ({
  shops: shops.value.length,
  products: products.value.length,
  orders: orders.value.length,
  inventory: inventory.value.length,
}))

const pendingReview = computed(() => orders.value.filter((o) => o.status === 'PENDING_REVIEW').length)
const awaitingShip = computed(() => orders.value.filter((o) => o.status === 'AWAITING_SHIPMENT').length)
const lowStock = computed(() => inventory.value.filter((i) => i.qtyOnHand <= i.reorderPoint).length)
const riskEta = computed(() =>
  orders.value.filter(
    (o) =>
      o.etaHours != null &&
      o.etaHours <= 6 &&
      !['SHIPPED', 'CANCELLED'].includes(o.status),
  ).length,
)
const shipped = computed(() => orders.value.filter((o) => o.status === 'SHIPPED').length)

const datasetLabel = computed(() => {
  if (!demo) return null
  return listDatasets().find((d) => d.key === getActiveKey())?.name ?? getActiveKey()
})

const kpiItems = computed(() => [
  { label: '店铺', value: counts.value.shops, hint: '已接入店铺' },
  { label: '商品', value: counts.value.products, hint: 'SKU 总量' },
  { label: '订单', value: counts.value.orders, hint: '全量订单' },
  { label: '库存条目', value: counts.value.inventory, hint: '仓存记录' },
])

const queueItems = computed(() => [
  { label: '待审单', value: pendingReview.value, tone: 'electric', route: 'orders', cta: '去审单' },
  { label: '待发货', value: awaitingShip.value, tone: 'ice', route: 'shipments', cta: '去发货' },
  { label: '库存预警', value: lowStock.value, tone: 'warn', route: 'inventory', cta: '看库存' },
  { label: '超时风险', value: riskEta.value, tone: 'danger', route: 'orders', cta: '去处理' },
])

async function load() {
  loading.value = true
  error.value = null
  try {
    const [h, s, p, o, inv] = await Promise.all([
      apiGet<HealthReady>('/health/ready'),
      apiGet<Shop[]>('/shops'),
      apiGet<Product[]>('/products'),
      apiGet<Order[]>('/orders'),
      apiGet<InventoryItem[]>('/inventory'),
    ])
    ready.value = h
    shops.value = s
    products.value = p
    orders.value = o
    inventory.value = inv
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

function go(name: string) {
  router.push({ name })
}

onMounted(load)
</script>

<template>
  <div class="page dash">
    <div class="page-header">
      <div class="page-header-main">
        <h2>总览</h2>
        <div class="page-meta">
          运营队列与健康状态一览
          <template v-if="datasetLabel"> · 当前演示集：{{ datasetLabel }}</template>
        </div>
      </div>
      <div class="page-actions">
        <a-button type="primary" class="btn-hero" :loading="loading" @click="load">刷新数据</a-button>
      </div>
    </div>

    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="demo" class="warn-box honesty-banner">
      演示数据 · DEMO — 非 Ozon 实盘、非生产环境。变更仅保存在本浏览器 localStorage。
    </div>

    <div class="kpi-strip">
      <div
        v-for="(c, i) in kpiItems"
        :key="c.label"
        class="kpi-hero lift"
        :class="{ breathe: i === 0 }"
      >
        <div class="kpi-label">{{ c.label }}</div>
        <div class="kpi-value tabular">
          <template v-if="loading && !shops.length"><span class="skeleton-block" style="width:48px;height:26px" /></template>
          <template v-else>{{ c.value }}</template>
        </div>
        <div class="kpi-hint muted">{{ c.hint }}</div>
      </div>
    </div>

    <div class="queue-strip">
      <button
        v-for="q in queueItems"
        :key="q.label"
        type="button"
        class="queue-card lift"
        :class="`tone-${q.tone}`"
        @click="go(q.route)"
      >
        <div class="queue-label">{{ q.label }}</div>
        <div class="queue-value tabular">{{ loading && !orders.length ? '—' : q.value }}</div>
        <div class="queue-cta">{{ q.cta }} →</div>
      </button>
    </div>

    <a-row :gutter="14">
      <a-col :xs="24" :md="16">
        <a-card title="待办队列摘要" class="panel-card">
          <a-descriptions :column="2" size="medium" bordered>
            <a-descriptions-item label="已发货"><span class="tabular">{{ shipped }}</span></a-descriptions-item>
            <a-descriptions-item label="待审单"><span class="tabular">{{ pendingReview }}</span></a-descriptions-item>
            <a-descriptions-item label="待发货"><span class="tabular">{{ awaitingShip }}</span></a-descriptions-item>
            <a-descriptions-item label="库存 ≤ 再订货点"><span class="tabular">{{ lowStock }}</span></a-descriptions-item>
          </a-descriptions>
          <div class="muted trail">
            建议路径：审单 → 运行规则 → 打面单 → 发货 → 核对库存与审计。
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8">
        <a-card title="健康检查" class="panel-card health-card">
          <template v-if="ready">
            <a-space direction="vertical" fill size="medium">
              <a-space wrap>
                <StatusTag :value="ready.status" />
                <StatusTag :value="ready.db" :label="`db · ${ready.db}`" />
              </a-space>
              <span class="muted mono">{{ ready.ts }}</span>
              <div v-if="demo" class="muted">demo-memory = 浏览器内演示存储</div>
            </a-space>
          </template>
          <div v-else class="empty-soft">
            <div class="skeleton-block" style="width: 60%; margin-bottom: 10px" />
            <div class="skeleton-block" style="width: 40%" />
            <div class="muted" style="margin-top: 12px">尚未加载</div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.honesty-banner { border-radius: 8px; }
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.kpi-hero {
  position: relative;
  padding: 14px 16px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.07);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03), 0 0 0 1px rgba(59, 130, 246, 0.08);
  overflow: hidden;
  cursor: default;
}
.kpi-hero::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(90deg, #3B82F6, #22D3EE);
}
.kpi-label {
  font-size: 12px;
  color: #64748B;
  font-weight: 600;
}
.kpi-value {
  margin: 6px 0 2px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #0F172A;
  line-height: 1.1;
  min-height: 32px;
  display: flex;
  align-items: center;
}
.kpi-hint { font-size: 11.5px; }

.queue-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.queue-card {
  appearance: none;
  text-align: left;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 12px;
  padding: 12px 14px 11px;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  font: inherit;
}
.queue-card:hover {
  border-color: rgba(59, 130, 246, 0.28);
}
.queue-label { font-size: 12px; color: #64748B; font-weight: 600; }
.queue-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  margin: 4px 0 2px;
  letter-spacing: -0.02em;
}
.queue-cta {
  font-size: 12px;
  font-weight: 600;
  color: #3B82F6;
}
.tone-electric .queue-value { color: #2563EB; }
.tone-ice .queue-value { color: #0E7490; }
.tone-warn .queue-value { color: #D97706; }
.tone-danger .queue-value { color: #DC2626; }

.panel-card { margin-top: 2px; }
.trail { margin-top: 12px; font-size: 12.5px; }
.health-card { min-height: 160px; }
.empty-soft { padding: 4px 0; }

@media (max-width: 960px) {
  .kpi-strip, .queue-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .kpi-strip, .queue-strip { grid-template-columns: 1fr; }
}
</style>
