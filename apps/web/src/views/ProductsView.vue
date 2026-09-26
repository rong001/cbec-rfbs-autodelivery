<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { ClaimResult, Product, Shop } from '../api/types'

const rows = ref<Product[]>([])
const shops = ref<Shop[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const claiming = ref(false)
const form = reactive({
  shopId: '',
  sku: '',
  title: '',
  costCny: 10,
  weightG: 100,
  titleRu: '',
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const [plist, slist] = await Promise.all([
      apiGet<Product[]>('/products'),
      apiGet<Shop[]>('/shops'),
    ])
    rows.value = plist
    shops.value = slist
    if (!form.shopId && slist[0]) form.shopId = slist[0].id
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

async function claim() {
  claiming.value = true
  error.value = null
  success.value = null
  try {
    const body: Record<string, unknown> = {
      shopId: form.shopId,
      sku: form.sku.trim(),
      title: form.title.trim(),
      costCny: Number(form.costCny),
      weightG: Number(form.weightG),
    }
    if (form.titleRu.trim()) body.titleRu = form.titleRu.trim()
    const res = await apiPost<ClaimResult>('/products/claim-from-selection', body)
    const pid = res.productId || res.product?.id || '?'
    const lid = res.listingId || res.listing?.id || '?'
    success.value = `认领成功 product=${pid} listing=${lid}`
    form.sku = ''
    form.title = ''
    form.titleRu = ''
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    claiming.value = false
  }
}

onMounted(load)

const columns = [
  { title: 'SKU', dataIndex: 'sku' },
  { title: '标题', dataIndex: 'title' },
  { title: '成本CNY', dataIndex: 'costCny' },
  { title: '重量g', dataIndex: 'weightG' },
  { title: '状态', dataIndex: 'status' },
  { title: '店铺ID', dataIndex: 'shopId', width: 180 },
  { title: 'ID', dataIndex: 'id', width: 200 },
]
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2>选品认领</h2>
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>

    <a-card title="从选品认领（claim-from-selection）">
      <div class="card-form">
        <div class="form-row">
          <label>店铺</label>
          <a-select v-model="form.shopId" placeholder="选择店铺" allow-search>
            <a-option v-for="s in shops" :key="s.id" :value="s.id">{{ s.name }}</a-option>
          </a-select>
        </div>
        <div class="form-row">
          <label>SKU</label>
          <a-input v-model="form.sku" />
        </div>
        <div class="form-row">
          <label>标题</label>
          <a-input v-model="form.title" />
        </div>
        <div class="form-row">
          <label>俄文标题</label>
          <a-input v-model="form.titleRu" placeholder="可选，写入 listing" />
        </div>
        <div class="form-row">
          <label>成本 CNY</label>
          <a-input-number v-model="form.costCny" :min="0" :precision="2" style="width:100%" />
        </div>
        <div class="form-row">
          <label>重量 g</label>
          <a-input-number v-model="form.weightG" :min="0" :precision="0" style="width:100%" />
        </div>
        <div class="form-actions">
          <a-button
            type="primary"
            :loading="claiming"
            :disabled="claiming || !form.shopId || !form.sku.trim() || !form.title.trim()"
            @click="claim"
          >
            认领并生成刊登草稿
          </a-button>
        </div>
      </div>
    </a-card>

    <a-card title="商品列表">
      <a-table :columns="columns" :data="rows" :loading="loading" row-key="id" :pagination="{ pageSize: 20 }">
        <template #empty>
          <a-empty description="暂无商品（空）" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
