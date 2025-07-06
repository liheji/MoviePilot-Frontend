# PWA在iOS上防止后台被杀及状态恢复解决方案

## 问题概述

PWA添加到iOS桌面后，经常遇到以下问题：
- iOS系统积极清理后台应用内存
- 重新打开PWA时页面刷新，丢失之前状态
- 用户体验不佳，类似于"冷启动"

## 核心解决策略

### 1. 实现状态持久化

#### 使用多层存储策略
```javascript
// 状态管理类
class PWAStateManager {
  constructor() {
    this.storageKey = 'pwa-app-state';
    this.sessionKey = 'pwa-session-state';
  }

  // 保存应用状态
  saveState(state) {
    try {
      // 主要状态存储到localStorage
      localStorage.setItem(this.storageKey, JSON.stringify({
        ...state,
        timestamp: Date.now()
      }));
      
      // 临时状态存储到sessionStorage
      sessionStorage.setItem(this.sessionKey, JSON.stringify({
        scrollPosition: window.scrollY,
        activeTab: state.activeTab,
        formData: state.formData
      }));
    } catch (error) {
      console.error('状态保存失败:', error);
    }
  }

  // 恢复应用状态
  restoreState() {
    try {
      const savedState = localStorage.getItem(this.storageKey);
      const sessionState = sessionStorage.getItem(this.sessionKey);
      
      if (savedState) {
        const state = JSON.parse(savedState);
        const sessionData = sessionState ? JSON.parse(sessionState) : {};
        
        return {
          ...state,
          ...sessionData,
          isRestored: true
        };
      }
    } catch (error) {
      console.error('状态恢复失败:', error);
    }
    return null;
  }

  // 清除过期状态
  clearExpiredState(maxAge = 24 * 60 * 60 * 1000) { // 24小时
    try {
      const savedState = localStorage.getItem(this.storageKey);
      if (savedState) {
        const state = JSON.parse(savedState);
        if (Date.now() - state.timestamp > maxAge) {
          localStorage.removeItem(this.storageKey);
          sessionStorage.removeItem(this.sessionKey);
        }
      }
    } catch (error) {
      console.error('清除过期状态失败:', error);
    }
  }
}
```

#### 使用IndexedDB存储大量数据
```javascript
// IndexedDB状态管理
class PWAIndexedDBManager {
  constructor() {
    this.dbName = 'PWAStateDB';
    this.dbVersion = 1;
    this.storeName = 'appState';
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async saveState(state) {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await store.put({
        id: 'appState',
        data: state,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('IndexedDB保存失败:', error);
    }
  }

  async restoreState() {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get('appState');
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB恢复失败:', error);
      return null;
    }
  }
}
```

### 2. 使用Service Worker实现状态共享

#### Service Worker状态管理
```javascript
// sw.js - Service Worker中的状态管理
const STATE_CACHE_NAME = 'pwa-state-cache';
const STATE_ENDPOINT = '/api/state';

// 激活时立即接管页面
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// 拦截状态相关请求
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (url.pathname === STATE_ENDPOINT) {
    if (request.method === 'POST') {
      event.respondWith(saveStateToCache(request));
    } else if (request.method === 'GET') {
      event.respondWith(getStateFromCache());
    }
  }
});

// 保存状态到缓存
async function saveStateToCache(request) {
  try {
    const state = await request.json();
    const cache = await caches.open(STATE_CACHE_NAME);
    
    await cache.put(STATE_ENDPOINT, new Response(JSON.stringify({
      ...state,
      timestamp: Date.now()
    })));
    
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}

// 从缓存获取状态
async function getStateFromCache() {
  try {
    const cache = await caches.open(STATE_CACHE_NAME);
    const response = await cache.match(STATE_ENDPOINT);
    
    if (response) {
      const state = await response.json();
      return new Response(JSON.stringify(state));
    }
    
    return new Response(JSON.stringify({}));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}
```

#### 客户端状态同步
```javascript
// 客户端状态同步
class ServiceWorkerStateSync {
  constructor() {
    this.stateEndpoint = '/api/state';
  }

  async saveState(state) {
    try {
      const response = await fetch(this.stateEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Service Worker状态保存失败:', error);
    }
  }

  async loadState() {
    try {
      const response = await fetch(this.stateEndpoint);
      return await response.json();
    } catch (error) {
      console.error('Service Worker状态加载失败:', error);
      return {};
    }
  }
}
```

### 3. 监听应用生命周期

