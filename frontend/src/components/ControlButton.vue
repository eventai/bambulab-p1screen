<template>
  <button class="control-button" type="button" :disabled="disabled" @click="handleClick">
    <img :src="icon" />
    <span :style="{ fontSize }">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">

const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    fontSize?: string
    disabled?: boolean
  }>(),
  {
    fontSize: '14px',
    disabled: false
  }
)

const emit = defineEmits<{
  (event: 'click'): void
}>()

const handleClick = () => {
  if (props.disabled) return
  emit('click')
}
</script>

<style scoped>
.control-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
  background: var(--van-background-3);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  border: 0;
}

.control-button:disabled {
  opacity: 0.6;
  pointer-events: none;
}

.control-button:not(:disabled):active {
  filter: brightness(0.9);
}

.control-button > img {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-button > span {
  text-align: center;
  font-weight: 500;
}

</style>
