/**
 * PWA 徽章管理工具
 */

// 等待Service Worker准备就绪
export async function waitForServiceWorker(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  // 如果已经有激活的Service Worker，直接返回
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller
  }

  // 等待Service Worker注册和激活
  return new Promise(resolve => {
    const checkServiceWorker = () => {
      if (navigator.serviceWorker.controller) {
        resolve(navigator.serviceWorker.controller)
      } else {
        setTimeout(checkServiceWorker, 100)
      }
    }

    // 监听Service Worker变化
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      resolve(navigator.serviceWorker.controller)
    })

    checkServiceWorker()
  })
}

// 应用启动时检查未读消息数量
export async function checkUnreadOnStartup(): Promise<number> {
  try {
    // 等待Service Worker准备就绪
    const sw = await waitForServiceWorker()
    if (!sw) {
      return 0
    }

    // 延迟500ms确保Service Worker完全准备好
    await new Promise(resolve => setTimeout(resolve, 500))

    const unreadCount = await getUnreadCount()
    return unreadCount
  } catch (error) {
    return 0
  }
}

// 清除桌面图标徽章
export async function clearAppBadge(): Promise<boolean> {
  try {
    // 如果浏览器支持原生Badge API，直接调用
    if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge()
    }

    // 向service worker发送清除徽章消息
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel()

      return new Promise(resolve => {
        messageChannel.port1.onmessage = event => {
          resolve(event.data.success)
        }

        navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_BADGE' }, [messageChannel.port2])
      })
    }

    return true
  } catch (error) {
    console.error('Failed to clear app badge:', error)
    return false
  }
}

// 更新桌面图标徽章数量
export async function updateAppBadge(count: number): Promise<boolean> {
  try {
    // 如果浏览器支持原生Badge API，直接调用
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count)
      } else {
        await navigator.clearAppBadge()
      }
    }

    // 向service worker发送更新徽章消息
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel()

      return new Promise(resolve => {
        messageChannel.port1.onmessage = event => {
          resolve(event.data.success)
        }

        navigator.serviceWorker.controller?.postMessage({ type: 'UPDATE_BADGE', count }, [messageChannel.port2])
      })
    }

    return true
  } catch (error) {
    console.error('Failed to update app badge:', error)
    return false
  }
}

// 获取Service Worker中的未读消息数量
export async function getUnreadCount(): Promise<number> {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel()

      return new Promise(resolve => {
        messageChannel.port1.onmessage = event => {
          resolve(event.data.count || 0)
        }

        navigator.serviceWorker.controller?.postMessage({ type: 'GET_UNREAD_COUNT' }, [messageChannel.port2])
      })
    }

    return 0
  } catch (error) {
    console.error('Failed to get unread count:', error)
    return 0
  }
}

// 检查浏览器是否支持Badge API
export function supportsBadgeAPI(): boolean {
  return 'setAppBadge' in navigator && 'clearAppBadge' in navigator
}