#### 页面可见性监听
```javascript
// 页面可见性状态管理
class VisibilityStateManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.setupVisibilityListener();
  }

  setupVisibilityListener() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 页面被隐藏时保存状态
        this.handlePageHidden();
      } else {
        // 页面显示时恢复状态
        this.handlePageVisible();
      }
    });

    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload();
    });

    // 监听页面焦点变化
    window.addEventListener('blur', () => {
      this.handlePageBlur();
    });

    window.addEventListener('focus', () => {
      this.handlePageFocus();
    });
  }

  handlePageHidden() {
    // 页面被隐藏时保存当前状态
    const currentState = this.getCurrentAppState();
    this.stateManager.saveState(currentState);
    
    console.log('页面被隐藏，已保存状态');
  }

  handlePageVisible() {
    // 页面显示时检查是否需要恢复状态
    const restoredState = this.stateManager.restoreState();
    if (restoredState) {
      this.restoreAppState(restoredState);
      console.log('页面显示，已恢复状态');
    }
  }

  handlePageUnload() {
    // 页面卸载时最后保存状态
    const currentState = this.getCurrentAppState();
    this.stateManager.saveState(currentState);
  }

  handlePageBlur() {
    // 失去焦点时保存状态（定时器避免频繁保存）
    if (this.blurTimer) clearTimeout(this.blurTimer);
    this.blurTimer = setTimeout(() => {
      const currentState = this.getCurrentAppState();
      this.stateManager.saveState(currentState);
    }, 1000);
  }

  handlePageFocus() {
    // 获得焦点时清除定时器
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
  }

  getCurrentAppState() {
    // 获取当前应用状态（需要根据具体应用实现）
    return {
      url: window.location.href,
      scrollPosition: window.scrollY,
      timestamp: Date.now(),
      // 添加其他应用特定状态
    };
  }

  restoreAppState(state) {
    // 恢复应用状态（需要根据具体应用实现）
    if (state.scrollPosition) {
      window.scrollTo(0, state.scrollPosition);
    }
    // 恢复其他应用特定状态
  }
}
```

### 4. 实现智能状态恢复

#### 状态恢复决策器
```javascript
class StateRestoreDecision {
  constructor() {
    this.maxStateAge = 30 * 60 * 1000; // 30分钟
    this.urlChangeThreshold = 5; // URL变化阈值
  }

  shouldRestoreState(savedState, currentContext) {
    if (!savedState) return false;

    // 检查状态年龄
    if (this.isStateExpired(savedState)) {
      return false;
    }

    // 检查URL匹配
    if (!this.isUrlCompatible(savedState.url, currentContext.url)) {
      return false;
    }

    // 检查设备方向
    if (this.isOrientationChanged(savedState, currentContext)) {
      return false;
    }

    return true;
  }

  isStateExpired(savedState) {
    return Date.now() - savedState.timestamp > this.maxStateAge;
  }

  isUrlCompatible(savedUrl, currentUrl) {
    if (!savedUrl || !currentUrl) return false;
    
    const savedPath = new URL(savedUrl).pathname;
    const currentPath = new URL(currentUrl).pathname;
    
    return savedPath === currentPath;
  }

  isOrientationChanged(savedState, currentContext) {
    return savedState.orientation !== currentContext.orientation;
  }
}
```

### 5. 完整的应用状态管理器

