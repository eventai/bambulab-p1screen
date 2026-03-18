<template>
  <div class="controls-page">
    <div class="control-panel">
        <div class="control-list">
          <div class="control-row" @click="openTempPopup('nozzle')">
            <div class="control-left">
              <img
                class="control-icon-img"
                src="../assets/images/monitor_nozzle_temp.svg"
              />
            </div>
            <div class="control-value">{{ Math.floor(Number(device.print.nozzle_temper ?? '0')) }} / {{ Math.floor(Number(device.print.nozzle_target_temper ?? '0')) }} ℃</div>
          </div>
          <div class="control-row" @click="openTempPopup('bed')">
            <div class="control-left">
              <img
                class="control-icon-img"
                src="../assets/images/monitor_bed_temp.svg"
              />
            </div>
            <div class="control-value">{{ Math.floor(Number(device.print.bed_temper ?? '0')) }} / {{ Math.floor(Number(device.print.bed_target_temper ?? '0')) }} ℃</div>
          </div>
          <!-- 
          <div class="control-row" @click="openTempPopup('chamber', '机箱温度')">
            <div class="control-left">
              <img
                class="control-icon-img"
                src="../assets/images/monitor_frame_temp.svg"
              />
            </div>
            <div class="control-value">_ / _ ℃</div>
          </div>
          -->
          <div class="fan-row">
            <div class="fan-card">
              <div class="fan-name">部件</div>
              <div class="fan-toggle" role="button" @click="toggleFan('part')">
                <img :src="getFanSpeed('part') !== 0 ? fanOnIcon : fanOffIcon" />
              </div>
              <div class="fan-percent">{{ (getFanSpeed('part') / 255 * 100).toFixed(0) }}%</div>
            </div>
            <div class="fan-card">
              <div class="fan-name">辅助</div>
              <div class="fan-toggle" role="button" @click="toggleFan('aux')">
                <img :src="getFanSpeed('aux') !== 0 ? fanOnIcon : fanOffIcon" />
              </div>
              <div class="fan-percent">{{ (getFanSpeed('aux') / 255 * 100).toFixed(0) }}%</div>
            </div>
            <div class="fan-card">
              <div class="fan-name">机箱</div>
              <div class="fan-toggle" role="button" @click="toggleFan('chamber')">
                <img :src="getFanSpeed('chamber') !== 0 ? fanOnIcon : fanOffIcon" />
              </div>
              <div class="fan-percent">{{ (getFanSpeed('chamber') / 255 * 100).toFixed(0) }}%</div>
            </div>
          </div>
          <div class="control-split">
            <div class="control-row">
              <div class="control-left">
                <img
                  class="control-icon-img"
                  src="../assets/images/monitor_speed.svg"
                />
              </div>
              <div class="control-value">
                <span>100%</span>
              </div>
            </div>
            <div class="control-row">
              <div class="control-left">
                <img
                  class="control-icon-img"
                  :src="lightState ? lightOnIcon : lightOffIcon"
                  />
              </div>
              <div class="control-value" @click="toggleLight">
                <span>LED</span>
              </div>
            </div>
          </div>
        </div>
    </div>

    <div class="xyz-motion">
        <XYMotion @move="handleMove" />
        <ZMotion @move="handleMove" />
    </div>

    <EMotion @move="handleMove" />

    <TempKeypadPopup
      v-model:show="showTempPopup"
      :type="tempPopupType"
      @confirm="handleTempConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import XYMotion from '../components/XYMotion.vue'
import ZMotion from '../components/ZMotion.vue'
import EMotion from '../components/EMotion.vue'
import TempKeypadPopup from '../components/TempKeypadPopup.vue'
import { device } from '../store/device'
import { computed, ref } from 'vue'

import fanOnIcon from '../assets/images/monitor_fan_on.svg'
import fanOffIcon from '../assets/images/monitor_fan_off.svg'
import lightOnIcon from '../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../assets/images/monitor_lamp_off.svg'
import { WSService } from '../store/ws'

const handleMove = (axis: 'home' | 'x' | 'y' | 'z' | 'e', step: -10 | -1 | 0| 1 | 10) => {
  console.log('[XYMotion] move', axis, step)
  // TODO
}

const getFanSpeed = (type: 'part' | 'aux' | 'chamber') => {
  const fanGear = device.print.fan_gear ?? 0
  if (type === 'part') {
    return fanGear % 256
  } else if (type === 'aux') {
    return (fanGear >> 8) % 256
  } else if (type === 'chamber') {
    return (fanGear >> 16) % 256
  }
  return 0
}

const toggleFan = (type: 'part' | 'aux' | 'chamber') => {
  let speed = getFanSpeed(type)
  if (speed === 0) {
    speed = 255
  } else {
    speed = 0
  }
  console.log(`[Controls] setFanSpeed: type=${type}, speed=${speed}`)
  WSService.getInstance().setFanSpeed(type, speed)
}

const lightState = computed(() => {
  if (!device.print) return false
  return device.print.lights_report?.find(item => item.node === 'chamber_light')?.mode === 'on'
})

const toggleLight = () => {
  console.log(`[Controls] setLight: on=${!lightState.value}`)
  WSService.getInstance().setLight(!lightState.value)
}

const tempPopupType = ref<'bed' | 'nozzle' | 'chamber' | undefined>(undefined)
const showTempPopup = ref(false)

const openTempPopup = (type: 'bed' | 'nozzle' | 'chamber') => {
  tempPopupType.value = type
  showTempPopup.value = true
}

const handleTempConfirm = (type: 'bed' | 'nozzle' | 'chamber' | undefined, value: number) => {
  console.log('[Controls] temp confirm', type, value)
  // TODO
}

</script>

<style scoped>
.controls-page {
  height: 100%;
  border-radius: 12px;
  display: grid;
  grid-template-columns: 170px 320px 70px;
  gap: 4px;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
  color: var(--van-text-color);
}

.control-panel {
  background: var(--van-background-2);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  height: 100%;
}

.control-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--van-background-3);
  font-size: 14px;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.control-row:active {
  background: rgba(255, 255, 255, 0.06);
}

.control-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-icon-img {
  width: 18px;
  height: 18px;
}

.control-value {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  white-space: nowrap;
}

.control-split .control-row {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.control-split .control-left {
  flex-direction: column;
  gap: 6px;
}

.control-split .control-value {
  flex-direction: column;
  align-items: center;
  gap: 2px;
  line-height: 1.1;
}

.control-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.fan-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.fan-card {
  background: var(--van-background-3);
  border-radius: 10px;
  padding: 8px 6px;
  display: grid;
  justify-items: center;
  gap: 6px;
  font-size: 12px;
}

.fan-name {
  color: var(--van-text-color-2);
}

.fan-percent {
  font-weight: 600;
}

.fan-toggle {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.fan-toggle img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.xyz-motion {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 4px;
  height: 100%;
  min-height: 0;
}

</style>
