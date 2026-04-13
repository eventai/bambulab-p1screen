<template>
  <div class="filament-page">
    <van-tabs v-if="device?.ams.ams && device.ams.ams.length > 1" class="ams-tab" @click-tab="handleClickTab">
      <van-tab
        v-for="i in device.ams.ams.length"
        :key="i"
        :title="`AMS-${amsPrefix(device.ams.ams[i-1].id)}`"
        :name="device.ams.ams[i-1].id"
      />
    </van-tabs>
    <div v-if="device && currentAms" class="ams-card">
      <Tray
        v-for="slot in 4"
        :key="slot"
        :name="`${amsPrefix(currentAms.id)}${slot}`"
        :amsId="Number(currentAms.id)"
        :tray="currentAms.tray[slot - 1]"
        :trayNow="Number(device?.ams.tray_now) ?? -1"
        :popoverAction="handleTrayAction"
      />
      <span class="ams-name" >AMS-{{ amsPrefix(currentAms.id) }}</span>
      <img class="ams-hum" :src="humIcon(currentAms.humidity)"/>
    </div>
    <div v-if="device?.vt_tray" class="ext-card">
      <Tray
        name="Ext"
        :amsId="255"
        :tray="device?.vt_tray"
        :trayNow="Number(device?.ams.tray_now) ?? 0"
        :popoverAction="handleTrayAction"
      />
      <span class="ext-name" >外挂料盘</span>
    </div>
  </div>

  <div class="setting">
    <van-popover
      v-model:show="showSettingsPopover"
      trigger="manual"
      placement="top-end"
      :actions="settingsActions"
      style="--van-popover-action-width: 100px;"
      @select="handleSettingsSelect"
    >
      <template #reference>
        <button type="button" @click.stop="showSettingsPopover = !showSettingsPopover">
          <i-material-symbols-handyman />
        </button>
      </template>
    </van-popover>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { PopoverAction } from 'vant'
import { useRouter } from 'vue-router'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'
import humLevelIcon from '../../assets/images/hum_level1_no_num_dark.svg'
import humLevel1Icon from '../../assets/images/hum_level1_dark.svg'
import humLevel2Icon from '../../assets/images/hum_level2_dark.svg'
import humLevel3Icon from '../../assets/images/hum_level3_dark.svg'
import humLevel4Icon from '../../assets/images/hum_level4_dark.svg'
import humLevel5Icon from '../../assets/images/hum_level5_dark.svg'
import { DeviceTray } from '../../api/device'

const router = useRouter()
const client = PrinterClient.getInstance()

const device = ref(client.device.print)
const currentAmsId = ref<string | undefined>(device.value?.ams.ams?.[0].id)
const currentAms = computed(() => device.value?.ams.ams?.filter(ams => ams.id === currentAmsId.value)[0])
const showSettingsPopover = ref(false)
const settingsActions: PopoverAction[] = [{ type: 'auto-refill', text: '自动续料' }]

const amsPrefix = (amsId: string) => String.fromCharCode('A'.charCodeAt(0) + Number(amsId ?? '0'))
const humIcon = (humidity: string) => [humLevelIcon, humLevel1Icon, humLevel2Icon, humLevel3Icon, humLevel4Icon, humLevel5Icon][Number(humidity)]

onMounted(() => {
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

const onPushStatus = () => {
  device.value = client.device.print
  if (!currentAmsId.value && device.value?.ams.ams && device.value.ams.ams.length > 0) {
    currentAmsId.value = device.value.ams.ams[0].id
  }
}

const handleTrayAction = (amsId: number, tray: DeviceTray, action: PopoverAction) => {
  console.log(`[Tray] type=${action.type}, amsId=${amsId}, tray=${JSON.stringify(tray)}`)
  switch (action.type) {
    case 'edit':
      router.push(`/filament/edit/${amsId}/${tray.id}`)
      break
    case 'load':
      if (Number(tray.id) === 254) {
        client.request('print.ams_change_filament', {
          ams_id: 255,
          slot_id: 0,
          target: 0,
          curr_temp: -1,
          tar_temp: -1,
        })
      } else {
        client.request('print.ams_change_filament', {
          ams_id: amsId,
          slot_id: Number(tray.id),
          target: Number(tray.id),
          curr_temp: -1,
          tar_temp: -1,
        })
      }
      break
    case 'unload':
      client.request('print.ams_change_filament', {
        ams_id: 255,
        slot_id: 255,
        target: 255,
        curr_temp: -1,
        tar_temp: -1,
      })
      break
    case 'reload':
      client.request('print.ams_get_rfid', { ams_id: amsId, slot_id: Number(tray.id) })
      break
    default:
      break
  }
}

const handleClickTab = ({name}: {name: string}) => {
  currentAmsId.value = name
}

const handleSettingsSelect = (action: PopoverAction) => {
  console.log(`[FilamentPage] settings action: ${action.type}`)
  showSettingsPopover.value = false
  if (action.type === 'auto-refill') {
    router.push('/filament/auto-refill')
  }
}
</script>

<style scoped>
.filament-page {
  height: 100%;
  position: relative;
  padding: 16px;
  padding-bottom: calc(30px + 16px + env(safe-area-inset-bottom));

  display: grid;
  grid-template-rows: 30px 150px;
  grid-template-columns: repeat(2, auto);
  align-content: center;
  align-items: center;
  justify-content: center;
}

.ams-tab {
  width: calc(60px * 4 + 18px);
  margin: 16px;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.ams-tab > .van-tabs__wrap) {
  height: 30px;
}

:deep(.ams-tab .van-tab) {
  font-size: 12px;
}

.ams-card, .ext-card {
  grid-row: 2;
  display: grid;
  grid-template-rows: auto 20px 0;
  margin: 16px;
  padding: 8px;
  border-radius: 8px;
  border: var(--van-background-4) 1px solid;
  background-color: var(--van-background-2);
}

.ams-card {
  width: calc(60px * 4 + 18px);
  grid-template-columns: repeat(4, 60px);
}

.ext-card {
  width: calc(60px + 18px);
  grid-template-columns: 60px;
}

.ams-name, .ext-name {
  grid-column: 1 / -1;
  padding: 0 8px;
  margin: 0 -8px;
  margin-top: 10px;

  font-size: 12px;
  line-height: 20px;
  height: 20px;
  background-color: var(--van-background-3);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  border-bottom: var(--van-background-4) 1px solid;
  overflow: hidden;
}

.ams-hum {
  position: relative;
  width: 30px;
  height: 30px;
  left: 234px;
  bottom: 20px;
  padding: 4px;
  border-radius: 12px;
  border: var(--van-background-3) 1px solid;
  background-color: var(--van-background);
}

.setting {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom));
}

.setting button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--van-background-3);
  color: var(--van-text-color);
}

@media (orientation: portrait) {
  .filament-page {
    grid-template-rows: 40px 150px 150px;
    grid-template-columns: auto;
    align-content: unset;
  }
  .ams-card, .ext-card {
    grid-row: unset;
  }
  .setting {
    bottom: calc(64px + 16px + env(safe-area-inset-bottom));
  }
}
</style>
