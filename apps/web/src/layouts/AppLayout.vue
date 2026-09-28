<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { useAuth } from '../composables/useAuth'
import {
  listDatasets,
  getActiveKey,
  setActiveDataset,
  resetActiveDataset,
  subscribeDemo,
  isDemoMode,
  type DatasetKey,
} from '../demo'
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
  IconRefresh,
} from '@arco-design/web-vue/es/icon'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()
const collapsed = ref(false)
const demo = isDemoMode()
const activeKey = ref<DatasetKey>(getActiveKey())
const datasets = listDatasets()

let unsub: (() => void) | undefined
onMounted(() => {
  if (demo) {
    unsub = subscribeDemo(() => {
      activeKey.value = getActiveKey()
    })
  }
})
onUnmounted(() => unsub?.())

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

function onDatasetChange(value: unknown) {
  const key = String(value) as DatasetKey
  setActiveDataset(key, false)
  activeKey.value = key
  Message.success(`已切换演示集：${datasets.find((d) => d.key === key)?.name || key}`)
  router.go(0)
}

function onResetDataset() {
  resetActiveDataset()
  Message.success('已重置当前演示集为种子数据')
  router.go(0)
}
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-sider
      collapsible
      :collapsed="collapsed"
      @collapse="collapsed = $event"
      :width="220"
      class="sider"
    >
      <div class="brand">
        <strong>{{ collapsed ? '跨境' : '跨境自动履约' }}</strong>
        <span v-if="!collapsed && demo" class="brand-sub">DEMO 控制台</span>
      </div>
      <a-menu
        :selected-keys="selected"
        theme="dark"
        @menu-item-click="onMenuClick"
        class="sider-menu"
      >
        <a-menu-item v-for="m in menus" :key="m.key">
          <span class="menu-ico"><component :is="m.icon" /></span>
          {{ m.label }}
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="topbar">
        <div class="top-left">
          <a-tag color="orangered" size="small" class="demo-badge">演示数据 · DEMO</a-tag>
          <span class="muted honesty">
            {{ demo ? '静态演示 · 非 Ozon 实盘 · 无后端 API' : '本地控制台 · 数据在 Postgres，非 Ozon 实盘' }}
          </span>
        </div>
        <div class="top-right">
          <template v-if="demo">
            <a-select
              :model-value="activeKey"
              size="small"
              style="width: 160px"
              @change="onDatasetChange"
            >
              <a-option v-for="d in datasets" :key="d.key" :value="d.key">{{ d.name }}</a-option>
            </a-select>
            <a-button size="small" type="outline" @click="onResetDataset">
              <template #icon><icon-refresh /></template>
              重置
            </a-button>
          </template>
          <span class="mono user-email">{{ user?.email }}</span>
          <a-button size="small" type="outline" @click="onLogout">
            <template #icon><icon-poweroff /></template>
            退出
          </a-button>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view :key="demo ? activeKey + '-' + String(route.name) : String(route.name)" />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.app-shell { min-height: 100vh; background: #f2f4f7; }
.sider {
  background: #165dff;
}
.brand {
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  letter-spacing: 0.4px;
  gap: 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.brand-sub {
  font-size: 11px;
  opacity: 0.75;
  font-weight: 400;
}
.sider-menu { background: transparent; }
.topbar {
  background: #fff;
  border-bottom: 1px solid #e5e6eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  gap: 12px;
}
.top-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.honesty {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.user-email { color: #4e5969; }
.content { padding: 20px; }
.menu-ico { margin-right: 8px; }
.demo-badge { font-weight: 600; }
:deep(.arco-layout-sider-trigger) {
  background: #0e42d2;
  color: #fff;
}
:deep(.arco-menu-dark .arco-menu-item.arco-menu-selected) {
  background: rgba(255, 255, 255, 0.16);
}
</style>
