<script setup lang="ts">
import { useDisplay } from 'vuetify'
import store from '@/store'
import { NavMenu } from '@layouts/types'

const display = useDisplay()
const appMode = computed(() => {
  return localStorage.getItem('MP_APPMODE') != '0' && display.mdAndDown.value
})

const route = useRoute()

// 各按钮活动状态
const getMenuList = () => {
  return store.state.menu.system.filter((item: NavMenu) => item.enable ?? true).slice(0, 4)
}

const activeIcon: Map<string, string> = new Map([
  ['mdi-home-outline', 'mdi-home'],
  ['mdi-star-outline', 'mdi-star'],
  ['mdi-movie-open-outline', 'mdi-movie-open'],
  ['mdi-television', 'mdi-television-play'],
  ['mdi-dots-horizontal', 'mdi-dots-horizontal-circle'],
])
</script>

<template>
  <!--todo do something -->
  <div v-if="appMode" class="w-100" style="block-size: calc(3.5rem + env(safe-area-inset-bottom))">
    <VBottomNavigation
      grow
      horizontal
      color="primary"
      class="footer-nav border-t"
      style="block-size: calc(3.5rem + env(safe-area-inset-bottom))"
    >
      <VBtn v-for="item in getMenuList()" :to="item.to as string" :ripple="false">
        <VIcon v-if="route.path==item.to" size="28">{{ activeIcon.get(item.icon as string) || item.icon }}</VIcon>
        <VIcon v-else size="28">{{ item.icon }}</VIcon>
      </VBtn>
      <VBtn to="/apps" :ripple="false">
        <VIcon v-if="route.path=='/apps'" size="28">mdi-dots-horizontal-circle</VIcon>
        <VIcon v-else size="28">mdi-dots-horizontal</VIcon>
      </VBtn>
    </VBottomNavigation>
  </div>
</template>

<style lang="scss">
.footer-nav {
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  background-color: rgb(var(--v-theme-surface), 0.8);
  padding-block-end: env(safe-area-inset-bottom);
}

.footer-nav .v-btn--variant-text .v-btn__overlay {
  background-color: transparent !important;
}
</style>
}
