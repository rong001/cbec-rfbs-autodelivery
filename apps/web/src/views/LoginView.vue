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
  <div class="login-stage">
    <div class="aurora" aria-hidden="true"><span class="aurora-mid" /></div>
    <div class="login-panel page-enter">
      <div class="hero-side">
        <div class="logo-mark breathe">
          <span>跨境</span>
        </div>
        <h1>跨境自动履约</h1>
        <p class="hero-lead">
          Ozon rFBS 运营控制台 · 认领、刊登、审单、面单与库存闭环，一屏掌控。
        </p>
        <ul class="hero-points">
          <li>蓝冰渐变产品壳 · ToC 质感</li>
          <li>演示数据集可一键切换</li>
          <li>始终标注：演示数据 · 非实盘</li>
        </ul>
      </div>

      <a-card class="login-card" :bordered="false">
        <div class="login-card-head">
          <div>
            <div class="eyebrow">Welcome back</div>
            <h2>登录控制台</h2>
          </div>
          <span v-if="demo" class="honesty-chip">
            <span class="honesty-dot breathe-soft" />
            演示数据 · DEMO
          </span>
        </div>

        <p class="muted intro">
          <template v-if="demo">
            静态演示模式：数据在浏览器本地，不连接 Nest API / Ozon。账号
            <span class="mono">demo@local.dev</span> /
            <span class="mono">Demo123!</span>
            （亦接受 admin@local.dev / Admin123!）
          </template>
          <template v-else>
            JWT Bearer 认证，对接本地 Nest API（127.0.0.1:3200）
          </template>
        </p>

        <div v-if="error" class="err-box" style="margin-bottom: 14px">{{ error }}</div>

        <a-form :model="{ email, password }" layout="vertical" @keydown.enter.prevent="onSubmit">
          <a-form-item label="邮箱">
            <a-input v-model="email" placeholder="demo@local.dev" allow-clear size="large" />
          </a-form-item>
          <a-form-item label="密码">
            <a-input-password v-model="password" placeholder="密码" allow-clear size="large" />
          </a-form-item>
          <a-button
            type="primary"
            long
            size="large"
            class="login-cta breathe"
            :loading="pending"
            :disabled="pending"
            @click="onSubmit"
          >
            进入控制台
          </a-button>
        </a-form>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.login-stage {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px 20px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(59, 130, 246, 0.22), transparent 55%),
    radial-gradient(900px 500px at 90% 110%, rgba(34, 211, 238, 0.18), transparent 50%),
    linear-gradient(160deg, #0B1220 0%, #111827 42%, #0F172A 100%);
}
.login-panel {
  position: relative;
  z-index: 1;
  width: min(980px, 100%);
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 28px;
  align-items: stretch;
}
.hero-side {
  color: #E2E8F0;
  padding: 28px 12px 12px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.logo-mark {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.02em;
  color: #fff;
  background: linear-gradient(135deg, #3B82F6, #22D3EE);
  margin-bottom: 22px;
}
.hero-side h1 {
  margin: 0 0 12px;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.15;
}
.hero-lead {
  margin: 0 0 20px;
  color: rgba(203, 213, 225, 0.92);
  font-size: 15px;
  max-width: 36ch;
  line-height: 1.6;
}
.hero-points {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.hero-points li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(186, 230, 253, 0.95);
}
.hero-points li::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60A5FA, #22D3EE);
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.55);
  flex-shrink: 0;
}

.login-card {
  width: 100%;
  border-radius: 20px !important;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 24px 60px rgba(11, 18, 32, 0.35) !important;
  padding: 8px 4px 4px;
}
.login-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: #3B82F6;
  letter-spacing: 0.04em;
  text-transform: none;
  margin-bottom: 4px;
}
.login-card-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0F172A;
}
.intro { margin: 0 0 18px; line-height: 1.55; }
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
.login-cta {
  margin-top: 6px;
  height: 44px !important;
  font-size: 15px !important;
}

@media (max-width: 820px) {
  .login-panel {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .hero-side {
    padding: 8px 4px 0;
    text-align: left;
  }
  .hero-points { display: none; }
}
</style>
