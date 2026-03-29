<template>
  <div class="nav-header">
    <button class="nav-header-back" type="button" @click="emit('back')">
      <i-material-symbols-arrow-back-ios-new-rounded />
    </button>
    <div class="nav-header-title">{{ title }}</div>
    <van-button
      v-if="showConfirm"
      class="nav-header-confirm"
      type="primary"
      size="normal"
      :disabled="confirmDisabled"
      @click="emit('confirm')"
    >
      确定
    </van-button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
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
  (event: 'back'): void
  (event: 'confirm'): void
}>()
</script>

<style scoped>
.nav-header {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 12px;
  align-items: center;
  height: 40px;
}

.nav-header-back {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 0;
  background: none;
  display: grid;
  place-items: center;
}

.nav-header-title {
  font-size: 18px;
  font-weight: 600;
}

.nav-header-confirm {
  width: 80px;
  height: 32px;
  font-size: 16px;
}
</style>
