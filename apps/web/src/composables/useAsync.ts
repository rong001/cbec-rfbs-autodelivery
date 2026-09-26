import { ref } from 'vue'
import { ApiError, formatErrorBody } from '../api/client'

export function useAsync() {
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    pending.value = true
    error.value = null
    try {
      return await fn()
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = formatErrorBody(e.body)
      } else if (e instanceof Error) {
        error.value = e.message
      } else {
        error.value = String(e)
      }
      return null
    } finally {
      pending.value = false
    }
  }

  return { pending, error, run }
}
