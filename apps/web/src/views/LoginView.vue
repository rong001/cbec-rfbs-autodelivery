<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { ApiError, formatErrorBody } from '../api/client'

const email = ref('admin@local.dev')
const password = ref('Admin123!')
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
    <a-card class="login-card" title="跨境自动履约 · 登录">
      <p class="muted">JWT Bearer 认证，对接本地 Nest API（127.0.0.1:3200）</p>
      <div v-if="error" class="err-box" style="margin-bottom: 12px">{{ error }}</div>
      <a-form layout="vertical" @submit.prevent="onSubmit">
        <a-form-item label="邮箱">
          <a-input v-model="email" placeholder="admin@local.dev" allow-clear />
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
  background: linear-gradient(180deg, #f7f8fa 0%, #e8f3ff 100%);
}
.login-card {
  width: 100%;
  max-width: 420px;
}
</style>
