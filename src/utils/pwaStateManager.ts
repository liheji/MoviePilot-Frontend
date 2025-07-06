/**
 * PWA状态管理器
 * 用于在iOS设备上防止后台被杀时丢失状态，提供状态恢复功能
 */

// 应用状态接口
export interface PWAState {
  url: string
  scrollPosition: number
  orientation: number
  timestamp: number
  appData?: any
  formData?: Record<string, any>
  userSelections?: {
    selectedItems: string[]
    activeTab?: string
  }
}

// 当前上下文接口
export interface PWAContext {
  url: string
  orientation: number
  timestamp: number
}

/**
 * 基础状态管理器（使用localStorage和sessionStorage）
 */
export class PWAStateManager {
  private storageKey = 'mp-pwa-app-state'
  private sessionKey = 'mp-pwa-session-state'

  // 保存应用状态
  saveState(state: PWAState): void {
    try {
      // 主要状态存储到localStorage
      localStorage.setItem(this.storageKey, JSON.stringify({
        ...state,
        timestamp: Date.now()
      }))
      
      // 临时状态存储到sessionStorage
      sessionStorage.setItem(this.sessionKey, JSON.stringify({
        scrollPosition: state.scrollPosition,
        activeTab: state.appData?.activeTab,
        formData: state.formData
      }))
    } catch (error) {
      console.error('状态保存失败:', error)
    }
  }

  // 恢复应用状态
  restoreState(): PWAState | null {
    try {
      const savedState = localStorage.getItem(this.storageKey)
      const sessionState = sessionStorage.getItem(this.sessionKey)
      
      if (savedState) {
        const state = JSON.parse(savedState)
        const sessionData = sessionState ? JSON.parse(sessionState) : {}
        
        return {
          ...state,
          ...sessionData,
          isRestored: true
        }
      }
    } catch (error) {
      console.error('状态恢复失败:', error)
    }
    return null
  }

  // 清除过期状态
  clearExpiredState(maxAge = 24 * 60 * 60 * 1000): void { // 24小时
    try {
      const savedState = localStorage.getItem(this.storageKey)
      if (savedState) {
        const state = JSON.parse(savedState)
        if (Date.now() - state.timestamp > maxAge) {
          localStorage.removeItem(this.storageKey)
          sessionStorage.removeItem(this.sessionKey)
        }
      }
    } catch (error) {
      console.error('清除过期状态失败:', error)
    }
  }
}

/**
 * IndexedDB状态管理器
 */
export class PWAIndexedDBManager {
  private dbName = 'MPPWAStateDB'
  private dbVersion = 1
  private storeName = 'appState'

  private async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' })
        }
      }
    })
  }

  async saveState(state: PWAState): Promise<void> {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      await store.put({
        id: 'appState',
        data: state,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('IndexedDB保存失败:', error)
    }
  }

  async restoreState(): Promise<PWAState | null> {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.get('appState')
        request.onsuccess = () => {
          const result = request.result
          resolve(result ? result.data : null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('IndexedDB恢复失败:', error)
      return null
    }
  }
}

/**
 * Service Worker状态同步
 */
export class ServiceWorkerStateSync {
  private stateEndpoint = '/api/pwa-state'

  async saveState(state: PWAState): Promise<boolean> {
    try {
      const response = await fetch(this.stateEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      })
      
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Service Worker状态保存失败:', error)
      return false
    }
  }

  async loadState(): Promise<PWAState | null> {
    try {
      const response = await fetch(this.stateEndpoint)
      const state = await response.json()
      return Object.keys(state).length > 0 ? state : null
    } catch (error) {
      console.error('Service Worker状态加载失败:', error)
      return null
    }
  }

  // 使用MessageChannel与Service Worker通信
  async saveStateViaMessage(state: PWAState): Promise<boolean> {
    return new Promise((resolve) => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel()
        channel.port1.onmessage = (event) => {
          resolve(event.data.success)
        }
        
        navigator.serviceWorker.controller.postMessage({
          type: 'SAVE_PWA_STATE',
          state
        }, [channel.port2])
      } else {
        resolve(false)
      }
    })
  }

  async loadStateViaMessage(): Promise<PWAState | null> {
    return new Promise((resolve) => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel()
        channel.port1.onmessage = (event) => {
          resolve(event.data.state || null)
        }
        
        navigator.serviceWorker.controller.postMessage({
          type: 'GET_PWA_STATE'
        }, [channel.port2])
      } else {
        resolve(null)
      }
    })
  }
}

