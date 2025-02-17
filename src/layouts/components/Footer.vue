<script setup lang="ts">
import { SystemNavMenus } from '@/router/menu'
import { useDisplay } from 'vuetify'

const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

const route = useRoute()

const moreMenuDialog = ref(false)

const moreMemus = computed(() => SystemNavMenus.filter(menu => !menu.footer))

const activeState = computed(() => {
  return {
    home: route.path === '/dashboard',
    recommend: route.path === '/recommend',
    movie: route.path === '/subscribe/movie',
    tv: route.path === '/subscribe/tv',
  }
})

const currentPath = computed(() => route.path)

const toggleMoreMenu = () => {
  moreMenuDialog.value = !moreMenuDialog.value
}
</script>

<template>
  <div v-if="appMode" class="w-100" style="block-size: calc(3.5rem + env(safe-area-inset-bottom))">
    <VBottomNavigation
      grow
      horizontal
      color="primary"
      class="footer-nav border-t"
      style="block-size: calc(3.5rem + env(safe-area-inset-bottom))"
      :z-index="9998"
    >
      <VBtn to="/dashboard" :ripple="false">
        <VIcon v-if="activeState.home" size="28">mdi-home</VIcon>
        <VIcon v-else size="28">mdi-home-outline</VIcon>
      </VBtn>
      <VBtn to="/recommend" :ripple="false">
        <VIcon v-if="activeState.recommend" size="28">mdi-star</VIcon>
        <VIcon v-else size="28">mdi-star-outline</VIcon>
      </VBtn>
      <VBtn to="/subscribe/movie" :ripple="false">
        <VIcon v-if="activeState.movie" size="28">mdi-movie-open</VIcon>
        <VIcon v-else size="28">mdi-movie-open-outline</VIcon>
      </VBtn>
      <VBtn to="/subscribe/tv" :ripple="false">
        <VIcon v-if="activeState.tv" size="28">mdi-television-play</VIcon>
        <VIcon v-else size="28">mdi-television</VIcon>
      </VBtn>
      <VBtn @click="toggleMoreMenu" :ripple="false">
        <VIcon
          size="28"
          :icon="moreMenuDialog ? 'mdi-close' : 'mdi-dots-horizontal'"
          :color="moreMenuDialog ? 'primary' : ''"
        />
      </VBtn>
    </VBottomNavigation>
    <VBottomSheet
      v-if="moreMenuDialog"
      v-model="moreMenuDialog"
      inset
      close-on-content-click
      :scrim="false"
      style="margin-bottom: calc(3.5rem + env(safe-area-inset-bottom))"
      content-class="elevation-0"
    >
      <VDivider />
      <VList class="font-bold" lines="one">
        <VListSubheader class="bg-transparent"> 更多 </VListSubheader>
        <VListItem
          v-for="(menu, index) in moreMemus"
          :key="index"
          :prepend-icon="menu.icon"
          nav
          :to="menu.to"
          :base-color="currentPath === menu.to ? 'primary' : undefined"
        >
          <VListItemTitle>
            <span class="text-lg">{{ menu.title }}</span>
          </VListItemTitle>
        </VListItem>
      </VList>
    </VBottomSheet>
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
