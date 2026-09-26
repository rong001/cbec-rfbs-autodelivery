<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import {
  IconDashboard,
  IconHome,
  IconStorage,
  IconFile,
  IconCheckCircle,
  IconSend,
  IconApps,
  IconLink,
  IconSettings,
  IconHistory,
  IconPoweroff,
} from '@arco-design/web-vue/es/icon'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()
const collapsed = ref(false)

const selected = computed(() => [route.name as string])

const menus = [
  { key: 'dashboard', label: '总览', icon: () => h(IconDashboard) },
  { key: 'shops', label: '店铺', icon: () => h(IconHome) },
  { key: 'products', label: '选品认领', icon: () => h(IconApps) },
  { key: 'listings', label: '刊登', icon: () => h(IconFile) },
  { key: 'orders', label: '审单', icon: () => h(IconCheckCircle) },
  { key: 'shipments', label: '面单/发货', icon: () => h(IconSend) },
  { key: 'inventory', label: '库存', icon: () => h(IconStorage) },
  { key: 'integrations', label: '集成', icon: () => h(IconLink) },
  { key: 'rules', label: '自动化规则', icon: () => h(IconSettings) },
  { key: 'audit', label: '审计', icon: () => h(IconHistory) },
]

function onMenuClick(key: string) {
  router.push({ name: key })
}

function onLogout() {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider
      collapsible
      :collapsed="collapsed"
      @collapse="collapsed = $event"
      :width="220"
      style="background: #165dff"
    >
      <div class="brand">
        <strong>{{ collapsed ? '跨境' : '跨境自动履约' }}</strong>
      </div>
      <a-menu
        :selected-keys="selected"
        theme="dark"
        @menu-item-click="onMenuClick"
        style="background: transparent"
      >
        <a-menu-item v-for="m in menus" :key="m.key">
          <span class="menu-ico"><component :is="m.icon" /></span>
          {{ m.label }}
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="topbar">
        <div>
          <span class="muted">本地控制台 · 数据在 Postgres，非 Ozon 实盘</span>
        </div>
        <div class="top-right">
          <span class="mono">{{ user?.email }}</span>
          <a-button size="small" type="outline" @click="onLogout">
            <template #icon><icon-poweroff /></template>
            退出
          </a-button>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.brand {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  letter-spacing: 0.5px;
}
.topbar {
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.content {
  padding: 20px;
}
.menu-ico {
  margin-right: 8px;
}
:deep(.arco-layout-sider-trigger) {
  background: #0e42d2;
  color: #fff;
}
:deep(.arco-menu-dark .arco-menu-item.arco-menu-selected) {
  background: rgba(255, 255, 255, 0.16);
}
</style>
