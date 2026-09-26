<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { Shop } from '../api/types'

const rows = ref<Shop[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const creating = ref(false)
const form = reactive({
  name: '',
  platform: 'OZON_RFBS' as const,
  externalShopId: '',
  status: 'ACTIVE' as const,
})

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = await apiGet<Shop[]>('/shops')
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

async function createShop() {
  creating.value = true
  error.value = null
  success.value = null
  try {
    const body: Record<string, string> = {
      name: form.name.trim(),
      platform: form.platform,
      status: form.status,
    }
    if (form.externalShopId.trim()) body.externalShopId = form.externalShopId.trim()
    const shop = await apiPost<Shop>('/shops', body)
    success.value = `已创建店铺：${shop.name} (${shop.id})`
    form.name = ''
    form.externalShopId = ''
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    creating.value = false
  }
}

onMounted(load)

const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: '平台', dataIndex: 'platform' },
  { title: '状态', dataIndex: 'status' },
  { title: '外部店铺ID', dataIndex: 'externalShopId' },
  { title: 'ID', dataIndex: 'id', width: 220 },
  { title: '创建时间', dataIndex: 'createdAt' },
]
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2>店铺</h2>
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>

    <a-card title="创建店铺">
      <div class="card-form">
        <div class="form-row">
          <label>名称</label>
          <a-input v-model="form.name" placeholder="店铺名称" />
        </div>
        <div class="form-row">
          <label>平台</label>
          <a-select v-model="form.platform">
            <a-option value="OZON_RFBS">OZON_RFBS</a-option>
            <a-option value="OTHER">OTHER</a-option>
          </a-select>
        </div>
        <div class="form-row">
          <label>外部店铺ID</label>
          <a-input v-model="form.externalShopId" placeholder="可选" />
        </div>
        <div class="form-actions">
          <a-button type="primary" :loading="creating" :disabled="creating || !form.name.trim()" @click="createShop">
            创建
          </a-button>
        </div>
      </div>
    </a-card>

    <a-card title="店铺列表">
      <a-table :columns="columns" :data="rows" :loading="loading" row-key="id" :pagination="{ pageSize: 20 }">
        <template #empty>
          <a-empty description="暂无店铺（空）" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
