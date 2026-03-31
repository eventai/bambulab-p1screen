import { reactive, ref } from 'vue'
import {
  type DeviceState,
  type Project,
} from './models'
import {
  FanType,
  TemperatureType,
  LightType,
  PrintSpeedLevel,
} from './enums'

type ConnectionParams = {
  ip: string
  serial: string
  code: string
}

export class PrinterClient {
  private static instance: PrinterClient | null = null
  private ws: WebSocket | null = null
  private connecting = false
  readyState = ref<number | null>(null)
  private shouldReconnect = true
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private readonly maxReconnectDelay = 30
  private sequenceId = 0
  private readonly pendingPublishes = new Map<string, {
    resolve: (value: any) => void
    reject: (reason?: any) => void
  }>()
  private connectionParams: ConnectionParams | null = null
  private readonly onVisibilityChange = () => {
    if (typeof document === 'undefined' || document.hidden) {
      return
    }
    if (!this.shouldReconnect || !this.connectionParams) {
      return
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.clearReconnectTimer()
    this.reconnectAttempt = 0
    this.connect(this.connectionParams.ip, this.connectionParams.serial, this.connectionParams.code)
  }

  device = reactive<DeviceState>({
    module: [],
    print: {},
  })

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange)
    }
  }

  /**
   * Returns the singleton PrinterClient instance.
   * @returns The global PrinterClient instance.
   */
  static getInstance() {
    if (!PrinterClient.instance) {
      PrinterClient.instance = new PrinterClient()
    }
    return PrinterClient.instance
  }

  /**
   * Opens a WebSocket connection to the backend tunnel.
   * @param ip Printer IP address.
   * @param serial Printer serial number.
   * @param code Printer access code.
   * @returns The WebSocket instance when connection is initiated, otherwise null.
   */
  connect(ip: string, serial: string, code: string) {
    if (typeof window === 'undefined') return null
    this.shouldReconnect = true

    if (!ip || !serial || !code) {
      console.warn('[PrintClient] missing connection parameters')
      this.readyState.value = null
      return null
    }
    this.connectionParams = { ip, serial, code }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.readyState.value = this.ws.readyState
      return this.ws
    }

    if (this.connecting) {
      return this.ws
    }

    this.clearReconnectTimer()
    this.connecting = true
    this.readyState.value = WebSocket.CONNECTING
    try {
      const url = `ws://${location.host}/ws?ip=${encodeURIComponent(ip)}&serial=${encodeURIComponent(serial)}&code=${encodeURIComponent(code)}`
      this.ws = new WebSocket(url)
      this.ws.addEventListener('open', this.onOpen.bind(this))
      this.ws.addEventListener('close', this.onClose.bind(this))
      this.ws.addEventListener('error', this.onError.bind(this))
      this.ws.addEventListener('message', this.onMessage.bind(this))
      return this.ws
    } catch (error) {
      this.connecting = false
      console.error('[PrintClient] connect failed:', error)
      this.scheduleReconnect()
      return null
    }
  }

  /**
   * Closes the current connection and disables auto-reconnect.
   * @returns No return value.
   */
  disconnect() {
    this.stopConnection()
  }

  private stopConnection() {
    this.shouldReconnect = false
    this.reconnectAttempt = 0
    this.clearReconnectTimer()
    this.rejectPendingPublishes('connection closed')
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connecting = false
    this.readyState.value = WebSocket.CLOSED
  }

  private onOpen(_event: Event) {
    console.log('[PrintClient] connected')
    this.connecting = false
    this.reconnectAttempt = 0
    this.clearReconnectTimer()
    this.readyState.value = this.ws?.readyState ?? null
    this.updateAllData()
  }

  private onClose(_event: Event) {
    console.log('[PrintClient] closed')
    this.connecting = false
    this.readyState.value = WebSocket.CLOSED
    this.rejectPendingPublishes('socket closed')
    this.ws = null
    this.scheduleReconnect()
  }

  private onError(event: Event) {
    console.error('[PrintClient] error:', event)
    this.connecting = false
    this.readyState.value = this.ws?.readyState ?? null
    this.rejectPendingPublishes('socket error')
    this.scheduleReconnect()
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.connecting || this.reconnectTimer) {
      return
    }

    const delaySeconds = Math.min(2 ** this.reconnectAttempt, this.maxReconnectDelay)
    this.reconnectAttempt += 1
    console.warn(`[PrintClient] reconnecting in ${delaySeconds}s`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.shouldReconnect) {
        return
      }
      if (!this.connectionParams) {
        console.warn('[PrintClient] reconnect skipped: missing connection parameters')
        return
      }
      this.connect(this.connectionParams.ip, this.connectionParams.serial, this.connectionParams.code)
    }, delaySeconds * 1000)
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) {
      return
    }
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private onMessage(event: MessageEvent<any>) {
    let data = JSON.parse(event.data) ?? {}
    Object.keys(data).forEach(key => {
      const params = data[key]
      const sequenceId: string = params.sequence_id
      const command: string = `${key}.${params.command}`
      const result: string = params.result ?? ''
      const reason: string = params.reason ?? ''
      delete params.command
      delete params.sequence_id
      delete params.result
      delete params.reason
      console.debug(`[PrintClient]  report: sequence_id=${sequenceId}, command=${command}, result=${result}, reason=${reason}, params=`, params)

      switch(command) {
        case 'print.push_status':
          this.handlePushStatus(params)
          break
        case 'print.project_file':
          this.handleProjectFile(params)
          break
        default:
          const flag = this.resolvePublishResponse(sequenceId, result, reason, params)
          if (!flag) {
            console.warn(`[PrintClient] unhandled message: sequence_id=${sequenceId}, command=${command}, result=${result}, reason=${reason}, params=`, params)
          }
          break
      }
    })
  }

  private handlePushStatus(printData: any) {
    for (const key in printData) {
      (this.device.print as any)[key] = printData[key]
    }
  }

  private handleProjectFile(projectData: any) {
    const project = reactive<Project>(projectData as Project)
    project.thumbnail_url = `/api/getThumbnail?url=${encodeURIComponent(project.url)}&plate_idx=${project.plate_idx}`
    this.saveProject(project)
  }

  private saveProject(project: Project) {
    if (typeof window === 'undefined') return

    const projects = this.getProjectsFromStorage()
    projects.push(project)
    localStorage.setItem('projects', JSON.stringify(projects))
  }

  private getProjectsFromStorage() {
    try {
      const rawProjects = localStorage.getItem('projects')
      if (!rawProjects) {
        return [] as Project[]
      }
      const parsedProjects = JSON.parse(rawProjects)
      return Array.isArray(parsedProjects) ? parsedProjects as Project[] : []
    } catch (error) {
      console.warn('[PrintClient] failed to parse projects from localStorage:', error)
      return [] as Project[]
    }
  }

  getCurrentProject() {
    if (typeof window === 'undefined') return null

    const taskId = this.device.print.task_id
    const subtaskId = this.device.print.subtask_id
    if (!taskId || !subtaskId) {
      return null
    }

    const projects = this.getProjectsFromStorage()
    return projects.find(project => (
      project.task_id === taskId && project.subtask_id === subtaskId
    )) ?? null
  }

  /**
   * Requests a full status refresh from the printer.
   * @returns No return value.
   */
  async updateAllData() {
    this.request('pushing.pushall') // no response

    const result = await this.request('info.get_version')
    this.device.module = result.module
  }

  async request(command: string, params?: Record<string, any>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false // TODO: reject
    const [type, name] = command.split('.')
    this.sequenceId = (this.sequenceId + 1) & 0xFFFF
    const req = {
      [type]: {
        'sequence_id': `${this.sequenceId}`,
        'command': name,
        ...params,
      }
    }
    const response = new Promise<any>((resolve, reject) => {
      this.pendingPublishes.set(`${this.sequenceId}`, { resolve, reject })
    })
    console.debug(`[PrintClient] request: sequence_id=${this.sequenceId}, command=${command}, params=`, params)
    this.ws.send(JSON.stringify(req))
    return response
  }

  private resolvePublishResponse(sequenceId: string, result: string, reason: string, params: Record<string, any>) {
    if (sequenceId === undefined || sequenceId === null) return false
    const key = `${sequenceId}`
    const pending = this.pendingPublishes.get(key)
    if (!pending) return false
    this.pendingPublishes.delete(key)
    if (result.toLowerCase() === 'success') {
      pending.resolve(params)
    } else {
      pending.reject(new Error(reason))
    }
    return true
  }

  private rejectPendingPublishes(reason: string) {
    for (const [key, pending] of this.pendingPublishes.entries()) {
      pending.reject(new Error(`[PrintClient] ${reason}: ${key}`))
      this.pendingPublishes.delete(key)
    }
  }

  /**
   * Gets the current speed of a fan.
   * @param type Fan type: `part`, `aux`, or `chamber`.
   * @returns Fan speed value in range 0-255.
   */
  getFanSpeed(type: FanType) {
    const fanGear = this.device.print.fan_gear ?? 0
    const fanBit = 8 * (type as number - 1)
    return (fanGear >> fanBit) % 256
  }

  /**
   * Converts printer Wi-Fi signal (dBm) into percentage.
   * @returns Wi-Fi strength percentage in range 0-100.
   */
  getWifiSignalPercentage() {
    const wifiSignal = this.device.print.wifi_signal
    if (!wifiSignal) return 0
    const dbm = parseInt(wifiSignal)
    if (isNaN(dbm)) return 0

    // Normalize dBm to percentage
    // -30dBm or better -> 100%
    // -100dBm or worse -> 0%
    const minDbm = -100
    const maxDbm = -30
    const percentage = Math.round(((dbm - minDbm) / (maxDbm - minDbm)) * 100)
    return Math.max(0, Math.min(100, percentage))
  }

  /**
   * Sets the speed for a specific fan.
   * @param type Fan type: `part`, `aux`, or `chamber`.
   * @param speed Fan speed value in range 0-255.
   * @returns No return value.
   */
  async setFanSpeed(type: FanType, speed: number) {
    const param = `M106 P${type as number} S${speed}\n`
    const result = await this.request('print.gcode_line', { param })
    if (result.param === param) {
      const fanBit = 8 * (type as number - 1)
      const fanGear = this.device.print.fan_gear ?? 0
      this.device.print.fan_gear = (fanGear & ~(0xFF << fanBit)) | (speed << fanBit)
    }
  }

  /**
   * Sets the print speed level.
   * @param level Speed level: 1=silent, 2=standard, 3=sport, 4=ludicrous.
   * @returns No return value.
   */
  async setPrintSpeedLevel(level: PrintSpeedLevel) {
    const param = `${level}`
    const result = await this.request('print.print_speed', { param })
    if (result.param === param) {
      this.device.print.spd_lvl = level
    }
  }

  /**
   * Toggles chamber light state.
   * @param on `true` to turn on, `false` to turn off.
   * @returns No return value.
   */
  async setLight(type: LightType, on: boolean) {
    const result = await this.request('system.ledctrl', {
      "led_node": type,
      "led_mode": on ? "on" : "off",
    })
    const light = this.device.print.lights_report?.find(item => item.node === result.led_node)
    if (light) light.mode = result.led_mode
  }

  /**
   * Sets a target temperature.
   * @param type Target heater: `nozzle` or `heatbed`.
   * @param temperature Target temperature in Celsius.
   * @returns No return value.
   */
  setTemperature(type: TemperatureType, temperature: number) {
    const gcode = type === TemperatureType.Nozzle ? 'M104' : type === TemperatureType.Heatbed ? 'M140' : null
    if (!gcode) {
      // TODO: chamber temperature control command is not implemented yet.
      console.warn('[PrintClient] chamber temperature control is not implemented yet')
      return
    }
    // TODO not working
    this.request('print.gcode_line', {
      "led_node": type,
      "param": `${gcode} S${temperature.toFixed(0)}\n`
    })
  }

  /**
   * Sends a pause-print command.
   * @returns No return value.
   */
  setPause() {
    this.request('print.pause', { 'param': '' })
  }

  /**
   * Sends a resume-print command.
   * @returns No return value.
   */
  setResume() {
    this.request('print.resume', { 'param': '' })
  }

  /**
   * Sends a stop-print command.
   * @returns No return value.
   */
  setStop() {
    this.request('print.stop', { 'param': '' })
  }

}
