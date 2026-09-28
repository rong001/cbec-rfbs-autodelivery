<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiGet, ApiError, formatErrorBody } from '../api/client'
import type { HealthReady, InventoryItem, Order, Product, Shop } from '../api/types'
import { isDemoMode, listDatasets, getActiveKey } from '../demo'

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
      <div>
        <h2>总览</h2>
        <div class="muted" v-if="datasetLabel">当前演示集：{{ datasetLabel }}</div>
      </div>
      <a-button type="primary" :loading="loading" @click="load">刷新数据</a-button>
    </div>

    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="demo" class="warn-box honesty-banner">
      演示数据 · DEMO — 非 Ozon 实盘、非生产环境。变更仅保存在本浏览器 localStorage。
    </div>

    <div class="kpi-strip" :class="{ loading }">
      <div
        v-for="(c, i) in kpiItems"
        :key="c.label"
        class="kpi-hero breathe lift"
        :style="{ animationDelay: `${i * 0.35}s` }"
      >
        <div class="kpi-label">{{ c.label }}</div>
        <div class="kpi-value">
          <template v-if="loading && !shops.length"><span class="skeleton-block" style="width:48px;height:28px" /></template>
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
        <div class="queue-value">{{ loading && !orders.length ? '—' : q.value }}</div>
        <div class="queue-cta">{{ q.cta }} →</div>
      </button>
    </div>

    <a-row :gutter="16">
      <a-col :xs="24" :md="16">
        <a-card title="待办队列摘要" class="panel-card">
          <a-descriptions :column="2" size="large" bordered>
            <a-descriptions-item label="已发货">{{ shipped }}</a-descriptions-item>
            <a-descriptions-item label="待审单">{{ pendingReview }}</a-descriptions-item>
            <a-descriptions-item label="待发货">{{ awaitingShip }}</a-descriptions-item>
            <a-descriptions-item label="库存 ≤ 再订货点">{{ lowStock }}</a-descriptions-item>
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
                <a-tag :color="ready.status === 'ready' ? 'green' : 'red'">{{ ready.status }}</a-tag>
                <a-tag :color="ready.db === 'up' || ready.db === 'demo-memory' ? 'green' : 'orange'">
                  db: {{ ready.db }}
                </a-tag>
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
.honesty-banner {
  border-radius: 12px;
}
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.kpi-hero {
  position: relative;
  padding: 18px 18px 16px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  border: 1px solid transparent;
  background-clip: padding-box;
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.18),
    0 10px 28px rgba(59, 130, 246, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  overflow: hidden;
  cursor: default;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.kpi-hero::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, #3B82F6, #22D3EE);
}
.kpi-label {
  font-size: 13px;
  color: #64748B;
  font-weight: 600;
}
.kpi-value {
  margin: 8px 0 4px;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #0F172A;
  line-height: 1.1;
  min-height: 36px;
  display: flex;
  align-items: center;
}
.kpi-hint { font-size: 12px; }

.queue-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.queue-card {
  appearance: none;
  text-align: left;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 16px 16px 14px;
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
  font: inherit;
}
.queue-card:hover {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.12);
}
.queue-card:active { transform: scale(0.985); }
.queue-label { font-size: 13px; color: #64748B; font-weight: 600; }
.queue-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.25;
  margin: 6px 0 4px;
  letter-spacing: -0.02em;
}
.queue-cta {
  font-size: 12px;
  font-weight: 650;
  color: #3B82F6;
}
.tone-electric .queue-value { color: #2563EB; }
.tone-ice .queue-value { color: #0891B2; }
.tone-warn .queue-value { color: #D97706; }
.tone-danger .queue-value { color: #DC2626; }

.panel-card { margin-top: 2px; }
.trail { margin-top: 14px; }
.health-card { min-height: 180px; }
.empty-soft { padding: 4px 0; }

@media (max-width: 960px) {
  .kpi-strip, .queue-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .kpi-strip, .queue-strip {
    grid-template-columns: 1fr;
  }
}
</style>