/**
 * 状态恢复决策器
 */
export class StateRestoreDecision {
  private maxStateAge = 60 * 60 * 1000 // 60分钟，延长有效期

  shouldRestoreState(savedState: PWAState | null, currentContext: PWAContext): boolean {
    if (!savedState) return false

    // 检查状态年龄 - 更宽松的过期检查
    if (this.isStateExpired(savedState)) {
      return false
    }

    // URL匹配检查 - 更宽松的匹配策略
    if (!this.isUrlCompatible(savedState.url, currentContext.url)) {
      // 即使URL不匹配，也可以恢复一些基础状态（如滚动位置除外）
      return true
    }

    // 设备方向变化不阻止状态恢复
    if (this.isOrientationChanged(savedState, currentContext)) {
      // 继续恢复
    }

    return true
  }

  private isStateExpired(savedState: PWAState): boolean {
    return Date.now() - savedState.timestamp > this.maxStateAge
  }

  private isUrlCompatible(savedUrl: string, currentUrl: string): boolean {
    if (!savedUrl || !currentUrl) return false
    
    try {
      const savedPath = new URL(savedUrl).pathname
      const currentPath = new URL(currentUrl).pathname
      return savedPath === currentPath
    } catch {
      return false
    }
  }

  private isOrientationChanged(savedState: PWAState, currentContext: PWAContext): boolean {
    return savedState.orientation !== currentContext.orientation
  }
}

/**
 * 页面可见性状态管理器
 */
export class VisibilityStateManager {
  private stateManager: PWAStateManager
  private blurTimer: number | null = null
  private isRestoring = false
  private restorePromise: Promise<void> | null = null

  constructor(stateManager: PWAStateManager) {
    this.stateManager = stateManager
    this.setupVisibilityListener()
  }

  private setupVisibilityListener(): void {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden()
      } else {
        this.handlePageVisible()
      }
    })

    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload()
    })

    // 监听页面焦点变化
    window.addEventListener('blur', () => {
      this.handlePageBlur()
    })

    window.addEventListener('focus', () => {
      this.handlePageFocus()
    })
  }

  private handlePageHidden(): void {
    const currentState = this.getCurrentAppState()
    this.stateManager.saveState(currentState)
    console.log('页面被隐藏，已保存状态')
  }

  private handlePageVisible(): void {
    if (this.isRestoring) return
    
    this.isRestoring = true
    this.restorePromise = this.performStateRestore()
  }

  private async performStateRestore(): Promise<void> {
    try {
      const restoredState = this.stateManager.restoreState()
      if (restoredState) {
        await this.restoreAppState(restoredState)
        console.log('页面显示，已静默恢复状态')
      }
    } catch (error) {
      console.error('状态恢复失败:', error)
    } finally {
      this.isRestoring = false
    }
  }



  private handlePageUnload(): void {
    const currentState = this.getCurrentAppState()
    this.stateManager.saveState(currentState)
  }

  private handlePageBlur(): void {
    if (this.blurTimer) clearTimeout(this.blurTimer)
    this.blurTimer = window.setTimeout(() => {
      const currentState = this.getCurrentAppState()
      this.stateManager.saveState(currentState)
    }, 1000)
  }

  private handlePageFocus(): void {
    if (this.blurTimer) {
      clearTimeout(this.blurTimer)
      this.blurTimer = null
    }
  }

  private getCurrentAppState(): PWAState {
    return {
      url: window.location.href,
      scrollPosition: window.scrollY,
      orientation: window.orientation || 0,
      timestamp: Date.now(),
      appData: this.getAppSpecificState()
    }
  }

  private async restoreAppState(state: PWAState): Promise<void> {
    // 立即恢复状态，无需延迟
    if (state.scrollPosition) {
      window.scrollTo(0, state.scrollPosition)
    }
    if (state.appData) {
      this.restoreAppSpecificState(state.appData)
    }
    
    // 触发状态恢复完成事件
    window.dispatchEvent(new CustomEvent('pwaStateRestored', {
      detail: { state }
    }))
  }

  private getAppSpecificState(): any {
    // 获取应用特定状态
    return {
      formData: this.getFormData(),
      userSelections: this.getUserSelections()
    }
  }

  private restoreAppSpecificState(appData: any): void {
    if (appData.formData) {
      this.restoreFormData(appData.formData)
    }
    if (appData.userSelections) {
      this.restoreUserSelections(appData.userSelections)
    }
  }

  private getFormData(): Record<string, any> {
    const forms = document.querySelectorAll('form')
    const formData: Record<string, any> = {}
    
    forms.forEach((form, index) => {
      const data = new FormData(form)
      formData[`form-${index}`] = Object.fromEntries(data)
    })
    
    return formData
  }

  private restoreFormData(formData: Record<string, any>): void {
    Object.entries(formData).forEach(([formId, data]) => {
      const formIndex = parseInt(formId.split('-')[1])
      const form = document.querySelectorAll('form')[formIndex]
      
      if (form) {
        Object.entries(data).forEach(([name, value]) => {
          const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement
          if (input) {
            input.value = value as string
          }
        })
      }
    })
  }

  private getUserSelections(): any {
    return {
      selectedItems: Array.from(document.querySelectorAll('.selected')).map(el => el.id),
      activeTab: document.querySelector('.tab.active')?.id
    }
  }

  private restoreUserSelections(selections: any): void {
    if (selections.selectedItems) {
      selections.selectedItems.forEach((id: string) => {
        const element = document.getElementById(id)
        if (element) {
          element.classList.add('selected')
        }
      })
    }
    
    if (selections.activeTab) {
      const tab = document.getElementById(selections.activeTab)
      if (tab) {
        tab.classList.add('active')
      }
    }
  }
}

