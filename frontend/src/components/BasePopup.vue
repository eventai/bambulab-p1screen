<template>
  <van-popup
    :show="show"
    :class="{ popup: true, 'popup-bottom': isPortrait }"
    :position="isPortrait ? 'bottom' : 'right'"
    @click-overlay="handleClose"
  >
    <NavHeader
      :title="title"
      :show-confirm="showConfirm"
      :confirm-disabled="confirmDisabled"
      @back="handleClose"
      @confirm="handleConfirm"
    />

    <slot></slot>
  </van-popup>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import NavHeader from './NavHeader.vue'

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

const isPortrait = ref(false)

const updateOrientation = () => {
  isPortrait.value = window.innerHeight > window.innerWidth
}

onMounted(() => {
  updateOrientation()
  window.addEventListener('resize', updateOrientation)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateOrientation)
})

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

.popup-bottom {
  width: 100%;
  height: auto;
  max-height: 100%;
  padding-right: 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}

@media (orientation: portrait) {
  .popup {
    padding-bottom: calc(4px + env(safe-area-inset-bottom));
  }
}
</style>
