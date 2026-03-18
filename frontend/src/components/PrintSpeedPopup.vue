<template>
  <van-popup :show="show" position="right" @click-overlay="handleClose">
    <div class="popup">
      <div class="popup-header">
        <button class="popup-header-back" type="button" @click="handleClose">
          <span class="material-symbols-rounded">arrow_back_ios</span>
        </button>
        <div class="popup-header-title">打印速度</div>
      </div>

      <div class="print-speed-buttons">
        <van-button v-for="item in buttons" :class="`print-speed-button ${item.value === value ? 'print-speed-button-active' : ''}`" type="primary" size="large" @click="handleConfirm(item.value)">{{ item.label }}</van-button>
      </div>

    </div>
  </van-popup>
</template>

<script setup lang="ts">

const buttons = [{
  label: '狂暴模式（166%）',
  value: 4
}, {
  label: '运动模式（124%）',
  value: 3
}, {
  label: '标准模式（100%）',
  value: 2
}, {
  label: '静音模式（50%）',
  value: 1
}]

const props = withDefaults(
  defineProps<{
    show: boolean
    value?: number
  }>(),
  {
    value: undefined
  }
)

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
  (event: 'confirm', value: number): void
}>()

const handleClose = () => {
  emit('update:show', false)
}

const handleConfirm = (value: number) => {
  emit('confirm', value)
  emit('update:show', false)
}

</script>

<style scoped>

.print-speed-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 8px;
}

.print-speed-button {
  background: var(--van-background-5);
  border: 0;
  border-radius: 8px;
  width: 200px;
  height: 55px;
  cursor: pointer;
}

.print-speed-button-active {
  background: var(--van-primary-color);
}

</style>
