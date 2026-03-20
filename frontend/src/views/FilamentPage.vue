<template>
  <div class="filament-page">
    <div class="ext-card">
      <Tray />
    </div>
    <div class="ams-cards">
      <AMS ams-id="0" />
      <!-- <AMS ams-id="0" /> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import AMS from '../components/AMS.vue'
import Tray from '../components/Tray.vue'
</script>

<style scoped>
.filament-page {
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
}
.ext-card {
  padding: 60px 20px;
  border-right: var(--van-background-4) 2px dotted;
}
.ext-card .tray {
  position: relative;
  top: -8px;
}
.ams-cards {
  flex: 1;
  width: auto;
  height: 100%;
  display: grid;
  align-items: center;
  padding: 20px 16px;
}
</style>
