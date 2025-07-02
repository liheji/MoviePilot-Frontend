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

const display = useDisplay()
const appMode = inject('pwaMode')
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

// 下拉手势配置常量 (iOS风格)
const PULL_CONFIG = {
  START_THRESHOLD: 20, // 开始下拉的最小距离
  SHOW_INDICATOR: 60, // 显示指示器的距离
  TRIGGER_THRESHOLD: 100, // 触发快速访问的距离
  MAX_PULL_DISTANCE: 200, // 最大下拉距离
  PULL_RESISTANCE: 0.75, // 下拉阻力系数
  CONTENT_FOLLOW_RATIO: 0.4, // 页面内容跟随比例
  TOLERANCE: 80, // 手指抖动容忍度
}

// 下拉检测相关状态
const isPulling = ref(false)
const startY = ref(0)
const pullDistance = ref(0)
const initialScrollTop = ref(0)

// 检查是否有弹窗打开的函数
const hasOpenDialog = () => {
  try {
    // 检查 Vuetify 的各种弹窗组件
    const vuetifyOverlays = document.querySelectorAll('.v-overlay--active:not(.v-overlay--scroll-blocked)')
    const dialogs = document.querySelectorAll('.v-dialog--active')
    const menus = document.querySelectorAll('.v-menu--active')
    const bottomSheets = document.querySelectorAll('.v-bottom-sheet--active')
    const snackbars = document.querySelectorAll('.v-snackbar--active')

    // 检查自定义弹窗元素
    const customDialogs = document.querySelectorAll('[role="dialog"]:not([style*="display: none"])')
    const modalElements = document.querySelectorAll('.modal:not(.d-none):not([style*="display: none"])')

    // 检查具有弹窗特征的元素
    const dialogElements = document.querySelectorAll('[aria-modal="true"]:not([style*="display: none"])')

    // 计算有效的弹窗数量
    let totalDialogs =
      vuetifyOverlays.length +
      dialogs.length +
      menus.length +
      bottomSheets.length +
      snackbars.length +
      customDialogs.length +
      modalElements.length +
      dialogElements.length

    // 如果 QuickAccess 面板打开，不算作阻止下拉的弹窗
    if (showPluginQuickAccess.value) {
      totalDialogs = Math.max(0, totalDialogs - 1)
    }

    return totalDialogs > 0
  } catch (error) {
    console.warn('检测弹窗状态时出错:', error)
    // 出错时保守处理，认为有弹窗打开
    return true
  }
}

// 检查是否可以使用下拉手势
const canUsePullGesture = computed(() => {
  // 检查是否在dashboard页面
  const isDashboard = route.name === 'dashboard' || route.path === '/dashboard'

  // 检查是否是管理员
  const isAdmin = superUser.value

  return isDashboard && isAdmin
})

// 计算页面内容的transform
const contentTransform = computed(() => {
  if (!isPulling.value || pullDistance.value <= 0) return 'translateY(0)'
  // 页面内容跟随下拉距离，使用配置的跟随比例
  const moveDistance = pullDistance.value * PULL_CONFIG.CONTENT_FOLLOW_RATIO
  return `translateY(${moveDistance}px)`
})

// 计算页面内容的transition
const contentTransition = computed(() => {
  // 拖拽时不使用transition，松手后使用transition回弹
  return isPulling.value ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
})

// 计算下拉指示器的显示状态
const showPullIndicator = computed(() => {
  return canUsePullGesture.value && isPulling.value && pullDistance.value >= PULL_CONFIG.SHOW_INDICATOR
})

// 计算下拉指示器的旋转角度
const indicatorRotation = computed(() => {
  if (!isPulling.value) return 0
  // 从显示指示器开始计算旋转，到触发阈值时旋转180度
  const progress = Math.min(
    (pullDistance.value - PULL_CONFIG.SHOW_INDICATOR) / (PULL_CONFIG.TRIGGER_THRESHOLD - PULL_CONFIG.SHOW_INDICATOR),
    1,
  )
  return progress * 180 // 0到180度的旋转
})

