import { ref } from 'vue'
import { device } from './device'

export class WSService {
  private static instance: WSService | null = null
  private ws: WebSocket | null = null
  private connecting = false
  private readyState = ref<number | null>(null)

  static getInstance() {
    if (!WSService.instance) {
      WSService.instance = new WSService()
    }
    return WSService.instance
  }

  connect() {
    if (typeof window === 'undefined') return null

    const ip = window.localStorage.getItem('ip')
    const serial = window.localStorage.getItem('serial')
    const code = window.localStorage.getItem('accessCode')

    if (!ip || !serial || !code) {
      console.warn('[WebSocket] missing connection parameters')
      this.readyState.value = null
      return null
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.readyState.value = this.ws.readyState
      return this.ws
    }

    if (this.connecting) {
      return this.ws
    }

    this.connecting = true
    this.readyState.value = WebSocket.CONNECTING
    try {
      const url = `/ws?ip=${encodeURIComponent(ip)}&serial=${encodeURIComponent(serial)}&code=${encodeURIComponent(code)}`
      this.ws = new WebSocket(url)
      this.ws.addEventListener('open', this.onOpen.bind(this))
      this.ws.addEventListener('close', this.onClose.bind(this))
      this.ws.addEventListener('error', this.onError.bind(this))
      this.ws.addEventListener('message', this.onMessage.bind(this))
      return this.ws
    } catch (error) {
      this.connecting = false
      console.error('[WebSocket] connect failed:', error)
      return null
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.connecting = false
      this.readyState.value = WebSocket.CLOSED
    }
  }

  onOpen(event: Event) {
    console.log('[WebSocket] connected')
    this.connecting = false
    this.readyState.value = this.ws?.readyState ?? null
    this.updateAllData()
  }

  onClose(event: Event) {
    console.log('[WebSocket] closed')
    this.connecting = false
    this.readyState.value = this.ws?.readyState ?? null
  }

  onError(event: Event) {
    console.error('[WebSocket] error:', event)
    this.connecting = false
    this.readyState.value = this.ws?.readyState ?? null
  }

  onMessage(event: MessageEvent<any>) {
    let data = JSON.parse(event.data) ?? {}
    if (data?.print?.command === 'push_status') {
      for (const key in data.print) {
        if (['command', 'msg', 'sequence_id'].includes(key))
          continue
        (device.print as any)[key] = data.print[key]
        console.debug(`[WebSocket] update print.${key} = ${JSON.stringify(data.print[key])}`)
      }
    } else if (data?.print?.command === 'print_speed') {
      console.debug(`[WebSocket] update print.print_speed_level = ${JSON.stringify(data.print?.param)}`)
      device.print.spd_lvl = Number(data.print?.param)
      device.print.spd_mag = [50, 100, 124, 166][device.print.spd_lvl - 1]
    } else if (data?.info?.command === 'get_version') {
      device.module = data.info.module
      console.debug(`[WebSocket] update module = ${JSON.stringify(data.info.module)}`)
    } else if (data?.system?.led_mode) {
      const chamber_light = device.print.lights_report?.find(item => item.node === 'chamber_light')
      if (chamber_light) {
        chamber_light.mode = data.system.led_mode
      }
      console.debug(`[WebSocket] update system.led_mode = ${JSON.stringify(data.system.led_mode)}`)
    } else {
      console.warn('[WebSocket] unhandled message:', data)
    }
  }

  getReadyStateRef() {
    return this.readyState
  }

  updateAllData() {
    this.publishCommand({
      "pushing": {"command": "pushall"},
      "info": {"command": "get_version"},
      // "upgrade": {"command": "get_history"},
    })
  }

  publishCommand(command: {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(command))
    return true
  }

  setFanSpeed(type: 'part' | 'aux' | 'chamber', speed: number) {
    const fanNum = {
      part: 1,
      aux: 2,
      chamber: 3
    }[type]

    this.publishCommand({
      "print": {
        "sequence_id": 0,
        "command": "gcode_line",
        "param": `M106 P${fanNum} S${speed}\n`
      }
    })
  }

  setPrintSpeedLevel(level: number) {
    // TODO level enum
    this.publishCommand({
      "print": {
        "command": "print_speed",
        "param": `${level}`
      }
    })
  }

  setLight(on: boolean) {
    this.publishCommand({
      "system": {
        "led_mode": on ? "on" : "off"
      }
    })
  }
}
