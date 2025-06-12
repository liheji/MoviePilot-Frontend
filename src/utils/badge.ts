/**
 * PWA 徽章管理工具
 */

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

// 检查浏览器是否支持Badge API
export function supportsBadgeAPI(): boolean {
  return 'setAppBadge' in navigator && 'clearAppBadge' in navigator
}
