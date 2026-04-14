<template>
  <div class="filament-sub-page">
    <NavHeader title="自动续料" @back="router.back" />
    <van-empty description="开发中" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.filament-sub-page {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 8px;
  padding: 8px 12px;
}

:deep(.van-empty__image) {
  opacity: 0.5;
}
</style>
