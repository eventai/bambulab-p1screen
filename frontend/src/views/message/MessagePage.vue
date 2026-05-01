<template>
  <div class="msg-page">
    <div v-if="hmsList.length > 0" class="hms-layout">
      <!-- Left side: Selected Error Details -->
      <div class="hms-detail">
        <div class="qr-container">
          <qrcode-vue :value="wikiUrl" :size="160" level="H" background="#ffffff" foreground="#000000" />
          <div class="wiki-url">{{ displayUrl }}</div>
        </div>
        <div class="detail-text">{{ selectedIntro }}</div>
      </div>

      <!-- Right side: Error List -->
      <div class="hms-list-container">
        <div class="list-title">Assistant ({{ hmsList.length }})</div>
        <div class="hms-list">
          <div 
            v-for="(hms, index) in hmsList" 
            :key="index"
            :class="['hms-card', { active: selectedIndex === index }]"
            @click="selectedIndex = index"
          >
            <div class="hms-intro">{{ hms.intro }}</div>
            <div class="hms-code">[{{ hms.formattedCode }}]</div>
          </div>
        </div>
      </div>
    </div>
    
    <van-empty v-else description="No messages" class="empty-state" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'
import { loadHmsDictionary, getHmsEcode, formatHmsCode } from '../../utils/hms'

type HmsViewItem = {
  ecode: string
  formattedCode: string
  intro: string
}

const client = PrinterClient.getInstance()
const hmsList = ref<HmsViewItem[]>([])
const selectedIndex = ref(0)
const dict = ref<Map<string, string>>(new Map())

const updateHmsList = () => {
  const rawHms = client.device.print?.hms || []
  const newList: HmsViewItem[] = []
  
  for (const item of rawHms) {
    const ecode = getHmsEcode(item.attr, item.code)
    const intro = dict.value.get(ecode) || 'Unknown error'
    newList.push({
      ecode,
      formattedCode: formatHmsCode(ecode),
      intro
    })
  }
  
  hmsList.value = newList
  if (selectedIndex.value >= newList.length) {
    selectedIndex.value = 0
  }
}

onMounted(async () => {
  dict.value = await loadHmsDictionary()
  updateHmsList()
  client.on(PrinterEvent.MQTT_STATE_CHANGE, updateHmsList)
  client.on(PrinterEvent.PRINT_PUSH_STATUS, updateHmsList)
})

onUnmounted(() => {
  client.off(PrinterEvent.MQTT_STATE_CHANGE, updateHmsList)
  client.off(PrinterEvent.PRINT_PUSH_STATUS, updateHmsList)
})

const selectedItem = computed(() => {
  return hmsList.value[selectedIndex.value] || null
})

const selectedIntro = computed(() => {
  return selectedItem.value ? selectedItem.value.intro : ''
})

const wikiUrl = computed(() => {
  if (!selectedItem.value) return 'https://bambulab.com'
  return `https://bambulab.com/en/support/hms/${selectedItem.value.ecode}`
})

const displayUrl = computed(() => {
  if (!selectedItem.value) return ''
  return `e.bambulab.com/?e=${selectedItem.value.ecode}`
})
</script>

<style scoped>
.msg-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 16px;
  background: var(--van-background);
}

.hms-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  height: 100%;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hms-detail {
  background: var(--van-background-2);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.qr-container {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wiki-url {
  color: #000;
  font-size: 10px;
  margin-top: 8px;
  word-break: break-all;
  max-width: 160px;
}

.detail-text {
  font-size: 16px;
  color: var(--van-text-color);
  font-weight: 500;
  line-height: 1.4;
}

.hms-list-container {
  background: var(--van-background-2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-title {
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--van-text-color);
  border-bottom: 1px solid var(--van-border-color);
}

.hms-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hms-card {
  background: var(--van-background-3);
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.hms-card.active {
  border-color: #fbbc05; /* Yellow border for active/selected error */
  background: rgba(251, 188, 5, 0.05);
}

.hms-intro {
  font-size: 14px;
  color: var(--van-text-color);
  margin-bottom: 8px;
  line-height: 1.4;
}

.hms-code {
  font-size: 12px;
  color: var(--van-text-color-2);
  font-family: monospace;
}

/* Portrait layout fallback */
@media (orientation: portrait) {
  .hms-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}
</style>
