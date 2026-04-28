<template>
  <div class="nav-header">
    <button class="nav-header-back" type="button" @click="emit('back')">
      <i-material-symbols-arrow-back-ios-new-rounded />
    </button>
    <div class="nav-header-title">{{ title }}</div>
    <slot name="right"></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()

const emit = defineEmits<{
  (event: 'back'): void
}>()
</script>

<style scoped>
.nav-header {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 12px;
  align-items: center;
  height: 50px;
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
}
</style>
