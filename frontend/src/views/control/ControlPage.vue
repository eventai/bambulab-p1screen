<template>
  <div class="control-page">
    <img src="../../assets/images/printer-inside.png" class="background-image" />
    <div class="control-grid">
      <div class="panel panel-main panel-air" @click="showFanSpeedPopup = true">
        <div class="panel-icon">
          <img :src="activeFanCount() > 0 ? fanOnIcon : fanOffIcon" />
        </div>
        <div class="panel-title">风扇</div>
        <div class="panel-value">{{ fanStatusText }}</div>
        <i-material-symbols-chevron-right-rounded class="panel-arrow" />
      </div>

      <div class="panel panel-main panel-speed" @click="showPrintSpeedPopup = true">
        <div class="panel-icon">
          <i-material-symbols-swap-driving-apps-wheel />
          <!-- <img src="../../assets/images/monitor_speed.svg" /> -->
        </div>
        <div class="panel-title">速度</div>
        <div class="panel-value">{{ speedText }}</div>
        <i-material-symbols-chevron-right-rounded class="panel-arrow" />
      </div>

      <div class="panel panel-main panel-motion" @click="router.push('/control/motion')">
        <div class="panel-icon">
          <i-material-symbols-open-with-rounded />
        </div>
        <div class="panel-title">运动</div>
        <div class="panel-value">XYZ</div>
        <i-material-symbols-chevron-right-rounded class="panel-arrow" />
      </div>

      <div class="panel panel-nozzle" @click="router.push('/control/nozzle')">
        <div class="panel-head">
          <div class="panel-icon">
            <img :src="nozzleHeating ? nozzleOnIcon : nozzleOffIcon" />
          </div>
          <div class="panel-title">喷嘴和挤出机</div>
          <i-material-symbols-chevron-right-rounded class="panel-arrow" />
        </div>
        <div class="nozzle-temp-row">
          <img class="nozzle-image" src="../../assets/images/extruder_normal_23.png" />
          <span>{{ nozzleTempText }}</span>
        </div>
      </div>

      <div class="panel panel-main panel-bed" @click="openTempPopup">
        <div class="panel-icon">
          <img :src="bedHeating ? bedOnIcon : bedOffIcon" />
        </div>
        <div class="panel-title">热床</div>
        <div class="panel-value">{{ bedTempText }}</div>
        <i-material-symbols-chevron-right-rounded class="panel-arrow" />
      </div>

    </div>
    <div class="panel panel-light-fixed">
      <div class="light-content">
        <div class="light-left">
          <img class="lightbulb" :src="lightSwitchValue ? lightOnIcon : lightOffIcon" />
          <span>照明</span>
        </div>
        <van-switch
          :model-value="lightSwitchValue"
          size="22"
          @update:model-value="handleLightSwitch"
        />
      </div>
    </div>

    <TempKeypadPopup
      v-model:show="showTempPopup"
      :type="TemperatureType.Heatbed"
      @confirm="handleTempConfirm"
    />

    <FanSpeedPopup
      v-model:show="showFanSpeedPopup"
    />

    <PrintSpeedPopup
      v-model:show="showPrintSpeedPopup"
      :value="printSpeedLevel"
      @confirm="handlePrintSpeedConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'
import { FanType, GcodeState, LightType, PrintSpeedLevel, TemperatureType } from '../../api/enums'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'

import fanOnIcon from '../../assets/images/monitor_fan_on.svg'
import fanOffIcon from '../../assets/images/monitor_fan_off.svg'
import nozzleOnIcon from '../../assets/images/monitor_nozzle_temp_active.svg'
import nozzleOffIcon from '../../assets/images/monitor_nozzle_temp.svg'
import bedOnIcon from '../../assets/images/monitor_bed_temp_active.svg'
import bedOffIcon from '../../assets/images/monitor_bed_temp.svg'
import lightOnIcon from '../../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../../assets/images/monitor_lamp_off.svg'

const router = useRouter()
const client = PrinterClient.getInstance()
const device = ref(client.device.print)
const lightState = computed(() => device.value?.lights_report?.find(item => item.node === LightType.Chamber)?.mode === 'on')
const lightSwitchValue = ref(lightState.value)

