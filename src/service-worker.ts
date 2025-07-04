import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)

// 离线版本控制 - 递增此版本号将触发install事件并强制更新缓存资源
const OFFLINE_VERSION = 1
const CACHE_NAME = 'mp-offline-cache-v1'
const OFFLINE_URL = '/offline.html'

// 通知选项
const options = {
  icon: '/logo.png',
  vibrate: [100, 50, 100],
  actions: [{ action: 'close', title: '关闭' }],
}

// 存储未读消息数量的键名
const UNREAD_COUNT_KEY = 'mp_unread_count'

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
        await navigator.setAppBadge(count)
      } else {
        await navigator.clearAppBadge()
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
      await navigator.clearAppBadge()
      await setStoredUnreadCount(0)
    } catch (error) {
      console.error('Failed to clear app badge:', error)
    }
  }
}

// 安装事件 - 缓存离线页面
self.addEventListener('install', event => {
  console.log('Service Worker install, version:', OFFLINE_VERSION)
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      // 使用 {cache: 'reload'} 确保从网络获取最新的离线页面
      // 而不是从HTTP缓存中获取
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))
    })(),
  )
  // 强制等待中的Service Worker立即成为活动的Service Worker
  self.skipWaiting()
})

// 激活事件
self.addEventListener('activate', event => {
  console.log('Service Worker activate')
  event.waitUntil(
    (async () => {
      // 启用导航预载功能以提高性能
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable()
      }
    })(),
  )
  // 告诉活动的Service Worker立即控制页面
  self.clients.claim()
})

// Fetch事件 - 处理网络请求和离线回退
self.addEventListener('fetch', event => {
  // 只处理HTML页面的导航请求
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // 首先尝试使用navigationPreload响应（如果支持）
          const preloadResponse = await event.preloadResponse
          if (preloadResponse) {
            return preloadResponse
          }

          // 总是优先尝试网络请求
          const networkResponse = await fetch(event.request)
          return networkResponse
        } catch (error) {
          // 只有在抛出异常时才会触发catch，通常是由于网络错误
          // 如果fetch()返回4xx或5xx响应码，不会触发catch
          console.log('网络请求失败，返回离线页面:', error)

          const cache = await caches.open(CACHE_NAME)
          const cachedResponse = await cache.match(OFFLINE_URL)
          return cachedResponse || new Response('离线页面不可用', { status: 503 })
        }
      })(),
    )
  }
})

// 监听 push 事件，显示通知
self.addEventListener('push', function (event) {
  console.log('notification push')
  if (!event.data) {
    return
  }
  // 解析获取推送消息
  let payload
  try {
    payload = event.data?.json()
  } catch (err) {
    console.log(err)
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
    console.error(e)
  }
})

// 监听通知点击事件
self.addEventListener('notificationclick', function (event) {
  console.log('notification click')
  const info = event.notification
  if (event.action === 'close') {
    info.close()
  } else if (info.data?.url) {
    event.waitUntil(self.clients.openWindow(info.data?.url))
  }
})

// 监听来自主应用的消息，用于清除徽章或更新徽章数量
self.addEventListener('message', function (event) {
  console.log('service worker received message:', event.data)

  if (event.data && event.data.type === 'CLEAR_BADGE') {
    // 清除徽章
    clearBadge()
      .then(() => {
        event.ports[0]?.postMessage({ success: true })
      })
      .catch(error => {
        console.error('Failed to clear badge:', error)
        event.ports[0]?.postMessage({ success: false, error: error.message })
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
        console.error('Failed to update badge:', error)
        event.ports[0]?.postMessage({ success: false, error: error.message })
      })
  } else if (event.data && event.data.type === 'GET_UNREAD_COUNT') {
    // 获取未读消息数量
    getStoredUnreadCount()
      .then(count => {
        event.ports[0]?.postMessage({ count })
      })
      .catch(error => {
        console.error('Failed to get unread count:', error)
        event.ports[0]?.postMessage({ count: 0 })
      })
  }
})
