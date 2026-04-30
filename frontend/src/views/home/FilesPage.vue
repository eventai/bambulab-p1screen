<template>
  <BaseSubPage title="File List">
    <!-- Loading state -->
    <div v-if="loading" class="state-center">
      <div class="spinner" />
      <span class="state-label">Loading files…</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="state-center">
      <van-empty image-size="48">
        <template #image>
          <i-material-symbols-error-outline style="font-size:48px;color:var(--van-red)" />
        </template>
        <template #description>
          <div style="text-align: center; padding: 0 16px;">{{ error }}</div>
        </template>
        <van-button size="small" @click="loadFiles">Retry</van-button>
      </van-empty>
    </div>

    <!-- Empty state -->
    <div v-else-if="files.length === 0" class="state-center">
      <van-empty>
        <template #description>
          <div style="text-align: center; padding: 0 16px;">No files found on printer storage</div>
        </template>
      </van-empty>
    </div>

    <!-- File list -->
    <div v-else class="file-list">
      <div
        v-for="file in files"
        :key="file.name"
        class="file-row"
        @click="confirmPrint(file)"
      >
        <div class="file-icon-wrap">
          <i-material-symbols-print class="file-icon" />
        </div>
        <div class="file-info">
          <span class="file-name">{{ file.fullName }}</span>
        </div>
        <span class="file-size">{{ formatSize(file.size) }}</span>
        <div class="file-action">
          <i-material-symbols-play-circle-outline class="file-play-icon" />
        </div>
      </div>
    </div>

    <!-- Print confirmation dialog -->
    <van-dialog
      v-model:show="showDialog"
      title="Start Print"
      show-cancel-button
      cancel-button-text="Cancel"
      confirm-button-text="Print"
      @confirm="startPrint"
    >
      <div class="dialog-content">
        <img v-if="selectedFile?.thumbnailUrl" :src="selectedFile.thumbnailUrl" class="dialog-thumb" />
        <span class="dialog-name">{{ selectedFile?.name }}</span>
        <span class="dialog-hint">Bed leveling will be performed before printing.</span>
      </div>
    </van-dialog>
  </BaseSubPage>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
import { PrinterClient } from '../../api/PrinterClient'
import { getCurrentDevice } from '../../utils/device'

interface PrinterFile {
  name: string
  fullName: string
  size: number
  modified: string | null
  path: string
  thumbnailUrl?: string
}

const client = PrinterClient.getInstance()
const loading = ref(false)
const error = ref('')
const files = ref<PrinterFile[]>([])
const showDialog = ref(false)
const selectedFile = ref<PrinterFile | null>(null)
const router = useRouter()

onMounted(() => {
  loadFiles()
})

const loadFiles = async () => {
  const dev = getCurrentDevice()
  if (!dev?.ip || !dev?.code) {
    error.value = 'Printer not configured'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`/api/files?ip=${encodeURIComponent(dev.ip)}&code=${encodeURIComponent(dev.code)}`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `HTTP ${res.status}`)
    }
    const data: PrinterFile[] = await res.json()
    files.value = data
  } catch (err: any) {
    error.value = `Failed to load files: ${err.message}`
    console.error('[FilesPage] loadFiles error:', err)
  } finally {
    loading.value = false
  }
}

const loadThumbnail = async (file: PrinterFile, ip: string, code: string) => {
  try {
    const params = new URLSearchParams({
      ip,
      code,
      name: file.name,
      path: file.path,  // exact FTP path from file listing
    })
    const res = await fetch(`/api/thumbnail?${params}`)
    if (!res.ok) return
    const blob = await res.blob()
    file.thumbnailUrl = URL.createObjectURL(blob)
  } catch {
    // thumbnail is optional – ignore errors
  }
}

const confirmPrint = async (file: PrinterFile) => {
  selectedFile.value = file
  showDialog.value = true

  // Fetch thumbnail only for the selected file
  const dev = getCurrentDevice()
  if (!file.thumbnailUrl && dev?.ip && dev?.code) {
    await loadThumbnail(file, dev.ip, dev.code)
  }
}

const startPrint = () => {
  const file = selectedFile.value
  if (!file) return

  try {
    client.printFile(file.name, file.path)
    showToast({ message: `Print started: ${file.name}`, position: 'bottom' })
    router.replace('/')
  } catch (err: any) {
    showToast({ message: `Failed to start print: ${err.message}`, position: 'bottom' })
  }
}

const formatSize = (bytes: number): string => {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}


</script>

<style scoped>
.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--van-text-color-2);
}

.state-label {
  font-size: 14px;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--van-background-3);
  border-top-color: var(--van-primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.file-list {
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow-y: auto;
  height: 100%;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--van-background-3);
  cursor: pointer;
  transition: background-color 0.15s;
}

.file-row:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.file-row:last-child {
  border-bottom: none;
}

.file-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--van-text-color-3);
}

.file-icon {
  font-size: 24px;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 13px;
  color: var(--van-text-color-3);
  min-width: 60px;
  text-align: right;
}

.file-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-play-icon {
  font-size: 24px;
  color: var(--van-text-color-3);
  transition: color 0.15s;
}

.file-row:hover .file-play-icon {
  color: var(--van-primary-color);
}

/* Dialog */
.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
}

.dialog-thumb {
  width: 100px;
  height: 100px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--van-background-3);
}

.dialog-name {
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  word-break: break-all;
}

.dialog-hint {
  font-size: 12px;
  color: var(--van-text-color-3);
  text-align: center;
}
</style>
