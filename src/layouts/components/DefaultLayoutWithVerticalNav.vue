<script lang="ts" setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserNofification from '@/layouts/components/UserNotification.vue'
import SearchBar from '@/layouts/components/SearchBar.vue'
import ShortcutBar from '@/layouts/components/ShortcutBar.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import store from '@/store'
import { NavMenu } from '@/@layouts/types'
import { useDisplay } from 'vuetify'

const display = useDisplay()
const appMode = computed(() => {
  return localStorage.getItem('MP_APPMODE') != '0' && display.mdAndDown.value
})

// 从Vuex Store中获取superuser信息
const superUser = store.state.auth.superUser

// 从Vuex Store中获取菜单信息
const systemMenu = ref(store.state.menu.systemMenu)

// 计算属性，获取菜单
watch(() => store.state.menu.systemMenu, (newValue): void => {
  systemMenu.value = newValue
}, { deep: true })

// 根据分类获取菜单列表
const getHeaderList = () => {
  return new Set(systemMenu.value.filter((item: NavMenu) => item.enable ?? true).map((item: NavMenu) => item.header))
}

// 根据分类获取菜单列表
const getMenuList = (header: string) => {
  return systemMenu.value.filter((item: NavMenu) => item.enable ?? true).filter((item: NavMenu) => item.header === header && (!item.admin || superUser))
}

// 返回上一页
function goBack() {
  history.back()
}
</script>

<template>
  <VerticalNavLayout>
    <!-- 👉 Navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center mx-1">
        <!-- 👉 Vertical Nav Toggle -->
        <IconBtn v-if="!appMode && display.mdAndDown.value" class="ms-n2" @click="toggleVerticalOverlayNavActive(true)">
          <VIcon icon="mdi-menu" />
        </IconBtn>
        <!-- 👉 Back Button -->
        <IconBtn v-if="appMode" class="ms-n2" @click="goBack">
          <VIcon icon="mdi-arrow-left" size="32" />
        </IconBtn>
        <!-- 👉 Search Bar -->
        <SearchBar />
        <!-- 👉 Spacer -->
        <VSpacer />
        <!-- 👉 Shortcuts -->
        <ShortcutBar v-if="superUser" />
        <!-- 👉 Theme -->
        <NavbarThemeSwitcher />
        <!-- 👉 Notification -->
        <UserNofification />
        <!-- 👉 UserProfile -->
        <UserProfile />
      </div>
    </template>

    <template #vertical-nav-content>
      <template v-for="(header, index) in getHeaderList()">
        <VerticalNavSectionTitle
          v-if="index > 0"
          :item="{ heading: header}"
        />
        <VerticalNavLink v-for="item in getMenuList(header)" :item="item" />
      </template>
    </template>

    <template #after-vertical-nav-items />
    <!-- 👉 Pages -->
    <slot />
    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </VerticalNavLayout>
</template>

<style lang="scss" scoped>
.meta-key {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  block-size: 1.5625rem;
  line-height: 1.3125rem;
  padding-block: 0.125rem;
  padding-inline: 0.25rem;
}
</style>
