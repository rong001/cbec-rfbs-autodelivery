<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet, ApiError, formatErrorBody } from '../api/client'
import type { AuditLog } from '../api/types'
import OpsEmpty from '../components/OpsEmpty.vue'
import TableSkeleton from '../components/TableSkeleton.vue'

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
    return s.length > 100 ? s.slice(0, 100) + '…' : s
  } catch {
    return String(v)
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-header-main">
        <h2>审计</h2>
        <div class="page-meta">最近操作轨迹 · 显示 {{ rows.length }} / 上限 {{ limit }}</div>
      </div>
      <div class="page-actions">
        <a-input-number v-model="limit" :min="1" :max="200" size="small" style="width:88px" />
        <a-button type="primary" :loading="loading" @click="load">刷新</a-button>
      </div>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>

    <a-card title="最近日志">
      <TableSkeleton v-if="loading && !rows.length" :rows="8" :cols="5" />
      <a-table
        v-else
        :data="rows"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 30, showTotal: true }"
        :bordered="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="时间" data-index="createdAt" :width="170" />
          <a-table-column title="动作" data-index="action" :width="160">
            <template #cell="{ record }"><span class="mono">{{ record.action }}</span></template>
          </a-table-column>
          <a-table-column title="实体" :width="120">
            <template #cell="{ record }">{{ record.entityType }}</template>
          </a-table-column>
          <a-table-column title="实体ID" :width="160">
            <template #cell="{ record }"><span class="mono">{{ record.entityId }}</span></template>
          </a-table-column>
          <a-table-column title="变更">
            <template #cell="{ record }">
              <div class="mono muted change-cell">{{ briefly(record.beforeJson) }} → {{ briefly(record.afterJson) }}</div>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <OpsEmpty title="暂无审计日志" description="执行认领、审单、发货等操作后，变更轨迹将记录在此。" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.change-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 420px;
  font-size: 11.5px;
}
</style>
