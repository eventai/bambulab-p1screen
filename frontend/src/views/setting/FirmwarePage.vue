<template>
  <BaseSubPage title="固件">
    <van-cell-group v-if="modules" inset>
      <van-cell v-for="module in modules" :key="module.sn" :title="module.product_name" :value="module.sw_ver" v-show="module.visible" />
    </van-cell-group>
  </BaseSubPage>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'

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
