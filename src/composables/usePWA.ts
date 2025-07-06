import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { checkPWAStatus, isPWADisplayMode } from '@/@core/utils/navigator'
import type { PWAState } from '@/utils/pwaStateManager'

// 全局PWA状态，确保只初始化一次
const globalPwaStatus = ref<{
  hasPWAFeatures: boolean
  isStandaloneMode: boolean
  isPWAEnvironment: boolean
  isFullPWA: boolean
} | null>(null)
const globalLoading = ref(false)
let initPromise: Promise<void> | null = null

// 全局初始化函数
async function initializePWAGlobally() {
  if (initPromise) return initPromise

  if (globalPwaStatus.value !== null || globalLoading.value) return Promise.resolve()

  initPromise = new Promise(async (resolve, reject) => {
    globalLoading.value = true
    try {
      globalPwaStatus.value = await checkPWAStatus()
      resolve()
    } catch (error) {
      console.error('Failed to detect PWA status', error)
      globalPwaStatus.value = {
        hasPWAFeatures: false,
        isStandaloneMode: isPWADisplayMode(),
        isPWAEnvironment: isPWADisplayMode(),
        isFullPWA: false,
      }
      reject(error)
    } finally {
      globalLoading.value = false
    }
  })

  return initPromise
}

export function usePWA() {
  const display = useDisplay()

  // 基于新的PWA状态结构
  const pwaMode = computed(() => {
    return globalPwaStatus.value?.isPWAEnvironment ?? false
  })

  const appMode = computed(() => {
    return pwaMode.value && display.mdAndDown.value
  })

  // 详细的PWA状态信息
  const pwaStatus = computed(() => globalPwaStatus.value)

  // 自动初始化PWA检测
  onMounted(() => {
    initializePWAGlobally().catch(console.error)
  })

  // 如果是在服务端或首次调用，立即开始初始化
  if (typeof window !== 'undefined' && globalPwaStatus.value === null && !globalLoading.value) {
    initializePWAGlobally().catch(console.error)
  }

  return {
    pwaMode,
    appMode,
    pwaStatus,
    loading: globalLoading,
    // 保留手动初始化方法以防需要
    initializePWA: initializePWAGlobally,
  }
}

// PWA状态管理 composable
export function usePWAState() {
  const isStateRestored = ref(false)
  const stateRestoreCount = ref(0)
  const lastRestoredState = ref<PWAState | null>(null)
  const isPWAMode = ref(false)

  // 检查PWA模式 - 使用统一的检测方式
  const checkPWAMode = async () => {
    // 确保全局PWA状态已初始化
    if (globalPwaStatus.value === null) {
      await initializePWAGlobally()
    }

    // 获取PWA状态
    const status = globalPwaStatus.value
    if (status) {
      isPWAMode.value = status.isPWAEnvironment
    } else {
      // 如果状态获取失败，使用同步检测作为后备
      isPWAMode.value = isPWADisplayMode()
    }
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
      // 同步更新全局PWA状态
      if (globalPwaStatus.value) {
        globalPwaStatus.value.isStandaloneMode = e.matches
        globalPwaStatus.value.isPWAEnvironment = globalPwaStatus.value.hasPWAFeatures || e.matches
        globalPwaStatus.value.isFullPWA = globalPwaStatus.value.hasPWAFeatures && e.matches
      }
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
    checkPWAMode,
  }
}

// 全局PWA状态管理器
export function useGlobalPWAState() {
  // 检查是否在PWA环境中 - 使用统一的检测方式
  const isPWAEnvironment = () => {
    return globalPwaStatus.value?.isPWAEnvironment ?? isPWADisplayMode()
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
    clearStoredState,
  }
}
