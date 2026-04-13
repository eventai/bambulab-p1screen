<template>
  <div class="settings-page">
    <van-cell-group inset title="网络信息">
      <van-cell title="IP 地址" :value="ip ?? ''" />
      <van-cell title="WiFi 信号强度" :value="device?.wifi_signal ?? ''" />
      <van-cell title="状态">
        <template #value>
          <div class="status-cell-value">
            <span>{{ statusLabel }}</span>
            <button v-if="!isConnected" class="refresh-btn" type="button" @click="handleReconnect">
              <i-material-symbols-refresh-rounded />
            </button>
          </div>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group v-if="deviceModule" inset title="设备信息">
      <van-cell title="设备型号" :value="deviceModule.product_name" />
      <van-cell title="序列号" :value="deviceModule.sn" />
      <van-cell title="固件版本" :value="deviceModule.sw_ver" />
    </van-cell-group>

    <van-cell-group v-for="(module, index) in amsModules" :key="index" inset title="配件信息">
      <van-cell title="配件" :value="module.product_name" />
      <van-cell title="序列号" :value="module.sn" />
      <van-cell title="固件版本" :value="module.sw_ver" />
    </van-cell-group>

    <van-cell-group inset title="关于 bambulab-p1screen">
      <van-cell title="当前版本" :value="currentVersion" />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getCurrentDevice } from '../../utils/device'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'

const client = PrinterClient.getInstance()
const device = ref(client.device.print)
const modules = ref(client.device.module)

const getStatusLabel = () => {
  if (client.lastError?.message === 'Connection refused: Not authorized') return '认证失败'
  const c = client.mqttClient
  if (!c) return '未连接'
  if (c.connected) return '已连接'
  if (c.disconnecting) return '断开中'
  if (c.reconnecting) return '重连中'
  if (c.disconnected) return '已断开'
  return '未知'
}

const ip = computed(() => getCurrentDevice()?.ip)
const isConnected = ref(client.mqttClient?.connected || false)
const statusLabel = ref(getStatusLabel())
const deviceModule = computed(() => modules.value?.find(item => item.name === 'ota'))
const amsModules = computed(() => modules.value?.filter(item => item.name.includes('ams')))
const currentVersion = import.meta.env.APP_VERSION

onMounted(() => {
  client.on(PrinterEvent.MQTT_STATE_CHANGE, onPushStatus)
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.MQTT_STATE_CHANGE, onPushStatus)
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

const onPushStatus = () => {
  device.value = client.device.print
  modules.value = client.device.module
  isConnected.value = client.mqttClient?.connected || false
  statusLabel.value = getStatusLabel()
}

const handleReconnect = () => {
  const storedDevice = getCurrentDevice()
  if (!storedDevice) return
  client.connect(storedDevice.ip, storedDevice.serial, storedDevice.code)
}

</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 12px;
  padding: 8px 8px 12px;
  overscroll-behavior: none;
}

.status-cell-value {
  display: inline-flex;
  align-items: center;
}

.refresh-btn {
  width: 20px;
  height: 20px;
  margin-left: 6px;
  border: none;
  background: transparent;
  color: var(--van-text-color-2);
  display: inline-grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}
</style>
