<template>
  <BaseSubPage title="打印校准">
    <template #right>
      <van-button
        class="header-action-btn"
        type="primary"
        size="normal"
        :disabled="option === 0"
        @click="handleConfirm"
      >
        确定
      </van-button>
    </template>
    <SettingCell
      title="自动热床调平（6分钟）"
      label="通过喷嘴接触打印板来检测热床的平整度。调平可以试挤出的高度更均匀。"
      :selected="bedLevelling"
      @click="bedLevelling = $event"
    />
    <SettingCell
      title="振动补偿（4分钟）"
      label="测量打印机的机械共振模型以补偿震动。可以减少加速造成的纹路并大幅提高打印速度。"
      :selected="vibrationCompensation"
      @click="vibrationCompensation = $event"
    />
    <SettingCell
      title="电机降噪（15分钟）"
      label="测量每个电机的细微差异以优化主动降噪算法。"
      :selected="motorCancellation"
      @click="motorCancellation = $event"
    />
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
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
      message: '机器校准过程需要一段时间，且机器会产生轻微震动，在此过程中，不可操作机器，确定要开始校准吗？',
      confirmButtonText: '开始校准',
      messageAlign: 'left',
    })
  } catch {
    return
  }

  await client.request('print.calibration', { option: option.value })
  router.push('/home')

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
