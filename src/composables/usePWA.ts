import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { checkPWAStatus, isPWADisplayMode } from '@/@core/utils/navigator'

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

  initPromise = new Promise(async resolve => {
    globalLoading.value = true
    try {
      globalPwaStatus.value = await checkPWAStatus()
    } catch (error) {
      console.error('Failed to detect PWA status', error)
      // 即使检测失败，也设置一个合理的默认值
      globalPwaStatus.value = {
        hasPWAFeatures: false,
        isStandaloneMode: isPWADisplayMode(),
        isPWAEnvironment: isPWADisplayMode(),
        isFullPWA: false,
      }
    } finally {
      globalLoading.value = false
      // 无论成功还是失败，都解决Promise
      resolve()
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
    initializePWA: initializePWAGlobally,
  }
}
