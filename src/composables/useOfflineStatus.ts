import { ref, computed } from 'vue'
import { useOnline } from '@vueuse/core'

// 全局状态
const isAppOffline = ref(false)
const appOfflineReason = ref('')
const consecutiveNetworkErrors = ref(0)
const MAX_CONSECUTIVE_ERRORS = 3

// 全局离线状态管理
export function useGlobalOfflineStatus() {
  const isOnline = useOnline()

  // 综合离线状态（网络离线 或 应用离线）
  const isOffline = computed(() => !isOnline.value || isAppOffline.value)

  // 是否可以执行网络操作
  const canPerformNetworkAction = computed(() => isOnline.value && !isAppOffline.value)

  // 设置应用离线状态
  const setAppOffline = (offline: boolean, reason?: string) => {
    isAppOffline.value = offline
    appOfflineReason.value = reason || ''

    // 如果设置为在线状态，重置连续错误计数
    if (!offline) {
      consecutiveNetworkErrors.value = 0
    }
  }

  // 记录网络错误
  const recordNetworkError = (reason?: string) => {
    consecutiveNetworkErrors.value++

    // 只有连续出现三次网络错误时才设置为离线模式
    if (consecutiveNetworkErrors.value >= MAX_CONSECUTIVE_ERRORS) {
      setAppOffline(true, reason || `连续${MAX_CONSECUTIVE_ERRORS}次网络错误`)
    }
  }

  // 重置连续错误计数
  const resetConsecutiveErrors = () => {
    consecutiveNetworkErrors.value = 0
  }

  // 获取离线消息
  const getOfflineMessage = () => {
    if (!isOnline.value) {
      return appOfflineReason.value
    }
    if (isAppOffline.value) {
      return appOfflineReason.value
    }
    return ''
  }

  return {
    isOnline,
    isOffline,
    canPerformNetworkAction,
    setAppOffline,
    recordNetworkError,
    resetConsecutiveErrors,
    getOfflineMessage,
    consecutiveNetworkErrors: computed(() => consecutiveNetworkErrors.value),
  }
}

// 单个组件的离线状态
export function useOfflineStatus(initialMessage?: string) {
  const { isOnline, isOffline, canPerformNetworkAction, getOfflineMessage } = useGlobalOfflineStatus()

  const message = computed(() => {
    if (initialMessage) {
      return initialMessage
    }
    return getOfflineMessage()
  })

  return {
    isOnline,
    isOffline,
    canPerformNetworkAction,
    message,
  }
}
