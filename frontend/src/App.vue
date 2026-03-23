<template>
  <div class="app-shell">
    <aside class="side-nav">
        <RouterLink class="nav-item" to="/home" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <span class="material-symbols-rounded">home</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/controls" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <span class="material-symbols-rounded">discover_tune</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/filament" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <span class="material-symbols-rounded">database</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/settings" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <span class="material-symbols-rounded">settings</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/files" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <span class="material-symbols-rounded">folder</span>
        </RouterLink>
    </aside>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: auto 1fr;
  height: 100%;
  overflow: hidden;
}

.side-nav {
  display: grid;
  padding: 8px;
  padding-left: calc(8px + env(safe-area-inset-left));
  background: var(--van-background-2);
  height: 100%;
  align-items: center;
}

.nav-item {
  width: 48px;
  height: 48px;
  display: grid;
  align-items: center;
  justify-content: center;
  -webkit-user-drag: none;
  user-drag: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.nav-item .material-symbols-rounded {
  color: var(--van-text-color-2);
}

.nav-item.router-link-active .material-symbols-rounded {
  color: var(--van-primary-color);
}

.main {
  height: 100%;
  padding-right: env(safe-area-inset-right);
  overflow: auto;
}
</style>
