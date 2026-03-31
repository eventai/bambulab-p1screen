<template>
  <div class="filament-sub-page">
    <NavHeader title="自动续料" @back="router.back" />
    <div class="filament-sub-page-content">
      <van-empty description="开发中" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import NavHeader from '../components/NavHeader.vue'

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

.filament-sub-page-content {
  border-radius: 10px;
  background: var(--van-background-3);
  display: grid;
  place-items: center;
}
</style>
