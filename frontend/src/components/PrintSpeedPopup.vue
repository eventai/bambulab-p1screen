<template>
  <BasePopup
    :show="show"
    title="Print Speed"
    @update:show="emit('update:show', $event)"
  >
    <div class="print-speed-buttons">
      <van-button
        v-for="item in buttons"
        :key="item.value"
        class="print-speed-button"
        :plain="(item.value !== value)"
        :type="(item.value === value) ? 'primary' : 'default'"
        size="large"
        @click="handleConfirm(item.value)"
      >
        {{ item.label }}
      </van-button>
    </div>
  </BasePopup>
</template>

<script setup lang="ts">
import { PrintSpeedLevel } from '../api/enums'

type SpeedButton = {
  label: string
  value: PrintSpeedLevel
}

const buttons: SpeedButton[] = [{
  label: 'Ludicrous Mode (166%)',
  value: PrintSpeedLevel.Ludicrous,
}, {
  label: 'Sport Mode (124%)',
  value: PrintSpeedLevel.Sport,
}, {
  label: 'Standard Mode (100%)',
  value: PrintSpeedLevel.Standard,
}, {
  label: 'Silent Mode (50%)',
  value: PrintSpeedLevel.Silent,
}]

withDefaults(
  defineProps<{
    show: boolean
    value?: number
  }>(),
  {
    value: undefined
  }
)

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
  (event: 'confirm', value: number): void
}>()

const handleConfirm = (value: number) => {
  emit('confirm', value)
  emit('update:show', false)
}

</script>

<style scoped>

.print-speed-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 8px;
}

.print-speed-button {
  border-radius: 8px;
  width: 200px;
  margin-bottom: 10px;
}

</style>
