import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '../api/client'
import { isDemoMode } from '../demo'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: '总览' } },
        { path: 'shops', name: 'shops', component: () => import('../views/ShopsView.vue'), meta: { title: '店铺' } },
        { path: 'products', name: 'products', component: () => import('../views/ProductsView.vue'), meta: { title: '选品认领' } },
        { path: 'listings', name: 'listings', component: () => import('../views/ListingsView.vue'), meta: { title: '刊登' } },
        { path: 'orders', name: 'orders', component: () => import('../views/OrdersView.vue'), meta: { title: '审单' } },
        { path: 'shipments', name: 'shipments', component: () => import('../views/ShipmentsView.vue'), meta: { title: '面单/发货' } },
        { path: 'inventory', name: 'inventory', component: () => import('../views/InventoryView.vue'), meta: { title: '库存' } },
        { path: 'integrations', name: 'integrations', component: () => import('../views/IntegrationsView.vue'), meta: { title: '集成' } },
        { path: 'rules', name: 'rules', component: () => import('../views/RulesView.vue'), meta: { title: '自动化规则' } },
        { path: 'audit', name: 'audit', component: () => import('../views/AuditView.vue'), meta: { title: '审计' } },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!getToken()) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})

export default router

// Re-export for layout consumers
export { isDemoMode }
