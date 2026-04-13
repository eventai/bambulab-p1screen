<template>
  <div class="homepage">
    <div class="task-card">
      <span v-if="isRecording" class="recording"><i-material-symbols-circle />REC</span>
      <span class="files" @click="router.push('/files')">文件 &gt;</span>
      <img v-if="getPrintThumbnail" class="task-thumbnail" :src="getPrintThumbnail"/>
      <img v-if="!getPrintThumbnail" class="task-thumbnail task-broken-thumbnail" :src="brokenThumbnail"/>
      <span class="task-name">{{ taskName }}</span>
    </div>
    <div class="printer-card">
      <div id="printer-bg" :style="{ backgroundImage: `url(${p1sThumbnail})` }"></div>
      <span id="nozzle-temp">{{ nozzleTemp }} ℃</span>
      <span id="heatbed-temp">{{ heatbedTemp }} ℃</span>
      <span id="wifi-signal"><img :src="wifiSignalIcon"/></span>
      <button id="manage-device-btn" type="button" @click="handleManageDevice">
        <span v-if="deviceItem" >{{ deviceItem.name }}</span>
        <span v-if="!deviceItem">添加设备</span>
        <i-material-symbols-settings-rounded />
      </button>
    </div>
    <div class="progress-card">
      <div class="progress-card-left">
        <div class="progress-labels">
          <span>{{ getPrintPercent }}%</span>
          <span>{{ getPrintInfo }}</span>
        </div>
        <van-progress :percentage="getPrintPercent" :show-pivot="false" />
        <span class="progress-status">{{ getPrintStateLabel }}</span>
      </div>
      <div class="progress-card-buttons">
        <ControlButton :icon="skipIcon" label="跳过" font-size="10px" @click="handleSkip" :disabled="!showPrintActions" />
        <ControlButton v-if="!isPaused" :icon="pauseIcon" label="暂停" font-size="10px" @click="handlePause" :disabled="!showPrintActions" />
        <ControlButton v-if="isPaused" :icon="resumeIcon" label="继续" font-size="10px" @click="handleResume" :disabled="!showPrintActions" />
        <ControlButton :icon="stopIcon" label="停止" font-size="10px" @click="handleStop" :disabled="!showPrintActions" />
      </div>
    </div>
    <ControlButton class="light-button" :icon="lightState ? lightOnIcon : lightOffIcon" label="照明" font-size="10px" @click="toggleLight" />
    <DeviceListPopup v-model:show="showDeviceListPopup" />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
import humanizeDuration from 'humanize-duration'
import { PrinterClient, PrinterEvent } from '../api/PrinterClient'
import { LightType, GcodeState, CurrentStage } from '../api/enums'
import ControlButton from '../components/ControlButton.vue'
import DeviceListPopup from '../components/DeviceListPopup.vue'

import lightOnIcon from '../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../assets/images/monitor_lamp_off.svg'
import skipIcon from '../assets/images/print_control_partskip.svg'
import pauseIcon from '../assets/images/print_control_pause.svg'
import resumeIcon from '../assets/images/print_control_resume.svg'
import stopIcon from '../assets/images/print_control_stop.svg'
import brokenThumbnail from '../assets/images/dev_hms_diag_loading.svg'
import p1sThumbnail from '../assets/images/printer_thumbnail_p1s_png.png'
import signalNoIcon from '../assets/images/monitor_signal_no.svg'
import signalWeakIcon from '../assets/images/monitor_signal_weak.svg'
import signalMiddleIcon from '../assets/images/monitor_signal_middle.svg'
import signalStrongIcon from '../assets/images/monitor_signal_strong.svg'
import { getCurrentProject } from '../api/project'
import { getCurrentDevice } from '../utils/device'

const router = useRouter()
const client = PrinterClient.getInstance()

const getWifiSignalIcon = () => {
  if (!client.mqttClient?.connected) {
    return signalNoIcon
  }

  const percent = client.getWifiSignalPercentage()
  if (percent >= 75) {
    return signalStrongIcon
  } else if (percent >= 50) {
    return signalMiddleIcon
  } else {
    return signalWeakIcon
  }
}