/**
 * 完整的PWA状态管理器
 */
export class PWAStateController {
  private stateManager: PWAStateManager
  private indexedDBManager: PWAIndexedDBManager
  private swStateSync: ServiceWorkerStateSync
  private visibilityManager: VisibilityStateManager
  private restoreDecision: StateRestoreDecision
  private stateRestorePromise: Promise<void> | null = null
  private stateRestoreResolve: (() => void) | null = null
  private isRestoring = false

  constructor() {
    this.stateManager = new PWAStateManager()
    this.indexedDBManager = new PWAIndexedDBManager()
    this.swStateSync = new ServiceWorkerStateSync()
    this.visibilityManager = new VisibilityStateManager(this.stateManager)
    this.restoreDecision = new StateRestoreDecision()
    
    // 创建状态恢复Promise
    this.stateRestorePromise = new Promise((resolve) => {
      this.stateRestoreResolve = resolve
    })
    
    this.init()
  }

  /**
   * 等待状态恢复完成
   */
  async waitForStateRestore(): Promise<void> {
    return this.stateRestorePromise || Promise.resolve()
  }

  /**
   * 获取当前是否正在恢复状态
   */
  get isRestoringState(): boolean {
    return this.isRestoring
  }

  private async init(): Promise<void> {
    // 清理过期状态
    this.stateManager.clearExpiredState()
    
    // 检查是否需要恢复状态
    await this.checkAndRestoreState()
    
    // 设置定期保存
    this.setupPeriodicSave()
  }

  private async checkAndRestoreState(): Promise<void> {
    this.isRestoring = true
    
    try {
      const currentContext: PWAContext = {
        url: window.location.href,
        orientation: window.orientation || 0,
        timestamp: Date.now()
      }

      // 尝试从多个来源恢复状态
      const sources = [
        () => this.stateManager.restoreState(),
        () => this.indexedDBManager.restoreState(),
        () => this.swStateSync.loadState(),
        () => this.swStateSync.loadStateViaMessage()
      ]

      for (const source of sources) {
        try {
          const savedState = await source()
          if (this.restoreDecision.shouldRestoreState(savedState, currentContext)) {
            await this.restoreState(savedState!)
            console.log('PWA状态静默恢复成功')
            return
          }
        } catch (error) {
          // 静默处理错误，不输出详细错误信息
        }
      }
    } finally {
      this.isRestoring = false
      // 状态恢复完成（无论成功还是失败）
      if (this.stateRestoreResolve) {
        this.stateRestoreResolve()
        this.stateRestoreResolve = null
      }
    }
  }

