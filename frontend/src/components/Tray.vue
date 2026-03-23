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
        <div class="filament" :style="{ backgroundColor: bgColor }"></div>
        <span class="name" :style="{ color: textColor }">{{ name }}</span>
        <span class="material" :style="{ color: textColor }">{{ material }}</span>
        <span class="icon" :style="{ backgroundColor: textColor}"></span>
      </div>
    </template>
  </van-popover>
</template>

<script setup lang="ts">
import { colord } from 'colord'
import { computed, toRaw, ref } from 'vue'
import type { PopoverAction } from 'vant'
import type { DeviceTray } from '../services/device'

const props = withDefaults(
  defineProps<{
    name: string
    tray?: DeviceTray
  }>(),
  {
  }
)

const showPopover = ref(false)

const actions = computed<PopoverAction[]>(() => {
  const menu: PopoverAction[] = [
    { type: 'edit', text: '编辑' },
    { type: 'load', text: '进料' },
  ]
  if (Number(props.tray?.id) !== 254) {
    menu.push({ type: 'reload', text: '重读' })
  }
  return menu
})

const material = computed(() => props.tray?.tray_type || '?')
const color = computed(() => props.tray?.tray_color ? `#${props.tray.tray_color}` : '')

const handleTrayClick = () => {
  if (!props.tray) return
  showPopover.value = !showPopover.value
}

const handleSelect = (action: PopoverAction) => {
  console.log('[Tray] type =', action.type, ', tray =', toRaw(props.tray))
  showPopover.value = false
}

const bgColor = computed(() => {
  if (color.value === '') {
    return getComputedStyle(document.documentElement).getPropertyValue('--van-text-color').trim()
  }
  // fix vt_tray wrong alpha
  const parsedColor = colord(color.value)
  parsedColor.rgba.a = 1
  return parsedColor.toRgbString()
})

const textColor = computed(() => {
  const parsedColor = colord(bgColor.value)
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
  background-color: var(--van-text-color-2);
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
.tray > .icon {
  height: 18px;
  margin: 0 15px;
  -webkit-mask-image: url(/src/assets/images/rename_edit.svg);
  mask-image: url(/src/assets/images/rename_edit.svg);
}
</style>
