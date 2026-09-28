#!/usr/bin/env node
/**
 * Offline closed-loop smoke for the demo adapter (no Nest).
 * Runs via tsx against TypeScript sources.
 */
import { createRequire } from 'node:module'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}
// vite client stub
globalThis.import_meta_env = { VITE_DEMO: 'true' }

async function main() {
  // Use dynamic import through tsx by spawning — this file is meant to be run as:
  // npx tsx scripts/smoke-demo.mts
  console.error('Use: npx tsx scripts/smoke-demo.ts')
  process.exit(2)
}
main()
