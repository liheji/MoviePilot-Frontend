/**
 * 模块联邦动态加载器
 * 用于动态加载远程组件
 */
import { defineAsyncComponent, type Component } from 'vue'
import api from '@/api'

// 远程组件加载状态
interface RemoteModuleState {
  loading: boolean
  loaded: boolean
  module: any
  error: Error | null
}

// 已加载组件的缓存
const loadedRemotes: Record<string, RemoteModuleState> = {}

// 动态注册的远程组件映射
interface RemotePluginInfo {
  url: string
  pluginId: string
  moduleName: string
}

// 已注册的远程模块
const registeredRemotes: Record<string, RemotePluginInfo> = {}

/**
 * 动态注册远程组件
 * @param pluginId 插件ID
 * @param remoteUrl 远程组件URL
 * @returns 注册成功返回true，否则返回false
 */
export async function registerRemoteComponent(pluginId: string, remoteUrl: string): Promise<boolean> {
  try {
    // 生成远程模块名称（使用插件ID作为标识）
    const moduleName = `plugin_${pluginId.replace(/[^a-zA-Z0-9_]/g, '_')}`

    // 注册到映射表中
    registeredRemotes[pluginId] = {
      url: remoteUrl,
      pluginId,
      moduleName,
    }

    console.log(`已注册远程组件: ${pluginId} -> ${moduleName} (${remoteUrl})`)
    return true
  } catch (error) {
    console.error(`注册远程组件失败: ${pluginId}`, error)
    return false
  }
}

/**
 * 获取远程组件信息
 * @param pluginId 插件ID
 * @returns 远程组件信息
 */
export function getRemoteComponent(pluginId: string): RemotePluginInfo | null {
  return registeredRemotes[pluginId] || null
}

/**
 * 获取和初始化远程组件
 * @param remoteUrl 远程组件URL
 * @param options 组件选项
 * @returns 异步组件
 */
export function loadRemoteComponent(
  remoteUrl: string,
  options: {
    timeout?: number
    onError?: (error: Error) => void
  } = {},
): Component {
  const { timeout = 30000, onError } = options

  // 创建异步组件
  return defineAsyncComponent({
    loader: async () => {
      try {
        // 检查缓存
        if (loadedRemotes[remoteUrl]?.loaded) {
          return loadedRemotes[remoteUrl].module
        }

        // 标记加载状态
        if (!loadedRemotes[remoteUrl]) {
          loadedRemotes[remoteUrl] = {
            loading: false,
            loaded: false,
            module: null,
            error: null,
          }
        }

        // 如果正在加载，等待加载完成
        if (loadedRemotes[remoteUrl].loading) {
          while (loadedRemotes[remoteUrl].loading && !loadedRemotes[remoteUrl].loaded) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          if (loadedRemotes[remoteUrl].error) {
            throw loadedRemotes[remoteUrl].error
          }
          return loadedRemotes[remoteUrl].module
        }

        loadedRemotes[remoteUrl].loading = true

        // 获取远程组件JS
        const response = await api.get(remoteUrl)
        if (!response) {
          throw new Error('无法加载远程组件：请求无响应或响应无数据')
        }

        // 创建Blob URL并动态导入
        const blob = new Blob([response as any], { type: 'text/javascript' })
        const blobUrl = URL.createObjectURL(blob)

        // 动态导入模块
        const moduleExports = await import(/* @vite-ignore */ blobUrl)

        // 清理Blob URL
        URL.revokeObjectURL(blobUrl)

        // 获取默认导出
        if (!moduleExports.default) {
          throw new Error('远程组件没有默认导出')
        }

        // 更新缓存
        loadedRemotes[remoteUrl].module = moduleExports.default
        loadedRemotes[remoteUrl].loaded = true
        loadedRemotes[remoteUrl].loading = false

        return moduleExports.default
      } catch (error: any) {
        console.error(`加载远程组件失败: ${remoteUrl}`, error)
        loadedRemotes[remoteUrl].error = error
        loadedRemotes[remoteUrl].loading = false

        // 调用错误处理回调
        if (onError) onError(error)

        // 返回一个简单的错误组件
        return {
          render: () =>
            h('div', { class: 'text-error pa-4 text-center' }, `组件加载失败: ${error.message || '未知错误'}`),
        }
      }
    },
    timeout,
    // 可以定义加载中和错误状态的组件
    loadingComponent: {
      render: () => h('div', { class: 'text-center pa-4' }, '加载组件中...'),
    },
    errorComponent: {
      render: () => h('div', { class: 'text-error pa-4 text-center' }, '组件加载失败'),
    },
  })
}

// 清除缓存的组件
export function clearRemoteComponentCache(remoteUrl?: string) {
  if (remoteUrl) {
    delete loadedRemotes[remoteUrl]
  } else {
    // 清除所有缓存
    Object.keys(loadedRemotes).forEach(key => {
      delete loadedRemotes[key]
    })
  }
}

// 取消注册远程组件
export function unregisterRemoteComponent(pluginId: string) {
  if (registeredRemotes[pluginId]) {
    delete registeredRemotes[pluginId]
    console.log(`已取消注册远程组件: ${pluginId}`)
    return true
  }
  return false
}
