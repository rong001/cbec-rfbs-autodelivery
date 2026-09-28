import { createApp } from 'vue'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
app.use(ArcoVue)
app.use(router)
app.mount('#app')

// Bridge Arco primary to electric blue brand (runtime CSS vars)
const root = document.documentElement
root.style.setProperty('--primary-6', '#3B82F6')
root.style.setProperty('--primary-5', '#60A5FA')
root.style.setProperty('--primary-7', '#2563EB')
root.style.setProperty('--arcoblue-6', '#3B82F6')
