import api from '@/api'

// 为Window接口扩展__FEDERATION__属性
declare global {
  interface Window {
    __FEDERATION__: Record<string, { url: string }>
  }
}

// 定义远程模块接口
interface RemoteModule {
  id: string
  url: string
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
 * 动态注入Federation Remote模块
 * @param modules 远程模块列表
 */
function injectRemoteModules(modules: RemoteModule[]): void {
  if (!modules || modules.length === 0) return

  // 创建Federation变量
  const federation: Record<string, { url: string }> = {}

  // 设置每个远程模块
  modules.forEach(module => {
    federation[module.id] = { url: module.url }
  })

  // 全局注入Federation变量供加载远程模块使用
  window.__FEDERATION__ = federation

  console.log('已注入远程模块:', federation)
}

/**
 * 加载远程组件
 * @param id 远程模块ID
 * @param componentName 组件名称 (如 'Page')
 */
export async function loadRemoteComponent(id: string, componentName: string = 'Page') {
  try {
    // 检查远程模块是否已经注册
    if (!window.__FEDERATION__ || !window.__FEDERATION__[id]) {
      // 如果未注册，尝试重新初始化
      const modules = await fetchRemoteModules()
      injectRemoteModules(modules)

      // 再次检查
      if (!window.__FEDERATION__ || !window.__FEDERATION__[id]) {
        throw new Error(`远程模块 ${id} 未注册`)
      }
    }

    // 模块联邦格式导入，不需要.vue扩展名
    console.log(`正在加载远程组件: ${id}/${componentName}`)
    // @ts-ignore - 动态导入远程模块
    return await import(`${id}/${componentName}`)
  } catch (error) {
    console.error(`加载远程组件失败: ${id}/${componentName}`, error)
    throw error
  }
}

/**
 * 初始化并加载所有远程组件
 */
export async function loadRemoteComponents(): Promise<boolean> {
  try {
    // 获取远程模块列表
    const modules = await fetchRemoteModules()

    // 确保有模块才注入
    if (modules && modules.length > 0) {
      // 注入远程模块
      injectRemoteModules(modules)
      return true
    } else {
      console.log('没有发现可用的远程模块')
      return false
    }
  } catch (error) {
    console.error('加载远程组件失败:', error)
    return false
  }
}
