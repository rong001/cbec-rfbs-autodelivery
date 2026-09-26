#!/usr/bin/env node
/**
 * Headless smoke: login + key GETs against live API.
 * Usage: node scripts/smoke-ui-api.mjs
 */
const API = process.env.API_BASE || 'http://127.0.0.1:3200'
const EMAIL = process.env.SMOKE_EMAIL || 'admin@local.dev'
const PASSWORD = process.env.SMOKE_PASSWORD || 'Admin123!'

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { ok: res.ok, status: res.status, data }
}

function summarize(path, result) {
  const d = result.data
  let detail = ''
  if (Array.isArray(d)) detail = `len=${d.length}`
  else if (d && typeof d === 'object') {
    if (d.status) detail = `status=${d.status}`
    else if (d.integrations) detail = `integrations=${d.integrations.length} ozonLive=${d.honesty?.ozonLive}`
    else if (d.accessToken) detail = `user=${d.user?.email}`
    else detail = Object.keys(d).slice(0, 5).join(',')
  } else detail = String(d).slice(0, 80)
  const mark = result.ok ? 'OK' : 'FAIL'
  console.log(`[${mark}] ${result.status} ${path} ${detail}`)
  return result.ok
}

async function main() {
  console.log(`smoke → ${API}`)
  let failed = 0

  const health = await req('/health/ready')
  if (!summarize('/health/ready', health)) failed++

  const login = await req('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  })
  if (!summarize('/auth/login', login)) {
    console.error('login failed, abort')
    process.exit(1)
  }
  const token = login.data.accessToken

  const gets = [
    '/shops',
    '/products',
    '/listings',
    '/orders',
    '/shipments',
    '/inventory',
    '/integrations/status',
    '/audit?limit=10',
  ]
  for (const path of gets) {
    const r = await req(path, { token })
    if (!summarize(path, r)) failed++
  }

  if (failed) {
    console.error(`smoke FAILED (${failed} errors)`)
    process.exit(1)
  }
  console.log('smoke PASSED')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
