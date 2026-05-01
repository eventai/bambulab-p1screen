import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Button, Checkbox, Slider, Progress, Popup, Popover, Overlay, Dialog, Cell, CellGroup, Empty, Tab, Tabs, Switch, Stepper, Field, Badge } from 'vant'
import App from './App.vue'
import { PrinterClient } from './api/PrinterClient'
import { routes } from './router/routes'
import { getCurrentDevice } from './utils/device'
import 'vant/lib/index.css'
import './styles/theme.css'

// import { showDialog } from 'vant'
// import Bowser from 'bowser'
// import pkg from '../package.json'
// const browser = Bowser.getParser(window.navigator.userAgent)
// const requirements: Record<string, string> = {}
// pkg.browserslist.forEach((item: string) => {
//   const match = item.match(/^(\w+)\s*>=\s*([\d.]+)$/)
//   if (match) {
//     requirements[match[1].toLowerCase()] = `>=${match[2]}`
//   }
// })
// if (browser.satisfies(requirements) === false) {
//   showDialog({
//     message: 'Your WebView version is too old, which may cause functional and UI issues. Android users: upgrade Android System WebView. iOS users: upgrade your OS.',
//     messageAlign: 'left',
//   })
// }

window.client = PrinterClient.getInstance()

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
  .use(Field)
  .use(Badge)
  .mount('#app')

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

const storedDevice = getCurrentDevice()
if (storedDevice) {
  window.client.connect(storedDevice.ip, storedDevice.serial, storedDevice.code)
}
