import { ref, watch, onBeforeUnmount, readonly } from 'vue'

// 滚动锁定配置选项
export interface ScrollLockOptions {
  // 是否在组件卸载时自动恢复滚动（默认true）
  autoRestore?: boolean
  // 是否保存和恢复滚动位置（默认true）
  preserveScrollPosition?: boolean
  // 自定义锁定时的样式
  lockStyles?: {
    overflow?: string
    position?: string
    width?: string
  }
}

// 默认配置
const DEFAULT_OPTIONS: Required<ScrollLockOptions> = {
  autoRestore: true,
  preserveScrollPosition: true,
  lockStyles: {
    overflow: 'hidden',
    position: 'fixed',
    width: '100%',
  },
}

export function useScrollLock(options: ScrollLockOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  // 状态管理
  const isLocked = ref(false)
  const savedScrollPosition = ref(0)
  const originalBodyStyles = ref<{ [key: string]: string }>({})
  const originalDocumentStyles = ref<{ [key: string]: string }>({})

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
  }

  // 锁定滚动
  const lockScroll = () => {
    if (isLocked.value) return

    // 保存当前状态
    saveScrollPosition()
    saveOriginalStyles()

    // 应用锁定样式
    document.body.style.overflow = config.lockStyles.overflow || 'hidden'
    document.body.style.position = config.lockStyles.position || 'fixed'
    document.body.style.width = config.lockStyles.width || '100%'
    document.documentElement.style.overflow = config.lockStyles.overflow || 'hidden'

    // 如果需要保持滚动位置，设置top偏移
    if (config.preserveScrollPosition) {
      document.body.style.top = `-${savedScrollPosition.value}px`
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
