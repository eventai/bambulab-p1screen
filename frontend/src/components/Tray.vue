<template>
  <van-popover
    v-model:show="showPopover"
    trigger="manual"
    placement="bottom"
    :actions="actions"
    :offset="[0, -32]"
    style="--van-popover-action-width: 80px;"
    @select="handleSelect"
  >
    <template #reference>
      <div class="tray" @click.stop="handleTrayClick">
        <div class="filament" :style="{ '--tray-bg': bgColor }"></div>
        <span class="name" :style="{ color: textColor }">{{ name }}</span>
        <span class="material" :style="{ color: textColor }">{{ material }}</span>
        <span v-if="!readonly" class="icon-edit" :style="{ backgroundColor: textColor}"></span>
        <span v-if="readonly" class="icon-view" :style="{ backgroundColor: textColor}"></span>
      </div>
    </template>
  </van-popover>
</template>

<script setup lang="ts">
import { colord } from 'colord'
import { computed, toRaw, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PopoverAction } from 'vant'
import type { DeviceTray } from '../api/models'
import { PrinterClient } from '../api/PrinterClient'

const client = PrinterClient.getInstance()
const router = useRouter()

const props = withDefaults(
  defineProps<{
    name: string
    amsId: string
    tray?: DeviceTray
  }>(),
  {
  }
)

const showPopover = ref(false)

const actions = computed<PopoverAction[]>(() => {
  const menu: PopoverAction[] = [
    { type: 'edit', text: readonly.value ? '查看' : '编辑' },
    isCurrent.value ? { type: 'unload', text: '退料' } : { type: 'load', text: '进料' },
  ]

  if (isExt.value) {
    menu.push({ type: 'reload', text: '重读' })
  }
  return menu
})

const material = computed(() => props.tray?.tray_type || '?')
const color = computed(() => props.tray ? `#${props.tray.tray_color}` : getComputedStyle(document.documentElement).getPropertyValue('--van-text-color').trim())
const readonly = computed(() => props.tray?.tag_uid !== '0000000000000000')
const isCurrent = computed(() => {
  const trayNow = Number(client.device.print.ams?.tray_now ?? '0')
  const trayId = Number(props.tray?.id ?? '0')
  return (trayNow === 254 && trayId === 254)
    || (Number(props.amsId) * 4 + trayId === trayNow)
})
const isExt = computed(() => Number(props.tray?.id ?? '0') === 254)

const handleTrayClick = () => {
  if (!props.tray) return
  showPopover.value = !showPopover.value
}

const handleSelect = (action: PopoverAction) => {
  console.log('[Tray] type =', action.type, 'amsId = ', props.amsId, ', tray =', toRaw(props.tray))
  showPopover.value = false
  switch (action.type) {
    case 'edit':
      router.push(`/filament/edit/${props.amsId}/${props.tray?.id}`)
      break
    case 'load':
      // client.request('print.ams_change_filament', { ams_id: Number(props.amsId), slot_id: Number(props.tray?.id), curr_temp: -1, tar_temp: -1, target: 0 })
      break
    case 'unload':
      // TODO
      break
    case 'reload':
      client.request('print.ams_get_rfid', { ams_id: Number(props.amsId), slot_id: Number(props.tray?.id) })
      break
    default:
      break
  }
}

const bgColor = computed(() => {
  const parsedColor = colord(color.value)
  return parsedColor.toRgbString()
})

const textColor = computed(() => {
  let parsedColor = colord(bgColor.value)
  if (parsedColor.rgba.a === 0) return 'white'
  return parsedColor.brightness() > 0.5 ? 'black' : 'white'
})

</script>

<style scoped>
.tray {
  display: grid;
  width: 48px;
  height: 64px;
  margin: 8px;
}
.filament {
  width: 48px;
  height: 64px;
  border: var(--van-background-5) 2px solid;
  --tray-bg: var(--van-text-color-2);
  background-image:
    linear-gradient(var(--tray-bg), var(--tray-bg)),
    linear-gradient(45deg, var(--van-background-5) 25%, transparent 25%, transparent 75%, var(--van-background-5) 75%),
    linear-gradient(45deg, var(--van-background-5) 25%, transparent 25%, transparent 75%, var(--van-background-5) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 0, 6px 6px;
}
.filament::before, .filament::after {
  display: block;
  width: 4px;
  height: 130%;
  border-radius: 2px;
  position: relative;
  content: '\0020';
  background-color: var(--van-background-5);
}
.filament::before {
  left: -2px;
  top: -15%;
}
.filament::after {
  left: calc(100% - 2px);
  top: -145%;
}
.tray > span {
  position: relative;
  top: -58px;
  font-weight: 600;
  text-align: center;
}
.tray > .name {
  font-size: 11px;
}
.tray > .material {
  font-size: 12px;
}
.tray > .icon-edit {
  height: 19px;
  margin: 0 15px;
  -webkit-mask-image: url(/src/assets/images/rename_edit.svg);
  mask-image: url(/src/assets/images/rename_edit.svg);
}
.tray > .icon-view {
  height: 19px;
  margin: 0 16px;
  -webkit-mask-image: url(/src/assets/images/ams_readonly.svg);
  mask-image: url(/src/assets/images/ams_readonly.svg);
}
</style>
