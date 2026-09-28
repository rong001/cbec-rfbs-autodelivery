<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { ClaimResult, Product, Shop } from '../api/types'
import StatusTag from '../components/StatusTag.vue'
import OpsEmpty from '../components/OpsEmpty.vue'
import TableSkeleton from '../components/TableSkeleton.vue'

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
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-header-main">
        <h2>选品认领</h2>
        <div class="page-meta">从选品认领并生成刊登草稿 · {{ rows.length }} 个 SKU</div>
      </div>
      <div class="page-actions">
        <a-button type="primary" :loading="loading" @click="load">刷新</a-button>
      </div>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>

    <a-card title="从选品认领">
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
      <TableSkeleton v-if="loading && !rows.length" :rows="6" :cols="5" />
      <a-table
        v-else
        :data="rows"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20, showTotal: true }"
        :bordered="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="SKU" data-index="sku">
            <template #cell="{ record }"><span class="mono">{{ record.sku }}</span></template>
          </a-table-column>
          <a-table-column title="标题" data-index="title" />
          <a-table-column title="成本 CNY" :width="100" align="right">
            <template #cell="{ record }"><span class="tabular">{{ record.costCny }}</span></template>
          </a-table-column>
          <a-table-column title="重量 g" :width="90" align="right">
            <template #cell="{ record }"><span class="tabular">{{ record.weightG }}</span></template>
          </a-table-column>
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }"><StatusTag :value="record.status" /></template>
          </a-table-column>
        </template>
        <template #empty>
          <OpsEmpty title="暂无商品" description="使用上方表单认领选品，将自动生成商品与刊登草稿。" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
