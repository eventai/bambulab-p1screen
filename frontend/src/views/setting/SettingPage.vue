<template>
  <BaseSubPage title="设置">
    <div class="settings-page">
      <van-cell-group inset>
        <van-cell title="打印选项" is-link to="/setting/print-option" />
        <van-cell title="AMS 选项" is-link to="/setting/ams-setting" />
      </van-cell-group>

      <van-cell-group inset>
        <van-cell title="设备和序列号" :value="getCurrentDevice()?.name" is-link to="/setting/serial" />
      </van-cell-group>

      <van-cell-group inset title="关于 bambulab-p1screen">
        <van-cell title="当前版本" :value="currentVersion" />
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
