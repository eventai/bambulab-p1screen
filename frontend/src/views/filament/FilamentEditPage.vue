<template>
  <div class="filament-edit-page">
    <NavHeader title="编辑耗材" @back="router.back" />
    <div class="filament-edit-card">
      <div class="form-row">
        <label class="form-label">耗材</label>
        <button class="filament-select" type="button" disabled>
          <span>{{ trayType }}</span>
          <i-material-symbols-arrow-drop-down-rounded />
        </button>
      </div>

      <div class="form-row">
        <label class="form-label">颜色</label>
        <button class="color-field" type="button">
          <span class="color-swatch" :style="{ background: `#${trayColor}` }"></span>
          <i-material-symbols-edit-outline-rounded class="color-edit-icon" />
          <input
            class="native-color-input"
            type="color"
            :value="trayColorInputValue"
            @input="handleColorInput"
            aria-label="选择颜色"
          />
        </button>
      </div>

      <div class="form-row">
        <label class="form-label">喷嘴温度</label>
        <div class="temperature-fields">
          <div class="temperature-input-wrap">
            <input v-model="nozzleTempMin" class="temperature-input" inputmode="numeric" maxlength="3" />
            <span class="temperature-unit">℃</span>
          </div>
          <span class="temperature-separator">-</span>
          <div class="temperature-input-wrap">
            <input v-model="nozzleTempMax" class="temperature-input" inputmode="numeric" maxlength="3" />
            <span class="temperature-unit">℃</span>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <van-button class="action-btn" plain type="default" @click="router.back">取消</van-button>
        <van-button class="action-btn" type="primary" @click="handleConfirm">确定</van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { closeToast, showFailToast, showLoadingToast, showSuccessToast } from 'vant'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'

const route = useRoute()
const router = useRouter()
const client = PrinterClient.getInstance()

const device = ref(client.device.print)
const amsId = route.params.ams_id as string
const trayId = route.params.tray_id as string

const ams = computed(() => device.value?.ams.ams?.find((item) => item.id === amsId))

const tray = computed(() => {
  if (amsId === '255' && trayId === device.value?.vt_tray?.id) {
    return device.value?.vt_tray
  }
  return ams.value?.tray.find((item) => item.id === trayId)
})

const trayType = ref('?')
const trayColor = ref('')
const nozzleTempMin = ref('')
const nozzleTempMax = ref('')
const trayColorInputValue = computed(() => `#${trayColor.value.slice(0, 6)}`)

onMounted(() => {
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

const onPushStatus = () => {
  device.value = client.device.print
}

watch(
  tray,
  (nextTray) => {
    if (!nextTray) return
    trayType.value = nextTray.tray_type
    trayColor.value = nextTray.tray_color
    nozzleTempMin.value = nextTray.nozzle_temp_min
    nozzleTempMax.value = nextTray.nozzle_temp_max
  },
  { immediate: true }
)

const handleColorInput = (event: Event) => {
  const value = (event.target as HTMLInputElement | null)?.value.toUpperCase() ?? '#000000'
  console.log(`[FilamentEditPage] select color: ${value}`)
  trayColor.value = value.replace('#', '').slice(0, 6) + 'FF'
}

const handleConfirm = async () => {
  if (!tray.value) return
  const payload = {
    ams_id: Number(amsId), // TODO: Ext Tray?
    tray_id: Number(trayId),
    tray_info_idx: tray.value?.tray_info_idx,
    tray_color: trayColor.value,
    tray_type: trayType.value,
    nozzle_temp_min: Number(nozzleTempMin.value),
    nozzle_temp_max: Number(nozzleTempMax.value),
  }

  console.log(`[FilamentEditPage] confirm payload=${JSON.stringify(payload)}`)

  showLoadingToast({
    message: '保存中...',
    duration: 0,
    forbidClick: true,
  })
  try {
    await client.request('print.ams_filament_setting', payload)
    tray.value.tray_color = trayColor.value
    tray.value.tray_type = trayType.value
    tray.value.nozzle_temp_min = nozzleTempMin.value
    tray.value.nozzle_temp_max = nozzleTempMax.value
    closeToast()
    showSuccessToast('保存成功')
    router.back()
  } catch (error: any) {
    console.error(`[FilamentEditPage] save failed: ${error.message}`)
    closeToast()
    showFailToast('保存失败')
  }
}
</script>

<style scoped>
.filament-edit-page {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.filament-edit-card {
  min-height: 0;
  margin: 8px;
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 8px;
  background: var(--van-background-3);
}

.form-row {
  min-height: 44px;
  display: grid;
  grid-template-columns: 150px minmax(0, 180px);
  justify-content: start;
  align-items: center;
}

.form-label {
  color: var(--van-text-color);
  font-size: 14px;
}

.filament-select {
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--van-background-5);
  background: var(--van-background-2);
  color: var(--van-text-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}

.filament-select-icon {
  width: 18px;
  height: 18px;
}

.color-field {
  position: relative;
  height: 36px;
  width: 72px;
  border-radius: 8px;
  border: 1px solid var(--van-background-5);
  background: var(--van-background-2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}

.native-color-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--van-background-5);
}

.color-edit-icon {
  width: 18px;
  height: 18px;
  color: var(--van-text-color-2);
}

.temperature-fields {
  display: flex;
  align-items: center;
}

.temperature-separator {
  color: var(--van-text-color-2);
  padding: 0 8px;
}

.temperature-input-wrap {
  flex: 1;
  min-width: 0;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--van-background-5);
  background: var(--van-background-2);
  display: flex;
  align-items: center;
  padding: 0 10px;
}

.temperature-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--van-text-color);
  font-size: 14px;
}

.temperature-unit {
  color: var(--van-text-color-2);
  font-size: 12px;
}

.form-actions {
  justify-self: end;
  display: flex;
  margin-top: auto;
  margin-right: -8px;
}

.action-btn {
  width: 80px;
  height: 32px;
  margin-right: 8px;
}
</style>
