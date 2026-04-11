<template>
  <div class="extruder-card">
    <button class="extruder-btn" type="button" @click="emitMove('e', -10)">
      <img src="../assets/images/monitor_extruder_up.svg" />
    </button>
    <div class="extruder-imgs">
      <img src="../assets/images/pipe_of_empty.svg" />
      <img src="../assets/images/single_nozzle_xp.svg" />
    </div>
    <button class="extruder-btn" type="button" @click="emitMove('e', 10)">
      <img src="../assets/images/monitor_extruder_down.svg" />
    </button>
    <div class="extruder-label">挤出机</div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (event: 'move', axis: 'e', step: -10 | 10): void
}>()

const emitMove = (axis: 'e', step: -10 | 10) => {
  emit('move', axis, step)
}
</script>

<style scoped>
.extruder-card {
  background: var(--van-background-2);
  border-radius: 12px;
  padding: 8px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: center;
  justify-items: center;
  text-align: center;
}

.extruder-imgs {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.extruder-imgs img:first-child {
  width: 8px;
  margin-bottom: -2px;
}

.extruder-label {
  font-size: 13px;
  font-weight: 600;
  padding: 24px 0 8px 0;
}

.extruder-btn {
  background: var(--van-background-4);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  width: 40px;
  height: 40px;
}

.extruder-btn:active {
  background: rgba(255, 255, 255, 0.08);
}

</style>
