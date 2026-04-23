import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Button, Checkbox, Slider, Progress, Popup, Popover, Overlay, Dialog, Cell, CellGroup, Empty, Tab, Tabs, Switch, Stepper, showDialog } from 'vant'
import Bowser from 'bowser'
import App from './App.vue'
import { PrinterClient } from './api/PrinterClient'
import HomePage from './views/home/HomePage.vue'
import FilesPage from './views/home/FilesPage.vue'
import ControlPage from './views/control/ControlPage.vue'
import MotionPage from './views/control/MotionPage.vue'
import NozzlePage from './views/control/NozzlePage.vue'
import FilamentPage from './views/filament/FilamentPage.vue'
import FilamentAutoRefillPage from './views/filament/FilamentAutoRefillPage.vue'
import FilamentEditPage from './views/filament/FilamentEditPage.vue'
import SettingHomePage from './views/setting/HomePage.vue'
import SettingDeviceEditPage from './views/setting/DeviceEditPage.vue'
import SettingFirmwarePage from './views/setting/FirmwarePage.vue'
import SettingCalibrationPage from './views/setting/CalibrationPage.vue'
import SettingToolboxPage from './views/setting/ToolboxPage.vue'
import SettingPage from './views/setting/SettingPage.vue'
import SettingPrintOptionPage from './views/setting/PrintOptionPage.vue'
import SettingAMSSettingPage from './views/setting/AMSSettingPage.vue'
import SettingSerialPage from './views/setting/SerialPage.vue'
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
    message: '你的WebView内核版本过低，会导致功能和界面异常。Android用户请升级浏览器内核组件（Android System WebView），iOS用户请升级操作系统。',
    messageAlign: 'left',
  })
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: HomePage },
    { path: '/home/files', component: FilesPage },
    { path: '/control', component: ControlPage },
    { path: '/control/motion', component: MotionPage },
    { path: '/control/nozzle', component: NozzlePage },
    { path: '/filament', component: FilamentPage },
    { path: '/filament/auto-refill', component: FilamentAutoRefillPage },
    { path: '/filament/edit/:ams_id/:tray_id', component: FilamentEditPage, props: true },
    { path: '/setting', component: SettingHomePage },
    { path: '/setting/device/add', component: SettingDeviceEditPage },
    { path: '/setting/device/edit/:serial', component: SettingDeviceEditPage, props: true },
    { path: '/setting/firmware', component: SettingFirmwarePage },
    { path: '/setting/calibration', component: SettingCalibrationPage },
    { path: '/setting/toolbox', component: SettingToolboxPage },
    { path: '/setting/setting', component: SettingPage },
    { path: '/setting/print-option', component: SettingPrintOptionPage },
    { path: '/setting/ams-setting', component: SettingAMSSettingPage },
    { path: '/setting/serial', component: SettingSerialPage },
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
