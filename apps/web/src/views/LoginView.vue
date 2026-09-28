<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { ApiError, formatErrorBody } from '../api/client'
import { isDemoMode } from '../demo'

const demo = isDemoMode()
const email = ref(demo ? 'demo@local.dev' : 'admin@local.dev')
const password = ref(demo ? 'Demo123!' : 'Admin123!')
const pending = ref(false)
const error = ref<string | null>(null)

const { login } = useAuth()
const router = useRouter()
const route = useRoute()

async function onSubmit() {
  pending.value = true
  error.value = null
  try {
    await login(email.value.trim(), password.value)
    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect)
  } catch (e) {
    error.value = e instanceof ApiError ? formatErrorBody(e.body) : (e as Error).message
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <a-card class="login-card" :bordered="true">
      <template #title>
        <div class="login-title">
          <span>跨境自动履约 · 登录</span>
          <a-tag v-if="demo" color="orangered" size="small">演示数据 · DEMO</a-tag>
        </div>
      </template>
      <p class="muted">
        <template v-if="demo">
          静态演示模式：数据在浏览器本地，不连接 Nest API / Ozon。账号
          <span class="mono">demo@local.dev</span> / <span class="mono">Demo123!</span>
          （亦接受 admin@local.dev / Admin123!）
        </template>
        <template v-else>
          JWT Bearer 认证，对接本地 Nest API（127.0.0.1:3200）
        </template>
      </p>
      <div v-if="error" class="err-box" style="margin-bottom: 12px">{{ error }}</div>
      <a-form :model="{}" layout="vertical" @submit.prevent="onSubmit">
        <a-form-item label="邮箱">
          <a-input v-model="email" placeholder="demo@local.dev" allow-clear />
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password v-model="password" placeholder="密码" allow-clear />
        </a-form-item>
        <a-button type="primary" html-type="submit" long :loading="pending" :disabled="pending">
          登录
        </a-button>
      </a-form>
    </a-card>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f2f4f7;
}
.login-card {
  width: 100%;
  max-width: 440px;
  border: 1px solid #e5e6eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.login-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
