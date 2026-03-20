<template>
  <van-popup :show="show" class="popup" position="right" @click-overlay="handleClose">
    <div class="popup-header">
      <button class="popup-header-back" type="button" @click="handleClose">
        <span class="material-symbols-rounded">arrow_back_ios</span>
      </button>
      <div class="popup-header-title">风扇</div>
    </div>

    <div class="popup-fan-speed-card" v-for:="item in fans" :key="item.type">
      <div>
        <img class="popup-fan-speed-icon" :src="WSService.getInstance().getFanSpeed(item.type) !== 0 ? fanOnIcon : fanOffIcon" />
        <span class="popup-fan-speed-name">{{ item.name }} {{ (WSService.getInstance().getFanSpeed(item.type) / 255 * 100).toFixed(0) }}%</span>
      </div>
      <van-slider v-model="fanSpeeds[item.type].value" @change="(value) => onChange(item.type, value)"/>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { fans } from '../store/device'
import { WSService } from '../store/ws'
import fanOnIcon from '../assets/images/monitor_fan_on.svg'
import fanOffIcon from '../assets/images/monitor_fan_off.svg'
import { ref } from 'vue'

const fanSpeeds = {
  part: ref(WSService.getInstance().getFanSpeed('part')),
  aux: ref(WSService.getInstance().getFanSpeed('aux')),
  chamber: ref(WSService.getInstance().getFanSpeed('chamber'))
}

const props = withDefaults(
  defineProps<{
    show: boolean
  }>(),
  {
  }
)

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
}>()

const handleClose = () => {
  emit('update:show', false)
}

const onChange = (type: 'part' | 'aux' | 'chamber', value: number) => {
  let speed = Math.floor(Number(value) / 100 * 255)
  console.log(`[Controls] setFanSpeed: type=${type}, speed=${speed}`)
  WSService.getInstance().setFanSpeed(type, speed)
}

</script>

<style scoped>

.popup-fan-speed-card {
  background: var(--van-background-5);
  border-radius: 10px;
  max-height: 100px;
}

.popup-fan-speed-card div {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px;
  font-size: 13px;
}

.popup-fan-speed-card .van-slider {
  height: 4px;
  width: 200px;
  margin: 22px;
}

</style>
