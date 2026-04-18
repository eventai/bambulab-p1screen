<template>
  <BaseSubPage title="打印选项">
    <SettingCell
      v-if="device"
      title="丢步自动恢复"
      label="检测到电机运行异常导致跳过步骤时，尝试自动恢复。"
      :selected="auto_recovery"
      @click="onChange"
    />
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { onMounted, onUnmounted, ref } from 'vue'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'
import { HomeFlagBit } from '../../api/enums'

const client = PrinterClient.getInstance()
const device = ref(client.device.print)
const auto_recovery = ref(Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.auto_recovery)))

onMounted(() => {
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

const onPushStatus = () => {
  device.value = client.device.print
  auto_recovery.value = Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.auto_recovery))
}

const onChange = async (selected: boolean) => {
  console.log('auto_recovery:', auto_recovery.value)
  console.log('selected:', selected)
  await client.request('print.print_option', { option: selected ? 1 : 0, auto_recovery: selected })
}
</script>

<style scoped>
.van-checkbox {
  display: block;
  padding-top: 4px;
  padding-right: 8px;
}
</style>
