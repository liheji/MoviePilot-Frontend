import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// Service Worker 类型声明
declare let self: ServiceWorkerGlobalScope

// 扩展ServiceWorkerRegistration类型以支持sync
interface SyncManager {
  register(tag: string): Promise<void>
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager
}

// 扩展ExtendableEvent以支持sync事件
interface SyncEvent extends ExtendableEvent {
  readonly tag: string
  readonly lastChance: boolean
}

// 扩展ServiceWorkerGlobalScope事件映射
declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    'sync': SyncEvent
  }
}

// 缓存版本控制
const CACHE_VERSION = 'v1.0.0'
const CACHE_NAMES = {
  appShell: `app-shell-${CACHE_VERSION}`,
  static: `static-resources-${CACHE_VERSION}`,
  images: `image-cache-${CACHE_VERSION}`,
  fonts: `font-cache-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`,
  tmdb: `tmdb-image-cache-${CACHE_VERSION}`,
  pages: `pages-cache-${CACHE_VERSION}`,
}

// 缓存大小限制
const CACHE_SIZE_LIMITS = {
  appShell: { maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7天
  static: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30天
  images: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30天
  fonts: { maxEntries: 50, maxAgeSeconds: 365 * 24 * 60 * 60 }, // 1年
  api: { maxEntries: 500, maxAgeSeconds: 24 * 60 * 60 }, // 24小时
  tmdb: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7天
  pages: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7天
}

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

// 清理旧版本缓存
async function deleteOldCaches() {
  const cacheWhitelist = Object.values(CACHE_NAMES)
  const cacheNames = await caches.keys()
  
  await Promise.all(
    cacheNames.map(async (cacheName) => {
      if (!cacheWhitelist.includes(cacheName)) {
        console.log('Deleting old cache:', cacheName)
        return caches.delete(cacheName)
      }
    })
  )
}

// 获取缓存大小
async function getCacheSize(cacheName: string): Promise<number> {
  if (!('estimate' in navigator.storage)) {
    return 0
  }
  
  try {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    let totalSize = 0
    
    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }
    
    return totalSize
  } catch (error) {
    console.error('Failed to get cache size:', error)
    return 0
  }
}

// 监控缓存大小
async function monitorCacheSize() {
  const cacheSizes: Record<string, number> = {}
  let totalSize = 0
  
  for (const [key, cacheName] of Object.entries(CACHE_NAMES)) {
    const size = await getCacheSize(cacheName)
    cacheSizes[key] = size
    totalSize += size
  }
  
  // 发送缓存统计信息给客户端
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({
      type: 'CACHE_SIZE_UPDATE',
      data: {
        cacheSizes,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      }
    })
  })
  
  return { cacheSizes, totalSize }
}

