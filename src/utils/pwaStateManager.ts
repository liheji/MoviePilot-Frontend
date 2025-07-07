/**
 * PWA状态管理器
 * 用于在iOS设备上防止后台被杀时丢失状态，提供状态恢复功能
 * 只在页面隐藏时收集状态，避免实时监听影响性能
 */

export interface ScrollPosition {
  x: number
  y: number
  element?: string
}

export interface ModalState {
  id: string
  isOpen: boolean
  data?: any
}

export interface FormFieldState {
  selector: string
  value: string | number | boolean
  type: string
  checked?: boolean
  selectedIndex?: number
}

export interface PWAState {
  url: string
  scrollPosition: number
  scrollPositions: ScrollPosition[]
  orientation: number
  timestamp: number
  appData?: any
  formFields?: FormFieldState[]
  modalStates?: ModalState[]
}

export interface PWAContext {
  url: string
  orientation: number
  timestamp: number
}

/**
 * 状态收集器
 * 只在需要时收集状态，不进行实时监听
 */
export class StateCollector {
  static collectScrollPositions(): ScrollPosition[] {
    const positions: ScrollPosition[] = []

    positions.push({
      x: window.scrollX,
      y: window.scrollY,
      element: 'window',
    })

    const scrollContainers = [
      '.v-main__wrap',
      '.v-card-text',
      '.v-sheet',
      '.perfect-scrollbar',
      '[data-simplebar]',
      '.overflow-auto',
      '.overflow-y-auto',
    ]

    scrollContainers.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(element => {
        if (element.scrollTop > 0 || element.scrollLeft > 0) {
          positions.push({
            x: element.scrollLeft,
            y: element.scrollTop,
            element: this.generateElementSelector(element),
          })
        }
      })
    })

    return positions
  }

  static collectModalStates(): ModalState[] {
    const states: ModalState[] = []

    const modalSelectors = [
      '.v-dialog',
      '.v-menu',
      '.v-overlay',
      '.v-tooltip',
      '.v-snackbar',
      '.modal',
      '.popup',
      '.drawer',
      '.v-navigation-drawer',
      '[role="dialog"]',
      '[role="alertdialog"]',
    ]

    modalSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(element => {
        if (this.isModalOpen(element)) {
          states.push({
            id: this.getModalId(element),
            isOpen: true,
            data: this.extractModalData(element),
          })
        }
      })
    })

    return states
  }

  static collectFormFields(): FormFieldState[] {
    const fields: FormFieldState[] = []

    const formElements = document.querySelectorAll('input, textarea, select')
    formElements.forEach(element => {
      const inputElement = element as HTMLInputElement

      if (inputElement.type === 'password' || inputElement.type === 'hidden') {
        return
      }

      if (inputElement.value || inputElement.checked) {
        fields.push({
          selector: this.getFieldSelector(inputElement),
          value: inputElement.value,
          type: inputElement.type,
          checked: inputElement.checked,
          selectedIndex:
            inputElement.tagName === 'SELECT'
              ? (inputElement as unknown as HTMLSelectElement).selectedIndex
              : undefined,
        })
      }
    })

    return fields
  }

  static restoreScrollPositions(positions: ScrollPosition[]): void {
    positions.forEach(pos => {
      if (pos.element === 'window') {
        window.scrollTo({ top: pos.y, left: pos.x, behavior: 'auto' })
      } else {
        const elements = document.querySelectorAll(pos.element!)
        elements.forEach(element => {
          element.scrollTo({ top: pos.y, left: pos.x, behavior: 'auto' })
        })
      }
    })
  }

  static restoreModalStates(states: ModalState[]): void {
    states.forEach(state => {
      window.dispatchEvent(
        new CustomEvent('restoreModalState', {
          detail: state,
        }),
      )
    })
  }

  static restoreFormFields(fields: FormFieldState[]): void {
    fields.forEach(field => {
      const elements = document.querySelectorAll(field.selector)
      elements.forEach(element => {
        const inputElement = element as HTMLInputElement

        if (field.type === 'checkbox' || field.type === 'radio') {
          inputElement.checked = field.checked || false
        } else if (field.type === 'select-one' || field.type === 'select-multiple') {
          const selectElement = inputElement as unknown as HTMLSelectElement
          if (field.selectedIndex !== undefined) {
            selectElement.selectedIndex = field.selectedIndex
          }
        } else {
          inputElement.value = field.value as string
        }

        inputElement.dispatchEvent(new Event('input', { bubbles: true }))
        inputElement.dispatchEvent(new Event('change', { bubbles: true }))
      })
    })
  }

  private static isModalOpen(element: Element): boolean {
    const computedStyle = window.getComputedStyle(element)
    return (
      computedStyle.display !== 'none' &&
      computedStyle.visibility !== 'hidden' &&
      computedStyle.opacity !== '0' &&
      !element.hasAttribute('hidden') &&
      element.getAttribute('aria-hidden') !== 'true'
    )
  }

  private static getModalId(element: Element): string {
    return (
      element.id ||
      element.getAttribute('data-modal-id') ||
      element.className.replace(/\s+/g, '-') ||
      `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    )
  }

  private static extractModalData(element: Element): any {
    const data: any = {}

    const inputs = element.querySelectorAll('input, select, textarea')
    if (inputs.length > 0) {
      data.formData = {}
      inputs.forEach(input => {
        const inputElement = input as HTMLInputElement
        if (inputElement.name && inputElement.value) {
          data.formData[inputElement.name] = inputElement.value
        }
      })
    }

    const scrollableElements = element.querySelectorAll('[class*="overflow"], .v-card-text')
    if (scrollableElements.length > 0) {
      data.scrollPositions = Array.from(scrollableElements).map(el => ({
        selector: this.generateElementSelector(el),
        x: el.scrollLeft,
        y: el.scrollTop,
      }))
    }

    return data
  }

  private static generateElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`
    }

    const path = []
    let current = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()

      if (current.id) {
        selector += `#${current.id}`
        path.unshift(selector)
        break
      }

      if (current.className) {
        const classes = current.className.split(/\s+/).filter(c => c && !c.includes('v-'))
        if (classes.length > 0) {
          selector += `.${classes[0]}`
        }
      }

      // Use nth-child instead of nth-of-type, but only when necessary
      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === current.tagName && child.className === current.className,
        )

        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1
          selector += `:nth-child(${index})`
        }
      }

      path.unshift(selector)
      current = current.parentElement as Element

      if (path.length >= 4) break
    }

    return path.join(' > ')
  }

  private static getFieldSelector(element: HTMLInputElement): string {
    if (element.id) return `#${element.id}`
    if (element.name) return `[name="${element.name}"]`

    const path = []
    let current = element as Element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()

      if (current.id) {
        selector += `#${current.id}`
        path.unshift(selector)
        break
      }

      if (current.className) {
        const classes = current.className.split(/\s+/).filter(c => c)
        if (classes.length > 0) {
          selector += `.${classes[0]}`
        }
      }

      path.unshift(selector)
      current = current.parentNode as Element

      if (path.length >= 3) break
    }

    return path.join(' > ')
  }
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
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          ...state,
          timestamp: Date.now(),
        }),
      )

      // 临时状态存储到sessionStorage
      sessionStorage.setItem(
        this.sessionKey,
        JSON.stringify({
          scrollPosition: state.scrollPosition,
          activeTab: state.appData?.activeTab,
          formData: state.appData?.formData,
        }),
      )
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
          isRestored: true,
        }
      }
    } catch (error) {
      console.error('状态恢复失败:', error)
    }
    return null
  }

  // 清除过期状态
  clearExpiredState(maxAge = 24 * 60 * 60 * 1000): void {
    // 24小时
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

      request.onupgradeneeded = event => {
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
        timestamp: Date.now(),
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
      // 通过Service Worker的fetch拦截器保存状态
      const response = await fetch(this.stateEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
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
    return new Promise(resolve => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel()
        channel.port1.onmessage = event => {
          resolve(event.data.success)
        }

        navigator.serviceWorker.controller.postMessage(
          {
            type: 'SAVE_PWA_STATE',
            state,
          },
          [channel.port2],
        )
      } else {
        resolve(false)
      }
    })
  }

  async loadStateViaMessage(): Promise<PWAState | null> {
    return new Promise(resolve => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel()
        channel.port1.onmessage = event => {
          resolve(event.data.state || null)
        }

        navigator.serviceWorker.controller.postMessage(
          {
            type: 'GET_PWA_STATE',
          },
          [channel.port2],
        )
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

export class PWAStateController {
  private stateManager: PWAStateManager
  private indexedDBManager: PWAIndexedDBManager
  private swStateSync: ServiceWorkerStateSync
  private restoreDecision: StateRestoreDecision
  private stateRestorePromise: Promise<void> | null = null
  private stateRestoreResolve: (() => void) | null = null
  private isRestoring = false

  constructor() {
    this.stateManager = new PWAStateManager()
    this.indexedDBManager = new PWAIndexedDBManager()
    this.swStateSync = new ServiceWorkerStateSync()
    this.restoreDecision = new StateRestoreDecision()

    this.stateRestorePromise = new Promise(resolve => {
      this.stateRestoreResolve = resolve
    })

    this.init()
  }

  async waitForStateRestore(): Promise<void> {
    return this.stateRestorePromise || Promise.resolve()
  }

  private async init(): Promise<void> {
    this.stateManager.clearExpiredState()
    await this.checkAndRestoreState()
  }

  private async checkAndRestoreState(): Promise<void> {
    this.isRestoring = true

    try {
      const currentContext: PWAContext = {
        url: window.location.href,
        orientation: window.orientation || 0,
        timestamp: Date.now(),
      }

      // 尝试从多个来源恢复状态
      const sources = [
        () => this.stateManager.restoreState(),
        () => this.indexedDBManager.restoreState(),
        () => this.swStateSync.loadState(),
        () => this.swStateSync.loadStateViaMessage(),
      ]

      for (const source of sources) {
        try {
          const savedState = await source()
          if (this.restoreDecision.shouldRestoreState(savedState, currentContext)) {
            await this.restoreState(savedState!)
            return
          }
        } catch (error) {
          // 静默处理错误
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
    const scrollPositions = StateCollector.collectScrollPositions()
    const modalStates = StateCollector.collectModalStates()
    const formFields = StateCollector.collectFormFields()

    const state: PWAState = {
      url: window.location.href,
      scrollPosition: window.scrollY,
      scrollPositions:
        scrollPositions.length > 0 ? scrollPositions : [{ x: window.scrollX, y: window.scrollY, element: 'window' }],
      orientation: window.orientation || 0,
      timestamp: Date.now(),
      appData: this.getAppSpecificState(),
      modalStates: modalStates.length > 0 ? modalStates : undefined,
      formFields: formFields.length > 0 ? formFields : undefined,
    }

    await Promise.allSettled([
      this.stateManager.saveState(state),
      this.indexedDBManager.saveState(state),
      this.swStateSync.saveState(state),
      this.swStateSync.saveStateViaMessage(state),
    ])
  }

  private async restoreState(state: PWAState): Promise<void> {
    const currentUrl = window.location.href
    const urlMatches = this.isUrlExactMatch(state.url, currentUrl)

    if (state.scrollPositions && urlMatches) {
      StateCollector.restoreScrollPositions(state.scrollPositions)
    } else if (state.scrollPosition && urlMatches) {
      window.scrollTo({
        top: state.scrollPosition,
        behavior: 'auto',
      })
    }

    if (state.modalStates) {
      StateCollector.restoreModalStates(state.modalStates)
    }

    if (state.formFields && urlMatches) {
      StateCollector.restoreFormFields(state.formFields)
    }

    if (state.appData) {
      this.restoreAppSpecificState(state.appData)
    }

    this.dispatchStateRestoreEvent(state)
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

  private getAppSpecificState(): any {
    return {
      routerState: {
        currentRoute: window.location.pathname,
        query: window.location.search,
        hash: window.location.hash,
      },
      uiState: {
        sidebarOpen: document.querySelector('.v-navigation-drawer--active') !== null,
        darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
      },
    }
  }

  private restoreAppSpecificState(appData: any): void {
    // 基础状态恢复，可根据需要扩展
  }

  private dispatchStateRestoreEvent(state: PWAState): void {
    window.dispatchEvent(
      new CustomEvent('pwaStateRestored', {
        detail: { state },
      }),
    )
  }

  destroy(): void {
    // 无需清理资源
  }
}
