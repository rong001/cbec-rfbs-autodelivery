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

function onDatasetChange(key: DatasetKey) {
  if (key === activeKey.value) return
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
    <div class="aurora" aria-hidden="true"><span class="aurora-mid" /></div>
    <a-layout-sider
      collapsible
      :collapsed="collapsed"
      @collapse="collapsed = $event"
      :width="232"
      class="sider"
    >
      <div class="brand">
        <div class="brand-mark breathe" :class="{ compact: collapsed }">
          <span class="brand-glyph">跨境</span>
        </div>
        <div v-if="!collapsed" class="brand-copy">
          <strong>跨境自动履约</strong>
          <span v-if="demo" class="brand-sub">DEMO 产品控制台</span>
        </div>
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
    <a-layout class="main-pane">
      <a-layout-header class="topbar">
        <div class="top-left">
          <span class="honesty-chip">
            <span class="honesty-dot breathe-soft" />
            演示数据 · DEMO
          </span>
          <span class="muted honesty">
            {{ demo ? '静态演示 · 非 Ozon 实盘 · 无后端 API' : '本地控制台 · 数据在 Postgres，非 Ozon 实盘' }}
          </span>
        </div>
        <div class="top-right">
          <template v-if="demo">
            <div class="dataset-control" role="group" aria-label="演示数据集">
              <button
                v-for="d in datasets"
                :key="d.key"
                type="button"
                class="dataset-pill"
                :class="{ active: activeKey === d.key }"
                @click="onDatasetChange(d.key)"
              >
                {{ d.name }}
              </button>
            </div>
            <a-button size="small" class="ghost-btn" @click="onResetDataset">
              <template #icon><icon-refresh /></template>
              重置
            </a-button>
          </template>
          <span class="mono user-email">{{ user?.email }}</span>
          <a-button size="small" class="ghost-btn" @click="onLogout">
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
.app-shell {
  min-height: 100vh;
  background: transparent;
  position: relative;
}
.main-pane {
  background: transparent;
  position: relative;
  z-index: 1;
}
.sider {
  background: linear-gradient(180deg, #0B1220 0%, #101827 55%, #0B1220 100%) !important;
  box-shadow: 4px 0 24px rgba(11, 18, 32, 0.18);
  z-index: 2;
}
.brand {
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
  color: #fff;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}
.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #3B82F6, #22D3EE);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: -0.02em;
}
.brand-mark.compact {
  width: 34px;
  height: 34px;
  margin: 0 auto;
}
.brand-glyph { transform: scale(0.92); }
.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.brand-copy strong {
  font-size: 14px;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.brand-sub {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.9);
  font-weight: 500;
}
.sider-menu {
  background: transparent !important;
  padding: 10px 8px;
}
.menu-ico { margin-right: 8px; }

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: rgba(255, 255, 255, 0.72) !important;
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  height: 60px;
  gap: 12px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}
.top-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.honesty-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 650;
  color: #92400E;
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.16), rgba(34, 211, 238, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.28);
  white-space: nowrap;
}
.honesty-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);
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
.user-email {
  color: #475569;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.content {
  padding: 22px 24px 32px;
  position: relative;
  z-index: 1;
}

.dataset-control {
  display: inline-flex;
  padding: 3px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.08);
  gap: 2px;
}
.dataset-pill {
  appearance: none;
  border: 0;
  background: transparent;
  color: #64748B;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 120ms ease;
  white-space: nowrap;
}
.dataset-pill:hover {
  color: #0F172A;
  background: rgba(255, 255, 255, 0.7);
}
.dataset-pill.active {
  color: #fff;
  background: linear-gradient(135deg, #3B82F6, #2563EB 60%, #0EA5E9);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}
.dataset-pill:active { transform: scale(0.98); }

.ghost-btn {
  border-radius: 10px !important;
}

:deep(.arco-layout-sider-trigger) {
  background: #121A2B !important;
  color: #93C5FD !important;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}
:deep(.arco-menu-dark),
:deep(.arco-menu-dark .arco-menu-inner) {
  background: transparent !important;
}
:deep(.arco-menu-dark .arco-menu-item) {
  background: transparent;
  border-radius: 10px;
  margin: 2px 0;
  color: rgba(226, 232, 240, 0.82);
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}
:deep(.arco-menu-dark .arco-menu-item:hover) {
  background: rgba(59, 130, 246, 0.12);
  color: #fff;
}
:deep(.arco-menu-dark .arco-menu-item.arco-menu-selected) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(14, 165, 233, 0.85)) !important;
  color: #fff !important;
  box-shadow: 0 0 0 1px rgba(147, 197, 253, 0.25), 0 8px 22px rgba(59, 130, 246, 0.35);
  font-weight: 600;
}

@media (max-width: 1100px) {
  .honesty { display: none; }
  .dataset-pill { padding: 6px 8px; font-size: 11px; }
}
</style>
