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
  const originalBodyStyles = ref<{ [key: string]: string }>({})
  const originalDocumentStyles = ref<{ [key: string]: string }>({})
  const originalHtmlStyles = ref<{ [key: string]: string }>({})

  // 保存当前滚动位置
  const saveScrollPosition = () => {
    if (config.preserveScrollPosition) {
      savedScrollPosition.value =
        window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    }
  }

  // 保存原始样式
  const saveOriginalStyles = () => {
    // 保存 body 样式
    originalBodyStyles.value = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }

    // 保存 documentElement 样式
    originalDocumentStyles.value = {
      overflow: document.documentElement.style.overflow,
    }

    // 保存 html 样式
    originalHtmlStyles.value = {
      overflow: document.documentElement.style.overflow,
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
    }
  }

  // 锁定滚动
  const lockScroll = () => {
    if (isLocked.value) return

    // 保存当前状态
    saveScrollPosition()
    saveOriginalStyles()

    // 应用锁定样式到 body
    document.body.style.overflow = config.lockStyles.overflow || 'hidden'
    document.body.style.position = config.lockStyles.position || 'fixed'
    document.body.style.width = config.lockStyles.width || '100%'

    // 应用锁定样式到 documentElement
    document.documentElement.style.overflow = config.lockStyles.overflow || 'hidden'

    // 添加 CSS 类名
    document.documentElement.classList.add('v-overlay-scroll-blocked')

    // 如果需要保持滚动位置，设置top偏移
    if (config.preserveScrollPosition) {
      document.body.style.top = `-${savedScrollPosition.value}px`
    }

    // 保持navbar的滚动状态 - 添加一个CSS变量来记录滚动位置
    if (savedScrollPosition.value > 0) {
      document.documentElement.style.setProperty('--saved-scroll-y', `${savedScrollPosition.value}px`)
      document.documentElement.classList.add('dialog-scroll-locked')
    }

    // 添加触摸事件监听器
    if (config.preventTouchScroll) {
      document.addEventListener('touchmove', preventTouchScroll, { passive: false })
    }

    isLocked.value = true
  }

  // 恢复滚动
  const restoreScroll = () => {
    if (!isLocked.value) return

    // 恢复原始样式
    document.body.style.overflow = originalBodyStyles.value.overflow || ''
    document.body.style.position = originalBodyStyles.value.position || ''
    document.body.style.top = originalBodyStyles.value.top || ''
    document.body.style.width = originalBodyStyles.value.width || ''
    document.documentElement.style.overflow = originalDocumentStyles.value.overflow || ''

    // 移除 CSS 类名
    document.documentElement.classList.remove('v-overlay-scroll-blocked')
    document.documentElement.classList.remove('dialog-scroll-locked')

    // 移除CSS变量
    document.documentElement.style.removeProperty('--saved-scroll-y')

    // 移除触摸事件监听器
    if (config.preventTouchScroll) {
      document.removeEventListener('touchmove', preventTouchScroll)
    }

    // 恢复滚动位置
    if (config.preserveScrollPosition) {
      window.scrollTo(0, savedScrollPosition.value)
    }

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
