<template>
  <div class="device-manage-page">
    <NavHeader title="设备管理" @back="router.back" />

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
        :clickable="canSave"
        :class="{ 'save-cell': true, 'save-cell-disabled': !canSave }"
        @click="handleSave"
      />
      <van-cell title="删除" class="delete-cell" @click="handleDelete" />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { showSuccessToast } from 'vant'
import { useRouter } from 'vue-router'
import { PrinterClient } from '../api/PrinterClient'
import NavHeader from '../components/NavHeader.vue'
import { clearDevice, getDevice, setDevice } from '../utils/device'

const client = PrinterClient.getInstance()

const stored = getDevice()
const router = useRouter()
const name = ref(stored?.name || '')
const ip = ref(stored?.ip || '')
const serial = ref(stored?.serial || '')
const code = ref(stored?.code || '')
const ipInputRef = ref<HTMLInputElement | null>(null)
const serialInputRef = ref<HTMLInputElement | null>(null)
const codeInputRef = ref<HTMLInputElement | null>(null)
const canSave = computed(() => Boolean(name.value && ip.value && serial.value && code.value))

const handleSave = () => {
  setDevice({ name: name.value, ip: ip.value, serial: serial.value, code: code.value })
  client.connect(ip.value, serial.value, code.value)
  router.back()
  showSuccessToast('保存成功')
}

const handleDelete = () => {
  clearDevice()
  client.disconnect()
  router.back()
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

.save-cell {
  color: var(--van-blue);
}

.save-cell-disabled {
  color: var(--van-text-color-3);
}

.delete-cell {
  color: var(--van-red);
}
</style>
