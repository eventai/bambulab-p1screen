<template>
  <div class="device-manage-page">
    <NavHeader :title="isEditMode ? '编辑设备' : '添加设备'" @back="router.back" />

    <van-cell-group inset>
      <van-cell title="设备名称">
        <template #value>
          <input
            v-model.trim="name"
            class="cell-input"
            placeholder="设备名称"
            enterkeyhint="next"
            @keydown.enter.prevent="ipInputRef?.focus()"
          />
        </template>
      </van-cell>
      <van-cell title="IP 地址">
        <template #value>
          <input
            ref="ipInputRef"
            v-model.trim="ip"
            class="cell-input"
            placeholder="IP 地址"
            enterkeyhint="next"
            @keydown.enter.prevent="serialInputRef?.focus()"
          />
        </template>
      </van-cell>
      <van-cell title="序列号">
        <template #value>
          <input
            ref="serialInputRef"
            v-model.trim="serial"
            class="cell-input"
            :readonly="isEditMode"
            :class="{ 'cell-input-readonly': isEditMode }"
            placeholder="序列号"
            enterkeyhint="next"
            @keydown.enter.prevent="codeInputRef?.focus()"
          />
        </template>
      </van-cell>
      <van-cell title="配对码">
        <template #value>
          <input
            ref="codeInputRef"
            v-model.trim="code"
            class="cell-input"
            placeholder="配对码"
            enterkeyhint="done"
            @keydown.enter.prevent="(e) => (e.target as HTMLInputElement | null)?.blur()"
          />
        </template>
      </van-cell>
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
const ipInputRef = ref<HTMLInputElement | null>(null)
const serialInputRef = ref<HTMLInputElement | null>(null)
const codeInputRef = ref<HTMLInputElement | null>(null)
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
  padding: 8px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom) + var(--keyboard-offset, 0px));
  overflow: auto;
}

.cell-input {
  width: 100%;
  border: 0;
  outline: none;
  text-align: right;
  background: transparent;
  color: var(--van-text-color-2);
}

.cell-input-readonly {
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
