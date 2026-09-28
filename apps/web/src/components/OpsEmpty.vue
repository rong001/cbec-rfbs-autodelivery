<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** Optional CTA slot via default action button text */
    actionLabel?: string
  }>(),
  {
    title: '暂无数据',
    description: '当前列表为空。完成前置步骤后数据将出现在此。',
  },
)

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="ops-empty">
    <div class="ops-empty-icon" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" stroke-width="1.5" opacity="0.35" />
        <path d="M10 16h20M10 21h14M10 26h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.45" />
      </svg>
    </div>
    <div class="ops-empty-title">{{ title }}</div>
    <div class="ops-empty-desc">{{ description }}</div>
    <div v-if="actionLabel || $slots.action" class="ops-empty-action">
      <slot name="action">
        <a-button type="primary" size="small" @click="emit('action')">{{ actionLabel }}</a-button>
      </slot>
    </div>
  </div>
</template>
