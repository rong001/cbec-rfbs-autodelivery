import type { ApiErrorBody } from './types'

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
