<template>
  <div class="files-page">
    <van-empty description="开发中" />
  </div>
</template>

<style scoped>
.files-page {
  height: 100%;
  display: grid;
  place-items: center;
}

:deep(.van-empty__image) {
  opacity: 0.5;
}
</style>
