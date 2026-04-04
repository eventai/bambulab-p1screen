<template>
  <div class="filament-page">
    <div class="ams-cards">
      <AMS v-for="ams in amsList" :key="ams.id ?? '0'" :ams-id="ams.id ?? '0'" />
      <!-- <AMS v-for="ams in amsList" :key="ams.id ?? '0'" :ams-id="ams.id ?? '0'" /> -->
    </div>
    <div class="ext-card">
      <ExtTray />
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
import { computed, ref } from 'vue'
import type { PopoverAction } from 'vant'
import { useRouter } from 'vue-router'
import AMS from '../components/AMS.vue'
import ExtTray from '../components/ExtTray.vue'
import { PrinterClient } from '../api/PrinterClient'

const router = useRouter()
const client = PrinterClient.getInstance()
const device = client.device

const amsList = computed(() => device.print.ams?.ams ?? [{ id: '0' }])
const showSettingsPopover = ref(false)
const settingsActions: PopoverAction[] = [{ type: 'auto-refill', text: '自动续料' }]

const handleSettingsSelect = (action: PopoverAction) => {
  console.log('[FilamentPage] settings action:', action.type)
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
.ext-card {
  grid-row: 1;
  grid-column: 2;
  padding: 60px 28px;
  border-left: var(--van-background-4) 2px dotted;
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
