<template>
  <div class="msg-page">
    <van-empty description="开发中" />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.msg-page {
  display: grid;
  height: 100%;
}

:deep(.van-empty__image) {
  opacity: 0.5;
}
</style>