onMounted(() => {
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

const onPushStatus = (params: any) => {
  device.value = client.device.print
  if (params?.lights_report) {
    lightSwitchValue.value = lightState.value
  }
}

const showTempPopup = ref(false)
const showFanSpeedPopup = ref(false)
const showPrintSpeedPopup = ref(false)

const openTempPopup = () => {
  showTempPopup.value = true
}

const handleTempConfirm = (type: TemperatureType | undefined, value: number) => {
  if (!type) return
  console.log(`[ControlPage] set temperature type=${type}, value=${value}`)
  client.setTemperature(type, value)
}

const printSpeedLevel = computed(() => device.value?.spd_lvl)

const handlePrintSpeedConfirm = (speedLevel: number) => {
  if ([GcodeState.Idle, GcodeState.Finish].includes(device.value?.gcode_state ?? GcodeState.Unknown)) {
    showDialog({ message: '空闲状态下调整打印速度不生效。' })
    return
  }
  client.setPrintSpeedLevel(speedLevel)
}

const handleLightSwitch = (value: boolean) => {
  lightSwitchValue.value = value
  client.setLight(LightType.Chamber, value)
}

const speedText = computed(() => {
  const speed = [{
    label: '狂暴',
    value: PrintSpeedLevel.Ludicrous,
  }, {
    label: '运动',
    value: PrintSpeedLevel.Sport,
  }, {
    label: '标准',
    value: PrintSpeedLevel.Standard,
  }, {
    label: '静音',
    value: PrintSpeedLevel.Silent,
  }].filter(item => item.value === device.value?.spd_lvl)
  return (speed.length > 0) ? speed[0].label : ''
})

const activeFanCount = () => [FanType.Part, FanType.Aux, FanType.Chamber].filter(type => client.getFanSpeed(type) > 0).length
const fanStatusText = computed(() => {
  if (!device.value) return ''
  const count = activeFanCount()
  return count === 0 ? '无风扇开启' : `${count}风扇开启`
})

const nozzleHeating = computed(() => device.value && (device.value.nozzle_target_temper - 2 > device.value.nozzle_temper))
const nozzleTempText = computed(() => device.value ? `${Math.floor(Number(device.value.nozzle_temper ?? '0'))}°C/${Math.floor(Number(device.value.nozzle_target_temper ?? '0'))}°C` : '')

const bedHeating = computed(() => device.value && (device.value.bed_target_temper - 2 > device.value.bed_temper))
const bedTempText = computed(() => device.value ? `${Math.floor(Number(device.value.bed_temper ?? '0'))}°C/${Math.floor(Number(device.value.bed_target_temper ?? '0'))}°C` : '')
</script>

<style scoped>
.control-page {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100%;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
}

.background-image {
  position: absolute;
  right: 0;
  bottom: 0;
  height: calc(100% - 40px);
  width: auto;
  object-fit: contain;
  opacity: 0.7;
}

.control-grid {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 4fr) minmax(0, 3fr) minmax(0, 3fr);
  grid-template-rows: 60px 100px 60px 1fr;
  grid-template-areas:
    'air speed motion'
    'nozzle . .'
    'bed . .'
    '. . .';
}

.panel {
  border: 0;
  border-radius: 8px;
  background-color: var(--van-background-2);
  padding: 10px 12px;
  text-align: left;
}

.panel:not(.panel-light-fixed):active {
  filter: brightness(0.8);
}

.panel-head {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 8px;
  height: 34px;
}

.panel-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--van-background-4);
  display: grid;
  place-items: center;
  font-size: 20px;
}

.panel-title {
  color: var(--van-text-color-2);
  font-size: 13px;
  line-height: 18px;
}

.panel-icon > img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  opacity: 0.8;
}

.panel-icon > svg {
  color: var(--van-text-color-3);
}

.panel-arrow {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  align-self: center;
  justify-self: center;
  color: var(--van-text-color-2);
  font-size: 20px;
  line-height: 1;
}

.panel-value {
  margin-left: 42px;
  margin-top: 2px;
  font-size: 15px;
  line-height: 20px;
  white-space: nowrap;
  color: var(--van-text-color);
}

.panel-air { grid-area: air; }
.panel-speed { grid-area: speed; }
.panel-motion { grid-area: motion; }
.panel-nozzle { grid-area: nozzle; }
.panel-bed { grid-area: bed; }

.panel-main .panel-icon {
  grid-column: 1;
  grid-row: 1 / 3;
  align-self: center;
}

.panel-main .panel-arrow {
  grid-column: 3;
  grid-row: 1 / 3;
  align-self: center;
  justify-self: center;
}

.panel-main .panel-title {
  grid-column: 2;
  grid-row: 1;
  align-self: end;
  margin-left: 0;
  white-space: nowrap;
}

.panel-main {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  grid-template-rows: 1fr 1fr;
  align-items: center;
  align-content: center;
  column-gap: 8px;
}

.panel-main .panel-value {
  grid-column: 2;
  grid-row: 2;
  margin: 0;
  min-height: 20px;
  display: flex;
  align-items: center;
  align-self: start;
}

.panel-nozzle {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
}

.panel-nozzle .panel-head {
  margin: 8px 0;
  width: 100%;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
}

.nozzle-temp-row {
  margin: 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--van-text-color);
  font-size: 16px;
  line-height: 20px;
}

.nozzle-image {
  width: 32px;
  height: 32px;
  object-fit: contain;
  margin-right: 6px;
}

.light-content {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
}

.light-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--van-text-color);
}

.lightbulb {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.panel-light-fixed {
  position: fixed;
  right: 10px;
  bottom: 10px;
  bottom: calc(10px + env(safe-area-inset-bottom));
  width: 140px;
  height: 40px;
  padding: 8px 10px;
  z-index: 20;
}

@media (orientation: portrait) {
  .background-image {
    width: calc(100% - 40px);
    height: auto;
  }

  .control-grid {
    grid-template-columns: 60% 40%;
    grid-template-rows: 60px 60px 100px;
    grid-template-areas:
      'air speed'
      'bed motion'
      'nozzle .';
  }

  .panel-light-fixed {
    width: 156px;
    bottom: calc(10px + 64px);
    bottom: calc(10px + 64px + env(safe-area-inset-bottom));
  }
}
</style>
