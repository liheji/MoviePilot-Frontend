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
import HeaderTab from '@/layouts/components/HeaderTab.vue'
import { useUserStore } from '@/stores'
import { getNavMenus } from '@/router/i18n-menu'
import { NavMenu } from '@/@layouts/types'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { filterMenusByPermission } from '@/utils/permission'
import { onUnreadMessage } from '@/utils/badge'
import { usePullDownGesture } from '@/composables/usePullDownGesture'
import { usePWA } from '@/composables/usePWA'
import OfflinePage from '@/layouts/components/OfflinePage.vue'
import { useGlobalOfflineStatus } from '@/composables/useOfflineStatus'

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

// 离线状态管理
const { setAppOffline, isOffline } = useGlobalOfflineStatus()

// 动态标签页相关
// 定义动态标签页类型
interface DynamicHeaderTab {
  items: Array<{ title: string; icon: string; tab: string }>
  modelValue: string
  appendButtons?: Array<{
    icon: string
    color?: string | ComputedRef<string>
    variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain'
    size?: string
    class?: string
    action?: () => void
    show?: boolean | ComputedRef<boolean>
    dataAttr?: string
  }>
  routePath?: string // 用于标识哪个路由注册的
  onUpdateModelValue?: (value: string) => void // 用于通知值更新
}

// 提供动态标签页注册和获取的方法
const dynamicHeaderTab = ref<DynamicHeaderTab | null>(null)

// 提供一个方法让其他组件注册动态标签页
const registerDynamicHeaderTab = (tab: DynamicHeaderTab) => {
  // 保存注册标签页的路由路径
  tab.routePath = route.path
  // 强制更新，确保响应式系统能检测到变化
  dynamicHeaderTab.value = { ...tab }
}

// 提供一个方法让其他组件取消注册动态标签页
const unregisterDynamicHeaderTab = () => {
  dynamicHeaderTab.value = null
}

// 标签页值更新处理
const handleTabChange = (newValue: string) => {
  if (dynamicHeaderTab.value) {
    dynamicHeaderTab.value.modelValue = newValue
    // 通知注册的页面更新值
    if (dynamicHeaderTab.value.onUpdateModelValue) {
      dynamicHeaderTab.value.onUpdateModelValue(newValue)
    }
  }
}

// 添加全局注册方法，解决注入不可用的问题
if (typeof window !== 'undefined') {
  // 确保在浏览器环境中
  ;(window as any).__VUE_INJECT_DYNAMIC_HEADER_TAB__ = registerDynamicHeaderTab
}

// 提供给其他组件使用
provide('registerDynamicHeaderTab', registerDynamicHeaderTab)
provide('unregisterDynamicHeaderTab', unregisterDynamicHeaderTab)

// 监听路由变化来清除动态标签页
watch(
  () => route.path,
  () => {
    // 使用nextTick确保新页面的组件已经挂载完成
    nextTick(() => {
      // 如果当前标签页不属于新路由，则清除
      if (dynamicHeaderTab.value && dynamicHeaderTab.value.routePath !== route.path) {
        dynamicHeaderTab.value = null
      }
    })
  },
  { immediate: false },
)

// 显示动态标签页
const showDynamicHeaderTab = computed(() => {
  return (
    dynamicHeaderTab.value && dynamicHeaderTab.value.items.length > 0 && dynamicHeaderTab.value.routePath === route.path
  )
})

// 在组件销毁时清理
onUnmounted(() => {
  dynamicHeaderTab.value = null
  // 清理全局方法
  if (typeof window !== 'undefined') {
    delete (window as any).__VUE_INJECT_DYNAMIC_HEADER_TAB__
  }
})

// 监听Service Worker消息
const handleServiceWorkerMessage = (event: MessageEvent) => {
  if (event.data && event.data.type === 'OFFLINE_STATUS') {
    if (event.data.offline) {
      setAppOffline(true, t('common.serverConnectionFailed'))
    } else {
      setAppOffline(false)
    }
  }
}

// 检查是否可以使用下拉手势
const canUsePullGesture = () => {
  // 检查是否在dashboard页面
  const isDashboard = route.path === '/dashboard' || route.path === '/'
  // 检查是否是管理员
  const isAdmin = superUser.value
  // 检查插件快速访问面板是否已显示
  const quickAccessOpen = showPluginQuickAccess.value
  // 检查是否离线
  const offline = isOffline.value

  return isDashboard && isAdmin && !quickAccessOpen && !offline
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

  // 监听Service Worker消息
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
  }

  // 组件卸载时清理监听
  onBeforeUnmount(() => {
    unsubscribe()
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
    }
  })
})
</script>

<template>
  <!-- 👉 Offline Page -->
  <OfflinePage />

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
  <VerticalNavLayout :style="{ '--navbar-tab-height': showDynamicHeaderTab ? '2.5rem' : '0px' }">
    <!-- 👉 Navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-14 align-center mx-1">
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

    <!-- 👉 Dynamic Header Tab -->
    <template #dynamic-header-tab>
      <div v-if="showDynamicHeaderTab">
        <HeaderTab
          :items="dynamicHeaderTab!.items"
          :model-value="dynamicHeaderTab!.modelValue"
          @update:model-value="handleTabChange"
        >
          <template #append>
            <template v-for="button in dynamicHeaderTab!.appendButtons" :key="button.icon">
              <VBtn
                v-if="typeof button.show === 'boolean' ? button.show !== false : (button.show as any)?.value !== false"
                :icon="button.icon"
                :variant="button.variant || 'text'"
                :color="typeof button.color === 'string' ? button.color : (button.color as any)?.value || 'gray'"
                :size="button.size || 'default'"
                :class="button.class || 'settings-icon-button'"
                :data-menu-activator="button.dataAttr"
                @click="button.action"
              />
            </template>
          </template>
        </HeaderTab>
      </div>
    </template>

    <!-- 👉 下拉跟随动画 -->
    <div
      class="main-content-wrapper"
      :style="{
        transform: contentTransform,
        transition: contentTransition,
        paddingTop: showDynamicHeaderTab ? '3rem' : '0px',
      }"
    >
      <slot />
    </div>

    <!-- 👉 Footer -->
    <template #footer>
      <Footer :show-nav="!showPluginQuickAccess" />
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