#### 统一状态管理
```javascript
// 完整的PWA状态管理器
class PWAStateController {
  constructor() {
    this.stateManager = new PWAStateManager();
    this.indexedDBManager = new PWAIndexedDBManager();
    this.swStateSync = new ServiceWorkerStateSync();
    this.visibilityManager = new VisibilityStateManager(this.stateManager);
    this.restoreDecision = new StateRestoreDecision();
    
    this.init();
  }

  async init() {
    // 清理过期状态
    this.stateManager.clearExpiredState();
    
    // 检查是否需要恢复状态
    await this.checkAndRestoreState();
    
    // 设置定期保存
    this.setupPeriodicSave();
  }

  async checkAndRestoreState() {
    const currentContext = {
      url: window.location.href,
      orientation: window.orientation || 0,
      timestamp: Date.now()
    };

    // 尝试从多个来源恢复状态
    const sources = [
      () => this.stateManager.restoreState(),
      () => this.indexedDBManager.restoreState(),
      () => this.swStateSync.loadState()
    ];

    for (const source of sources) {
      try {
        const savedState = await source();
        if (this.restoreDecision.shouldRestoreState(savedState, currentContext)) {
          await this.restoreState(savedState);
          return;
        }
      } catch (error) {
        console.error('状态恢复失败:', error);
      }
    }
  }

  async saveCurrentState() {
    const state = {
      url: window.location.href,
      scrollPosition: window.scrollY,
      orientation: window.orientation || 0,
      timestamp: Date.now(),
      // 添加应用特定状态
      appData: this.getAppSpecificState()
    };

    // 多重保存策略
    await Promise.allSettled([
      this.stateManager.saveState(state),
      this.indexedDBManager.saveState(state),
      this.swStateSync.saveState(state)
    ]);
  }

  async restoreState(state) {
    // 恢复滚动位置
    if (state.scrollPosition) {
      window.scrollTo(0, state.scrollPosition);
    }

    // 恢复应用特定状态
    if (state.appData) {
      this.restoreAppSpecificState(state.appData);
    }

    // 触发状态恢复事件
    this.dispatchStateRestoreEvent(state);
  }

  setupPeriodicSave() {
    // 每30秒保存一次状态
    setInterval(() => {
      if (!document.hidden) {
        this.saveCurrentState();
      }
    }, 30000);
  }

  getAppSpecificState() {
    // 根据具体应用实现
    return {
      // 表单数据
      formData: this.getFormData(),
      // 用户选择
      userSelections: this.getUserSelections(),
      // 其他应用状态
    };
  }

  restoreAppSpecificState(appData) {
    // 根据具体应用实现状态恢复
    if (appData.formData) {
      this.restoreFormData(appData.formData);
    }
    if (appData.userSelections) {
      this.restoreUserSelections(appData.userSelections);
    }
  }

  dispatchStateRestoreEvent(state) {
    const event = new CustomEvent('stateRestored', {
      detail: { state }
    });
    window.dispatchEvent(event);
  }

  getFormData() {
    // 获取表单数据
    const forms = document.querySelectorAll('form');
    const formData = {};
    
    forms.forEach((form, index) => {
      const data = new FormData(form);
      formData[`form-${index}`] = Object.fromEntries(data);
    });
    
    return formData;
  }

  restoreFormData(formData) {
    // 恢复表单数据
    Object.entries(formData).forEach(([formId, data]) => {
      const formIndex = parseInt(formId.split('-')[1]);
      const form = document.querySelectorAll('form')[formIndex];
      
      if (form) {
        Object.entries(data).forEach(([name, value]) => {
          const input = form.querySelector(`[name="${name}"]`);
          if (input) {
            input.value = value;
          }
        });
      }
    });
  }

  getUserSelections() {
    // 获取用户选择状态
    return {
      selectedItems: Array.from(document.querySelectorAll('.selected')).map(el => el.id),
      activeTab: document.querySelector('.tab.active')?.id
    };
  }

  restoreUserSelections(selections) {
    // 恢复用户选择
    if (selections.selectedItems) {
      selections.selectedItems.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.classList.add('selected');
        }
      });
    }
    
    if (selections.activeTab) {
      const tab = document.getElementById(selections.activeTab);
      if (tab) {
        tab.classList.add('active');
      }
    }
  }
}
```

### 6. 使用方法

#### 在应用中集成
```javascript
// 在应用启动时初始化状态管理
document.addEventListener('DOMContentLoaded', () => {
  const stateController = new PWAStateController();
  
  // 监听状态恢复事件
  window.addEventListener('stateRestored', (event) => {
    console.log('状态已恢复:', event.detail.state);
    // 执行状态恢复后的处理
  });
});

// 在关键操作后手动保存状态
function onImportantUserAction() {
  if (window.stateController) {
    window.stateController.saveCurrentState();
  }
}
```

### 7. 最佳实践

1. **分层存储策略**：
   - localStorage：持久性强，用于核心状态
   - sessionStorage：会话级别，用于临时状态
   - IndexedDB：大量数据存储
   - Service Worker缓存：跨页面共享状态

2. **智能状态恢复**：
   - 检查状态年龄
   - 验证URL匹配
   - 考虑设备方向变化
   - 处理异常情况

3. **性能优化**：
   - 避免频繁保存状态
   - 使用防抖技术
   - 异步处理状态操作
   - 清理过期状态

4. **错误处理**：
   - 多重保存策略
   - 降级处理
   - 日志记录
   - 用户通知

### 8. 注意事项

1. **存储限制**：
   - localStorage: 约5-10MB
   - sessionStorage: 约5-10MB
   - IndexedDB: 较大容量但可能被清理
   - Service Worker缓存: 约50MB

2. **iOS特殊性**：
   - PWA不与Safari共享存储
   - 后台执行时间有限
   - 内存压力时会被清理

3. **用户体验**：
   - 提供状态恢复指示
   - 处理恢复失败情况
   - 保持操作流畅性

这个完整的解决方案应该能够显著改善PWA在iOS上的状态恢复体验，减少用户因为后台被杀而丢失状态的问题。