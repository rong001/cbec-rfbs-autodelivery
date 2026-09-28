<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { apiGet, apiPatch, apiPost, ApiError, formatErrorBody } from '../api/client'
import type { FulfillmentRule } from '../api/types'
import StatusTag from '../components/StatusTag.vue'
import OpsEmpty from '../components/OpsEmpty.vue'
import TableSkeleton from '../components/TableSkeleton.vue'

const rows = ref<FulfillmentRule[]>([])
const loading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const pendingIds = ref<string[]>([])

const form = reactive({
  name: '',
  priority: 100,
  conditionJson: '{\n  "status": "PENDING_REVIEW"\n}',
  actionJson: '{\n  "type": "AUTO_APPROVE"\n}',
})

const canSubmit = computed(() =>
  form.name.trim().length > 0 && form.priority >= 0 && !creating.value,
)

function messageFor(errorValue: unknown, action = '操作', roles = 'MANAGER 或 ADMIN') {
  if (errorValue instanceof ApiError) {
    if (errorValue.status === 403) {
      return `403 Forbidden：当前角色无权${action}规则（需要 ${roles}）。`
    }
    return `${errorValue.status}：${formatErrorBody(errorValue.body)}`
  }
  return errorValue instanceof Error ? errorValue.message : '请求失败'
}

function isPending(id: string) {
  return pendingIds.value.includes(id)
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = await apiGet<FulfillmentRule[]>('/rules')
  } catch (e) {
    error.value = messageFor(e, '查看', 'OPERATOR、MANAGER 或 ADMIN')
  } finally {
    loading.value = false
  }
}

async function createRule() {
  error.value = null
  success.value = null
  let conditionJson: Record<string, unknown>
  let actionJson: Record<string, unknown>
  try {
    conditionJson = JSON.parse(form.conditionJson)
    actionJson = JSON.parse(form.actionJson)
  } catch {
    error.value = 'JSON 格式错误：请检查条件 JSON 和动作 JSON。'
    return
  }
  if (conditionJson === null || Array.isArray(conditionJson) || typeof conditionJson !== 'object') {
    error.value = '条件 JSON 必须是对象。'
    return
  }
  if (actionJson === null || Array.isArray(actionJson) || typeof actionJson !== 'object') {
    error.value = '动作 JSON 必须是对象。'
    return
  }

  creating.value = true
  try {
    const rule = await apiPost<FulfillmentRule>('/rules', {
      name: form.name.trim(),
      priority: form.priority,
      conditionJson,
      actionJson,
    })
    success.value = `已创建规则：${rule.name}`
    form.name = ''
    await load()
  } catch (e) {
    error.value = messageFor(e, '创建或修改')
  } finally {
    creating.value = false
  }
}

async function toggleRule(rule: FulfillmentRule, enabled: boolean) {
  if (isPending(rule.id)) return
  error.value = null
  success.value = null
  pendingIds.value = [...pendingIds.value, rule.id]
  try {
    await apiPatch<FulfillmentRule>(`/rules/${rule.id}/enabled`, { enabled })
    success.value = enabled ? `已启用规则：${rule.name}` : `已停用规则：${rule.name}`
    await load()
  } catch (e) {
    error.value = messageFor(e, enabled ? '启用' : '停用')
  } finally {
    pendingIds.value = pendingIds.value.filter((id) => id !== rule.id)
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-header-main">
        <h2>自动化规则</h2>
        <div class="page-meta">按优先级执行的本地履约规则 · 不调用 Ozon 实盘 · {{ rows.length }} 条</div>
      </div>
      <div class="page-actions">
        <a-button type="primary" :loading="loading" @click="load">刷新</a-button>
      </div>
    </div>

    <div v-if="error" class="err-box">{{ error }}</div>
    <div v-if="success" class="ok-box">{{ success }}</div>

    <a-card title="创建简单规则">
      <div class="card-form rule-form">
        <div class="form-row">
          <label>名称</label>
          <a-input v-model="form.name" placeholder="例如：auto-approve-pending" />
        </div>
        <div class="form-row">
          <label>优先级</label>
          <a-input-number v-model="form.priority" :min="0" />
        </div>
        <div class="form-row textarea-row">
          <label>条件 JSON</label>
          <div>
            <a-textarea v-model="form.conditionJson" :auto-size="{ minRows: 3, maxRows: 8 }" />
            <div class="muted" style="margin-top:4px;font-size:12px">示例：{ "status": "PENDING_REVIEW" } 或 { "checkInventory": true }</div>
          </div>
        </div>
        <div class="form-row textarea-row">
          <label>动作 JSON</label>
          <div>
            <a-textarea v-model="form.actionJson" :auto-size="{ minRows: 3, maxRows: 8 }" />
            <div class="muted" style="margin-top:4px;font-size:12px">AUTO_APPROVE / SUGGEST_CARRIER</div>
          </div>
        </div>
        <div class="form-actions">
          <a-button type="primary" :loading="creating" :disabled="!canSubmit" @click="createRule">创建规则</a-button>
        </div>
      </div>
    </a-card>

    <a-card title="规则列表">
      <TableSkeleton v-if="loading && !rows.length" :rows="4" :cols="5" />
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
          <a-table-column title="名称" data-index="name" />
          <a-table-column title="优先级" :width="80" align="right">
            <template #cell="{ record }"><span class="tabular">{{ record.priority }}</span></template>
          </a-table-column>
          <a-table-column title="条件" :width="220">
            <template #cell="{ record }"><span class="mono json-cell">{{ prettyJson(record.conditionJson) }}</span></template>
          </a-table-column>
          <a-table-column title="动作" :width="220">
            <template #cell="{ record }"><span class="mono json-cell">{{ prettyJson(record.actionJson) }}</span></template>
          </a-table-column>
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }">
              <StatusTag
                :label="record.enabled ? '启用' : '停用'"
                :tone="record.enabled ? 'success' : 'neutral'"
                :show-code="false"
              />
            </template>
          </a-table-column>
          <a-table-column title="开关" :width="80">
            <template #cell="{ record }">
              <a-switch
                :model-value="record.enabled"
                :loading="isPending(record.id)"
                :disabled="isPending(record.id)"
                @change="(value: string | number | boolean) => toggleRule(record, value === true)"
              />
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <OpsEmpty title="暂无规则" description="创建规则后可在审单页「运行规则」触发本地履约逻辑。" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.rule-form { max-width: 720px; }
.textarea-row { align-items: start; }
.textarea-row > div { min-width: 0; }
.json-cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
}
</style>
