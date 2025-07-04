import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { isPWA } from '@/@core/utils/navigator'

// 全局PWA状态，确保只初始化一次
const globalPwaMode = ref<boolean | null>(null)
const globalLoading = ref(false)
let initPromise: Promise<void> | null = null

// 全局初始化函数
async function initializePWAGlobally() {
  if (initPromise) return initPromise

  if (globalPwaMode.value !== null || globalLoading.value) return Promise.resolve()

  initPromise = new Promise(async (resolve, reject) => {
    globalLoading.value = true
    try {
      globalPwaMode.value = await isPWA()
      resolve()
    } catch (error) {
      console.error('Failed to detect PWA mode', error)
      globalPwaMode.value = false
      reject(error)
    } finally {
      globalLoading.value = false
    }
  })

  return initPromise
}

export function usePWA() {
  const display = useDisplay()

  const appMode = computed(() => {
    return globalPwaMode.value && display.mdAndDown.value
  })

  // 自动初始化PWA检测
  onMounted(() => {
    initializePWAGlobally().catch(console.error)
  })

  // 如果是在服务端或首次调用，立即开始初始化
  if (typeof window !== 'undefined' && globalPwaMode.value === null && !globalLoading.value) {
    initializePWAGlobally().catch(console.error)
  }

  return {
    pwaMode: globalPwaMode,
    appMode,
    loading: globalLoading,
    // 保留手动初始化方法以防需要
    initializePWA: initializePWAGlobally,
  }
}
