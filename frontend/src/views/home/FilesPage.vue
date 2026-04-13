<template>
  <div class="files-page">
    <NavHeader title="文件列表" @back="router.back" />
    <van-empty description="开发中" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.files-page {
  display: grid;
}

:deep(.van-empty__image) {
  opacity: 0.5;
}
</style>
