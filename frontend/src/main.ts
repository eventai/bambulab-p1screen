import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Button, Slider, Progress, Popup, Popover, Overlay, Dialog, Cell, CellGroup, Empty, Tab, Tabs, Switch, Stepper, showDialog } from 'vant'
import Bowser from 'bowser'
import App from './App.vue'
import { PrinterClient } from './api/PrinterClient'
import HomePage from './views/home/HomePage.vue'
import FilesPage from './views/home/FilesPage.vue'
import DeviceEditPage from './views/home/DeviceEditPage.vue'
import ControlPage from './views/control/ControlPage.vue'
import MotionPage from './views/control/MotionPage.vue'
import NozzlePage from './views/control/NozzlePage.vue'
import FilamentPage from './views/filament/FilamentPage.vue'
import FilamentAutoRefillPage from './views/filament/FilamentAutoRefillPage.vue'
import FilamentEditPage from './views/filament/FilamentEditPage.vue'
import SettingPage from './views/setting/SettingPage.vue'
import MessagePage from './views/message/MessagePage.vue'
import { getCurrentDevice } from './utils/device'
import 'vant/lib/index.css'
import './styles/theme.css'
import pkg from '../package.json'

window.client = PrinterClient.getInstance()

const browser = Bowser.getParser(window.navigator.userAgent)
const requirements: Record<string, string> = {}
pkg.browserslist.forEach((item: string) => {
  const match = item.match(/^(\w+)\s*>=\s*([\d.]+)$/)
  if (match) {
    requirements[match[1].toLowerCase()] = `>=${match[2]}`
  }
})

const isValid = browser.satisfies(requirements)

if (isValid === false) {
  showDialog({
    title: '提示',
    message: '你的WebView内核版本过低，会导致功能和界面异常。Android用户请升级「Android System WebView」，iOS用户请升级操作系统。',
  })
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: HomePage },
    { path: '/home/files', component: FilesPage },
    { path: '/home/device/add', component: DeviceEditPage },
    { path: '/home/device/edit/:serial', component: DeviceEditPage, props: true },
    { path: '/control', component: ControlPage },
    { path: '/control/motion', component: MotionPage },
    { path: '/control/nozzle', component: NozzlePage },
    { path: '/filament', component: FilamentPage },
    { path: '/filament/auto-refill', component: FilamentAutoRefillPage },
    { path: '/filament/edit/:ams_id/:tray_id', component: FilamentEditPage, props: true },
    { path: '/setting', component: SettingPage },
    { path: '/message', component: MessagePage },
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
  .use(Tab)
  .use(Tabs)
  .use(Switch)
  .use(Stepper)
  .use(Overlay)
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
  window.client.connect(storedDevice.ip, storedDevice.serial, storedDevice.code)
}
