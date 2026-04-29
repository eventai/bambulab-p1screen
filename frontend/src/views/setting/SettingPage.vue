<template>
  <BaseSubPage title="Settings">
    <div class="settings-page">
      <van-cell-group inset>
        <van-cell title="Print Options" is-link to="/setting/print-option" />
        <van-cell title="AMS Options" is-link to="/setting/ams-setting" />
      </van-cell-group>

      <van-cell-group inset>
        <van-cell title="Device & Serial Number" :value="getCurrentDevice()?.name" is-link to="/setting/serial" />
      </van-cell-group>

      <van-cell-group inset title="About bambulab-p1screen">
        <van-cell title="Current Version" :value="currentVersion" />
      </van-cell-group>
    </div>
  </BaseSubPage>
</template>

<script setup lang="ts">
import { getCurrentDevice } from '../../utils/device'
const currentVersion = import.meta.env.APP_VERSION
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 12px;
}
</style>
