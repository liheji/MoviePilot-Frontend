/**
 * PWA相关的类型声明
 */

// 扩展Window接口
declare global {
  interface Window {
    pwaStateController?: import('@/utils/pwaStateManager').PWAStateController
    orientation?: number
  }

  interface Navigator {
    standalone?: boolean
    setAppBadge?: (count: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }

  // 自定义事件类型
  interface WindowEventMap {
    'pwaStateRestored': CustomEvent<{
      state: import('@/utils/pwaStateManager').PWAState
    }>
  }
}

export {}