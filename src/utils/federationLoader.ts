/**
 * 动态模块联邦加载器
 * 支持运行时动态注册和加载远程模块联邦组件
 */
import api from '@/api'
import type { Component } from 'vue'

// 远程组件配置接口
export interface RemoteComponentConfig {
  id: string
  url?: string
  [key: string]: any
}

// 组件类型
export enum ComponentType {
  PAGE = 'page',
  CONFIG = 'config',
  DASHBOARD = 'dashboard',
}

// 远程组件映射
interface RemoteModuleMap {
  [pluginId: string]: {
    [componentType in ComponentType]?: {
      loaded: boolean
      loading: boolean
      error: Error | null
    }
  }
}

// 已加载的远程组件状态
const remoteModules: RemoteModuleMap = {}

// 全局联邦容器
declare global {
  interface Window {
    __FEDERATION__: Record<string, any>
  }
}

// 确保全局联邦对象存在
if (!window.__FEDERATION__) {
  window.__FEDERATION__ = {}
}

/**
 * 加载远程模块的入口文件
 * @param url 远程模块URL
 * @returns Promise<void>
 */
async function loadRemoteEntry(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 创建script标签
    const script = document.createElement('script')
    script.src = url
    script.type = 'text/javascript'
    script.async = true

    // 加载成功
    script.onload = () => {
      console.log(`远程模块加载成功: ${url}`)
      resolve()
    }

    // 加载失败
    script.onerror = error => {
      console.error(`远程模块加载失败: ${url}`, error)
      reject(new Error(`远程模块加载失败: ${url}`))
    }

    // 添加到文档
    document.head.appendChild(script)
  })
}

/**
 * 获取模块联邦远程URL的标准化地址
 * @param pluginId 插件ID
 * @param url 组件URL (可选)
 * @returns 完整的远程组件URL
 */
function getRemoteEntryUrl(pluginId: string, url?: string): string {
  // 如果提供了完整URL则直接使用
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
    return url.endsWith('/remoteEntry.js') ? url : `${url}/remoteEntry.js`
  }

  // 否则使用默认路径格式
  return `/api/plugin/component/${pluginId}/remoteEntry.js`
}

/**
 * 获取组件类型对应的模块名称
 * @param componentType 组件类型
 * @returns 模块名称
 */
function getComponentModule(componentType: ComponentType): string {
  switch (componentType) {
    case ComponentType.PAGE:
      return './Page'
    case ComponentType.CONFIG:
      return './Config'
    case ComponentType.DASHBOARD:
      return './Dashboard'
    default:
      return './Component'
  }
}

/**
 * 从后端API获取远程组件列表并加载
 * @returns Promise<boolean> 是否加载成功
 */
export async function loadRemoteComponents(): Promise<boolean> {
  try {
    // 调用后端API获取远程组件列表
    const result = await api.get('plugins/remotes')

    if (!result || !Array.isArray(result)) {
      console.error('获取远程组件列表失败：无效的响应格式')
      return false
    }

    // 加载所有远程组件
    const remotes = result as RemoteComponentConfig[]
    const loadPromises = remotes.map(remote => {
      if (remote.id) {
        return registerRemotePlugin(remote.id, remote.url).catch(err => {
          console.error(`注册插件失败: ${remote.id}`, err)
          return false
        })
      }
      return Promise.resolve(false)
    })

    await Promise.allSettled(loadPromises)
    console.log(`已加载远程组件列表, 成功加载: ${loadPromises.length} 个`)
    return true
  } catch (error) {
    console.error('加载远程组件列表失败', error)
    return false
  }
}

/**
 * 注册远程插件
 * @param pluginId 插件ID
 * @param url 远程URL (可选)
 * @returns Promise<boolean> 是否注册成功
 */
