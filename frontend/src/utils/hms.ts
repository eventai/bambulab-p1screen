export type HmsEntry = {
  ecode: string
  intro: string
}

let hmsCache: Map<string, string> | null = null

export const loadHmsDictionary = async (): Promise<Map<string, string>> => {
  if (hmsCache) return hmsCache

  try {
    const hmsModule = await import('../assets/devicehms@202602042359/01S/hms.json')
    const data = hmsModule.default
    
    const map = new Map<string, string>()
    if (data?.data?.device_hms?.en) {
      const enEntries: HmsEntry[] = data.data.device_hms.en
      for (const entry of enEntries) {
        if (entry.intro) {
          map.set(entry.ecode.toLowerCase(), entry.intro)
        }
      }
    }
    
    hmsCache = map
    return map
  } catch (err) {
    console.error('Failed to load HMS dictionary', err)
    return new Map()
  }
}

export const getHmsEcode = (attr: number, code: number): string => {
  const attrHex = attr.toString(16).padStart(8, '0')
  const codeHex = code.toString(16).padStart(8, '0')
  return `${attrHex}${codeHex}`.toLowerCase()
}

export const formatHmsCode = (ecode: string): string => {
  if (ecode.length !== 16) return ecode
  // Example: 0c00-0300-0002-001c
  return `${ecode.slice(0, 4)}-${ecode.slice(4, 8)}-${ecode.slice(8, 12)}-${ecode.slice(12, 16)}`
}
