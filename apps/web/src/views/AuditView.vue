<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet, ApiError, formatErrorBody } from '../api/client'
import type { AuditLog } from '../api/types'

const rows = ref<AuditLog[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const limit = ref(50)

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = await apiGet<AuditLog[]>(`/audit?limit=${limit.value}`)
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

function briefly(v: unknown) {
  try {
    const s = JSON.stringify(v)
    return s.length > 120 ? s.slice(0, 120) + '…' : s
  } catch {
    return String(v)
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2>审计</h2>
      <a-space>
        <a-input-number v-model="limit" :min="1" :max="200" />
        <a-button :loading="loading" @click="load">刷新</a-button>
      </a-space>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>

    <a-card title="最近日志">
      <a-table :data="rows" :loading="loading" row-key="id" :pagination="{ pageSize: 30 }">
        <template #columns>
          <a-table-column title="时间" data-index="createdAt" :width="190" />
          <a-table-column title="动作" data-index="action" />
          <a-table-column title="实体" :width="160">
            <template #cell="{ record }">{{ record.entityType }}</template>
          </a-table-column>
          <a-table-column title="实体ID" data-index="entityId" :width="200" />
          <a-table-column title="变更">
            <template #cell="{ record }">
              <div class="mono muted">{{ briefly(record.beforeJson) }} → {{ briefly(record.afterJson) }}</div>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty description="暂无审计日志（空）" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>
