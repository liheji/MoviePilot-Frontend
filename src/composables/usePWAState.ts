import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { PWAState } from '@/utils/pwaStateManager'

export function usePWAState() {
  const isStateRestored = ref(false)
  const stateRestoreCount = ref(0)
  const lastRestoredState = ref<PWAState | null>(null)
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
    }
  }

  // 手动触发状态恢复检查
  const checkStateRestore = async () => {
    if (window.pwaStateController) {
      // 静默检查
    }
  }

  // 监听状态恢复事件
  const handleStateRestored = (event: Event) => {
    const customEvent = event as CustomEvent<{ state: PWAState }>
    isStateRestored.value = true
    stateRestoreCount.value++
    lastRestoredState.value = customEvent.detail.state
  }

  // 重置状态恢复标志
  const resetStateRestored = () => {
    isStateRestored.value = false
    lastRestoredState.value = null
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
      mediaQuery.addListener(handleDisplayModeChange)
    }
    
    onUnmounted(() => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange)
      } else {
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
    isStateManagerAvailable,
    checkPWAMode
  }
}

// 全局PWA状态管理器
export function useGlobalPWAState() {
  // 检查是否在PWA环境中
  const isPWAEnvironment = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone || 
           document.referrer.includes('android-app://')
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
    getStoredState,
    clearStoredState
  }
}