// 清理过期缓存条目
async function cleanupExpiredCaches() {
  for (const [key, cacheName] of Object.entries(CACHE_NAMES)) {
    const limit = CACHE_SIZE_LIMITS[key as keyof typeof CACHE_SIZE_LIMITS]
    if (!limit) continue
    
    try {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      
      // 如果缓存条目超过限制，删除最老的条目
      if (keys.length > limit.maxEntries) {
        const deleteCount = keys.length - limit.maxEntries
        console.log(`Cleaning up ${deleteCount} entries from ${cacheName}`)
        
        // 删除最老的条目（假设数组开头是最老的）
        for (let i = 0; i < deleteCount; i++) {
          await cache.delete(keys[i])
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup cache ${cacheName}:`, error)
    }
  }
}

// 安装事件
self.addEventListener('install', () => {
  // 强制等待中的Service Worker立即成为活动的Service Worker
  self.skipWaiting()
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
      await deleteOldCaches()
      
      // 清理过期的缓存条目
      await cleanupExpiredCaches()
      
      // 监控缓存大小
      await monitorCacheSize()
    })(),
  )
  // 告诉活动的Service Worker立即控制页面
  self.clients.claim()
})

// 处理API请求，当离线时发送消息到客户端
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // 处理API请求
  if (event.request.url.includes('/api/v1/')) {
    // GET请求：尝试从缓存返回
    if (event.request.method === 'GET') {
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
            const cache = await caches.open(CACHE_NAMES.api)
            const cachedResponse = await cache.match(event.request)
            if (cachedResponse) {
              return cachedResponse
            }

            // 如果没有缓存，抛出错误
            throw error
          }
        })(),
      )
    } 
    // POST/PUT/DELETE请求：离线时加入同步队列
    else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method)) {
      event.respondWith(
        (async () => {
          try {
            // 尝试网络请求
            const networkResponse = await fetch(event.request)
            return networkResponse
          } catch (error) {
            // 网络错误时，加入同步队列
            await addToSyncQueue(event.request)
            
            // 通知客户端请求已加入队列
            if (self.clients) {
              self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                  client.postMessage({
                    type: 'REQUEST_QUEUED',
                    url: event.request.url,
                    method: event.request.method,
                  })
                })
              })
            }
            
            // 返回一个假的成功响应
            return new Response(
              JSON.stringify({ 
                success: true, 
                queued: true,
                message: '请求已加入离线队列，将在网络恢复后自动同步' 
              }),
              {
                status: 202,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }
        })(),
      )
    }
    return
  }
})

// 后台同步队列
const syncQueue: Array<{
  id: string
  url: string
  method: string
  data?: any
  timestamp: number
}> = []

// 添加请求到同步队列
async function addToSyncQueue(request: Request) {
  const id = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const url = request.url
  const method = request.method
  
  let data: any = null
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      data = await request.clone().text()
    } catch (e) {
      console.error('Failed to read request body:', e)
    }
  }
  
  const syncItem = {
    id,
    url,
    method,
    data,
    timestamp: Date.now(),
  }
  
  // 保存到IndexedDB
  await set(`sync-${id}`, syncItem)
  syncQueue.push(syncItem)
  
  // 注册后台同步
  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-data')
  }
}

// 执行同步队列中的请求
async function processSyncQueue() {
  const db = await openDB()
  const transaction = db.transaction(['badge'], 'readonly')
  const store = transaction.objectStore('badge')
  const request = store.getAllKeys()
  
  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  
  // 过滤出同步项
  const syncKeys = keys.filter(key => String(key).startsWith('sync-'))
  
  for (const key of syncKeys) {
    try {
      const syncItem = await get(String(key))
      if (!syncItem) continue
      
      // 构建请求
      const init: RequestInit = {
        method: syncItem.method,
        headers: {
          'Content-Type': 'application/json',
        },
      }
      
      if (syncItem.data) {
        init.body = syncItem.data
      }
      
      // 发送请求
      const response = await fetch(syncItem.url, init)
      
      if (response.ok) {
        // 成功后删除同步项
        const deleteTransaction = db.transaction(['badge'], 'readwrite')
        const deleteStore = deleteTransaction.objectStore('badge')
        await deleteStore.delete(key)
        
        // 通知客户端同步成功
        const clients = await self.clients.matchAll()
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            syncId: syncItem.id,
            url: syncItem.url,
          })
        })
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Sync failed for item:', key, error)
      
      // 检查是否超过24小时，如果是则删除
      const syncItem = await get(String(key))
      if (syncItem && Date.now() - syncItem.timestamp > 24 * 60 * 60 * 1000) {
        const deleteTransaction = db.transaction(['badge'], 'readwrite')
        const deleteStore = deleteTransaction.objectStore('badge')
        await deleteStore.delete(key)
      }
    }
  }
}

// 初始化 Workbox
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// 监听 sync 事件，处理后台同步
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(processSyncQueue())
  }
})

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
  } else if (event.data && event.data.type === 'CLEANUP_CACHES') {
    // 手动触发缓存清理
    Promise.all([
      deleteOldCaches(),
      cleanupExpiredCaches(),
      monitorCacheSize()
    ])
      .then(([, , cacheInfo]) => {
        event.ports[0]?.postMessage({ success: true, cacheInfo })
      })
      .catch(error => {
        event.ports[0]?.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) })
      })
  } else if (event.data && event.data.type === 'GET_CACHE_INFO') {
    // 获取缓存信息
    monitorCacheSize()
      .then(cacheInfo => {
        event.ports[0]?.postMessage({ success: true, cacheInfo })
      })
      .catch(error => {
        event.ports[0]?.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) })
      })
  }
})
