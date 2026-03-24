export enum FanType {
  Part = 1,
  Aux = 2,
  Chamber = 3,
}

export enum TemperatureType {
  Nozzle = 'nozzle',
  Heatbed = 'heatbed',
  Chamber = 'chamber',
}

export enum LightType {
  Chamber = 'chamber_light',
}

export enum LightMode {
  On = 'on',
  Off = 'off',
}

export enum GcodeState {
  Idle = 'IDLE',
  Prepare = 'PREPARE',
  Running = 'RUNNING',
  Pause = 'PAUSE',
  Finish = 'FINISH',
  Failed = 'FAILED',
  Unknown = 'UNKNOWN',
}

export enum PrintSpeedLevel {
  Silent = 1,
  Standard = 2,
  Sport = 3,
  Ludicrous = 4,
}

export type DeviceModule = {
  name: string
  sw_ver: string
  hw_ver: string
  loader_ver: string
  sn: string
  product_name: string
  visible: boolean
  new_ver?: string
  flag: number
}

export type DevicePrint = {

  // device
  wifi_signal?: string
  sdcard?: boolean

  // nozzle
  nozzle_diameter?: '0.2' | '0.4' | '0.6' | '0.8'
  nozzle_type?: 'stainless_steel' | 'hardened_steel'
  nozzle_temper?: number
  nozzle_target_temper?: number

  // heatbed
  bed_temper?: number
  bed_target_temper?: number

  // fan speed
  fan_gear?: number

  // print speed
  spd_lvl?: PrintSpeedLevel

  // light
  lights_report?: DeviceLight[]

  // filament
  ams?: DeviceAMSInfo
  vt_tray?: DeviceTray
  
  // print state
  stg_cur?: number
  gcode_state?: GcodeState
  gcode_file_prepare_percent?: string
  mc_percent?: number
  mc_remaining_time?: number // minute
  mc_print_stage?: string // 1:空闲,2:打印中,3:暂停
  mc_print_sub_stage?: number // 0:无,1:?,2:加热,4:换料中
  layer_num?: number
  total_layer_num?: number
}

export type DeviceAMSInfo = {
  ams: DeviceAMS[]
}

export type DeviceAMS = {
  id: string
  humidity: '1' | '2' | '3' | '4' | '5' // humidity level
  humidity_raw: string // humidity percent
  temp: string // °C
  tray: DeviceTray[]
}

export type DeviceTray = {
  id: string
  state?: number // AMS only
  k: number
  n: number
  tray_type: string
  tray_color: string // rgba
  nozzle_temp_max: string
  nozzle_temp_min: string
}

export type DeviceLight = {
  node: LightType
  mode: LightMode
}

export type DeviceState = {
  module: DeviceModule[]
  print: DevicePrint
}
