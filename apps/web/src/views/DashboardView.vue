<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiGet } from '../api/client'
import type { HealthReady, InventoryItem, Order, Product, Shop } from '../api/types'
import { formatErrorBody, ApiError } from '../api/client'

const ready = ref<HealthReady | null>(null)
const counts = ref({ shops: 0, products: 0, orders: 0, inventory: 0 })
const error = ref<string | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [h, shops, products, orders, inventory] = await Promise.all([
      apiGet<HealthReady>('/health/ready'),
      apiGet<Shop[]>('/shops'),
      apiGet<Product[]>('/products'),
      apiGet<Order[]>('/orders'),
      apiGet<InventoryItem[]>('/inventory'),
    ])
    ready.value = h
    counts.value = {
      shops: shops.length,
      products: products.length,
      orders: orders.length,
      inventory: inventory.length,
    }
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
      <h2>总览</h2>
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>
    <div v-if="error" class="err-box">{{ error }}</div>
    <a-row :gutter="16">
      <a-col :span="6" v-for="c in [
        { label: '店铺', value: counts.shops },
        { label: '商品', value: counts.products },
        { label: '订单', value: counts.orders },
        { label: '库存条目', value: counts.inventory },
      ]" :key="c.label">
        <a-card>
          <a-statistic :title="c.label" :value="c.value" />
          <div v-if="c.value === 0" class="muted" style="margin-top:8px">暂无数据（空）</div>
        </a-card>
      </a-col>
    </a-row>
    <a-card title="健康检查 /health/ready">
      <template v-if="ready">
        <a-space>
          <a-tag :color="ready.status === 'ready' ? 'green' : 'red'">{{ ready.status }}</a-tag>
          <a-tag :color="ready.db === 'up' ? 'green' : 'red'">db: {{ ready.db }}</a-tag>
          <span class="muted mono">{{ ready.ts }}</span>
        </a-space>
      </template>
      <div v-else class="muted">尚未加载</div>
    </a-card>
  </div>
</template>
