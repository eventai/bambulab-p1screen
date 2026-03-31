<template>
  <div class="heatbed-card">
    <van-button
      class="heatbed-btn"
      type="default"
      size="small"
      :icon="bedUpIcon"
      @click="emitMove('z', -10)"
    >
      10
    </van-button>
    <van-button
      class="heatbed-btn inner"
      type="default"
      size="small"
      :icon="bedUpIcon"
      @click="emitMove('z', -1)"
    >
      1
    </van-button>
    <div class="heatbed-label">热床</div>
    <van-button
      class="heatbed-btn inner"
      type="default"
      size="small"
      :icon="bedDownIcon"
      @click="emitMove('z', 1)"
    >
      1
    </van-button>
    <van-button
      class="heatbed-btn"
      type="default"
      size="small"
      :icon="bedDownIcon"
      @click="emitMove('z', 10)"
    >
      10
    </van-button>
  </div>
</template>

<script setup lang="ts">
import bedUpIcon from '../assets/images/monitor_bed_up.svg'
import bedDownIcon from '../assets/images/monitor_bed_down.svg'

const emit = defineEmits<{
  (event: 'move', axis: 'z', step: -10 | -1 | 1 | 10): void
}>()

const emitMove = (axis: 'z', step: -10 | -1 | 1 | 10) => {
  emit('move', axis, step)
}
</script>

<style scoped>
.heatbed-card {
  background: var(--van-background-2);
  border-radius: 12px;
  padding: 8px;
  display: grid;
  place-items: center;
  grid-template-columns: repeat(5, 1fr);
}

.heatbed-btn {
  border-radius: 10px;
  border: 0;
  font-size: 13px;
  color: var(--van-text-color);
  background: var(--van-background-4);
}

.heatbed-btn.inner {
  background: var(--van-background-3);
}

.heatbed-label {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  min-width: 30px;
}

</style>
