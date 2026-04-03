export type DeviceItem = {
  name: string
  ip: string
  serial: string
  code: string
}

export const DEVICE_STORAGE_KEY = 'device'

export const getDevice = (): DeviceItem | null => {
  try {
    const raw = localStorage.getItem(DEVICE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      name: String((parsed as Record<string, unknown>).name ?? '').trim(),
      ip: String((parsed as Record<string, unknown>).ip ?? '').trim(),
      serial: String((parsed as Record<string, unknown>).serial ?? '').trim(),
      code: String((parsed as Record<string, unknown>).code ?? '').trim(),
    }
  } catch {
    return null
  }
}

export const setDevice = (deviceItem: DeviceItem) => {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(deviceItem))
}

export const clearDevice = () => {
  localStorage.removeItem(DEVICE_STORAGE_KEY)
}
