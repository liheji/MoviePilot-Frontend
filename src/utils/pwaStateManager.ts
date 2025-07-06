/**
 * PWA状态管理器 - 增强版本
 * 用于在iOS设备上防止后台被杀时丢失状态，提供状态恢复功能
 * 新增功能：实时表单保存、弹窗状态管理、增强滚动位置管理
 */

// 滚动位置接口
export interface ScrollPosition {
  x: number
  y: number
  element?: string // 元素选择器
}

// 弹窗状态接口
export interface ModalState {
  id: string
  isOpen: boolean
  data?: any
  position?: { x: number; y: number }
}

// 表单字段状态接口
export interface FormFieldState {
  selector: string
  value: string | number | boolean
  type: string
  checked?: boolean
  selectedIndex?: number
}

// 应用状态接口 - 增强版本
export interface PWAState {
  url: string
  scrollPosition: number
  scrollPositions: ScrollPosition[] // 多个滚动位置
  orientation: number
  timestamp: number
  appData?: any
  formData?: Record<string, any>
  formFields?: FormFieldState[] // 详细的表单字段状态
  modalStates?: ModalState[] // 弹窗状态
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
 * 增强的滚动位置管理器
 */
export class EnhancedScrollManager {
  private scrollPositions = new Map<string, ScrollPosition>()
  private scrollObservers = new Map<string, MutationObserver>()
  private debounceTimer: number | null = null
  private saveCallback: (positions: ScrollPosition[]) => void

  constructor(saveCallback: (positions: ScrollPosition[]) => void) {
    this.saveCallback = saveCallback
    this.initScrollTracking()
  }

  private initScrollTracking(): void {
    // 监听主窗口滚动
    window.addEventListener('scroll', this.debounceScrollSave.bind(this), { passive: true })
    
    // 监听常见的滚动容器
    const scrollContainers = [
      '.v-main__wrap',
      '.v-card-text',
      '.v-sheet',
      '.perfect-scrollbar',
      '[data-simplebar]',
      '.overflow-auto',
      '.overflow-y-auto'
    ]
    
    scrollContainers.forEach(selector => {
      this.observeScrollContainer(selector)
    })
  }

  private observeScrollContainer(selector: string): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              if (element.matches(selector)) {
                this.addScrollListener(element, selector)
              }
              // 也检查子元素
              element.querySelectorAll(selector).forEach((child) => {
                this.addScrollListener(child, selector)
              })
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    this.scrollObservers.set(selector, observer)

    // 立即处理已存在的元素
    document.querySelectorAll(selector).forEach((element) => {
      this.addScrollListener(element, selector)
    })
  }

  private addScrollListener(element: Element, selector: string): void {
    if (element.getAttribute('data-scroll-tracked')) return
    
    element.setAttribute('data-scroll-tracked', 'true')
    element.addEventListener('scroll', () => {
      this.updateScrollPosition(element, selector)
    }, { passive: true })
  }

  private updateScrollPosition(element: Element, selector: string): void {
    const scrollPos: ScrollPosition = {
      x: element.scrollLeft,
      y: element.scrollTop,
      element: selector
    }
    this.scrollPositions.set(selector, scrollPos)
    this.debounceScrollSave()
  }

  private debounceScrollSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = window.setTimeout(() => {
      // 主窗口滚动
      this.scrollPositions.set('window', {
        x: window.scrollX,
        y: window.scrollY,
        element: 'window'
      })
      
      this.saveCallback(Array.from(this.scrollPositions.values()))
    }, 100)
  }

  restoreScrollPositions(positions: ScrollPosition[]): void {
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

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.scrollObservers.forEach(observer => observer.disconnect())
    this.scrollObservers.clear()
    this.scrollPositions.clear()
  }
}

/**
 * 弹窗状态管理器
 */
export class ModalStateManager {
  private modalStates = new Map<string, ModalState>()
  private mutationObserver: MutationObserver | null = null
  private saveCallback: (states: ModalState[]) => void

  constructor(saveCallback: (states: ModalState[]) => void) {
    this.saveCallback = saveCallback
    this.initModalTracking()
  }