// 计算下拉指示器的透明度
const indicatorOpacity = computed(() => {
  if (!isPulling.value) return 0
  // 从显示指示器开始计算透明度
  const progress = Math.min(
    (pullDistance.value - PULL_CONFIG.SHOW_INDICATOR) / (PULL_CONFIG.TRIGGER_THRESHOLD - PULL_CONFIG.SHOW_INDICATOR),
    1,
  )
  return 0.7 + progress * 0.3 // 0.7到1.0的透明度
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

// 处理触摸开始
function handleTouchStart(event: TouchEvent) {
  if (!appMode || !display.mdAndDown.value) return

  // 检查是否满足下拉手势的条件
  if (!canUsePullGesture.value) return

  // 实时检查是否有弹窗打开
  if (hasOpenDialog()) return

  // 如果插件快速访问面板已显示，不处理下拉手势
  if (showPluginQuickAccess.value) return

  const touch = event.touches[0]
  startY.value = touch.clientY

  // 重置下拉状态，但不立即阻止滚动
  isPulling.value = false
  pullDistance.value = 0

  // 记录开始时的滚动位置，用于更准确的判断
  initialScrollTop.value = window.scrollY || document.documentElement.scrollTop || 0
}

// 处理触摸移动
function handleTouchMove(event: TouchEvent) {
  if (!appMode || !display.mdAndDown.value) return

  // 检查是否满足下拉手势的条件
  if (!canUsePullGesture.value) return

  // 实时检查是否有弹窗打开
  if (hasOpenDialog()) {
    // 如果检测到弹窗打开，立即停止下拉
    isPulling.value = false
    pullDistance.value = 0
    return
  }

  // 如果插件快速访问面板已显示，不处理下拉手势
  if (showPluginQuickAccess.value) return

  const touch = event.touches[0]
  const deltaY = touch.clientY - startY.value

  // 如果已经开始下拉，继续保持下拉状态，避免中途中断
  if (isPulling.value) {
    // 继续下拉，但要确保是向下移动
    if (deltaY > -PULL_CONFIG.TOLERANCE) {
      // 允许轻微的向上偏移，避免手指抖动导致中断
      pullDistance.value = Math.max(0, Math.min(deltaY * PULL_CONFIG.PULL_RESISTANCE, PULL_CONFIG.MAX_PULL_DISTANCE))
      // 阻止默认滚动行为
      event.preventDefault()
    } else {
      // 如果向上移动超过容忍度，停止下拉
      isPulling.value = false
      pullDistance.value = 0
    }
  } else {
    // 还没开始下拉，检查是否应该开始
    if (deltaY > PULL_CONFIG.START_THRESHOLD) {
      // 检查当前的滚动位置
      const currentScrollTop = window.scrollY || document.documentElement.scrollTop || 0

      // 必须同时满足：1. 向下拖拽超过阈值  2. 当前在页面顶部  3. 从顶部开始拖拽
      if (currentScrollTop <= 100 && initialScrollTop.value <= 100) {
        // 向下拖拽且在页面顶部附近，开始下拉
        isPulling.value = true
        pullDistance.value = Math.min(deltaY * PULL_CONFIG.PULL_RESISTANCE, PULL_CONFIG.MAX_PULL_DISTANCE)
        // 阻止默认滚动
        event.preventDefault()
      }
    }
  }
}

// 处理触摸结束
function handleTouchEnd() {
  if (!appMode || !display.mdAndDown.value) return

  // 检查是否满足下拉手势的条件
  if (!canUsePullGesture.value) return

  // 实时检查是否有弹窗打开
  if (hasOpenDialog()) {
    // 如果检测到弹窗打开，立即停止下拉并重置状态
    isPulling.value = false
    pullDistance.value = 0
    startY.value = 0
    return
  }

  // 如果插件快速访问面板已显示，不处理下拉手势
  if (showPluginQuickAccess.value) return

  if (isPulling.value && pullDistance.value >= PULL_CONFIG.TRIGGER_THRESHOLD) {
    // 达到触发阈值，触发插件快速访问
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

// 保存页面滚动位置
let scrollPosition = 0

// 监听插件快速访问的显示状态，控制背景滚动
watch(showPluginQuickAccess, visible => {
  if (visible) {
    // 保存当前滚动位置
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0

    // 显示时锁定背景滚动
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollPosition}px`
    document.body.style.width = '100%'
    document.documentElement.style.overflow = 'hidden'
  } else {
    // 隐藏时恢复滚动
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    document.documentElement.style.overflow = ''

    // 恢复滚动位置
    window.scrollTo(0, scrollPosition)
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
    document.body.style.top = ''
    document.body.style.width = ''
    document.documentElement.style.overflow = ''
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
      transform: `translate(-50%, ${Math.min((pullDistance - PULL_CONFIG.SHOW_INDICATOR) * 0.5, 40)}px)`,
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
