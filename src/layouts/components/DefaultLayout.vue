<script lang="ts" setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import Footer from '@/layouts/components/Footer.vue'
import UserNofification from '@/layouts/components/UserNotification.vue'
import SearchBar from '@/layouts/components/SearchBar.vue'
import ShortcutBar from '@/layouts/components/ShortcutBar.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import PluginQuickAccess from '@/components/misc/PluginQuickAccess.vue'
import { useUserStore } from '@/stores'
import { getNavMenus } from '@/router/i18n-menu'
import { NavMenu } from '@/@layouts/types'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { filterMenusByPermission } from '@/utils/permission'
import { onUnreadMessage } from '@/utils/badge'

const display = useDisplay()
const appMode = inject('pwaMode')
const { t } = useI18n()

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

// 下拉检测相关状态
const isPulling = ref(false)
const startY = ref(0)
const pullDistance = ref(0)

// 计算页面内容的transform
const contentTransform = computed(() => {
  if (!isPulling.value || pullDistance.value <= 0) return 'translateY(0)'
  // 页面内容的移动距离是下拉距离的30%，提供更自然的阻尼感
  const moveDistance = pullDistance.value * 0.3
  return `translateY(${moveDistance}px)`
})

// 计算页面内容的transition
const contentTransition = computed(() => {
  // 拖拽时不使用transition，松手后使用transition回弹
  return isPulling.value ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
})

// 计算下拉指示器的显示状态
const showPullIndicator = computed(() => {
  return isPulling.value && pullDistance.value > 20
})

// 计算下拉指示器的旋转角度
const indicatorRotation = computed(() => {
  if (!isPulling.value) return 0
  const progress = Math.min(pullDistance.value / 120, 1)
  return progress * 180 // 0到180度的旋转
})

// 计算下拉指示器的透明度
const indicatorOpacity = computed(() => {
  if (!isPulling.value) return 0
  return Math.min(pullDistance.value / 60, 1)
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

// 检查是否在页面顶部
function isAtTop(): boolean {
  return window.scrollY <= 5
}

// 处理触摸开始
function handleTouchStart(event: TouchEvent) {
  if (!appMode || !display.mdAndDown.value || !isAtTop()) return

  const touch = event.touches[0]
  startY.value = touch.clientY
  isPulling.value = false
  pullDistance.value = 0
}

// 处理触摸移动
function handleTouchMove(event: TouchEvent) {
  if (!appMode || !display.mdAndDown.value || !isAtTop()) return

  const touch = event.touches[0]
  const deltaY = touch.clientY - startY.value

  if (deltaY > 0 && isAtTop()) {
    // 向下拖拽且在页面顶部
    isPulling.value = true
    pullDistance.value = Math.min(deltaY * 0.6, 150) // 增加最大距离到150px

    // 阻止默认滚动
    event.preventDefault()
  }
}

// 处理触摸结束
function handleTouchEnd() {
  if (!appMode || !display.mdAndDown.value) return

  if (isPulling.value && pullDistance.value > 120) {
    // 增加触发阈值到120px
    // 触发插件快速访问
    showPluginQuickAccess.value = true
  }

  // 先停止拖拽状态，触发回弹动画
  isPulling.value = false

  // 延迟重置其他状态，让动画完成
  setTimeout(() => {
    pullDistance.value = 0
    startY.value = 0
  }, 300) // 与transition时间匹配
}

// 关闭插件快速访问
function handleClosePluginQuickAccess() {
  showPluginQuickAccess.value = false
}

// 点击插件后关闭
function handlePluginClick() {
  showPluginQuickAccess.value = false
}

// 阻止滚动的函数
function preventScroll(e: TouchEvent) {
  e.preventDefault()
}

// 监听插件快速访问的显示状态，控制背景滚动
watch(showPluginQuickAccess, visible => {
  if (visible) {
    // 显示时锁定背景滚动 - 使用更强的锁定方式
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    document.documentElement.style.overflow = 'hidden'
    // 禁用触摸滚动
    document.addEventListener('touchmove', preventScroll, { passive: false })
  } else {
    // 隐藏时恢复滚动
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
    document.body.style.height = ''
    document.documentElement.style.overflow = ''
    // 恢复触摸滚动
    document.removeEventListener('touchmove', preventScroll)
  }
})

onMounted(() => {
  // 获取菜单列表
  startMenus.value = getMenuList(t('menu.start'))
  discoveryMenus.value = getMenuList(t('menu.discovery'))
  subscribeMenus.value = getMenuList(t('menu.subscribe'))
  organizeMenus.value = getMenuList(t('menu.organize'))
  systemMenus.value = getMenuList(t('menu.system'))

  // 监听全局未读消息事件
  const unsubscribe = onUnreadMessage(handleUnreadMessage)

  // 只在appMode下添加触摸事件监听
  if (appMode && display.mdAndDown.value) {
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
  }

  // 组件卸载时清理监听
  onBeforeUnmount(() => {
    unsubscribe()
    // 恢复body滚动样式
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
    document.body.style.height = ''
    document.documentElement.style.overflow = ''
    document.removeEventListener('touchmove', preventScroll)
    if (appMode && display.mdAndDown.value) {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
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
      transform: `translate(-50%, ${Math.min(pullDistance * 0.5, 50)}px)`,
    }"
  >
    <div
      class="indicator-icon"
      :style="{
        transform: `rotate(${indicatorRotation}deg)`,
      }"
    >
      <VIcon icon="mdi-chevron-down" size="large" :color="pullDistance > 120 ? 'success' : 'primary'" />
    </div>
    <div class="indicator-text">
      {{ pullDistance > 120 ? t('plugin.releaseToOpen') : t('plugin.pullToOpen') }}
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

    <!-- 👉 Pages - 添加下拉跟随动画 -->
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
  <PluginQuickAccess
    v-if="appMode"
    :visible="showPluginQuickAccess"
    :pull-distance="pullDistance"
    @close="handleClosePluginQuickAccess"
    @plugin-click="handlePluginClick"
  />
</template>

<style lang="scss" scoped>
/* 主内容包装器样式 */
.main-content-wrapper {
  /* 在下拉状态下优化渲染性能 */
  backface-visibility: hidden;
  block-size: 100%;

  /* 确保包装器不影响原有布局 */
  inline-size: 100%;

  /* 使用GPU加速来优化动画性能 */
  transform: translateZ(0);
  will-change: transform;
}

/* 下拉指示器样式 */
.pull-indicator {
  position: fixed;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  border-radius: 0;
  backdrop-filter: none;

  /* 完全透明，无背景装饰 */
  background: none;
  box-shadow: none;
  gap: 4px;
  inset-block-start: 64px; /* 紧贴导航栏下方 */
  inset-inline-start: 50%;
  pointer-events: none;
  transform: translateX(-50%);
  transition: opacity 0.2s ease;
}

.indicator-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: none;
  block-size: 28px;
  inline-size: 28px;
  transition: transform 0.2s ease;
}

.indicator-text {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 30%);
  white-space: nowrap;
}
</style>