const wifiSignalIcon = ref(getWifiSignalIcon())
const showDeviceListPopup = ref(false)
const deviceItem = ref(getCurrentDevice())
const device = ref(client.device.print)
const project = ref(getCurrentProject())

onMounted(() => {
  client.on(PrinterEvent.MQTT_STATE_CHANGE, onPushStatus)
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
  client.on(PrinterEvent.PRINT_PROJECT_FILE, onProjectFile)
})

onUnmounted(() => {
  client.off(PrinterEvent.MQTT_STATE_CHANGE, onPushStatus)
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
  client.off(PrinterEvent.PRINT_PROJECT_FILE, onProjectFile)
})

watch(
  () => showDeviceListPopup.value,
  (visible, prevVisible) => {
    if (prevVisible && !visible) {
      deviceItem.value = getCurrentDevice()
    }
  }
)

const onPushStatus = () => {
  device.value = client.device.print
  wifiSignalIcon.value = getWifiSignalIcon()
}

const onProjectFile = () => {
  // console.debug('[HomePage] on print.project_file')
  project.value = getCurrentProject()
}

const handleManageDevice = () => {
  if (!getCurrentDevice()) {
    router.push('/settings/device/add')
  } else {
    showDeviceListPopup.value = true
  }
}

const taskName = computed(() => device.value?.subtask_name || '')
const nozzleTemp = computed(() => Math.floor(Number(device.value?.nozzle_temper ?? '0')))
const heatbedTemp = computed(() => Math.floor(Number(device.value?.bed_temper ?? '0')))

const isRecording = computed(() => getCurrentProject()?.timelapse)

const getPrintThumbnail = computed(() => getCurrentProject()?.thumbnail_url)

const getPrintPercent = computed(() => {
  if (device.value?.gcode_state === GcodeState.Prepare) {
    return 0
  }
  return device.value?.mc_percent || 0
})

const getPrintStateLabel = computed(() => {
  switch (device.value?.gcode_state) {
    case GcodeState.Idle:
      return '空闲'
    case GcodeState.Prepare:
      return `下载中(${device.value?.gcode_file_prepare_percent}%)`
    case GcodeState.Running:
      return getPrintSubStateLabel()
      // return '打印中'
    case GcodeState.Pause:
      return '已暂停'
    case GcodeState.Finish:
      return '完成'
    case GcodeState.Failed:
      return '失败'
    default:
      return ''
  }
})

const getPrintSubStateLabel = () => {
  switch (device.value?.stg_cur) {
    case CurrentStage.PRINTING:
      return '打印中'
    case CurrentStage.HEATBED_PREHEATING:
      return '预加热热床'
    case CurrentStage.CHANGING_FILAMENT:
      return '换料中'
    case CurrentStage.HOMING_TOOLHEAD:
      return '工具头回中'
    case CurrentStage.CLEANING_NOZZLE_TIP:
      return '清理喷嘴头'
    default:
      return ''
  }
}

const getPrintInfo = computed(() => {
  if ([GcodeState.Finish, GcodeState.Failed].includes(device.value?.gcode_state ?? GcodeState.Unknown)) return ''

  const remainingTimeText = humanizeDuration((device.value?.mc_remaining_time || 0) * 60 * 1000, {
    units: ['h', 'm'],
    round: true,
    language: 'zh_CN'
  })
  return `${device.value?.layer_num || 0} / ${device.value?.total_layer_num || 0} | ${remainingTimeText}`
})

const isPaused = computed(() => device.value?.gcode_state === GcodeState.Pause)
const showPrintActions = computed(() => [GcodeState.Pause, GcodeState.Running].includes(device.value?.gcode_state ?? GcodeState.Unknown))

const handleSkip = () => {
  console.log('[Controls] skip')
  showToast({
    message: '功能开发中～',
    position: 'bottom',
  })
}

const handleResume = () => {
  console.log('[Controls] resume')
  client.setResume()
}

const handlePause = () => {
  console.log('[Controls] pause')
  client.setPause()
}

const handleStop = () => {
  console.log('[Controls] stop')
  client.setStop()
}

