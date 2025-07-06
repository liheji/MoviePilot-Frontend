import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { sseManagerSingleton } from '@/utils/sseManager'
import { addBackgroundTimer, removeBackgroundTimer } from '@/utils/backgroundManager'

/**
 * 后台优化组合函数
 * 统一管理SSE连接和定时器，优化iOS后台性能
 */
export function useBackgroundOptimization() {
  
  /**
   * 使用优化的SSE连接
   * @param url SSE连接地址
   * @param messageHandler 消息处理函数
   * @param listenerId 监听器ID（用于区分不同的监听器）
   * @param options 选项
   */
  const useSSE = (
    url: string, 
    messageHandler: (event: MessageEvent) => void, 
    listenerId: string,
    options?: {
      backgroundCloseDelay?: number
      reconnectDelay?: number
      maxReconnectAttempts?: number
    }
  ) => {
    const manager = sseManagerSingleton.getManager(url, options)
    
    onMounted(() => {
      manager.addMessageListener(listenerId, messageHandler)
    })
    
    onUnmounted(() => {
      manager.removeMessageListener(listenerId)
    })
    
    return {
      manager,
      readyState: () => manager.readyState,
      close: () => manager.removeMessageListener(listenerId)
    }
  }

  /**
   * 使用优化的定时器
   * @param id 定时器ID
   * @param callback 回调函数
   * @param interval 间隔时间（毫秒）
   * @param options 选项
   */
  const useTimer = (
    id: string,
    callback: () => void,
    interval: number,
    options?: {
      runInBackground?: boolean
      skipInitialRun?: boolean
    }
  ) => {
    onMounted(() => {
      addBackgroundTimer(id, callback, interval, options)
    })
    
    onUnmounted(() => {
      removeBackgroundTimer(id)
    })
    
    return {
      remove: () => removeBackgroundTimer(id)
    }
  }

  /**
   * 使用延迟SSE连接（类似原来的setTimeout延迟）
   * @param url SSE连接地址
   * @param messageHandler 消息处理函数
   * @param listenerId 监听器ID
   * @param delay 延迟时间（毫秒）
   * @param options SSE选项
   */
  const useDelayedSSE = (
    url: string,
    messageHandler: (event: MessageEvent) => void,
    listenerId: string,
    delay: number = 3000,
    options?: Parameters<typeof useSSE>[3]
  ) => {
    const manager = sseManagerSingleton.getManager(url, options)
    
    onMounted(() => {
      setTimeout(() => {
        manager.addMessageListener(listenerId, messageHandler)
      }, delay)
    })
    
    onUnmounted(() => {
      manager.removeMessageListener(listenerId)
    })
    
    return {
      manager,
      readyState: () => manager.readyState,
      close: () => manager.removeMessageListener(listenerId)
    }
  }

  /**
   * 使用进度SSE连接（用于进度监听）
   * @param url SSE连接地址
   * @param messageHandler 消息处理函数
   * @param listenerId 监听器ID
   * @param isActive 是否激活的响应式变量
   */
  const useProgressSSE = (
    url: string,
    messageHandler: (event: MessageEvent) => void,
    listenerId: string,
    isActive: Ref<boolean>
  ) => {
    const manager = sseManagerSingleton.getManager(url, {
      backgroundCloseDelay: 1000, // 进度SSE更快关闭
      reconnectDelay: 1000,
      maxReconnectAttempts: 5
    })
    
    const startProgress = () => {
      if (isActive.value) {
        manager.addMessageListener(listenerId, messageHandler)
      }
    }
    
    const stopProgress = () => {
      manager.removeMessageListener(listenerId)
    }
    
    onUnmounted(() => {
      stopProgress()
    })
    
    return {
      start: startProgress,
      stop: stopProgress,
      manager
    }
  }

  /**
   * 使用数据刷新定时器（用于仪表盘等数据刷新）
   * @param id 定时器ID
   * @param loadDataFunc 加载数据函数
   * @param interval 刷新间隔（毫秒）
   * @param immediate 是否立即执行
   */
  const useDataRefresh = (
    id: string,
    loadDataFunc: () => Promise<void> | void,
    interval: number = 3000,
    immediate: boolean = true
  ) => {
    const loading = ref(false)
    
    const wrappedLoadData = async () => {
      if (loading.value) return
      
      loading.value = true
      try {
        await loadDataFunc()
      } catch (error) {
        console.error(`数据刷新失败 [${id}]:`, error)
      } finally {
        loading.value = false
      }
    }
    
    onMounted(async () => {
      if (immediate) {
        await wrappedLoadData()
      }
      
      addBackgroundTimer(
        id,
        wrappedLoadData,
        interval,
        {
          runInBackground: false, // 后台不刷新数据
          skipInitialRun: true // 已经手动执行过了
        }
      )
    })
    
    onUnmounted(() => {
      removeBackgroundTimer(id)
    })
    
    return {
      loading,
      refresh: wrappedLoadData,
      stop: () => removeBackgroundTimer(id)
    }
  }

  return {
    useSSE,
    useTimer,
    useDelayedSSE,
    useProgressSSE,
    useDataRefresh
  }
}