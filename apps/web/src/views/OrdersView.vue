<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { Order, Product, Shop } from '../api/types'

const rows = ref<Order[]>([])
const shops = ref<Shop[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const creating = ref(false)
const runningRules = ref(false)
const approvingId = ref<string | null>(null)

const form = reactive({
  shopId: '',
  productId: '',
  qty: 1,
  unitPrice: 999,
  buyerNote: '',
  orderNo: '',
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const [olist, slist, plist] = await Promise.all([
      apiGet<Order[]>('/orders'),
      apiGet<Shop[]>('/shops'),
      apiGet<Product[]>('/products'),
    ])
    rows.value = olist
    shops.value = slist
    products.value = plist
    if (!form.shopId && slist[0]) form.shopId = slist[0].id
    if (!form.productId && plist[0]) form.productId = plist[0].id
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

async function createOrder() {
  creating.value = true
  error.value = null
  success.value = null
  try {
    const body: Record<string, unknown> = {
      shopId: form.shopId,
      lines: [
        {
          productId: form.productId,
          qty: Number(form.qty),
          unitPrice: Number(form.unitPrice),
        },
      ],
    }
    if (form.buyerNote.trim()) body.buyerNote = form.buyerNote.trim()
    if (form.orderNo.trim()) body.orderNo = form.orderNo.trim()
    const order = await apiPost<Order>('/orders', body)
    success.value = `已创建订单 ${order.orderNo} 状态=${order.status}`
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    creating.value = false
  }
}

async function runRules() {
  runningRules.value = true
  error.value = null
  success.value = null
  try {
    const res = await apiPost<Record<string, unknown>>('/orders/run-rules')
    success.value = `规则执行结果：${JSON.stringify(res)}`
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    runningRules.value = false
  }
}

async function approve(order: Order) {
  approvingId.value = order.id
  error.value = null
  success.value = null
  try {
    const res = await apiPost<Order>(`/orders/${order.id}/approve`)
    success.value = `已审批 ${res.orderNo || order.id} → ${res.status}`
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    approvingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2>审单</h2>
      <a-space>
        <a-button type="outline" :loading="runningRules" :disabled="runningRules" @click="runRules">
          运行规则
        </a-button>
        <a-button :loading="loading" @click="load">刷新</a-button>
      </a-space>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>

    <a-card title="创建订单">
      <div class="card-form">
        <div class="form-row">
          <label>店铺</label>
          <a-select v-model="form.shopId">
            <a-option v-for="s in shops" :key="s.id" :value="s.id">{{ s.name }}</a-option>
          </a-select>
        </div>
        <div class="form-row">
          <label>商品</label>
          <a-select v-model="form.productId">
            <a-option v-for="p in products" :key="p.id" :value="p.id">{{ p.sku }} · {{ p.title }}</a-option>
          </a-select>
        </div>
        <div class="form-row">
          <label>数量</label>
          <a-input-number v-model="form.qty" :min="1" style="width:100%" />
        </div>
        <div class="form-row">
          <label>单价</label>
          <a-input-number v-model="form.unitPrice" :min="0" :precision="2" style="width:100%" />
        </div>
        <div class="form-row">
          <label>备注</label>
          <a-input v-model="form.buyerNote" placeholder="可选" />
        </div>
        <div class="form-actions">
          <a-button
            type="primary"
            :loading="creating"
            :disabled="creating || !form.shopId || !form.productId"
            @click="createOrder"
          >
            创建订单
          </a-button>
        </div>
      </div>
    </a-card>

    <a-card title="订单列表">
      <a-table :data="rows" :loading="loading" row-key="id" :pagination="{ pageSize: 20 }">
        <template #columns>
          <a-table-column title="单号" data-index="orderNo" />
          <a-table-column title="状态" data-index="status">
            <template #cell="{ record }">
              <a-tag>{{ record.status }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="金额">
            <template #cell="{ record }">{{ record.totalAmount }} {{ record.currency }}</template>
          </a-table-column>
          <a-table-column title="行数">
            <template #cell="{ record }">{{ record.lines?.length ?? 0 }}</template>
          </a-table-column>
          <a-table-column title="物流">
            <template #cell="{ record }">
              <span v-if="record.shipment?.trackingNo" class="mono">{{ record.shipment.trackingNo }}</span>
              <span v-else class="muted">—</span>
            </template>
          </a-table-column>
          <a-table-column title="ID" data-index="id" :width="180" />
          <a-table-column title="操作" :width="120">
            <template #cell="{ record }">
              <a-button
                size="mini"
                :loading="approvingId === record.id"
                :disabled="approvingId === record.id || record.status !== 'PENDING_REVIEW'"
                @click="approve(record)"
              >
                审批
              </a-button>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty description="暂无订单（空）" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
