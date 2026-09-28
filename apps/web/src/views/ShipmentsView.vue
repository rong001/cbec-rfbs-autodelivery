<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { Order, Shipment } from '../api/types'
import StatusTag from '../components/StatusTag.vue'
import OpsEmpty from '../components/OpsEmpty.vue'
import TableSkeleton from '../components/TableSkeleton.vue'

const shipments = ref<Shipment[]>([])
const orders = ref<Order[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const busyId = ref<string | null>(null)
const carrier = ref('INTERNAL_MOCK_CARRIER')

const actionable = computed(() =>
  orders.value.filter((o) => !['CANCELLED'].includes(o.status)),
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [slist, olist] = await Promise.all([
      apiGet<Shipment[]>('/shipments'),
      apiGet<Order[]>('/orders'),
    ])
    shipments.value = slist
    orders.value = olist
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

async function label(order: Order) {
  busyId.value = order.id
  error.value = null
  success.value = null
  try {
    const body = carrier.value.trim() ? { carrier: carrier.value.trim() } : {}
    const res = await apiPost<Shipment>(`/shipments/${order.id}/label`, body)
    success.value = `已打面单 ${order.orderNo} tracking=${res.trackingNo || '—'}`
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    busyId.value = null
  }
}

async function ship(order: Order) {
  busyId.value = order.id
  error.value = null
  success.value = null
  try {
    const res = await apiPost<Shipment | Order>(`/shipments/${order.id}/ship`)
    const track = (res as Shipment).trackingNo || order.shipment?.trackingNo || '—'
    success.value = `已发货 ${order.orderNo} tracking=${track}`
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-header-main">
        <h2>面单 / 发货</h2>
        <div class="page-meta">打单 → 发货闭环 · 面单号为本地 INTERNAL_GENERATED（非承运商实盘）</div>
      </div>
      <div class="page-actions">
        <a-button type="primary" :loading="loading" @click="load">刷新</a-button>
      </div>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>
    <div class="warn-box">面单号为本地 INTERNAL_GENERATED（非承运商/Ozon 实盘）。</div>

    <a-card title="可操作订单">
      <div class="toolbar" style="margin-bottom: 10px">
        <span class="muted" style="font-size:12px;font-weight:600">承运商</span>
        <a-input v-model="carrier" placeholder="可选，默认 INTERNAL_MOCK_CARRIER" style="max-width:280px" size="small" />
      </div>
      <TableSkeleton v-if="loading && !orders.length" :rows="5" :cols="4" />
      <a-table
        v-else
        :data="actionable"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20, showTotal: true }"
        :bordered="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="单号">
            <template #cell="{ record }"><span class="mono">{{ record.orderNo }}</span></template>
          </a-table-column>
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }"><StatusTag :value="record.status" /></template>
          </a-table-column>
          <a-table-column title="面单">
            <template #cell="{ record }">
              <span v-if="record.shipment?.trackingNo" class="mono">{{ record.shipment.trackingNo }}</span>
              <span v-else class="muted">未打单</span>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="200">
            <template #cell="{ record }">
              <a-space>
                <a-button
                  size="mini"
                  :loading="busyId === record.id"
                  :disabled="busyId === record.id || !!record.shipment?.labeledAt || record.status === 'SHIPPED'"
                  @click="label(record)"
                >
                  打面单
                </a-button>
                <a-button
                  size="mini"
                  type="primary"
                  :loading="busyId === record.id"
                  :disabled="busyId === record.id || record.status === 'SHIPPED' || !record.shipment?.labeledAt"
                  @click="ship(record)"
                >
                  发货
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <OpsEmpty title="暂无可操作订单" description="先在审单页创建并审批订单，再回到此打面单与发货。" />
        </template>
      </a-table>
    </a-card>

    <a-card title="发货记录">
      <TableSkeleton v-if="loading && !shipments.length" :rows="4" :cols="5" />
      <a-table
        v-else
        :data="shipments"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20, showTotal: true }"
        :bordered="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="运单号">
            <template #cell="{ record }"><span class="mono">{{ record.trackingNo || '—' }}</span></template>
          </a-table-column>
          <a-table-column title="承运商" data-index="carrier" />
          <a-table-column title="订单">
            <template #cell="{ record }">
              <span class="mono">{{ record.order?.orderNo || record.orderId }}</span>
            </template>
          </a-table-column>
          <a-table-column title="打单时间" data-index="labeledAt" />
          <a-table-column title="发货时间" data-index="shippedAt" />
        </template>
        <template #empty>
          <OpsEmpty title="暂无发货记录" description="完成打面单与发货后，记录将显示在此。" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
