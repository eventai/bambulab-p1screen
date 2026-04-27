<template>
  <BaseSubPage :title="isEditMode ? '编辑设备' : '添加设备'">
  <div class="device-manage-page">
    <van-cell-group inset>
      <van-field
        v-model.trim="name"
        label="设备名称"
        placeholder="设备名称"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="ipInputRef?.focus()"
      />
      <van-field
        ref="ipInputRef"
        v-model.trim="ip"
        label="IP 地址"
        placeholder="IP 地址"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="isEditMode ? codeInputRef?.focus() : serialInputRef?.focus()"
      />
      <van-field
        ref="serialInputRef"
        v-model.trim="serial"
        :readonly="isEditMode"
        label="序列号"
        placeholder="序列号"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="codeInputRef?.focus()"
      />
      <van-field
        ref="codeInputRef"
        v-model.trim="code"
        label="配对码"
        placeholder="配对码"
        type="digit"
        input-align="right"
        enterkeyhint="done"
        @keydown.enter.prevent="codeInputRef?.blur()"
      />
    </van-cell-group>

    <van-cell-group inset>
      <van-cell
        title="保存"
        class="save-btn"
        :clickable="canSave"
        @click="handleSave"
      />
      <van-cell v-if="isEditMode" title="删除" class="delete-btn" @click="handleDelete" />
    </van-cell-group>
  </div>
  </BaseSubPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import { PrinterClient } from '../../api/PrinterClient'
import { addDevice, getDevices, removeDevice, getCurrentDevice,setCurrentDevice } from '../../utils/device'

const client = PrinterClient.getInstance()
const route = useRoute()
const router = useRouter()

const isEditMode = computed(() => Boolean(route.params.serial as string | undefined))
const stored = isEditMode.value ? getDevices().find(item => item.serial === route.params.serial as string) ?? null : null
const name = ref(stored?.name || '')
const ip = ref(stored?.ip || '')
const serial = ref(stored?.serial || '')
const code = ref(stored?.code || '')
const ipInputRef = ref<HTMLElement | null>(null)
const serialInputRef = ref<HTMLElement | null>(null)
const codeInputRef = ref<HTMLElement | null>(null)
const canSave = computed(() => Boolean(name.value && ip.value && serial.value && code.value))

const handleSave = () => {
  if (!canSave.value) return
  addDevice({ name: name.value, ip: ip.value, serial: serial.value, code: code.value })
  setCurrentDevice(serial.value)
  client.connect(ip.value, serial.value, code.value)
  router.back()
  showToast({
    message: '保存成功',
    position: 'bottom',
  })
}

const handleDelete = () => {
  if (!serial.value) return
  removeDevice(serial.value)
  const current = getCurrentDevice()
  if (!current) {
    client.disconnect()
  } else {
    client.connect(current.ip, current.serial, current.code)
  }
  router.back()
  showToast({
    message: '删除成功',
    position: 'bottom',
  })
}

</script>

<style scoped>
.device-manage-page {
  display: grid;
  gap: 10px;
  padding-bottom: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  overflow: auto;
}

:deep(.van-field__control) {
  color: var(--van-text-color-2);
}

:deep(.van-field__control:read-only) {
  color: var(--van-text-color-3);
}

.save-btn {
  color: var(--van-blue);
  opacity: 0.5;
}

.save-btn.van-cell--clickable {
  opacity: 1;
}

.delete-btn {
  color: var(--van-red);
}
</style>
