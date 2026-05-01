<template>
  <div class="app-root">
    <div class="unsupported">Your browser version is too old. Please upgrade.</div>
    <div class="app-shell">
      <aside class="side-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          :class="{ 'nav-item': true, 'nav-item-active': item.key === activeNavKey }"
          :to="item.to"
          draggable="false"
          @dragstart.prevent
        >
          <van-badge v-if="item.key === 'message'" :content="hmsCount" :show-zero="false">
            <component :is="item.icon" class="nav-icon" />
          </van-badge>
          <component v-else :is="item.icon" class="nav-icon" />
        </RouterLink>
      </aside>

      <main class="main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Component } from 'vue'
import { PrinterClient, PrinterEvent } from './api/PrinterClient'
import IconHome from '~icons/material-symbols/home-rounded'
import IconTune from '~icons/material-symbols/tune-rounded'
import IconDatabase from '~icons/material-symbols/database'
import IconSettings from '~icons/material-symbols/settings-rounded'
import IconSMS from '~icons/material-symbols/sms-rounded'

const route = useRoute()

type NavItem = {
  key: string
  to: string
  icon: Component
}

const navItems: NavItem[] = [
  { key: 'home', to: '/home', icon: IconHome },
  { key: 'control', to: '/control', icon: IconTune },
  { key: 'filament', to: '/filament', icon: IconDatabase },
  { key: 'setting', to: '/setting', icon: IconSettings },
  { key: 'message', to: '/message', icon: IconSMS },
]

const activeNavKey = computed(() => {
  const firstSegment = route.path.split('/')[1]
  return firstSegment ?? ''
})

const client = PrinterClient.getInstance()
const hmsCount = ref(0)

const onPushStatus = () => {
  hmsCount.value = client.device.print?.hms?.length || 0
}

onMounted(() => {
  client.on(PrinterEvent.MQTT_STATE_CHANGE, onPushStatus)
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.MQTT_STATE_CHANGE, onPushStatus)
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})
</script>

<style scoped>
.app-root {
  width: 100%;
  height: 100%;
}

.app-shell {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  height: 100%;
  overflow: hidden;
}

.unsupported {
  display: none;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--van-text-color);
  font-size: 16px;
}

@supports not ((width: calc(1px + 1px)) and (color: var(--support-probe))) {
  .app-shell {
    display: none;
  }

  .unsupported {
    display: flex;
  }
}

.side-nav {
  display: grid;
  padding: 8px;
  padding-left: calc(8px + env(safe-area-inset-left));
  background: var(--van-background-2);
  height: 100%;
  align-items: center;
}

.nav-item {
  width: 48px;
  height: 48px;
  display: grid;
  align-items: center;
  justify-content: center;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  color: var(--van-text-color-2);
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-item.router-link-active {
  color: var(--van-primary-color);
}

.nav-item.nav-item-active {
  color: var(--van-primary-color);
}

.main {
  min-height: 320px;
  padding-right: env(safe-area-inset-right);
  overflow: auto;
}

@media (orientation: portrait) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .side-nav {
    grid-row: 2;
    grid-auto-flow: column;
    grid-auto-columns: 48px;
    justify-content: space-between;
    justify-items: center;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
    border-top: var(--van-background-3) 1px solid;
  }

  .nav-item {
    width: 40px;
    height: 40px;
  }

  .main {
    grid-row: 1;
    height: auto;
    padding-right: 0;
  }
}
</style>