  private initModalTracking(): void {
    // 监听DOM变化来检测弹窗的打开和关闭
    this.mutationObserver = new MutationObserver((mutations) => {
      let hasModalChanges = false
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // 检查新添加的弹窗
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              if (this.isModalElement(element)) {
                this.trackModal(element)
                hasModalChanges = true
              }
            }
          })
        } else if (mutation.type === 'attributes') {
          const element = mutation.target as Element
          if (this.isModalElement(element)) {
            this.updateModalState(element)
            hasModalChanges = true
          }
        }
      })

      if (hasModalChanges) {
        this.saveStates()
      }
    })

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden', 'data-*']
    })

    // 立即扫描已存在的弹窗
    this.scanExistingModals()
  }

  private isModalElement(element: Element): boolean {
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
      '[role="tooltip"]'
    ]
    
    return modalSelectors.some(selector => 
      element.matches(selector) || element.querySelector(selector)
    )
  }

  private trackModal(element: Element): void {
    const id = this.getModalId(element)
    const isOpen = this.isModalOpen(element)
    
    if (isOpen) {
      const state: ModalState = {
        id,
        isOpen: true,
        data: this.extractModalData(element)
      }
      
      this.modalStates.set(id, state)
    } else {
      this.modalStates.delete(id)
    }
  }

  private updateModalState(element: Element): void {
    const id = this.getModalId(element)
    const isOpen = this.isModalOpen(element)
    
    if (isOpen) {
      const state: ModalState = {
        id,
        isOpen: true,
        data: this.extractModalData(element)
      }
      this.modalStates.set(id, state)
    } else {
      this.modalStates.delete(id)
    }
  }

  private getModalId(element: Element): string {
    return element.id || 
           element.getAttribute('data-modal-id') ||
           element.className.replace(/\s+/g, '-') ||
           `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private isModalOpen(element: Element): boolean {
    const computedStyle = window.getComputedStyle(element)
    
    // 检查多种可能的显示状态
    return computedStyle.display !== 'none' &&
           computedStyle.visibility !== 'hidden' &&
           computedStyle.opacity !== '0' &&
           !element.hasAttribute('hidden') &&
           element.getAttribute('aria-hidden') !== 'true' &&
           !element.classList.contains('v-overlay--active') === false
  }

  private extractModalData(element: Element): any {
    const data: any = {}
    
    // 提取表单数据
    const form = element.querySelector('form')
    if (form) {
      data.formData = this.extractFormData(form)
    }
    
    // 提取输入字段
    const inputs = element.querySelectorAll('input, select, textarea')
    if (inputs.length > 0) {
      data.inputData = this.extractInputData(inputs)
    }
    
    // 提取滚动位置
    const scrollableElements = element.querySelectorAll('[class*="overflow"], .v-card-text')
    if (scrollableElements.length > 0) {
      data.scrollPositions = Array.from(scrollableElements).map(el => ({
        selector: this.getElementSelector(el),
        x: el.scrollLeft,
        y: el.scrollTop
      }))
    }
    
    return data
  }

  private extractFormData(form: Element): Record<string, any> {
    const formData: Record<string, any> = {}
    const inputs = form.querySelectorAll('input, select, textarea')
    
    inputs.forEach(input => {
      const element = input as HTMLInputElement
      if (element.name) {
        formData[element.name] = element.value
      }
    })
    
    return formData
  }

  private extractInputData(inputs: NodeListOf<Element>): Record<string, any> {
    const inputData: Record<string, any> = {}
    
    inputs.forEach(input => {
      const element = input as HTMLInputElement
      const key = element.name || element.id || this.getElementSelector(element)
      inputData[key] = element.value
    })
    
    return inputData
  }

  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`
    if (element.className) return `.${element.className.split(' ')[0]}`
    return element.tagName.toLowerCase()
  }

  private scanExistingModals(): void {
    const modalSelectors = [
      '.v-dialog',
      '.v-menu',
      '.v-overlay',
      '.modal',
      '.popup',
      '[role="dialog"]'
    ]
    
    modalSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (this.isModalOpen(element)) {
          this.trackModal(element)
        }
      })
    })
    
    this.saveStates()
  }

  private saveStates(): void {
    this.saveCallback(Array.from(this.modalStates.values()))
  }

  restoreModalStates(states: ModalState[]): void {
    // 此方法需要与应用的具体弹窗实现配合
    // 可以通过事件系统通知应用恢复弹窗状态
    states.forEach(state => {
      const event = new CustomEvent('restoreModalState', {
        detail: state
      })
      window.dispatchEvent(event)
    })
  }

  destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }
    this.modalStates.clear()
  }
}

/**
 * 实时表单数据管理器
 */
export class RealTimeFormManager {
  private formFields = new Map<string, FormFieldState>()
  private debounceTimer: number | null = null
  private saveCallback: (fields: FormFieldState[]) => void
  private observers = new Set<MutationObserver>()

  constructor(saveCallback: (fields: FormFieldState[]) => void) {
    this.saveCallback = saveCallback
    this.initFormTracking()
  }

  private initFormTracking(): void {
    // 监听表单输入事件
    const inputEvents = ['input', 'change', 'blur', 'focus']
    inputEvents.forEach(eventType => {
      document.addEventListener(eventType, this.handleFormInput.bind(this), true)
    })

    // 监听DOM变化，跟踪新添加的表单元素
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              this.trackFormElements(element)
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    this.observers.add(observer)

    // 立即扫描已存在的表单元素
    this.scanExistingForms()
  }

