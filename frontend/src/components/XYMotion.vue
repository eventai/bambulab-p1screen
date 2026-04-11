<template>
  <div class="control-dial">
    <div class="axis-dial">
      <div class="axis-ring">
        <div class="axis-segments">
          <button class="axis-seg tl" type="button" @click="emitMove('y', 10)"></button>
          <button class="axis-seg tr" type="button" @click="emitMove('x', 10)"></button>
          <button class="axis-seg br" type="button" @click="emitMove('y', -10)"></button>
          <button class="axis-seg bl" type="button" @click="emitMove('x', -10)"></button>
        </div>
      </div>
      <div class="axis-ring inner">
        <div class="axis-segments">
          <button class="axis-seg tl" type="button" @click="emitMove('y', 1)"></button>
          <button class="axis-seg tr" type="button" @click="emitMove('x', 1)"></button>
          <button class="axis-seg br" type="button" @click="emitMove('y', -1)"></button>
          <button class="axis-seg bl" type="button" @click="emitMove('x', -1)"></button>
        </div>
      </div>
      <div class="axis-label-outer y">Y</div>
      <div class="axis-label-outer x">X</div>
      <div class="axis-label-outer ny">-Y</div>
      <div class="axis-label-outer nx">-X</div>
      <div class="axis-label-inner plus10">+10</div>
      <div class="axis-label-inner plus1">+1</div>
      <div class="axis-label-inner minus1">-1</div>
      <div class="axis-label-inner minus10">-10</div>
    </div>
    <button class="axis-home" @click="emitMove('home', 0)"></button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (event: 'move', axis: 'home' | 'x' | 'y', step: -10 | -1 | 0 | 1 | 10): void
}>()

const emitMove = (axis: 'home' | 'x' | 'y', step: -10 | -1 | 0 | 1 | 10) => {
  emit('move', axis, step)
}
</script>

<style scoped>
.control-dial {
  background: var(--van-background-2);
  border-radius: 12px;
  display: grid;
  place-items: center;
  position: relative;
}

.axis-dial {
  width: 82%;
  height: 0;
  padding-top: 82%;
  margin: 8px;
  position: relative;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.axis-ring {
  position: absolute;
  inset: 0;
}

.axis-ring.inner {
  inset: 20%;
}

.axis-segments {
  position: absolute;
  inset: 0;
  transform: rotate(45deg);
}

.axis-seg {
  border: 0;
  padding: 0;
  position: absolute;
  width: 50%;
  height: 50%;
  background: var(--van-background-4);
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.axis-ring.inner .axis-seg {
  background: var(--van-background-3);
}

.axis-seg.tl {
  top: -4px;
  left: -4px;
  border-radius: 100% 0 0 0;
}

.axis-seg.tr {
  top: -4px;
  right: -4px;
  border-radius: 0 100% 0 0;
}

.axis-seg.br {
  bottom: -4px;
  right: -4px;
  border-radius: 0 0 100% 0;
}

.axis-seg.bl {
  bottom: -4px;
  left: -4px;
  border-radius: 0 0 0 100%;
}

.axis-label-outer {
  position: absolute;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
}

.axis-label-outer.y {
  top: 6%;
  left: 50%;
  transform: translateX(-50%);
}

.axis-label-outer.x {
  right: 6%;
  top: 50%;
  transform: translateY(-50%);
}

.axis-label-outer.ny {
  bottom: 6%;
  left: 50%;
  transform: translateX(-50%);
}

.axis-label-outer.nx {
  left: 6%;
  top: 50%;
  transform: translateY(-50%);
}

.axis-label-inner {
  position: absolute;
  font-size: 12px;
  font-weight: 600;
  color: var(--van-text-color-2);
  pointer-events: none;
  top: calc(50% + var(--y));
  left: calc(50% + var(--x));
  transform: translate(-50%, -50%) rotate(45deg);
}

.axis-label-inner.plus10 {
  --x: 34%;
  --y: -26%;
}

.axis-label-inner.plus1 {
  --x: 16%;
  --y: -10%;
}

.axis-label-inner.minus1 {
  --x: -16%;
  --y: 10%;
  padding-left: 16%;
}

.axis-label-inner.minus10 {
  --x: -34%;
  --y: 26%;
  padding-left: 23%;
}

.axis-home {
  width: 22%;
  height: 0;
  padding-top: 22%;
  position: absolute;
  border-radius: 40%;
  border-width: 0;
  display: grid;
  place-items: center;
  z-index: 3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  color: var(--van-primary-color);
  background: var(--van-background-4);
  background-image: url(../assets/images/monitor_axis_home.svg);
  background-repeat: no-repeat;
  background-position: center;
}

.axis-seg:active, .axis-home:active {
  filter: brightness(0.9);
}

</style>
