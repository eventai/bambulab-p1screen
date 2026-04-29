<template>
  <BaseSubPage title="Print Calibration">
    <template #right>
      <van-button
        class="header-action-btn"
        type="primary"
        size="normal"
        :disabled="option === 0"
        @click="handleConfirm"
      >
        Confirm
      </van-button>
    </template>
    <SettingCell
      title="Auto Bed Leveling (6 min)"
      label="Detects the flatness of the build plate by touching it with the nozzle. Ensures consistent first-layer height."
      :selected="bedLevelling"
      @click="bedLevelling = $event"
    />
    <SettingCell
      title="Vibration Compensation (4 min)"
      label="Measures the printer's mechanical resonance to compensate for vibration. Reduces artefacts from acceleration and significantly increases print speed."
      :selected="vibrationCompensation"
      @click="vibrationCompensation = $event"
    />
    <SettingCell
      title="Motor Noise Cancellation (15 min)"
      label="Measures subtle differences in each motor to optimize the active noise-cancellation algorithm."
      :selected="motorCancellation"
      @click="motorCancellation = $event"
    />
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAME } from '../../router/routes'
import { showConfirmDialog } from 'vant'
import { PrinterClient } from '../../api/PrinterClient'

const router = useRouter()
const client = PrinterClient.getInstance()

const bedLevelling = ref(true)
const vibrationCompensation = ref(true)
const motorCancellation = ref(false)
const option = computed(() => {
  let bitmask = 0
  if (bedLevelling.value) bitmask |= 1 << 1
  if (vibrationCompensation.value) bitmask |= 1 << 2
  if (motorCancellation.value) bitmask |= 1 << 3
  return bitmask
})

const handleConfirm = async () => {
  try {
    await showConfirmDialog({
      message: 'Calibration takes some time and the printer may vibrate slightly. Do not operate the printer during this process. Start calibration?',
      confirmButtonText: 'Start Calibration',
      messageAlign: 'left',
    })
  } catch {
    return
  }

  await client.request('print.calibration', { option: option.value })
  router.push({ name: ROUTE_NAME.HOME })

}
</script>

<style scoped>
.van-checkbox {
  display: block;
  padding-top: 4px;
  padding-right: 8px;
}
.header-action-btn {
  width: 80px;
  height: 32px;
  font-size: 16px;
}
</style>
