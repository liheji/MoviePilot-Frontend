import { createHandlerBoundToURL, cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)

// to allow work offline
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^(\/[\w-]+)*\/api/] }))

// 消息计数器，用于存储未读消息数量
let unreadCount = 0

// 通知选项
const options = {
  icon: '/logo.png',
  vibrate: [100, 50, 100],
  actions: [{ action: 'close', title: '关闭' }],
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
      unreadCount = 0
    } catch (error) {
      console.error('Failed to clear app badge:', error)
    }
  }
}

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

    // 增加未读消息计数
    unreadCount++

    // 更新桌面图标徽章
    event.waitUntil(Promise.all([self.registration.showNotification(payload.title, content), updateBadge(unreadCount)]))
  } catch (e) {
    console.error(e)
  }
})

// 安装
self.addEventListener('install', function (e) {
  console.log('worker install')
  self.skipWaiting()
})

// 激活
self.addEventListener('activate', function (e) {
  console.log('worker activate')
  e.waitUntil(self.clients.claim())
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
    event.ports[0]?.postMessage({ success: true })
  } else if (event.data && event.data.type === 'UPDATE_BADGE') {
    // 更新徽章数量
    const count = event.data.count || 0
    unreadCount = count
    updateBadge(count)
      .then(() => {
        event.ports[0]?.postMessage({ success: true })
      })
      .catch(error => {
        console.error('Failed to update badge:', error)
        event.ports[0]?.postMessage({ success: false, error: error.message })
      })
  }
})
