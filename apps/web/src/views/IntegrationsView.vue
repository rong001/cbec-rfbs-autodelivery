<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet, ApiError, formatErrorBody } from '../api/client'
import type { IntegrationsStatus } from '../api/types'
import StatusTag from '../components/StatusTag.vue'
import OpsEmpty from '../components/OpsEmpty.vue'
import TableSkeleton from '../components/TableSkeleton.vue'

const data = ref<IntegrationsStatus | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await apiGet<IntegrationsStatus>('/integrations/status')
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-header-main">
        <h2>集成</h2>
        <div class="page-meta">平台连接状态如实展示 — 禁止伪造成功</div>
      </div>
      <div class="page-actions">
        <a-button type="primary" :loading="loading" @click="load">刷新</a-button>
      </div>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>

    <a-card title="平台连接状态">
      <div v-if="data?.honesty" class="warn-box" style="margin-bottom:14px">
        <div><strong>诚实声明：</strong>{{ data.honesty.message }}</div>
        <div class="muted" style="margin-top:6px;font-size:12px">
          ozonLive={{ data.honesty.ozonLive }} · secretsInDb={{ data.honesty.secretsInDb }}
        </div>
      </div>

      <TableSkeleton v-if="loading && !data" :rows="3" :cols="4" />
      <a-table
        v-else-if="data"
        :data="data.integrations"
        row-key="provider"
        :pagination="false"
        :bordered="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="提供方" data-index="provider">
            <template #cell="{ record }"><span class="mono">{{ record.provider }}</span></template>
          </a-table-column>
          <a-table-column title="状态" :width="120">
            <template #cell="{ record }">
              <StatusTag :value="record.status" />
            </template>
          </a-table-column>
          <a-table-column title="说明">
            <template #cell="{ record }">
              <span class="muted">{{ (record.meta && (record.meta as any).note) || '—' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="更新时间" data-index="updatedAt" :width="180" />
        </template>
        <template #empty>
          <OpsEmpty title="无集成记录" description="尚未登记任何平台连接。" />
        </template>
      </a-table>

      <div
        v-if="data?.integrations?.some(i => i.provider === 'OZON' && i.status === 'NOT_CONFIGURED')"
        class="err-box"
        style="margin-top:14px"
      >
        Ozon 状态为 <strong>NOT_CONFIGURED</strong> — 未连接，禁止宣称已接通。
      </div>
    </a-card>
  </div>
</template>
