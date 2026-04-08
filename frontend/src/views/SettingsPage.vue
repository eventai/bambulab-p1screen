<template>
  <div class="settings-page">
    <template v-if="hasDeviceInStorage">
      <van-cell-group inset title="网络信息">
        <van-cell title="IP 地址" :value="ip" />
        <van-cell title="WiFi 信号强度" :value="device.print.wifi_signal ?? '未知'" />
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

      <van-cell-group v-if="deviceInfo" inset title="设备信息">
        <van-cell title="设备型号" :value="deviceInfo.product_name" />
        <van-cell title="序列号" :value="deviceInfo.sn" />
        <van-cell title="固件版本" :value="deviceInfo.sw_ver" />
      </van-cell-group>

      <van-cell-group v-for="(module, index) in modules" :key="index" inset title="配件信息">
        <van-cell title="配件" :value="module.product_name" />
        <van-cell title="序列号" :value="module.sn" />
        <van-cell title="固件版本" :value="module.sw_ver" />
      </van-cell-group>
    </template>

    <van-cell-group inset title="关于 bambulab-p1screen">
      <van-cell title="当前版本" :value="currentVersion" />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PrinterClient } from '../api/PrinterClient'
import { getDevice } from '../utils/device'

const client = PrinterClient.getInstance()
const device = client.device

const ip = computed(() => getDevice()?.ip ?? '')
const deviceInfo = computed(() => device.module.find(item => item.name === 'ota') ?? null)
const modules = computed(() => device.module.filter(item => item.name.includes('ams')))
const isConnected = computed(() => Boolean(client.mqttClient.value?.connected))
const currentVersion = computed(() => import.meta.env.APP_VERSION)
const hasDeviceInStorage = computed(() => Boolean(getDevice()))

const handleReconnect = () => {
  const storedDevice = getDevice()
  if (!storedDevice) return
  client.connect(storedDevice.ip, storedDevice.serial, storedDevice.code)
}

const statusLabel = computed(() => {
  if (client.lastError?.message === 'Connection refused: Not authorized') return '认证失败'
  const c = client.mqttClient.value
  if (!c) return '未连接'
  if (c.connected) return '已连接'
  if (c.disconnecting) return '断开中'
  if (c.reconnecting) return '重连中'
  if (c.disconnected) return '已断开'
  return '未知'
})

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
  gap: 6px;
}

.refresh-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--van-text-color-2);
  display: inline-grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}
</style>
