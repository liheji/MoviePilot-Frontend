<script lang="ts" setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import Footer from '@/layouts/components/Footer.vue'
import UserNofification from '@/layouts/components/UserNotification.vue'
import SearchBar from '@/layouts/components/SearchBar.vue'
import ShortcutBar from '@/layouts/components/ShortcutBar.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import QuickAccess from '@/layouts/components/QuickAccess.vue'
import { useUserStore } from '@/stores'
import { getNavMenus } from '@/router/i18n-menu'
import { NavMenu } from '@/@layouts/types'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { filterMenusByPermission } from '@/utils/permission'
import { onUnreadMessage } from '@/utils/badge'
import { usePullDownGesture } from '@/composables/usePullDownGesture'
import { useScrollLockWithWatch } from '@/composables/useScrollLock'
import { usePWA } from '@/composables/usePWA'

const display = useDisplay()
// PWA模式检测
const { appMode } = usePWA()
const { t } = useI18n()
const route = useRoute()

// 用户 Store
const userStore = useUserStore()

// 响应式的超级用户状态
const superUser = computed(() => userStore.superUser)

// ShortcutBar 引用
const shortcutBarRef = ref<InstanceType<typeof ShortcutBar> | null>(null)

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

// 插件快速访问相关状态
const showPluginQuickAccess = ref(false)

// 使用滚动锁定 composable（自动监听showPluginQuickAccess的变化）
useScrollLockWithWatch(showPluginQuickAccess)

// 检查是否可以使用下拉手势
const canUsePullGesture = () => {
  // 检查是否在dashboard页面
  const isDashboard = route.name === 'dashboard' || route.path === '/dashboard'
  // 检查是否是管理员
  const isAdmin = superUser.value
  // 检查插件快速访问面板是否已显示
  const quickAccessOpen = showPluginQuickAccess.value

  return isDashboard && isAdmin && !quickAccessOpen
}

// 使用下拉手势 composable
const {
  pullDistance,
  contentTransform,
  contentTransition,
  showPullIndicator,
  indicatorRotation,
  indicatorOpacity,
  indicatorTransform,
  config: PULL_CONFIG,
} = usePullDownGesture({
  enabled: true,
  canUsePullGesture,
  onTrigger: () => {
    showPluginQuickAccess.value = true
  },
})

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

// 处理未读消息事件
function handleUnreadMessage(count: number) {
  if (superUser.value && count > 0) {
    // 延迟一点时间确保组件已渲染
    setTimeout(() => {
      if (shortcutBarRef.value && typeof shortcutBarRef.value.openMessageDialog === 'function') {
        shortcutBarRef.value.openMessageDialog()
      }
    }, 500)
  }
}

// 关闭插件快速访问
function handleClosePluginQuickAccess() {
  showPluginQuickAccess.value = false
}

// 点击插件后关闭
function handlePluginClick() {
  showPluginQuickAccess.value = false
}

onMounted(() => {
  // 获取菜单列表
  startMenus.value = getMenuList(t('menu.start'))
  discoveryMenus.value = getMenuList(t('menu.discovery'))
  subscribeMenus.value = getMenuList(t('menu.subscribe'))
  organizeMenus.value = getMenuList(t('menu.organize'))
  systemMenus.value = getMenuList(t('menu.system'))

  // 监听全局未读消息事件
  const unsubscribe = onUnreadMessage(handleUnreadMessage)

  // 组件卸载时清理监听
  onBeforeUnmount(() => {
    unsubscribe()
  })
})
</script>

<template>
  <!-- 👉 Pull Down Indicator -->
  <div
    v-if="appMode && showPullIndicator"
    class="pull-indicator"
    :style="{
      opacity: indicatorOpacity,
      transform: indicatorTransform,
    }"
  >
    <div
      class="indicator-icon"
      :style="{
        transform: `scale(${
          1 + Math.min((pullDistance - PULL_CONFIG.SHOW_INDICATOR) / PULL_CONFIG.MAX_PULL_DISTANCE, 0.5) * 0.3
        }) rotate(${indicatorRotation}deg)`,
      }"
    >
      <VIcon
        icon="mdi-gesture-swipe-down"
        size="24"
        :color="pullDistance >= PULL_CONFIG.TRIGGER_THRESHOLD ? 'success' : 'primary'"
      />
    </div>
  </div>
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

    <!-- 👉 下拉跟随动画 -->
    <div
      class="main-content-wrapper"
      :style="{
        transform: contentTransform,
        transition: contentTransition,
      }"
    >
      <slot />
    </div>

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </VerticalNavLayout>

  <!-- 👉 Plugin Quick Access -->
  <QuickAccess
    v-if="appMode"
    :visible="showPluginQuickAccess"
    :pull-distance="pullDistance"
    @close="handleClosePluginQuickAccess"
    @plugin-click="handlePluginClick"
  />
</template>

<style lang="scss" scoped>
.main-content-wrapper {
  backface-visibility: hidden;
  block-size: 100%;
  inline-size: 100%;
  transform: translateZ(0);
  will-change: transform;
}

.pull-indicator {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 50%;
  backdrop-filter: blur(20px);
  background: rgba(var(--v-theme-surface), 0.3);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 10%), 0 1px 3px rgba(0, 0, 0, 6%);
  inset-block-start: 80px;
  inset-inline-start: 50%;
  pointer-events: none;
  transform: translateX(-50%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.indicator-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.08);
  block-size: 40px;
  inline-size: 40px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 透明主题适配 */
html[class*='transparent'] .pull-indicator,
html[class*='mica'] .pull-indicator,
html[class*='acrylic'] .pull-indicator {
  border: 1px solid rgba(255, 255, 255, 20%);
  background: rgba(255, 255, 255, 95%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 12%), 0 4px 16px rgba(0, 0, 0, 8%);
}

html[class*='transparent'] .indicator-icon,
html[class*='mica'] .indicator-icon,
html[class*='acrylic'] .indicator-icon {
  background: rgba(var(--v-theme-primary), 0.12);
}

html[data-theme='dark'][class*='transparent'] .pull-indicator,
html[data-theme='dark'][class*='mica'] .pull-indicator,
html[data-theme='dark'][class*='acrylic'] .pull-indicator {
  border: 1px solid rgba(255, 255, 255, 10%);
  background: rgba(18, 18, 18, 95%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 30%), 0 4px 16px rgba(0, 0, 0, 20%);
}

html[data-theme='dark'][class*='transparent'] .indicator-icon,
html[data-theme='dark'][class*='mica'] .indicator-icon,
html[data-theme='dark'][class*='acrylic'] .indicator-icon {
  background: rgba(var(--v-theme-primary), 0.15);
}
</style>
