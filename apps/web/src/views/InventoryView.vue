<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { InventoryItem } from '../api/types'

const rows = ref<InventoryItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const adjusting = ref(false)
const form = reactive({
  productId: '',
  delta: -1,
  reason: '',
  reorderPoint: undefined as number | undefined,
})

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = await apiGet<InventoryItem[]>('/inventory')
    if (!form.productId && rows.value[0]) form.productId = rows.value[0].productId
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

async function adjust() {
  adjusting.value = true
  error.value = null
  success.value = null
  try {
    const body: Record<string, unknown> = { delta: Number(form.delta) }
    if (form.reason.trim()) body.reason = form.reason.trim()
    if (form.reorderPoint !== undefined && form.reorderPoint !== null) {
      body.reorderPoint = Number(form.reorderPoint)
    }
    const res = await apiPost<InventoryItem>(`/inventory/${form.productId}/adjust`, body)
    success.value = `已调整库存 product=${form.productId} qtyOnHand=${res.qtyOnHand}`
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    adjusting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2>库存</h2>
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>

    <a-card title="调整库存">
      <div class="card-form">
        <div class="form-row">
          <label>商品</label>
          <a-select v-model="form.productId" allow-search>
            <a-option v-for="r in rows" :key="r.productId" :value="r.productId">
              {{ r.product?.sku || r.productId }} · 现有 {{ r.qtyOnHand }}
            </a-option>
          </a-select>
        </div>
        <div class="form-row">
          <label>增量 delta</label>
          <a-input-number v-model="form.delta" :precision="0" style="width:100%" />
        </div>
        <div class="form-row">
          <label>原因</label>
          <a-input v-model="form.reason" placeholder="可选" />
        </div>
        <div class="form-row">
          <label>再订货点</label>
          <a-input-number v-model="form.reorderPoint" :min="0" :precision="0" style="width:100%" placeholder="可选" />
        </div>
        <div class="form-actions">
          <a-button type="primary" :loading="adjusting" :disabled="adjusting || !form.productId" @click="adjust">
            提交调整
          </a-button>
        </div>
      </div>
    </a-card>

    <a-card title="库存列表">
      <a-table :data="rows" :loading="loading" row-key="id" :pagination="{ pageSize: 20 }">
        <template #columns>
          <a-table-column title="SKU">
            <template #cell="{ record }">{{ record.product?.sku || '—' }}</template>
          </a-table-column>
          <a-table-column title="标题">
            <template #cell="{ record }">{{ record.product?.title || '—' }}</template>
          </a-table-column>
          <a-table-column title="现有数量" data-index="qtyOnHand" />
          <a-table-column title="再订货点" data-index="reorderPoint" />
          <a-table-column title="productId" data-index="productId" :width="200" />
          <a-table-column title="更新时间" data-index="updatedAt" />
        </template>
        <template #empty>
          <a-empty description="暂无库存（空）" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
