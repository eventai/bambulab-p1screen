<template>
  <van-popup :show="show" class="popup" position="right" @click-overlay="handleClose">
    <div class="popup-header">
      <button class="popup-header-back" type="button" @click="handleClose">
        <span class="material-symbols-rounded">arrow_back_ios</span>
      </button>
      <div class="popup-header-title">{{ title }}</div>
      <van-button
        v-if="showConfirm"
        class="popup-header-confirm"
        type="primary"
        size="normal"
        :disabled="confirmDisabled"
        @click="handleConfirm"
      >
        确定
      </van-button>
    </div>

    <slot></slot>
  </van-popup>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    show: boolean
    title: string
    showConfirm?: boolean
    confirmDisabled?: boolean
  }>(),
  {
    showConfirm: false,
    confirmDisabled: false,
  }
)

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
  (event: 'confirm'): void
}>()

const handleClose = () => {
  emit('update:show', false)
}

const handleConfirm = () => {
  emit('confirm')
}
</script>

<style scoped>

.popup {
  background: var(--van-background-3);
  padding: 4px 12px;
  display: grid;
  gap: 8px;
  height: 100%;
  padding-right: calc(12px + env(safe-area-inset-right));
}

.popup-header {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 12px;
  align-items: center;
  height: 40px;
}

.popup-header-back {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 0;
  background: none;
  display: grid;
  place-items: center;
}

.popup-header-title {
  font-size: 18px;
  font-weight: 600;
}

.popup-header-confirm {
  width: 80px;
  height: 32px;
  font-size: 16px;
}
</style>
