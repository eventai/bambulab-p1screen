<template>
  <div class="base-sub-page">
    <NavHeader :title="title" @back="router.back">
      <template #right>
        <slot name="right"></slot>
      </template>
    </NavHeader>
    <div class="base-sub-page-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  title: string
}>()

const router = useRouter()
</script>

<style scoped>
.base-sub-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 0 8px;
}

.base-sub-page-content {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
