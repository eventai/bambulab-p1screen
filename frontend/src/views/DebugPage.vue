<template>
  <div class="debug-page">
    <van-button size="small" @click="handleConnect">重连WebSocket</van-button>
  </div>
</template>

<script setup lang="ts">
import { WSService } from '../store/ws'

const handleConnect = () => {
  WSService.getInstance().connect()
}

</script>

<style scoped>
.debug-page {
  padding: 8px;
}
</style>
