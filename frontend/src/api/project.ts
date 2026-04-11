import { unzipSync } from 'fflate'

export type Project = {
  param: string
  project_id: string
  design_id: string
  model_id: string
  profile_id: string
  plate_idx: string
  task_id: string
  subtask_id: string
  subtask_name: string
  job_id: number
  url: string
  thumbnail_url?: string
  md5: string
  timelapse: boolean
  bed_leveling: boolean
  flow_cali: boolean
  vibration_cali: boolean
  layer_inspect: boolean
  ams_mapping: number[]
  skip_objects: any
  timestamp: number
  dev_id: string
  job_type: number
  use_ams: boolean
  bed_temp: number
  auto_bed_leveling: number
  extrude_cali_flag: number
  nozzle_offset_cali: number
  ams_mapping2: any[]
  cfg: string
  extrude_cali_manual_mode: number
}

export const PROJECTS_STORAGE_KEY = 'projects'

export const saveProject = async (project: Project) => {
  if (typeof window === 'undefined') return

  const response = await fetch(`/api/fetch?url=${encodeURIComponent(project.url)}`)
  if (!response.ok) {
    console.warn(`[PrintClient] failed to fetch project file for thumbnail: ${response.statusText}`)
  }

  try {
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const unzipped = unzipSync(data)
    const thumbnailData = unzipped[`Metadata/plate_${project.plate_idx}.png`]
    project.thumbnail_url = thumbnailData ? `data:image/png;base64,${btoa(String.fromCharCode(...thumbnailData))}` : undefined
  } catch (err) {
    console.error('[PrintClient] get3MFThumbnail error:', err)
    return
  }

  const projects = getProjects()
  projects.push(project)
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
}

export const getProjects = () => {
  if (typeof window === 'undefined') return [] as Project[]
  try {
    const rawProjects = localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (!rawProjects) {
    return [] as Project[]
    }
    const parsedProjects = JSON.parse(rawProjects)
    return Array.isArray(parsedProjects) ? parsedProjects as Project[] : []
  } catch (error: any) {
    console.warn(`[PrintClient] failed to parse projects from localStorage: ${error.message}`)
    return [] as Project[]
  }
}
