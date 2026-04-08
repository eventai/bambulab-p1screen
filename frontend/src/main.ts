import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Button, Slider, Progress, Popup, Popover, Dialog, Cell, CellGroup, Empty } from 'vant'
import App from './App.vue'
import { PrinterClient } from './api/PrinterClient'
import HomePage from './views/HomePage.vue'
import ControlsPage from './views/ControlsPage.vue'
import FilamentPage from './views/FilamentPage.vue'
import FilamentAutoRefillPage from './views/FilamentAutoRefillPage.vue'
import FilamentEditPage from './views/FilamentEditPage.vue'
import SettingsPage from './views/SettingsPage.vue'
import FilesPage from './views/FilesPage.vue'
import DeviceEditPage from './views/DeviceEditPage.vue'
import { getCurrentDevice } from './utils/device'
import 'vant/lib/index.css'
import './styles/theme.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: HomePage },
    { path: '/controls', component: ControlsPage },
    { path: '/filament', component: FilamentPage },
    { path: '/filament/auto-refill', component: FilamentAutoRefillPage },
    { path: '/filament/edit/:ams_id/:tray_id', component: FilamentEditPage, props: true },
    { path: '/settings', component: SettingsPage },
    { path: '/settings/device/add', component: DeviceEditPage },
    { path: '/settings/device/edit/:serial', component: DeviceEditPage, props: true },
    { path: '/files', component: FilesPage },
  ]
})

createApp(App)
  .use(router)
  .use(Button)
  .use(Slider)
  .use(Progress)
  .use(Popup)
  .use(Popover)
  .use(Dialog)
  .use(Cell)
  .use(CellGroup)
  .use(Empty)
  .mount('#app')

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

const syncAppSize = () => {
  const appElement = document.getElementById('app')
  const appHeight = appElement?.clientHeight ?? window.innerHeight
  const appWidth =  appElement?.clientWidth ?? window.innerWidth
  document.documentElement.style.setProperty('--app-height', `${appHeight}px`)
  document.documentElement.style.setProperty('--app-width', `${appWidth}px`)
}
syncAppSize()
window.addEventListener('resize', syncAppSize)

const storedDevice = getCurrentDevice()
if (storedDevice) {
  PrinterClient.getInstance().connect(storedDevice.ip, storedDevice.serial, storedDevice.code)
}
