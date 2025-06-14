<script lang="ts" setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import Footer from '@/layouts/components/Footer.vue'
import UserNofification from '@/layouts/components/UserNotification.vue'
import SearchBar from '@/layouts/components/SearchBar.vue'
import ShortcutBar from '@/layouts/components/ShortcutBar.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import { useUserStore } from '@/stores'
import { getNavMenus } from '@/router/i18n-menu'
import { NavMenu } from '@/@layouts/types'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { filterMenusByPermission } from '@/utils/permission'
import { checkUnreadOnStartup } from '@/utils/badge'

const display = useDisplay()
const appMode = inject('pwaMode')
const { t } = useI18n()

// 用户 Store
const userStore = useUserStore()

// 响应式的超级用户状态
const superUser = computed(() => userStore.superUser)

// ShortcutBar 引用
const shortcutBarRef = ref<InstanceType<typeof ShortcutBar> | null>(null)

// 未读消息检查状态
const hasCheckedUnread = ref(false)

// 获取用户权限信息
const userPermissions = computed(() => ({
  is_superuser: userStore.superUser,
  ...userStore.permissions,
}))

// 开始菜单项
const startMenus = ref<NavMenu[]>([])

// 发现菜单项
const discoveryMenus = ref<NavMenu[]>([])

// 订阅菜单项
const subscribeMenus = ref<NavMenu[]>([])

// 整理菜单项
const organizeMenus = ref<NavMenu[]>([])

// 系统菜单项
const systemMenus = ref<NavMenu[]>([])

// 根据分类获取菜单列表
const getMenuList = (header: string) => {
  // 使用国际化菜单
  const menus = getNavMenus()
  const filteredMenus = filterMenusByPermission(menus, userPermissions.value)
  return filteredMenus.filter((item: NavMenu) => item.header === header)
}

// 返回上一页
function goBack() {
  history.back()
}

// 检查未读消息并自动打开消息弹窗
async function checkUnreadMessages() {
  if (!superUser.value || hasCheckedUnread.value) {
    return // 只有超级用户才能看到消息，且每次会话只检查一次
  }

  hasCheckedUnread.value = true

  try {
    const unreadCount = await checkUnreadOnStartup()

    if (unreadCount > 0) {
      // 等待组件完全加载并重试打开消息弹窗
      await waitAndOpenMessageDialog()
    }
  } catch (error) {
    // 静默处理错误
  }
}

// 等待组件准备好并打开消息弹窗
async function waitAndOpenMessageDialog() {
  const maxRetries = 5
  const retryDelay = 1000 // 1秒

  for (let i = 0; i < maxRetries; i++) {
    // 等待一段时间确保组件加载完成
    await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)))

    // 检查ShortcutBar组件是否已经准备好
    if (shortcutBarRef.value && typeof shortcutBarRef.value.openMessageDialog === 'function') {
      shortcutBarRef.value.openMessageDialog()
      return // 成功打开，退出重试循环
    }
  }
}

// 监听用户状态变化
watch(
  superUser,
  newValue => {
    if (newValue && !hasCheckedUnread.value) {
      // 用户状态变为超级用户且还没检查过未读消息时，延迟检查
      setTimeout(() => {
        checkUnreadMessages()
      }, 1000)
    }
  },
  { immediate: true },
)

onMounted(() => {
  // 获取菜单列表
  startMenus.value = getMenuList(t('menu.start'))
  discoveryMenus.value = getMenuList(t('menu.discovery'))
  subscribeMenus.value = getMenuList(t('menu.subscribe'))
  organizeMenus.value = getMenuList(t('menu.organize'))
  systemMenus.value = getMenuList(t('menu.system'))

  // 延迟检查未读消息，确保所有组件都已加载完成
  nextTick(() => {
    setTimeout(() => {
      checkUnreadMessages()
    }, 2000) // 增加延迟时间到2秒
  })
})
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
        <ShortcutBar v-if="superUser" ref="shortcutBarRef" />
        <!-- 👉 Notification -->
        <UserNofification />
        <!-- 👉 UserProfile -->
        <UserProfile />
      </div>
    </template>

    <template #vertical-nav-content>
      <VerticalNavLink v-for="item in startMenus" :item="item" />
      <!-- 👉 发现 -->
      <VerticalNavSectionTitle
        v-if="discoveryMenus.length > 0"
        :item="{
          heading: t('menu.discovery'),
        }"
      />
      <VerticalNavLink v-for="item in discoveryMenus" :item="item" />
      <!-- 👉 订阅 -->
      <VerticalNavSectionTitle
        v-if="subscribeMenus.length > 0"
        :item="{
          heading: t('menu.subscribe'),
        }"
      />
      <VerticalNavLink v-for="item in subscribeMenus" :item="item" />
      <!-- 👉 整理 -->
      <VerticalNavSectionTitle
        v-if="organizeMenus.length > 0"
        :item="{
          heading: t('menu.organize'),
        }"
      />
      <VerticalNavLink v-for="item in organizeMenus" :item="item" />
      <!-- 👉 系统 -->
      <VerticalNavSectionTitle
        v-if="systemMenus.length > 0"
        :item="{
          heading: t('menu.system'),
        }"
      />
      <VerticalNavLink v-for="item in systemMenus" :item="item" />
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