export async function registerRemotePlugin(pluginId: string, url?: string): Promise<boolean> {
  try {
    // 生成远程插件的标识符
    const remoteId = `plugin_${pluginId.replace(/[^a-zA-Z0-9_]/g, '_')}`

    // 获取完整的远程入口URL
    const remoteEntryUrl = getRemoteEntryUrl(pluginId, url)

    // 加载远程入口
    await loadRemoteEntry(remoteEntryUrl)

    // 初始化插件状态
    if (!remoteModules[pluginId]) {
      remoteModules[pluginId] = {}
    }

    // 注册到全局联邦对象 (如果尚未注册)
    if (!window.__FEDERATION__[remoteId]) {
      // 在这里我们假设远程模块已经挂载到全局作用域
      // 真实环境中这部分可能需要根据模块联邦的实际工作方式调整
      window.__FEDERATION__[remoteId] = {
        get: (module: string) => {
          // 动态导入远程模块
          return async () => {
            // 这里可能需要根据实际情况调整
            try {
              // 理论上这里应该使用模块联邦的import机制
              // 但由于我们是运行时加载，需要用一种变通方式
              const moduleUrl = `${remoteEntryUrl.replace('remoteEntry.js', '')}${module.replace('./', '')}.js`

              // 使用动态导入
              const moduleExports = await import(/* @vite-ignore */ moduleUrl)
              return { default: moduleExports.default }
            } catch (error) {
              console.error(`加载远程模块失败: ${remoteId}/${module}`, error)
              throw error
            }
          }
        },
      }
    }

    console.log(`已注册远程插件: ${pluginId} (${remoteId})`)
    return true
  } catch (error) {
    console.error(`注册远程插件失败: ${pluginId}`, error)
    return false
  }
}

/**
 * 异步加载远程组件
 * @param pluginId 插件ID
 * @param componentType 组件类型
 * @returns Promise<Component> 组件
 */
export async function loadRemoteComponent(pluginId: string, componentType: ComponentType): Promise<Component | null> {
  try {
    // 检查插件是否已初始化
    if (!remoteModules[pluginId]) {
      remoteModules[pluginId] = {}
    }

    // 检查组件状态
    const componentState = remoteModules[pluginId][componentType]

    // 如果已经在加载中，等待加载完成
    if (componentState?.loading) {
      while (componentState.loading && !componentState.loaded) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (componentState.error) {
        throw componentState.error
      }
      return await loadRemoteComponentModule(pluginId, componentType)
    }

    // 标记为正在加载
    remoteModules[pluginId][componentType] = {
      loading: true,
      loaded: false,
      error: null,
    }

    // 加载组件
    const component = await loadRemoteComponentModule(pluginId, componentType)

    // 更新状态
    remoteModules[pluginId][componentType] = {
      loading: false,
      loaded: true,
      error: null,
    }

    return component
  } catch (error: any) {
    // 更新错误状态
    if (remoteModules[pluginId]?.[componentType]) {
      remoteModules[pluginId][componentType] = {
        loading: false,
        loaded: false,
        error: error,
      }
    }

    console.error(`加载远程组件失败: ${pluginId}/${componentType}`, error)
    return null
  }
}

/**
 * 从远程模块加载特定组件
 * @param pluginId 插件ID
 * @param componentType 组件类型
 * @returns Promise<Component> 组件
 */
async function loadRemoteComponentModule(pluginId: string, componentType: ComponentType): Promise<Component | null> {
  // 生成远程插件的标识符
  const remoteId = `plugin_${pluginId.replace(/[^a-zA-Z0-9_]/g, '_')}`

  // 获取组件模块名称
  const moduleName = getComponentModule(componentType)

  try {
    // 通过模块联邦获取组件
    const factory = window.__FEDERATION__[remoteId].get(moduleName)
    const Module = await factory()

    // 返回组件
    return Module.default
  } catch (error) {
    console.error(`加载远程组件模块失败: ${remoteId}/${moduleName}`, error)
    throw error
  }
}

/**
 * 检查远程组件是否已加载
 * @param pluginId 插件ID
 * @param componentType 组件类型
 * @returns boolean 是否已加载
 */
export function isRemoteComponentLoaded(pluginId: string, componentType: ComponentType): boolean {
  return !!remoteModules[pluginId]?.[componentType]?.loaded
}

/**
 * 获取远程组件加载错误
 * @param pluginId 插件ID
 * @param componentType 组件类型
 * @returns Error | null 错误
 */
export function getRemoteComponentError(pluginId: string, componentType: ComponentType): Error | null {
  return remoteModules[pluginId]?.[componentType]?.error || null
}

/**
 * 清除远程组件缓存
 * @param pluginId 插件ID (可选，不提供则清除所有)
 * @param componentType 组件类型 (可选，不提供则清除插件的所有组件)
 */
export function clearRemoteComponentCache(pluginId?: string, componentType?: ComponentType): void {
  if (!pluginId) {
    // 清除所有缓存
    Object.keys(remoteModules).forEach(id => {
      delete remoteModules[id]
    })
    return
  }

  if (!remoteModules[pluginId]) {
    return
  }

  if (!componentType) {
    // 清除插件的所有组件
    delete remoteModules[pluginId]
    return
  }

  // 清除特定组件
  if (remoteModules[pluginId][componentType]) {
    delete remoteModules[pluginId][componentType]
  }
}
