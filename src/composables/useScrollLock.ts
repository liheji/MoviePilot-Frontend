import { ref, watch, onBeforeUnmount, readonly } from 'vue'

/**
 * 滚动锁定 Composable
 *
 * 使用示例：
 *
 * // 基本用法
 * const { isLocked, lockScroll, restoreScroll } = useScrollLock()
 *
 * // 带配置的用法
 * const { isLocked, lockScroll, restoreScroll } = useScrollLock({
 *   preventTouchScroll: true,
 *   preserveScrollPosition: true,
 *   allowScrollSelectors: ['.my-modal', '.scrollable-content'],
 *   allowScrollContainerSelectors: ['.modal-content'],
 *   customScrollCheck: (element) => {
 *     // 自定义逻辑
 *     return element.classList.contains('allow-scroll')
 *   }
 * })
 *
 * // 自动监听版本
 * const { isLocked, lockScroll, restoreScroll } = useScrollLockWithWatch(
 *   showModal, // 响应式布尔值
 *   {
 *     allowScrollSelectors: ['.modal-content'],
 *     allowScrollContainerSelectors: ['.scrollable-area']
 *   }
 * )
 */

// 滚动锁定配置
export interface ScrollLockOptions {
  // 是否在组件卸载时自动恢复滚动
  autoRestore?: boolean
  // 是否保存和恢复滚动位置
  preserveScrollPosition?: boolean
  // 是否阻止触摸事件穿透
  preventTouchScroll?: boolean
  // 自定义锁定时的样式
  lockStyles?: {
    overflow?: string
    position?: string
    width?: string
  }
  // 允许滚动的选择器列表（CSS选择器）
  // 例如：['.my-modal', '.scrollable-content']
  allowScrollSelectors?: string[]
  // 允许滚动的容器选择器列表（CSS选择器）
  // 这些容器内的可滚动元素将被允许滚动
  // 例如：['.modal-content', '.scroll-container']
  allowScrollContainerSelectors?: string[]
  // 自定义滚动检查函数
  // 返回 true 表示允许滚动，false 表示阻止滚动
  customScrollCheck?: (element: Element) => boolean
}

// 默认配置
const DEFAULT_OPTIONS: Required<
  Omit<ScrollLockOptions, 'allowScrollSelectors' | 'allowScrollContainerSelectors' | 'customScrollCheck'>
> = {
  autoRestore: true,
  preserveScrollPosition: true,
  preventTouchScroll: true,
  lockStyles: {
    overflow: 'hidden',
    position: 'fixed',
    width: '100%',
  },
}

// 全局状态管理
const globalLockCount = ref(0)
const globalOriginalStyles = ref<{
  body: { [key: string]: string }
  documentElement: { [key: string]: string }
  html: { [key: string]: string }
} | null>(null)
const globalSavedScrollPosition = ref(0)
const globalTouchEventListeners = new Set<(event: TouchEvent) => void>()

// 保存全局原始样式（只在第一次锁定时保存）
const saveGlobalOriginalStyles = () => {
  if (globalOriginalStyles.value === null) {
    globalOriginalStyles.value = {
      body: {
        overflow: document.body.style.overflow,
      },
      documentElement: {
        overflow: document.documentElement.style.overflow,
      },
      html: {
        overflow: document.documentElement.style.overflow,
      },
    }
  }
}

// 保存全局滚动位置（只在第一次锁定时保存）
const saveGlobalScrollPosition = () => {
  if (globalLockCount.value === 0) {
    globalSavedScrollPosition.value =
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  }
}

// 应用全局锁定样式
const applyGlobalLockStyles = (config: any) => {
  if (globalLockCount.value === 1) {
    // 第一次锁定时应用样式
    document.body.style.overflow = config.lockStyles.overflow || 'hidden'
    document.documentElement.style.overflow = config.lockStyles.overflow || 'hidden'
    document.documentElement.classList.add('v-overlay-scroll-blocked')
  }
}

