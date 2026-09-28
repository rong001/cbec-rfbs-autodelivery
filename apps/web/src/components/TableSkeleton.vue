<script setup lang="ts">
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 6, cols: 5 })
</script>

<template>
  <div class="table-skeleton" role="status" aria-label="加载中">
    <div class="table-skeleton-head">
      <span v-for="c in cols" :key="'h'+c" class="skeleton-block" :style="{ width: c === 1 ? '18%' : '12%', height: '12px' }" />
    </div>
    <div v-for="r in rows" :key="'r'+r" class="table-skeleton-row">
      <span
        v-for="c in cols"
        :key="'c'+c"
        class="skeleton-block"
        :style="{ width: `${10 + ((r * c) % 8) * 3}%`, height: '14px' }"
      />
    </div>
  </div>
</template>
