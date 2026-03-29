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
        <button class="color-field" type="button" @click="handleEditColor">
          <span class="color-swatch" :style="{ background: colorValue }"></span>
          <i-material-symbols-edit-outline-rounded class="color-edit-icon" />
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavHeader from '../components/NavHeader.vue'
import { PrinterClient } from '../api/PrinterClient'
import type { DeviceTray } from '../api/models'

const route = useRoute()
const router = useRouter()
const client = PrinterClient.getInstance()
const device = client.device

const allTrays = computed<DeviceTray[]>(() => {
  const amsTrays = device.print.ams?.ams?.flatMap((ams) => ams.tray ?? []) ?? []
  const vtTray = device.print.vt_tray ? [device.print.vt_tray] : []
  return [...amsTrays, ...vtTray]
})

const currentTray = computed<DeviceTray | null>(() => {
  if (!route.params.id) return null
  return allTrays.value.find((tray) => String(tray.id) === route.params.id) ?? null
})

const trayType = ref('?')
const nozzleTempMin = ref('')
const nozzleTempMax = ref('')
const colorValue = ref('')

watch(
  currentTray,
  (tray) => {
    trayType.value = tray?.tray_type || '?'
    nozzleTempMin.value = tray?.nozzle_temp_min || ''
    nozzleTempMax.value = tray?.nozzle_temp_max || ''
    colorValue.value = tray ? `#${tray.tray_color}` : ''
  },
  { immediate: true }
)

const handleEditColor = () => {
  console.log('[FilamentEditPage] edit color')
}

const handleConfirm = () => {
  console.log('[FilamentEditPage] confirm', {
    id: route.params.id,
    tray: currentTray.value,
    trayType: trayType.value,
    nozzleTempMin: nozzleTempMin.value,
    nozzleTempMax: nozzleTempMax.value,
    colorValue: colorValue.value,
  })
  // TODO
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
  gap: 8px;
}

.temperature-separator {
  color: var(--van-text-color-2);
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
  gap: 6px;
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
  gap: 8px;
  margin-top: auto;
}

.action-btn {
  width: 80px;
  height: 32px;
}
</style>
