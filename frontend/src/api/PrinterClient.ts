import { reactive, shallowRef, triggerRef } from 'vue'
import mqtt, { type MqttClient } from 'mqtt'
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

export class PrinterClient {
  private static instance: PrinterClient | null = null
  public mqttClient = shallowRef<MqttClient | null>(null)
  private manualDisconnect = false
  private sequenceId = 0
  private reportTopic = ''
  private requestTopic = ''
  private readonly pendingPublishes = new Map<string, {
    resolve: (value: any) => void
    reject: (reason?: any) => void
  }>()

  device = reactive<DeviceState>({
    module: [],
    print: {},
  })

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
   * Opens an MQTT-over-WebSocket connection to the backend tunnel.
   * @param ip Printer IP address.
   * @param serial Printer serial number.
   * @param code Printer access code.
   * @returns The MQTT client instance when connection is initiated, otherwise null.
   */
  connect(ip: string, serial: string, code: string) {
    if (typeof window === 'undefined') return null
    this.manualDisconnect = false

    if (!ip || !serial || !code) {
      console.warn('[PrintClient] missing connection parameters')
      return null
    }
    this.reportTopic = `device/${serial}/report`
    this.requestTopic = `device/${serial}/request`

    const client = this.mqttClient.value
    if (client && !client.disconnected) {
      return client
    }

    try {
      const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'
      const upstreamUrl = `mqtts://${ip}:8883`
      const proxyUrl = `${wsProtocol}://${location.host}/mqtt?url=${encodeURIComponent(upstreamUrl)}`
      const mqttClient = mqtt.connect(proxyUrl, {
        username: 'bblp',
        password: code,
        protocolVersion: 4,
        reconnectPeriod: 5000,
        reconnectOnConnackError: true,
      })
      this.mqttClient.value = mqttClient
      mqttClient.on('connect', this.onConnect.bind(this))
      mqttClient.on('reconnect', this.onReconnect.bind(this))
      mqttClient.on('offline', this.onOffline.bind(this))
      mqttClient.on('close', this.onClose.bind(this))
      mqttClient.on('end', this.onEnd.bind(this))
      mqttClient.on('error', this.onError.bind(this))
      mqttClient.on('message', this.onMessage.bind(this))
      return mqttClient
    } catch (error) {
      console.error('[PrintClient] connect failed:', error)
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
    this.manualDisconnect = true
    this.rejectPendingPublishes('connection closed')
    const client = this.mqttClient.value
    if (client) {
      client.end(true)
      this.mqttClient.value = null
    }
  }

  private onConnect() {
    console.log('[PrintClient] connected')
    const topic = this.reportTopic
    this.mqttClient.value?.subscribe(topic, (err) => {
      if (err) {
        console.error('[PrintClient] subscribe failed:', err)
        this.mqttClient.value?.end(true)
        return
      }
      console.log('[PrintClient] subscribed:', topic)
      this.updateAllData()
      triggerRef(this.mqttClient)
    })
  }

  private onClose() {
    console.log('[PrintClient] closed')
    this.rejectPendingPublishes('socket closed')
    if (this.manualDisconnect) {
      this.mqttClient.value = null
    }
    triggerRef(this.mqttClient)
  }

  private onReconnect() {
    console.warn('[PrintClient] reconnecting...')
    triggerRef(this.mqttClient)
  }

  private onOffline() {
    console.warn('[PrintClient] offline')
    triggerRef(this.mqttClient)
  }

  private onEnd() {
    console.log('[PrintClient] ended')
    this.mqttClient.value = null
    triggerRef(this.mqttClient)
  }

  private onError(error: unknown) {
    console.error('[PrintClient] error:', error)
    this.rejectPendingPublishes('socket error')
    triggerRef(this.mqttClient)
  }

  private onMessage(topic: string, payload: Uint8Array) {
    if (topic !== this.reportTopic) {
      return
    }
    const raw = new TextDecoder().decode(payload)
    let data: Record<string, any> = {}
    try {
      data = JSON.parse(raw) ?? {}
    } catch (error) {
      console.warn('[PrintClient] message parse failed:', error)
      return
    }
    Object.keys(data).forEach(key => {
      const params = data[key]
      const sequenceId: string = params.sequence_id
      const command: string = `${key}.${params.command}`
      const result: string = params.result
      const reason: string = params.reason
      delete params.command
      delete params.sequence_id
      delete params.result
      delete params.reason
      delete params.msg
      console.debug('[PrintClient]  report: sequenceId =', sequenceId, ', command =', command, ', result =', result, ', reason =', reason, ', params =', params)

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
            console.warn('[PrintClient] unhandled message: sequenceId =', sequenceId, ', command =', command, ', result =', result, ', reason =', reason, ', params =', params)
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
    const client = this.mqttClient.value
    if (!client || !client.connected) throw new Error('Not connected')

    const [type, name] = command.split('.')
    this.sequenceId = (this.sequenceId + 1) & 0xFFFF
    const sequenceId = `${this.sequenceId}`
    const req = {
      [type]: {
        'sequence_id': sequenceId,
        'command': name,
        ...params,
      }
    }
    const response = new Promise<any>((resolve, reject) => {
      this.pendingPublishes.set(sequenceId, { resolve, reject })
    })
    console.debug('[PrintClient] request: sequenceId =', sequenceId, ', command =', command, ', params =', params)
    client.publish(this.requestTopic, JSON.stringify(req), (err) => {
      if (!err) {
        return
      }
      const pending = this.pendingPublishes.get(sequenceId)
      if (!pending) {
        return
      }
      this.pendingPublishes.delete(sequenceId)
      pending.reject(err)
    })
    return response
  }

  private resolvePublishResponse(sequenceId: string, result?: string, reason?: string, params?: Record<string, any>) {
    if (sequenceId === undefined || sequenceId === null) return false
    const key = `${sequenceId}`
    const pending = this.pendingPublishes.get(key)
    if (!pending) return false
    this.pendingPublishes.delete(key)
    if (result?.toLowerCase() === 'success') {
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
    let gcode = ''
    switch (type) {
      case TemperatureType.Nozzle:
        gcode = `M104 S${temperature.toFixed(0)}\n`
        break
      case TemperatureType.Heatbed:
        gcode = `M140 S${temperature.toFixed(0)}\n`
        break
      case TemperatureType.Chamber:
        // not implemented
        return
    }
    this.request('print.gcode_line', { 'param': gcode })
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
