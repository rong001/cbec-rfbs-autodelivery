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
  <div class="page">
    <div class="page-header">
      <div>
        <h2>总览</h2>
        <div class="muted" v-if="datasetLabel">当前演示集：{{ datasetLabel }}</div>
      </div>
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="demo" class="warn-box">
      演示数据 · DEMO — 非 Ozon 实盘、非生产环境。变更仅保存在本浏览器 localStorage。
    </div>

    <a-row :gutter="16">
      <a-col :xs="12" :sm="6" v-for="c in [
        { label: '店铺', value: counts.shops },
        { label: '商品', value: counts.products },
        { label: '订单', value: counts.orders },
        { label: '库存条目', value: counts.inventory },
      ]" :key="c.label">
        <a-card class="kpi-card" :bordered="true">
          <a-statistic :title="c.label" :value="c.value" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 4px">
      <a-col :xs="12" :sm="6" v-for="q in [
        { label: '待审单', value: pendingReview, color: '#165dff', route: 'orders' },
        { label: '待发货', value: awaitingShip, color: '#0fc6c2', route: 'shipments' },
        { label: '库存预警', value: lowStock, color: '#ff7d00', route: 'inventory' },
        { label: '超时风险', value: riskEta, color: '#f53f3f', route: 'orders' },
      ]" :key="q.label">
        <a-card class="queue-card" hoverable @click="go(q.route)">
          <div class="queue-label">{{ q.label }}</div>
          <div class="queue-value" :style="{ color: q.color }">{{ q.value }}</div>
          <div class="muted queue-link">去处理 →</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :span="16">
        <a-card title="待办队列摘要">
          <a-descriptions :column="2" size="small" bordered>
            <a-descriptions-item label="已发货">{{ shipped }}</a-descriptions-item>
            <a-descriptions-item label="待审单">{{ pendingReview }}</a-descriptions-item>
            <a-descriptions-item label="待发货">{{ awaitingShip }}</a-descriptions-item>
            <a-descriptions-item label="库存 ≤ 再订货点">{{ lowStock }}</a-descriptions-item>
          </a-descriptions>
          <div class="muted" style="margin-top: 12px">
            建议路径：审单 → 运行规则 → 打面单 → 发货 → 核对库存与审计。
          </div>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="健康检查">
          <template v-if="ready">
            <a-space direction="vertical" fill>
              <a-space>
                <a-tag :color="ready.status === 'ready' ? 'green' : 'red'">{{ ready.status }}</a-tag>
                <a-tag :color="ready.db === 'up' || ready.db === 'demo-memory' ? 'green' : 'orange'">
                  db: {{ ready.db }}
                </a-tag>
              </a-space>
              <span class="muted mono">{{ ready.ts }}</span>
              <div v-if="demo" class="muted">demo-memory = 浏览器内演示存储</div>
            </a-space>
          </template>
          <div v-else class="muted">尚未加载</div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.kpi-card, .queue-card {
  border: 1px solid #e5e6eb;
  margin-bottom: 16px;
}
.queue-card { cursor: pointer; }
.queue-label { font-size: 13px; color: #86909c; }
.queue-value { font-size: 28px; font-weight: 600; line-height: 1.3; margin: 4px 0; }
.queue-link { font-size: 12px; }
</style>
