import api from '@/api'
import {
  __federation_method_setRemote,
  __federation_method_getRemote,
  __federation_method_unwrapDefault,
  // @ts-ignore
} from 'virtual:__federation__'

// 扩展全局接口，添加federation所需的共享作用域
declare global {
  interface Window {
    __rf_placeholder__shareScope?: Record<string, any>
    vue?: any
    vuetify?: any
    pinia?: any
    'vue-i18n'?: any
    'vue-router'?: any
    axios?: any
  }
}

// 定义远程模块接口
interface RemoteModule {
  id: string
  url: string
}

/**
 * 初始化共享作用域
 */
function initShareScope() {
  // 确保全局共享作用域存在
  if (!window.__rf_placeholder__shareScope) {
    window.__rf_placeholder__shareScope = {}
  }
  // 为共享模块设置默认作用域
  const shared = ['vue', 'vuetify', 'pinia', 'vue-i18n', 'vue-router', 'axios']
  shared.forEach(lib => {
    if (window.__rf_placeholder__shareScope) {
      window.__rf_placeholder__shareScope[lib] = { default: { get: () => (window as any)[lib] } }
    }
  })
  console.log('已初始化共享作用域:', window.__rf_placeholder__shareScope)
}

/**
 * 添加一个dummy远程模块以解决生产环境中的共享作用域问题
 */
function addDummyRemote() {
  __federation_method_setRemote('dummy', {
    url: () => Promise.resolve(''),
    format: 'esm',
    from: 'vite',
    shareScope: 'default',
  })
}

/**
 * 加载远程组件
 * @param id 远程模块ID
 * @param componentName 组件名称 (如 'Page')
 */
export async function loadRemoteComponent(id: string, componentName: string = 'Page') {
  try {
    const module = await __federation_method_getRemote(id, `./${componentName}`)
    return __federation_method_unwrapDefault(module)
  } catch (error) {
    console.error(`加载远程组件失败: ${id}/${componentName}`, error)
    throw error
  }
}

/**
 * 从API获取远程模块列表
 */
async function fetchRemoteModules(): Promise<RemoteModule[]> {
  try {
    const response = await api.get('plugin/remotes?token=moviepilot')
    return (response as any) || []
  } catch (error) {
    console.error('获取远程模块列表失败:', error)
    return []
  }
}

/**
 * 生成唯一的版本标记用于防止缓存
 */
function generateVersionTag(): string {
  return `v=${Date.now()}`
}

/**
 * 动态注入Federation Remote模块
 * @param modules 远程模块列表
 */
function injectRemoteModule(module: RemoteModule): void {
  // 从浏览器地址栏获取当前地址前缀
  const baseUrl = new URL(window.location.href)
  // 环境变量
  let apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase.startsWith('/')) {
    apiBase = apiBase.slice(1)
  }
  if (apiBase.endsWith('/')) {
    apiBase = apiBase.slice(0, -1)
  }

  // 添加版本标记防止缓存
  const versionTag = generateVersionTag()
  const remoteUrl = `${baseUrl.origin}/${apiBase}${module.url}`
  const urlWithVersion = remoteUrl.includes('?') ? `${remoteUrl}&${versionTag}` : `${remoteUrl}?${versionTag}`

  __federation_method_setRemote(module.id, {
    url: () => Promise.resolve(urlWithVersion),
    format: 'esm',
    from: 'vite',
    shareScope: 'default',
  })
  console.log('已注入远程模块:', module)
}

/**
 * 初始化并加载所有远程组件
 */
export async function loadRemoteComponents(): Promise<void> {
  try {
    // 初始化共享作用域
    initShareScope()

    // 添加dummy远程模块解决生产环境问题
    addDummyRemote()

    // 获取远程模块列表
    const modules = await fetchRemoteModules()

    // 确保有模块才注入
    if (modules && modules.length > 0) {
      // 注入远程模块
      modules.forEach(module => {
        injectRemoteModule(module)
      })
    } else {
      console.log('没有发现可用的远程模块')
    }
  } catch (error) {
    console.error('加载远程组件失败:', error)
  }
}
