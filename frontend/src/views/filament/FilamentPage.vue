<template>
  <div class="filament-page">
    <div class="ams-cards">
      <div v-for="ams in device?.ams.ams" :key="ams.id">
        <div class="ams-card">
          <Tray
            v-for="slot in 4"
            :key="slot"
            :name="`${amsPrefix(ams.id)}${slot}`"
            :amsId="ams.id"
            :tray="ams.tray[slot - 1]"
            :trayNow="device?.ams?.tray_now ?? '0'"
          />
          <span class="ams-name" >AMS-{{ amsPrefix(ams.id) }}</span>
        </div>
        <img class="ams-hum" :src="humIcon(ams.humidity)"/>
      </div>
    </div>
    <div class="ext-card">
      <div v-if="device?.vt_tray" class="ext-tray-card">
        <Tray
          name="Ext"
          amsId="255"
          :tray="device?.vt_tray"
          :trayNow="device?.ams?.tray_now ?? '0'"
        />
        <span class="ext-tray-name" >外挂料盘</span>
      </div>
    </div>

    <div class="settings-slot">
      <van-popover
        v-model:show="showSettingsPopover"
        trigger="manual"
        placement="top-end"
        :actions="settingsActions"
        style="--van-popover-action-width: 100px;"
        @select="handleSettingsSelect"
      >
        <template #reference>
          <button class="settings" type="button" @click.stop="showSettingsPopover = !showSettingsPopover">
            <i-material-symbols-handyman />
          </button>
        </template>
      </van-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { PopoverAction } from 'vant'
import { useRouter } from 'vue-router'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'
import humLevelIcon from '../../assets/images/hum_level1_no_num_dark.svg'
import humLevel1Icon from '../../assets/images/hum_level1_dark.svg'
import humLevel2Icon from '../../assets/images/hum_level2_dark.svg'
import humLevel3Icon from '../../assets/images/hum_level3_dark.svg'
import humLevel4Icon from '../../assets/images/hum_level4_dark.svg'
import humLevel5Icon from '../../assets/images/hum_level5_dark.svg'

const router = useRouter()
const client = PrinterClient.getInstance()

const device = ref(client.device.print)
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
  display: grid;
  grid-template-columns: repeat(2, auto);
  grid-template-rows: minmax(0, 1fr) auto;
  align-items: center;
  justify-content: center;
}

.ams-cards {
  grid-row: 1;
  grid-column: 1;
  height: 100%;
  display: grid;
  align-items: center;
  padding: 28px;
  gap: 20px;
}
.ams-card {
  width: calc(64px * 4 + 8px);
  background-color: var(--van-background-2);
  display: grid;
  grid-template-columns: repeat(4, 60px);
  padding: 8px;
  border-radius: 8px;
  border: var(--van-background-4) 1px solid;
  overflow: hidden;
  margin-bottom: -35px;
}
.ams-name {
  width: 300px;
  background-color: var(--van-background-3);
  margin-top: 8px;
  margin-bottom: -8px;
  margin-left: -8px;
  padding-left: 8px;
  font-size: 12px;
  line-height: 20px;
}
.ams-hum {
  position: relative;
  width: 30px;
  height: 30px;
  left: 248px;
  padding: 4px;
  border-radius: 12px;
  border: var(--van-background-3) 1px solid;
  background-color: var(--van-background);
}

.ext-card {
  grid-row: 1;
  grid-column: 2;
  padding: 60px 28px;
  border-left: var(--van-background-4) 2px dotted;
}
.ext-tray-card {
  width: 84px;
  display: grid;
  padding: 8px;
  border-radius: 8px;
  border: var(--van-background-4) 1px solid;
  overflow: hidden;
  background-color: var(--van-background-2);
}
.ext-tray-name {
  width: 84px;
  background-color: var(--van-background-3);
  margin-top: 8px;
  margin-bottom: -8px;
  margin-left: -8px;
  padding-left: 8px;
  font-size: 12px;
  line-height: 20px;
}

.settings-slot {
  grid-row: 2;
  grid-column: 1 / -1;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

.settings {
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
    height: auto;
    grid-template-columns: auto;
    grid-template-rows: auto auto auto;
  }

  .ext-card {
    grid-row: 2;
    grid-column: 1;
    padding: 28px;
    padding-top: 0;
    border-left: none;
  }

  .settings-slot {
    grid-row: 3;
    grid-column: 1 / -1;
  }
}
</style>
