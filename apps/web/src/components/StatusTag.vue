<script setup lang="ts">
import { computed } from 'vue'
import { resolveStatus, type StatusTone } from '../utils/status'

const props = withDefaults(
  defineProps<{
    value?: string | null
    label?: string
    tone?: StatusTone
    /** Show raw code in title tooltip */
    showCode?: boolean
  }>(),
  { showCode: true },
)

const meta = computed(() => {
  if (props.label && props.tone) return { label: props.label, tone: props.tone }
  return resolveStatus(props.value)
})
</script>

<template>
  <span
    class="status-tag"
    :class="`tone-${meta.tone}`"
    :title="showCode && value ? String(value) : undefined"
  >
    <span class="status-dot" aria-hidden="true" />
    {{ meta.label }}
  </span>
</template>
