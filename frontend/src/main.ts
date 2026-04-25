import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Button, Checkbox, Slider, Progress, Popup, Popover, Overlay, Dialog, Cell, CellGroup, Empty, Tab, Tabs, Switch, Stepper, showDialog } from 'vant'
import Bowser from 'bowser'
import App from './App.vue'
import { PrinterClient } from './api/PrinterClient'
import { routes } from './router/routes'
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
    message: '你的WebView内核版本过低，会导致功能和界面异常。Android用户请升级浏览器内核组件（Android System WebView），iOS用户请升级操作系统。',
    messageAlign: 'left',
  })
}

const router = createRouter({
  history: createWebHashHistory(),
  routes
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
  .use(Checkbox)
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