  private handleFormInput(event: Event): void {
    const target = event.target as HTMLInputElement
    if (this.isFormElement(target)) {
      this.updateFormField(target)
    }
  }

  private isFormElement(element: Element): boolean {
    const formTags = ['INPUT', 'TEXTAREA', 'SELECT']
    return formTags.includes(element.tagName)
  }

  private updateFormField(element: HTMLInputElement): void {
    const selector = this.getFieldSelector(element)
    const fieldState: FormFieldState = {
      selector,
      value: element.value,
      type: element.type,
      checked: element.checked,
      selectedIndex: element.tagName === 'SELECT' ? (element as unknown as HTMLSelectElement).selectedIndex : undefined
    }

    this.formFields.set(selector, fieldState)
    this.debounceSave()
  }

  private getFieldSelector(element: HTMLInputElement): string {
    if (element.id) return `#${element.id}`
    if (element.name) return `[name="${element.name}"]`
    
    // 构建更复杂的选择器
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
      
      const siblings = Array.from(current.parentNode?.children || [])
        .filter(sibling => sibling.tagName === current.tagName)
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }
      
      path.unshift(selector)
      current = current.parentNode as Element
    }
    
    return path.join(' > ')
  }

  private trackFormElements(element: Element): void {
    const formElements = element.querySelectorAll('input, textarea, select')
    formElements.forEach(formElement => {
      this.updateFormField(formElement as HTMLInputElement)
    })

    // 如果元素本身是表单元素
    if (this.isFormElement(element)) {
      this.updateFormField(element as HTMLInputElement)
    }
  }

  private scanExistingForms(): void {
    const formElements = document.querySelectorAll('input, textarea, select')
    formElements.forEach(element => {
      this.updateFormField(element as HTMLInputElement)
    })
  }

  private debounceSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = window.setTimeout(() => {
      this.saveCallback(Array.from(this.formFields.values()))
    }, 500) // 500ms防抖
  }

  restoreFormFields(fields: FormFieldState[]): void {
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
        
        // 触发事件以便Vue能够响应
        inputElement.dispatchEvent(new Event('input', { bubbles: true }))
        inputElement.dispatchEvent(new Event('change', { bubbles: true }))
      })
    })
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.formFields.clear()
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
      }
    } catch (error) {
      // 静默处理错误
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
      scrollPositions: [{ x: window.scrollX, y: window.scrollY, element: 'window' }],
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
 * 完整的PWA状态管理器 - 增强版本
 */
export class PWAStateController {
  private stateManager: PWAStateManager
  private indexedDBManager: PWAIndexedDBManager
  private swStateSync: ServiceWorkerStateSync
  private visibilityManager: VisibilityStateManager
  private restoreDecision: StateRestoreDecision
  private enhancedScrollManager: EnhancedScrollManager
  private modalStateManager: ModalStateManager
  private realTimeFormManager: RealTimeFormManager
  private stateRestorePromise: Promise<void> | null = null
  private stateRestoreResolve: (() => void) | null = null
  private isRestoring = false

  constructor() {
    this.stateManager = new PWAStateManager()
    this.indexedDBManager = new PWAIndexedDBManager()
    this.swStateSync = new ServiceWorkerStateSync()
    this.visibilityManager = new VisibilityStateManager(this.stateManager)
    this.restoreDecision = new StateRestoreDecision()
    
    // 初始化增强管理器
    this.enhancedScrollManager = new EnhancedScrollManager((positions) => {
      this.saveScrollPositions(positions)
    })
    
    this.modalStateManager = new ModalStateManager((states) => {
      this.saveModalStates(states)
    })
    
    this.realTimeFormManager = new RealTimeFormManager((fields) => {
      this.saveFormFields(fields)
    })
    
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
    // 从sessionStorage获取实时状态
    const scrollPositions = this.getScrollPositionsFromStorage()
    const modalStates = this.getModalStatesFromStorage()
    const formFields = this.getFormFieldsFromStorage()

    const state: PWAState = {
      url: window.location.href,
      scrollPosition: window.scrollY,
      scrollPositions: scrollPositions.length > 0 ? scrollPositions : [{ x: window.scrollX, y: window.scrollY, element: 'window' }],
      orientation: window.orientation || 0,
      timestamp: Date.now(),
      appData: this.getAppSpecificState(),
      modalStates: modalStates.length > 0 ? modalStates : undefined,
      formFields: formFields.length > 0 ? formFields : undefined
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
    const currentUrl = window.location.href
    const urlMatches = this.isUrlExactMatch(state.url, currentUrl)

    // 使用增强滚动管理器恢复滚动位置
    if (state.scrollPositions && urlMatches) {
      this.enhancedScrollManager.restoreScrollPositions(state.scrollPositions)
    } else if (state.scrollPosition && urlMatches) {
      // 向后兼容：如果没有新的滚动位置数据，使用旧的方式
      window.scrollTo({
        top: state.scrollPosition,
        behavior: 'auto'
      })
    }

    // 恢复弹窗状态
    if (state.modalStates) {
      this.modalStateManager.restoreModalStates(state.modalStates)
    }

    // 恢复表单字段
    if (state.formFields && urlMatches) {
      this.realTimeFormManager.restoreFormFields(state.formFields)
    }

    // 恢复应用特定状态 - 过滤掉不适用的状态
    if (state.appData) {
      this.restoreAppSpecificState(state.appData, urlMatches)
    }

    // 从sessionStorage恢复额外的状态
    this.restoreFromSessionStorage(urlMatches)

    // 触发状态恢复事件
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

  private setupPeriodicSave(): void {
    // 导入后台管理器
    import('@/utils/backgroundManager').then(({ addBackgroundTimer }) => {
      // 使用后台管理器，延长间隔
      addBackgroundTimer(
        'pwa-state-save',
        () => {
          // 只在前台时保存状态（由后台管理器自动处理）
          this.saveCurrentState()
        },
        60000, // 改为60秒，减少频率
        {
          runInBackground: false, // 后台时不保存
          skipInitialRun: true
        }
      )
    })
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

  /**
   * 保存滚动位置（被增强滚动管理器调用）
   */
  private saveScrollPositions(positions: ScrollPosition[]): void {
    // 实时保存滚动位置到sessionStorage
    try {
      sessionStorage.setItem('mp-scroll-positions', JSON.stringify(positions))
    } catch (error) {
      console.error('保存滚动位置失败:', error)
    }
  }

  /**
   * 保存弹窗状态（被弹窗状态管理器调用）
   */
  private saveModalStates(states: ModalState[]): void {
    // 实时保存弹窗状态到sessionStorage
    try {
      sessionStorage.setItem('mp-modal-states', JSON.stringify(states))
    } catch (error) {
      console.error('保存弹窗状态失败:', error)
    }
  }

  /**
   * 保存表单字段（被实时表单管理器调用）
   */
  private saveFormFields(fields: FormFieldState[]): void {
    // 实时保存表单字段到sessionStorage
    try {
      sessionStorage.setItem('mp-form-fields', JSON.stringify(fields))
    } catch (error) {
      console.error('保存表单字段失败:', error)
    }
  }

  /**
   * 从sessionStorage恢复额外的状态
   */
  private restoreFromSessionStorage(urlMatches: boolean): void {
    try {
      // 恢复滚动位置
      if (urlMatches) {
        const scrollPositions = sessionStorage.getItem('mp-scroll-positions')
        if (scrollPositions) {
          const positions: ScrollPosition[] = JSON.parse(scrollPositions)
          this.enhancedScrollManager.restoreScrollPositions(positions)
        }
      }

      // 恢复弹窗状态
      const modalStates = sessionStorage.getItem('mp-modal-states')
      if (modalStates) {
        const states: ModalState[] = JSON.parse(modalStates)
        this.modalStateManager.restoreModalStates(states)
      }

      // 恢复表单字段
      if (urlMatches) {
        const formFields = sessionStorage.getItem('mp-form-fields')
        if (formFields) {
          const fields: FormFieldState[] = JSON.parse(formFields)
          this.realTimeFormManager.restoreFormFields(fields)
        }
      }
    } catch (error) {
      console.error('从sessionStorage恢复状态失败:', error)
    }
  }

  /**
   * 从sessionStorage获取滚动位置
   */
  private getScrollPositionsFromStorage(): ScrollPosition[] {
    try {
      const stored = sessionStorage.getItem('mp-scroll-positions')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      return []
    }
  }

  /**
   * 从sessionStorage获取弹窗状态
   */
  private getModalStatesFromStorage(): ModalState[] {
    try {
      const stored = sessionStorage.getItem('mp-modal-states')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      return []
    }
  }

  /**
   * 从sessionStorage获取表单字段
   */
  private getFormFieldsFromStorage(): FormFieldState[] {
    try {
      const stored = sessionStorage.getItem('mp-form-fields')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      return []
    }
  }

  /**
   * 销毁管理器并清理资源
   */
  destroy(): void {
    this.enhancedScrollManager.destroy()
    this.modalStateManager.destroy()
    this.realTimeFormManager.destroy()
  }
}