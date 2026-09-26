<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet, ApiError, formatErrorBody } from '../api/client'
import type { IntegrationsStatus } from '../api/types'

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

function statusColor(s: string) {
  if (s === 'NOT_CONFIGURED') return 'orangered'
  if (s.includes('VERIFIED')) return 'green'
  if (s === 'BLOCKED') return 'red'
  return 'arcoblue'
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2>集成</h2>
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>

    <a-card title="平台连接状态（如实展示，禁止伪造成功）">
      <div v-if="data?.honesty" class="warn-box" style="margin-bottom:16px">
        <div><strong>诚实声明：</strong>{{ data.honesty.message }}</div>
        <div class="muted" style="margin-top:6px">
          ozonLive={{ data.honesty.ozonLive }} · secretsInDb={{ data.honesty.secretsInDb }}
        </div>
      </div>

      <a-table v-if="data" :data="data.integrations" row-key="provider" :pagination="false">
        <template #columns>
          <a-table-column title="提供方" data-index="provider" />
          <a-table-column title="状态" data-index="status">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="说明">
            <template #cell="{ record }">
              <span class="muted">{{ (record.meta && (record.meta as any).note) || '—' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="更新时间" data-index="updatedAt" />
        </template>
        <template #empty>
          <a-empty description="无集成记录" />
        </template>
      </a-table>

      <div v-if="data?.integrations?.some(i => i.provider === 'OZON' && i.status === 'NOT_CONFIGURED')" class="err-box" style="margin-top:16px">
        Ozon 状态为 <strong>NOT_CONFIGURED</strong> — 未连接，禁止宣称已接通。
      </div>
    </a-card>
  </div>
</template>
