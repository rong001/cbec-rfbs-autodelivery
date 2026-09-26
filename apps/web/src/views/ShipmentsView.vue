<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { Order, Shipment } from '../api/types'

const shipments = ref<Shipment[]>([])
const orders = ref<Order[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const busyId = ref<string | null>(null)
const carrier = ref('INTERNAL_MOCK_CARRIER')

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
      <h2>面单 / 发货</h2>
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>
    <div class="warn-box">面单号为本地 INTERNAL_GENERATED（非承运商/Ozon 实盘）。</div>

    <a-card title="可操作订单">
      <div class="form-row" style="max-width:480px;margin-bottom:12px">
        <label>承运商</label>
        <a-input v-model="carrier" placeholder="可选，默认 INTERNAL_MOCK_CARRIER" />
      </div>
      <a-table :data="orders" :loading="loading" row-key="id" :pagination="{ pageSize: 20 }">
        <template #columns>
          <a-table-column title="单号" data-index="orderNo" />
          <a-table-column title="状态" data-index="status" />
          <a-table-column title="面单">
            <template #cell="{ record }">
              <span v-if="record.shipment?.trackingNo" class="mono">{{ record.shipment.trackingNo }}</span>
              <span v-else class="muted">未打单</span>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="220">
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
          <a-empty description="暂无订单（空）" />
        </template>
      </a-table>
    </a-card>

    <a-card title="发货记录">
      <a-table :data="shipments" :loading="loading" row-key="id" :pagination="{ pageSize: 20 }">
        <template #columns>
          <a-table-column title="运单号" data-index="trackingNo" />
          <a-table-column title="承运商" data-index="carrier" />
          <a-table-column title="订单">
            <template #cell="{ record }">{{ record.order?.orderNo || record.orderId }}</template>
          </a-table-column>
          <a-table-column title="打单时间" data-index="labeledAt" />
          <a-table-column title="发货时间" data-index="shippedAt" />
        </template>
        <template #empty>
          <a-empty description="暂无发货记录（空）" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
