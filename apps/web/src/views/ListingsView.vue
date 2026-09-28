<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { Listing, ListingStatus } from '../api/types'
import StatusTag from '../components/StatusTag.vue'
import OpsEmpty from '../components/OpsEmpty.vue'
import TableSkeleton from '../components/TableSkeleton.vue'

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
      <div class="page-header-main">
        <h2>刊登</h2>
        <div class="page-meta">推进路径：草稿 → 映射中 → 就绪 → 发布 · {{ rows.length }} 条</div>
      </div>
      <div class="page-actions">
        <a-button type="primary" :loading="loading" @click="load">刷新</a-button>
      </div>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>

    <a-card title="刊登列表">
      <TableSkeleton v-if="loading && !rows.length" :rows="6" :cols="4" />
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
          <a-table-column title="俄文标题" data-index="titleRu" />
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }"><StatusTag :value="record.status" /></template>
          </a-table-column>
          <a-table-column title="SKU" :width="140">
            <template #cell="{ record }">
              <span class="mono">{{ record.product?.sku || '—' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="180">
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
          <OpsEmpty title="暂无刊登" description="先在选品认领中生成草稿，再回到此推进与发布。" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
