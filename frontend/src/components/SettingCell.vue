<template>
  <van-cell :title="props.title" :label="props.label">
    <template #icon>
      <van-checkbox shape="square" v-model="selected" v-on:click="emit('click', selected)"></van-checkbox>
    </template>
  </van-cell>
</template>

<script setup lang="tsx">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    label: string
    selected: boolean
  }>(),
  {}
)

const selected = ref(props.selected)

watch(
  () => props.selected,
  (newVal) => {
    selected.value = newVal;
  }
)

const emit = defineEmits<{
  (event: 'click', value: boolean): void
}>()
</script>

<style scoped>
.van-checkbox {
  display: block;
  padding-top: 4px;
  padding-right: 8px;
}
</style>
