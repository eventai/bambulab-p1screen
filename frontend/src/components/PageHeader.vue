<template>
  <div class="page-header">
    <button class="back-btn" type="button" @click="goBack">
      <span class="material-symbols-rounded">arrow_back</span>
    </button>
    <div class="page-title">{{ title }}</div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  title: string
  fallback?: string
}>()

const router = useRouter()
const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else if (props.fallback) {
    router.push(props.fallback)
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-0);
}

.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: #151b22;
  color: var(--text-0);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.back-btn .material-symbols-rounded {
  font-size: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.4px;
}
</style>
