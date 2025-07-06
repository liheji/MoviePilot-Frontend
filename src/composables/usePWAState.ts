/**
 * PWA状态管理的Vue组合式API
 */

import type { PWAState } from '@/utils/pwaStateManager'

export function usePWAState() {
  const isStateRestored = ref(false)
  const stateRestoreCount = ref(0)
  const lastRestoredState = ref<PWAState | null>(null)

  // 检查是否在PWA模式下运行
  const isPWAMode = ref(false)

  // 检查PWA模式
  const checkPWAMode = () => {
    isPWAMode.value = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone || 
                      document.referrer.includes('android-app://')
  }

  // 保存当前状态
  const saveCurrentState = async () => {
    if (window.pwaStateController) {
      await window.pwaStateController.saveCurrentState()
      console.log('手动保存PWA状态')
    }
  }

  // 手动触发状态恢复检查
  const checkStateRestore = async () => {
    if (window.pwaStateController) {
      // 这里可以添加手动检查状态恢复的逻辑
      console.log('检查状态恢复')
    }
  }

  // 监听状态恢复事件
  const handleStateRestored = (event: CustomEvent<{ state: PWAState }>) => {
    isStateRestored.value = true
    stateRestoreCount.value++
    lastRestoredState.value = event.detail.state
    
    console.log('Vue组件收到状态恢复通知:', event.detail.state)
  }

  // 重置状态恢复标志
  const resetStateRestored = () => {
    isStateRestored.value = false
    lastRestoredState.value = null
  }

  // 获取状态管理器实例
  const getStateController = () => {
    return window.pwaStateController
  }

  // 检查状态管理器是否可用
  const isStateManagerAvailable = () => {
    return !!window.pwaStateController
  }

  onMounted(() => {
    checkPWAMode()
    
    // 监听状态恢复事件
    window.addEventListener('pwaStateRestored', handleStateRestored)
    
    // 监听PWA模式变化
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      isPWAMode.value = e.matches
    }
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange)
    } else {
      // 兼容旧版本
      mediaQuery.addListener(handleDisplayModeChange)
    }
    
    onUnmounted(() => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange)
      } else {
        // 兼容旧版本
        mediaQuery.removeListener(handleDisplayModeChange)
      }
    })
  })

  onUnmounted(() => {
    window.removeEventListener('pwaStateRestored', handleStateRestored)
  })

  return {
    // 响应式状态
    isPWAMode,
    isStateRestored,
    stateRestoreCount,
    lastRestoredState,
    
    // 方法
    saveCurrentState,
    checkStateRestore,
    resetStateRestored,
    getStateController,
    isStateManagerAvailable,
    checkPWAMode
  }
}

/**
 * 全局PWA状态管理器
 */
export function useGlobalPWAState() {
  // 检查是否在PWA环境中
  const isPWAEnvironment = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone || 
           document.referrer.includes('android-app://')
  }

  // 初始化状态管理器（如果尚未初始化）
  const initStateManager = async () => {
    if (!window.pwaStateController && isPWAEnvironment()) {
      const { PWAStateController } = await import('@/utils/pwaStateManager')
      window.pwaStateController = new PWAStateController()
      console.log('延迟初始化PWA状态管理器')
    }
  }

  // 保存应用状态
  const saveAppState = async (customData?: any) => {
    await initStateManager()
    
    if (window.pwaStateController) {
      // 如果有自定义数据，可以通过这种方式传递
      if (customData) {
        // 临时存储自定义数据
        ;(window as any).tempCustomState = customData
      }
      
      await window.pwaStateController.saveCurrentState()
      
      // 清除临时数据
      if (customData) {
        delete (window as any).tempCustomState
      }
    }
  }

  // 获取存储的状态
  const getStoredState = () => {
    return localStorage.getItem('mp-pwa-app-state')
  }

  // 清除存储的状态
  const clearStoredState = () => {
    localStorage.removeItem('mp-pwa-app-state')
    sessionStorage.removeItem('mp-pwa-session-state')
  }

  return {
    isPWAEnvironment,
    initStateManager,
    saveAppState,
    getStoredState,
    clearStoredState
  }
}