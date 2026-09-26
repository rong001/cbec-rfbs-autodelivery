<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { Listing, ListingStatus } from '../api/types'

const rows = ref<Listing[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const busyId = ref<string | null>(null)

const NEXT: Partial<Record<ListingStatus, ListingStatus>> = {
  DRAFT: 'MAPPING',
  MAPPING: 'READY',
}

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = await apiGet<Listing[]>('/listings')
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

async function advance(row: Listing) {
  const next = NEXT[row.status]
  if (!next) {
    error.value = `状态 ${row.status} 无法 advance`
    return
  }
  busyId.value = row.id
  error.value = null
  success.value = null
  try {
    await apiPost(`/listings/${row.id}/advance`, { status: next })
    success.value = `已推进 ${row.id} → ${next}`
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    busyId.value = null
  }
}

async function publish(row: Listing) {
  busyId.value = row.id
  error.value = null
  success.value = null
  try {
    await apiPost(`/listings/${row.id}/publish`, { initialQty: 10, reorderPoint: 2 })
    success.value = `已发布 ${row.id}`
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
      <h2>刊登</h2>
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>
    <p class="muted">推进路径：DRAFT → MAPPING → READY，然后调用 publish。</p>

    <a-card title="刊登列表">
      <a-table :data="rows" :loading="loading" row-key="id" :pagination="{ pageSize: 20 }">
        <template #columns>
          <a-table-column title="俄文标题" data-index="titleRu" />
          <a-table-column title="状态" data-index="status">
            <template #cell="{ record }">
              <a-tag>{{ record.status }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="SKU">
            <template #cell="{ record }">{{ record.product?.sku || '—' }}</template>
          </a-table-column>
          <a-table-column title="productId" data-index="productId" :width="180" />
          <a-table-column title="ID" data-index="id" :width="180" />
          <a-table-column title="操作" :width="220">
            <template #cell="{ record }">
              <a-space>
                <a-button
                  size="mini"
                  :loading="busyId === record.id"
                  :disabled="busyId === record.id || !NEXT[record.status as ListingStatus]"
                  @click="advance(record)"
                >
                  推进
                </a-button>
                <a-button
                  size="mini"
                  type="primary"
                  :loading="busyId === record.id"
                  :disabled="busyId === record.id || record.status !== 'READY'"
                  @click="publish(record)"
                >
                  发布
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty description="暂无刊登（空）" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
