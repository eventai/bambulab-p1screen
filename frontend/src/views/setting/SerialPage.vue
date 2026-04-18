<template>
  <BaseSubPage title="设备和序列号">
    <van-cell-group inset title="设备信息">
      <van-cell title="设备名" :value="getCurrentDevice()?.name" />
      <!-- <van-cell title="打印机使用时间" value="x 小时" /> -->
    </van-cell-group>
    <van-cell-group v-if="modules" inset title="序列号">
      <van-cell v-for="module in modules" :key="module.sn" :title="module.product_name" :value="module.sn" v-show="module.visible" />
    </van-cell-group>
  </BaseSubPage>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'
import { getCurrentDevice } from '../../utils/device'

const client = PrinterClient.getInstance()
const modules = ref(client.device.module)

onMounted(() => {
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

const onPushStatus = () => {
  modules.value = client.device.module
}
</script>
<style scoped>

</style>