// 恢复全局样式（只在最后一个锁定时恢复）
const restoreGlobalStyles = (config: any) => {
  if (globalLockCount.value === 0 && globalOriginalStyles.value) {
    // 最后一个锁定时恢复样式
    document.body.style.overflow = globalOriginalStyles.value.body.overflow || ''
    document.documentElement.style.overflow = globalOriginalStyles.value.documentElement.overflow || ''

    // 移除 CSS 类名
    document.documentElement.classList.remove('v-overlay-scroll-blocked')

    // 重置全局状态
    globalOriginalStyles.value = null
    globalSavedScrollPosition.value = 0
  }
}

// 添加全局触摸事件监听器
const addGlobalTouchEventListener = (listener: (event: TouchEvent) => void) => {
  globalTouchEventListeners.add(listener)
  if (globalTouchEventListeners.size === 1) {
    // 第一次添加监听器时绑定到document
    document.addEventListener('touchmove', listener, { passive: false })
  }
}

// 移除全局触摸事件监听器
const removeGlobalTouchEventListener = (listener: (event: TouchEvent) => void) => {
  globalTouchEventListeners.delete(listener)
  if (globalTouchEventListeners.size === 0) {
    // 最后一个监听器被移除时解绑
    document.removeEventListener('touchmove', listener)
  }
}

export function useScrollLock(options: ScrollLockOptions = {}) {
  const config = {
    ...DEFAULT_OPTIONS,
    allowScrollSelectors: options.allowScrollSelectors || [],
    allowScrollContainerSelectors: options.allowScrollContainerSelectors || [],
    customScrollCheck: options.customScrollCheck,
    ...options,
  }

  // 状态管理
  const isLocked = ref(false)
  const savedScrollPosition = ref(0)

  // 保存当前滚动位置
  const saveScrollPosition = () => {
    if (config.preserveScrollPosition) {
      savedScrollPosition.value =
        window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    }
  }

  // 检查元素是否应该允许滚动
  const shouldAllowScroll = (element: Element): boolean => {
    // 1. 检查是否匹配允许滚动的选择器
    for (const selector of config.allowScrollSelectors) {
      if (element.matches(selector) || element.closest(selector)) {
        return true
      }
    }

    // 2. 检查是否在允许滚动的容器内
    for (const selector of config.allowScrollContainerSelectors) {
      const container = element.closest(selector)
      if (container) {
        // 检查容器是否可滚动
        const style = getComputedStyle(container)
        const isScrollable =
          container.scrollHeight > container.clientHeight &&
          style.overflow !== 'hidden' &&
          (style.overflow === 'auto' ||
            style.overflow === 'scroll' ||
            style.overflowY === 'auto' ||
            style.overflowY === 'scroll')
        if (isScrollable) {
          return true
        }
      }
    }

    // 3. 检查是否在弹窗、菜单或其他覆盖层内
    const isInDialog = element.closest(
      '.v-dialog, .v-menu, .v-bottom-sheet, .v-snackbar, [role="dialog"], .v-overlay__content',
    )

    // 4. 检查是否是可滚动的内容区域
    const isScrollableContent = element.closest(
      '.v-card-text, .v-list, .v-table__wrapper, .v-data-table__wrapper, .v-sheet, .v-card__content, .v-data-table, .v-table',
    )

    // 5. 检查是否在可滚动的容器内
    const scrollableContainer = element.closest('[style*="overflow"], [class*="overflow"]')
    const isInScrollableContainer =
      scrollableContainer &&
      (scrollableContainer.scrollHeight > scrollableContainer.clientHeight ||
        getComputedStyle(scrollableContainer).overflow !== 'hidden')

    // 6. 使用自定义检查函数
    if (config.customScrollCheck && config.customScrollCheck(element)) {
      return true
    }

    // 如果不在弹窗内且不是可滚动内容且不在可滚动容器内，则不允许滚动
    return !!(isInDialog || isScrollableContent || isInScrollableContainer)
  }

  // 阻止触摸滚动事件
  const preventTouchScroll = (event: TouchEvent) => {
    if (isLocked.value && config.preventTouchScroll) {
      // 检查触摸事件的目标元素
      const target = event.target as Element
      if (target) {
        // 如果元素应该允许滚动，则不阻止事件
        if (shouldAllowScroll(target)) {
          return
        }
      }

      // 否则阻止滚动
      event.preventDefault()
      event.stopPropagation()
    }
  }

  // 锁定滚动
  const lockScroll = () => {
    if (isLocked.value) return

    // 增加全局锁定计数
    globalLockCount.value++

    // 保存当前状态（只在第一次锁定时）
    if (globalLockCount.value === 1) {
      saveGlobalOriginalStyles()
      saveGlobalScrollPosition()
    }

    // 应用锁定样式
    applyGlobalLockStyles(config)

    // 添加触摸事件监听器
    if (config.preventTouchScroll) {
      addGlobalTouchEventListener(preventTouchScroll)
    }

    isLocked.value = true
  }

  // 恢复滚动
  const restoreScroll = () => {
    if (!isLocked.value) return

    // 减少全局锁定计数
    globalLockCount.value--

    // 移除触摸事件监听器
    if (config.preventTouchScroll) {
      removeGlobalTouchEventListener(preventTouchScroll)
    }

    // 恢复样式（只在最后一个锁定时）
    restoreGlobalStyles(config)

    isLocked.value = false
  }

  // 切换滚动锁定状态
  const toggleScrollLock = (lock?: boolean) => {
    const shouldLock = lock !== undefined ? lock : !isLocked.value

    if (shouldLock) {
      lockScroll()
    } else {
      restoreScroll()
    }
  }

  // 监听响应式值的变化
  const watchTarget = (target: any) => {
    return watch(
      target,
      newValue => {
        toggleScrollLock(!!newValue)
      },
      { immediate: false },
    )
  }

  // 生命周期清理
  onBeforeUnmount(() => {
    if (config.autoRestore && isLocked.value) {
      restoreScroll()
    }
  })

  return {
    // 状态
    isLocked: readonly(isLocked),
    savedScrollPosition: readonly(savedScrollPosition),

    // 方法
    lockScroll,
    restoreScroll,
    toggleScrollLock,
    watchTarget,

    // 工具方法
    saveScrollPosition,
  }
}