const lightState = computed(() => device.value?.lights_report?.find(item => item.node === LightType.Chamber)?.mode === 'on')
const toggleLight = () => client.setLight(LightType.Chamber, !lightState.value)

</script>

<style scoped>
.homepage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  padding: 10px;
  gap: 10px;
}

.task-card,
.printer-card,
.progress-card,
.light-button {
  background: var(--van-background-2);
  border-radius: 8px;
}

.task-card {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 22px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.recording {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
  margin-left: 8px;
  padding: 1px 2px;
  font-size: 6px;
  font-weight: bold;
  border-radius: 3px;
  border: 1px solid var(--van-text-color);
  color: var(--van-text-color);
}

.recording > svg {
  font-size: 3px;
  color: var(--van-red);
  margin-right: 1px;
}

.files {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  font-size: 12px;
  color: var(--van-text-color);
  cursor: pointer;
  padding-right: 8px;
}

.task-thumbnail {
  grid-column: 1 / span 2;
  grid-row: 2;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  justify-self: center;
}

.task-broken-thumbnail {
  filter: brightness(1.1);
  width: 60%;
  padding-bottom: 10%;
}

.task-name {
  grid-column: 1 / span 2;
  grid-row: 3;
  width: 100%;
  height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  text-align: left;
  align-content: center;
  padding: 0 12px;
  background-color: var(--van-background-3);
}

.printer-card {
  grid-column: 2;
  grid-row: 1;
  width: 200px;
  position: relative;
  overflow: hidden;
}

#printer-bg {
  position: absolute;
  inset: 4px 4px 22px 4px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.printer-card > span {
  font-size: 14px;
  font-weight: 500;
  display: block;
  position: relative;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 8px;
  padding: 4px 8px;
  width: fit-content;
}

#nozzle-temp {
  left: 60%;
  top: calc(50% - 100px + 45px);
}

#heatbed-temp {
  left: 25%;
  top: calc(50% - 100px + 90px);
}

#wifi-signal {
  left: 15%;
  top: calc(50% - 100px - 50px);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  padding: 8px;
}

#wifi-signal img {
  width: 18px;
  height: 18px;
}

#manage-device-btn {
  width: 100%;
  height: 25px;
  position: absolute;
  left: 50%;
  bottom: 0px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  border: none;
  background: none;
  color: var(--van-text-color-2);
  font-size: 12px;
  justify-content: center;
}

#manage-device-btn > span {
  font-size: 12px;
  margin-right: 4px;
  padding-left: 4px;
}

.progress-card {
  grid-column: 1 / 3;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr auto;
  font-size: 12px;
  gap: 8px;
  padding: 8px;
  margin-right: calc(56px + 10px);
}

.progress-card-left {
  display: grid;
  padding: 0 4px;
}

.progress-card-buttons {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-right: -8px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.progress-labels > span:first-child {
  font-weight: 500;
}

.van-progress {
  margin: 4px 0;
  height: 6px;
}

.progress-status {
  font-size: 12px;
  height: 22px;
  color: var(--van-text-color-2);
}

.progress-card-buttons > .control-button {
  width: 56px;
  height: 56px;
  margin-right: 8px;
  border-radius: 8px;
}

:deep(.progress-card-buttons > .control-button > img) {
  width: 20px;
  height: 20px;
  margin-bottom: 2px;
}

.light-button {
  grid-column: 2;
  grid-row: 2;
  justify-self: end;
  width: 56px;
  /* height: 72px; */
}

:deep(.light-button > img) {
  width: 20px;
  height: 20px;
}

@media (orientation: portrait) {
  .homepage {
    grid-template-columns: 1fr;
    grid-template-rows: 250px 200px auto auto;
    height: auto;
    padding-bottom: 8px;
  }

  .task-card {
    grid-column: 1;
    grid-row: 1;
    height: 250px;
  }

  .printer-card {
    grid-column: 1;
    grid-row: 2;
    width: 100%;
    height: 200px;
  }

  .progress-card {
    grid-column: 1;
    grid-row: 3;
    margin-right: 0;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .progress-card-buttons {
    justify-content: flex-start;
  }

  .light-button {
    display: none;
  }
}

</style>
