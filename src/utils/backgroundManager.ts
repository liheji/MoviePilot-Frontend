/**
 * 后台管理器
 * 统一管理定时器和后台活动，减少iOS系统杀掉应用的概率
 */
export class BackgroundManager {
  private timers: Map<string, {
    callback: () => void
    interval: number
    timer: ReturnType<typeof setInterval> | null
    pausedAt?: number
    runInBackground?: boolean
  }> = new Map()
  
  private isBackground = false
  private isDestroyed = false
  private lastActivityTime = Date.now()
  private activityTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.setupVisibilityListener()
    this.setupActivityTracking()
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      const wasBackground = this.isBackground
      this.isBackground = document.hidden
      
      if (this.isBackground && !wasBackground) {
        console.log('Background: 进入后台，暂停定时器')
        this.pauseAllTimers()
      } else if (!this.isBackground && wasBackground) {
        console.log('Background: 回到前台，恢复定时器')
        this.resumeAllTimers()
      }
    })

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      this.destroy()
    })
  }

  private setupActivityTracking() {
    // 跟踪用户活动
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const updateActivity = () => {
      this.lastActivityTime = Date.now()
    }

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // 定期更新活动状态
    this.activityTimer = setInterval(() => {
      // 如果超过5分钟没有活动，可以考虑减少后台活动
      const inactiveTime = Date.now() - this.lastActivityTime
      if (inactiveTime > 5 * 60 * 1000) {
        console.log('Background: 用户长时间不活跃')
      }
    }, 60000) // 每分钟检查一次
  }

  /**
   * 添加定时器
   */
  addTimer(
    id: string, 
    callback: () => void, 
    interval: number, 
    options: {
      runInBackground?: boolean
      skipInitialRun?: boolean
    } = {}
  ) {
    const { runInBackground = false, skipInitialRun = false } = options
    
    this.removeTimer(id)
    
    const timerConfig = {
      callback,
      interval,
      timer: null as ReturnType<typeof setInterval> | null,
      runInBackground
    }

    // 创建定时器
    const wrappedCallback = () => {
      if (this.isDestroyed) return
      
      // 只有在前台运行，或者明确允许后台运行时才执行
      if (!this.isBackground || runInBackground) {
        try {
          callback()
        } catch (error) {
          console.error(`Background: 定时器 ${id} 执行错误:`, error)
        }
      }
    }

    timerConfig.timer = setInterval(wrappedCallback, interval)
    this.timers.set(id, timerConfig)

    // 如果不跳过初始运行，立即执行一次
    if (!skipInitialRun) {
      wrappedCallback()
    }

    console.log(`Background: 添加定时器 ${id}, 间隔 ${interval}ms`)
  }

  /**
   * 移除定时器
   */
  removeTimer(id: string) {
    const timerConfig = this.timers.get(id)
    if (timerConfig) {
      if (timerConfig.timer) {
        clearInterval(timerConfig.timer)
      }
      this.timers.delete(id)
      console.log(`Background: 移除定时器 ${id}`)
    }
  }

  /**
   * 暂停所有定时器
   */
  private pauseAllTimers() {
    this.timers.forEach((timerConfig, id) => {
      if (timerConfig.timer && !timerConfig.runInBackground) {
        clearInterval(timerConfig.timer)
        timerConfig.timer = null
        timerConfig.pausedAt = Date.now()
      }
    })
  }

  /**
   * 恢复所有定时器
   */
  private resumeAllTimers() {
    this.timers.forEach((timerConfig, id) => {
      if (!timerConfig.timer) {
        const wrappedCallback = () => {
          if (this.isDestroyed) return
          
          if (!this.isBackground || timerConfig.runInBackground) {
            try {
              timerConfig.callback()
            } catch (error) {
              console.error(`Background: 定时器 ${id} 执行错误:`, error)
            }
          }
        }

        timerConfig.timer = setInterval(wrappedCallback, timerConfig.interval)
        delete timerConfig.pausedAt
      }
    })
  }

  /**
   * 获取定时器状态
   */
  getTimerStatus(id: string): 'running' | 'paused' | 'not-found' {
    const timerConfig = this.timers.get(id)
    if (!timerConfig) return 'not-found'
    return timerConfig.timer ? 'running' : 'paused'
  }

  /**
   * 获取所有定时器信息
   */
  getTimersInfo(): Array<{
    id: string
    interval: number
    status: 'running' | 'paused'
    runInBackground: boolean
    pausedAt?: number
  }> {
    return Array.from(this.timers.entries()).map(([id, config]) => ({
      id,
      interval: config.interval,
      status: config.timer ? 'running' : 'paused',
      runInBackground: config.runInBackground || false,
      pausedAt: config.pausedAt
    }))
  }

  /**
   * 检查用户是否活跃
   */
  isUserActive(maxInactiveTime = 5 * 60 * 1000): boolean {
    return Date.now() - this.lastActivityTime < maxInactiveTime
  }

  /**
   * 获取最后活动时间
   */
  getLastActivityTime(): number {
    return this.lastActivityTime
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isBackground: boolean
    isDestroyed: boolean
    timerCount: number
    lastActivityTime: number
    isUserActive: boolean
  } {
    return {
      isBackground: this.isBackground,
      isDestroyed: this.isDestroyed,
      timerCount: this.timers.size,
      lastActivityTime: this.lastActivityTime,
      isUserActive: this.isUserActive()
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.isDestroyed = true
    
    // 清理所有定时器
    this.timers.forEach((timerConfig, id) => {
      if (timerConfig.timer) {
        clearInterval(timerConfig.timer)
      }
    })
    this.timers.clear()

    // 清理活动跟踪定时器
    if (this.activityTimer) {
      clearInterval(this.activityTimer)
      this.activityTimer = null
    }

    console.log('Background: 管理器已销毁')
  }
}

/**
 * 全局后台管理器实例
 */
export const backgroundManager = new BackgroundManager()

/**
 * 便捷的定时器管理函数
 */
export function addBackgroundTimer(
  id: string, 
  callback: () => void, 
  interval: number, 
  options?: {
    runInBackground?: boolean
    skipInitialRun?: boolean
  }
) {
  backgroundManager.addTimer(id, callback, interval, options)
}

export function removeBackgroundTimer(id: string) {
  backgroundManager.removeTimer(id)
}

export function getBackgroundTimerStatus(id: string) {
  return backgroundManager.getTimerStatus(id)
}