  async saveCurrentState(): Promise<void> {
    const state: PWAState = {
      url: window.location.href,
      scrollPosition: window.scrollY,
      orientation: window.orientation || 0,
      timestamp: Date.now(),
      appData: this.getAppSpecificState()
    }

    // 多重保存策略
    await Promise.allSettled([
      this.stateManager.saveState(state),
      this.indexedDBManager.saveState(state),
      this.swStateSync.saveState(state),
      this.swStateSync.saveStateViaMessage(state)
    ])
  }

  private async restoreState(state: PWAState): Promise<void> {
    console.log('开始静默恢复PWA状态')

    const currentUrl = window.location.href
    const urlMatches = this.isUrlExactMatch(state.url, currentUrl)

    // 只有在URL完全匹配时才恢复滚动位置
    if (state.scrollPosition && urlMatches) {
      window.scrollTo({
        top: state.scrollPosition,
        behavior: 'auto'
      })
    }

    // 恢复应用特定状态 - 过滤掉不适用的状态
    if (state.appData) {
      this.restoreAppSpecificState(state.appData, urlMatches)
    }

    // 触发状态恢复事件
    this.dispatchStateRestoreEvent(state)
    console.log('PWA状态静默恢复完成')
  }

  private isUrlExactMatch(savedUrl: string, currentUrl: string): boolean {
    try {
      const saved = new URL(savedUrl)
      const current = new URL(currentUrl)
      return saved.pathname === current.pathname
    } catch {
      return false
    }
  }

  private setupPeriodicSave(): void {
    // 每30秒保存一次状态
    setInterval(() => {
      if (!document.hidden) {
        this.saveCurrentState()
      }
    }, 30000)
  }

  private getAppSpecificState(): any {
    // 可以在这里添加MoviePilot特定的状态
    return {
      // 路由状态
      routerState: this.getRouterState(),
      // 用户界面状态
      uiState: this.getUIState(),
      // 表单状态
      formState: this.getFormState()
    }
  }

  private getRouterState(): any {
    // 获取Vue Router状态
    return {
      currentRoute: window.location.pathname,
      query: window.location.search,
      hash: window.location.hash
    }
  }

  private getUIState(): any {
    // 获取UI状态
    return {
      sidebarOpen: document.querySelector('.v-navigation-drawer--active') !== null,
      darkMode: document.documentElement.classList.contains('dark') || 
                document.documentElement.getAttribute('data-theme') === 'dark'
    }
  }

  private getFormState(): any {
    // 获取表单状态
    const forms = document.querySelectorAll('form')
    const formData: Record<string, any> = {}
    
    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input, select, textarea')
      const data: Record<string, any> = {}
      
      inputs.forEach((input) => {
        const element = input as HTMLInputElement
        if (element.name) {
          data[element.name] = element.value
        }
      })
      
      if (Object.keys(data).length > 0) {
        formData[`form-${index}`] = data
      }
    })
    
    return formData
  }

  private restoreAppSpecificState(appData: any, urlMatches: boolean = true): void {
    // 总是恢复UI状态（如主题等）
    if (appData.uiState) {
      this.restoreUIState(appData.uiState)
    }
    
    // 只有在URL匹配时才恢复表单状态
    if (appData.formState && urlMatches) {
      this.restoreFormState(appData.formState)
    }
  }

  private restoreUIState(uiState: any): void {
    // 恢复UI状态
    if (uiState.darkMode !== undefined) {
      // 这里可以根据实际的主题切换逻辑来恢复
      console.log('恢复主题状态:', uiState.darkMode)
    }
  }

  private restoreFormState(formState: any): void {
    // 恢复表单状态
    Object.entries(formState).forEach(([formId, data]) => {
      const formIndex = parseInt(formId.split('-')[1])
      const form = document.querySelectorAll('form')[formIndex]
      
      if (form) {
        Object.entries(data as Record<string, any>).forEach(([name, value]) => {
          const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement
          if (input) {
            input.value = value as string
            // 触发change事件，以便Vue能够响应
            input.dispatchEvent(new Event('input', { bubbles: true }))
          }
        })
      }
    })
  }

  private dispatchStateRestoreEvent(state: PWAState): void {
    const event = new CustomEvent('pwaStateRestored', {
      detail: { state }
    })
    window.dispatchEvent(event)
  }
}