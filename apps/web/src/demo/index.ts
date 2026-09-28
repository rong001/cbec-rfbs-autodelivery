export { demoRequest } from './adapter'
export {
  getActiveKey,
  getState,
  setActiveDataset,
  resetActiveDataset,
  subscribeDemo,
  listDatasets,
} from './store'
export type { DatasetKey, DemoDatasetMeta } from './types'
export { FORCE_DEMO_KEY, STORAGE_KEY, DEMO_USER } from './types'

export function isDemoMode(): boolean {
  if (import.meta.env.VITE_DEMO === 'true') return true
  try {
    return localStorage.getItem('cbec_force_demo') === '1'
  } catch {
    return false
  }
}
