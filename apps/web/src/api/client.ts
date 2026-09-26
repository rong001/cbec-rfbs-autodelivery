import type { ApiErrorBody } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3200'
const TOKEN_KEY = 'cbec_access_token'
const USER_KEY = 'cbec_user'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    const msg = formatErrorBody(body)
    super(msg)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function formatErrorBody(body: unknown): string {
  if (body == null) return '请求失败'
  if (typeof body === 'string') return body
  const b = body as ApiErrorBody
  if (Array.isArray(b.message)) return b.message.join('; ')
  if (typeof b.message === 'string') return b.message
  if (typeof b.error === 'string') return b.error
  try {
    return JSON.stringify(body)
  } catch {
    return '请求失败'
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, user: unknown): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser<T = unknown>(): T | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data)
  }
  return data as T
}

export const apiGet = <T = unknown>(path: string) => api<T>(path)

export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

export const apiPatch = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

export { API_BASE }