// 便捷的自动监听版本
export function useScrollLockWithWatch(target: any, options: ScrollLockOptions = {}) {
  const scrollLock = useScrollLock(options)

  // 自动监听目标值的变化
  const stopWatcher = scrollLock.watchTarget(target)

  // 返回所有功能 + 停止监听的方法
  return {
    ...scrollLock,
    stopWatcher,
  }
}

// 全局弹窗检测和管理
export function useGlobalDialogScrollLock() {
  const activeDialogs = ref<Set<string>>(new Set())

  const registerDialog = (dialogId: string) => {
    activeDialogs.value.add(dialogId)
    if (activeDialogs.value.size === 1) {
      // 第一个弹窗时锁定滚动
      lockGlobalScroll()
    }
  }

  const unregisterDialog = (dialogId: string) => {
    activeDialogs.value.delete(dialogId)
    if (activeDialogs.value.size === 0) {
      // 没有弹窗时恢复滚动
      unlockGlobalScroll()
    }
  }

  const lockGlobalScroll = () => {
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('v-overlay-scroll-blocked')
  }

  const unlockGlobalScroll = () => {
    document.body.style.overflow = ''
    document.documentElement.classList.remove('v-overlay-scroll-blocked')
  }

  return {
    activeDialogs: readonly(activeDialogs),
    registerDialog,
    unregisterDialog,
    lockGlobalScroll,
    unlockGlobalScroll,
  }
}
