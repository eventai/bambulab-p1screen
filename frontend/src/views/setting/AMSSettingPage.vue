<template>
  <BaseSubPage title="AMS Settings">
    <div v-if="device">
      <SettingCell
        title="Read on Filament Insert"
        label="When filament is inserted, AMS will automatically read the filament info. Takes approximately 20 seconds."
        :selected="tray_read_option"
        @click="onChangeUserSetting('tray_read_option', $event)"
      />
      <SettingCell
        title="Read on Startup"
        label="On every startup, AMS will automatically read the filament info of inserted spools. Takes approximately 1 minute."
        :selected="startup_read_option"
        @click="onChangeUserSetting('startup_read_option', $event)"
      />
      <SettingCell
        title="Remaining Capacity Estimate"
        label="AMS will attempt to estimate the remaining capacity of Bambu Lab official filaments."
        :selected="calibrate_remain_flag"
        @click="onChangeUserSetting('calibrate_remain_flag', $event)"
      />
      <SettingCell
        title="AMS Auto Refill"
        label="AMS will automatically continue printing with a filament of the same brand, type, and color when the current spool runs out."
        :selected="auto_switch_filament"
        @click="onChangePrintOption('auto_switch_filament', $event)"
      />
    </div>
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { onMounted, onUnmounted, ref } from 'vue'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'
import { HomeFlagBit } from '../../api/enums'
import { showToast } from 'vant'

const client = PrinterClient.getInstance()
const device = ref(client.device.print)
const tray_read_option = ref(device.value?.ams.insert_flag === true)
const startup_read_option = ref(device.value?.ams.power_on_flag === true)
const calibrate_remain_flag = ref(Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.calibrate_remain_flag)))
const auto_switch_filament = ref(Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.auto_switch_filament)))

onMounted(() => {
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

const onPushStatus = () => {
  device.value = client.device.print
  tray_read_option.value = device.value?.ams.insert_flag === true
  startup_read_option.value = device.value?.ams.power_on_flag === true
  calibrate_remain_flag.value = Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.calibrate_remain_flag))
  auto_switch_filament.value = Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.auto_switch_filament))
}

const onChangeUserSetting = async (key: string, selected: boolean) => {
  if (!device.value) return
  try {
    const params: any = {
      'ams_id': 0,
      'tray_read_option': device.value.ams.insert_flag,
      'startup_read_option': device.value.ams.power_on_flag,
      'calibrate_remain_flag': Boolean((device.value.home_flag ?? 0) & (1 << HomeFlagBit.calibrate_remain_flag)),
    }
    params[key] = selected
    await client.request('print.ams_user_setting', params)
    showToast({ message: 'Success', position: 'bottom'})
    switch(key) {
      case 'tray_read_option':
        device.value.ams.insert_flag = selected
        break
      case 'startup_read_option':
        device.value.ams.power_on_flag = selected
        break
      case 'calibrate_remain_flag':
        if (selected) {
          device.value.home_flag = device.value.home_flag | (1 << HomeFlagBit.calibrate_remain_flag)
        } else {
          device.value.home_flag = device.value.home_flag & ~(1 << HomeFlagBit.calibrate_remain_flag)
        }
        break
    }
  } catch (error: any) {
    showToast({ message: `Failed: ${error.message}`, position: 'bottom'})
  }
}

const onChangePrintOption = async (key: string, selected: boolean) => {
  try {
    await client.request('print.print_option', { [key]: selected })
    showToast({ message: 'Success', position: 'bottom'})
  } catch (error: any) {
    showToast({ message: `Failed: ${error.message}`, position: 'bottom'})
  }
}

</script>

<style scoped>
.van-checkbox {
  display: block;
  padding-top: 4px;
  padding-right: 8px;
}
</style>
