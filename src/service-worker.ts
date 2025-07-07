import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// Service Worker 类型声明
declare let self: ServiceWorkerGlobalScope

// 通知选项
const options = {
  icon: '/logo.png',
  vibrate: [100, 50, 100],
  actions: [{ action: 'close', title: '关闭' }],
}

// 存储未读消息数量的键名
const UNREAD_COUNT_KEY = 'mp_unread_count'

// 状态管理相关的缓存名称和端点
const STATE_CACHE_NAME = 'mp-pwa-state-cache'
const STATE_ENDPOINT = '/api/pwa-state'

// 从IndexedDB获取未读消息数量
async function getStoredUnreadCount(): Promise<number> {
  try {
    const count = await get(UNREAD_COUNT_KEY)
    return count || 0
  } catch (error) {
    console.error('Failed to get stored unread count:', error)
    return 0
  }
}

// 保存未读消息数量到IndexedDB
async function setStoredUnreadCount(count: number): Promise<void> {
  try {
    await set(UNREAD_COUNT_KEY, count)
  } catch (error) {
    console.error('Failed to set stored unread count:', error)
  }
}

// 保存PWA状态到缓存
async function saveStateToCache(request: Request): Promise<Response> {
  try {
    const state = await request.json()
    const cache = await caches.open(STATE_CACHE_NAME)

    await cache.put(
      STATE_ENDPOINT,
      new Response(
        JSON.stringify({
          ...state,
          timestamp: Date.now(),
        }),
      ),
    )

    return new Response(JSON.stringify({ success: true }))
  } catch (error) {
    console.error('Failed to save state to cache:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

// 从缓存获取PWA状态
async function getStateFromCache(): Promise<Response> {
  try {
    const cache = await caches.open(STATE_CACHE_NAME)
    const response = await cache.match(STATE_ENDPOINT)

    if (response) {
      const state = await response.json()
      return new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Failed to get state from cache:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// 简单的IndexedDB包装器
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mp_badge_db', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('badge')) {
        db.createObjectStore('badge')
      }
    }
  })
}

// 获取IndexedDB中的数据
async function get(key: string): Promise<any> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['badge'], 'readonly')
    const store = transaction.objectStore('badge')
    const request = store.get(key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

// 保存数据到IndexedDB
async function set(key: string, value: any): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['badge'], 'readwrite')
    const store = transaction.objectStore('badge')
    const request = store.put(value, key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// 更新桌面图标徽章
async function updateBadge(count: number) {
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await navigator.setAppBadge!(count)
      } else {
        await navigator.clearAppBadge!()
      }
    } catch (error) {
      console.error('Failed to update app badge:', error)
    }
  }
}

// 清除桌面图标徽章
async function clearBadge() {
  if ('clearAppBadge' in navigator) {
    try {
      await navigator.clearAppBadge!()
      await setStoredUnreadCount(0)
    } catch (error) {
      console.error('Failed to clear app badge:', error)
    }
  }
}

// 安装事件
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      // 预缓存关键状态数据
      try {
        const cache = await caches.open(STATE_CACHE_NAME)
        const existingState = await cache.match(STATE_ENDPOINT)

        if (existingState) {
          // 预热状态数据（无需处理，仅确保缓存可用）
        }
      } catch (error) {
        // 静默处理错误
      }

      // 强制等待中的Service Worker立即成为活动的Service Worker
      self.skipWaiting()
    })(),
  )
})

// 激活事件
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // 启用导航预载功能以提高性能
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable()
      }

      // 清理旧版本的缓存
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.includes('old-') || cacheName.includes('deprecated-')) {
            return caches.delete(cacheName)
          }
        }),
      )
    })(),
  )
  // 告诉活动的Service Worker立即控制页面
  self.clients.claim()
})

// 处理API请求，当离线时发送消息到客户端
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // 处理PWA状态管理请求
  if (url.pathname === STATE_ENDPOINT) {
    if (event.request.method === 'POST') {
      event.respondWith(saveStateToCache(event.request))
    } else if (event.request.method === 'GET') {
      event.respondWith(getStateFromCache())
    }
    return
  }

  if (event.request.url.includes('/api/v1/') && event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        try {
          // 尝试网络请求
          const networkResponse = await fetch(event.request)
          return networkResponse
        } catch (error) {
          // 网络错误时，通知客户端当前处于离线状态
          if (self.clients) {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'OFFLINE_STATUS',
                  offline: true,
                })
              })
            })
          }

          // 尝试返回缓存的响应
          const cache = await caches.open('api-cache')
          const cachedResponse = await cache.match(event.request)
          if (cachedResponse) {
            return cachedResponse
          }

          // 如果没有缓存，抛出错误
          throw error
        }
      })(),
    )
    return
  }
})

// 初始化 Workbox
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// 监听 push 事件，显示通知
self.addEventListener('push', function (event) {
  if (!event.data) {
    return
  }
  // 解析获取推送消息
  let payload
  try {
    payload = event.data?.json()
  } catch (err) {
    payload = {
      title: event.data?.text(),
    }
  }
  // 根据推送消息生成桌面通知并展现出来
  try {
    const content = {
      body: payload.body || '',
      icon: payload.icon || options.icon,
      vibrate: [100, 50, 100],
      data: { url: payload.url },
      actions: options.actions,
    }

    // 增加未读消息计数并持久化存储
    event.waitUntil(
      (async () => {
        const currentCount = await getStoredUnreadCount()
        const newCount = currentCount + 1
        await setStoredUnreadCount(newCount)
        await Promise.all([self.registration.showNotification(payload.title, content), updateBadge(newCount)])
      })(),
    )
  } catch (e) {
    // 静默处理错误
  }
})

// 监听通知点击事件
self.addEventListener('notificationclick', function (event) {
  const info = event.notification
  if (event.action === 'close') {
    info.close()
  } else if (info.data?.url) {
    event.waitUntil(self.clients.openWindow(info.data?.url))
  }
})

// 监听来自主应用的消息，用于清除徽章或更新徽章数量
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    // 清除徽章
    clearBadge()
      .then(() => {
        event.ports[0]?.postMessage({ success: true })
      })
      .catch(error => {
        event.ports[0]?.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) })
      })
  } else if (event.data && event.data.type === 'UPDATE_BADGE') {
    // 更新徽章数量
    const count = event.data.count || 0
    setStoredUnreadCount(count)
      .then(() => updateBadge(count))
      .then(() => {
        event.ports[0]?.postMessage({ success: true })
      })
      .catch(error => {
        event.ports[0]?.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) })
      })
  } else if (event.data && event.data.type === 'GET_UNREAD_COUNT') {
    // 获取未读消息数量
    getStoredUnreadCount()
      .then(count => {
        event.ports[0]?.postMessage({ count })
      })
      .catch(error => {
        event.ports[0]?.postMessage({ count: 0 })
      })
  } else if (event.data && event.data.type === 'SAVE_PWA_STATE') {
    // 保存PWA状态
    const state = event.data.state || {}
    saveStateToCache(
      new Request(STATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }),
    )
      .then(response => response.json())
      .then(result => {
        event.ports[0]?.postMessage({ success: result.success })
      })
      .catch(error => {
        event.ports[0]?.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) })
      })
  } else if (event.data && event.data.type === 'GET_PWA_STATE') {
    // 获取PWA状态
    getStateFromCache()
      .then(response => response.json())
      .then(state => {
        event.ports[0]?.postMessage({ state })
      })
      .catch(error => {
        event.ports[0]?.postMessage({ state: {} })
      })
  }
})
