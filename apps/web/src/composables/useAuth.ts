import { computed, ref } from 'vue'
import {
  apiPost,
  clearAuth,
  getStoredUser,
  getToken,
  setAuth,
} from '../api/client'
import type { LoginResponse, UserInfo } from '../api/types'

const token = ref<string | null>(getToken())
const user = ref<UserInfo | null>(getStoredUser<UserInfo>())

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await apiPost<LoginResponse>('/auth/login', { email, password })
    setAuth(res.accessToken, res.user)
    token.value = res.accessToken
    user.value = res.user
    return res
  }

  function logout() {
    clearAuth()
    token.value = null
    user.value = null
  }

  function hydrate() {
    token.value = getToken()
    user.value = getStoredUser<UserInfo>()
  }

  return { token, user, isAuthenticated, login, logout, hydrate }
}
