import api from '@/api'
import type { AxiosRequestConfig } from 'axios'

export const REMOVED_PLUGIN_CAPABILITIES = [
  'media',
  'subscribe',
  'transfer',
  'storage',
  'mediaserver',
  'workflow',
  'agent',
] as const

export type RemovedPluginCapability = (typeof REMOVED_PLUGIN_CAPABILITIES)[number]

export interface PluginApiClient {
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  request<T = unknown>(config: AxiosRequestConfig): Promise<T>
}

export interface PluginScopedApi {
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  head<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  options<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  request<T = unknown>(config: AxiosRequestConfig): Promise<T>
}

export interface PluginScopedApiOptions {
  anonymous?: boolean
  apiClient?: PluginApiClient
  fingerprint?: string
  isAdmin?: boolean
  pluginId: string
}

export class PluginLiteApiError extends Error {
  readonly capability: RemovedPluginCapability
  readonly code = 'PLUGIN_LITE_INCOMPATIBLE'
  readonly pluginId: string

  constructor(pluginId: string, capability: RemovedPluginCapability) {
    super('插件远程页面调用了 Lite 已删除的宿主能力')
    this.name = 'PluginLiteApiError'
    this.pluginId = pluginId
    this.capability = capability
  }
}

export class PluginScopeApiError extends Error {
  readonly code = 'PLUGIN_API_SCOPE_REJECTED'
  readonly pluginId: string

  constructor(pluginId: string) {
    super('匿名插件页面只能访问认证接口和当前插件接口')
    this.name = 'PluginScopeApiError'
    this.pluginId = pluginId
  }
}

export class PluginApiOriginError extends Error {
  readonly code = 'PLUGIN_API_ORIGIN_REJECTED'
  readonly pluginId: string

  constructor(pluginId: string) {
    super('插件远程页面只能访问当前 MoviePilot Origin')
    this.name = 'PluginApiOriginError'
    this.pluginId = pluginId
  }
}

function assertPluginApiOrigin(config: AxiosRequestConfig, pluginId: string): void {
  if (config.baseURL !== undefined) throw new PluginApiOriginError(pluginId)

  try {
    const requestUrl = new URL(config.url || '', `${window.location.origin}/`)
    if (requestUrl.origin !== window.location.origin) throw new PluginApiOriginError(pluginId)
  } catch (error) {
    if (error instanceof PluginApiOriginError) throw error
    throw new PluginApiOriginError(pluginId)
  }
}

function normalizeApiSegments(url: string): string[] {
  let pathname: string
  try {
    pathname = new URL(url, 'http://moviepilot.local').pathname
  } catch {
    pathname = url.split(/[?#]/, 1)[0]
  }

  const segments = pathname
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)

  const apiIndex = segments.findIndex(
    (segment, index) => segment.toLowerCase() === 'api' && /^v\d+$/i.test(segments[index + 1] || ''),
  )
  return apiIndex >= 0 ? segments.slice(apiIndex + 2) : segments
}

function removedCapabilityForUrl(url: string): RemovedPluginCapability | undefined {
  const [prefix] = normalizeApiSegments(url)
  const normalizedPrefix = prefix?.toLowerCase()
  return REMOVED_PLUGIN_CAPABILITIES.find(capability => capability === normalizedPrefix)
}

function isCurrentPluginPath(url: string, pluginId: string): boolean {
  const segments = normalizeApiSegments(url).map(segment => segment.toLowerCase())
  if (segments[0] !== 'plugin') return false

  const normalizedPluginId = pluginId.toLowerCase()
  if (segments[1] === normalizedPluginId) return true
  return ['dashboard', 'file', 'form', 'page'].includes(segments[1]) && segments[2] === normalizedPluginId
}

function isAnonymousPathAllowed(url: string, pluginId: string): boolean {
  const [prefix] = normalizeApiSegments(url)
  return prefix?.toLowerCase() === 'auth' || isCurrentPluginPath(url, pluginId)
}

async function reportLiteIncompatibility(
  client: PluginApiClient,
  options: PluginScopedApiOptions,
  capability: RemovedPluginCapability,
): Promise<void> {
  if (!options.isAdmin || !options.fingerprint) return

  try {
    await client.post(`plugin/${options.pluginId}/lite-incompatible`, {
      capability,
      code: 'PLUGIN_LITE_INCOMPATIBLE',
      fingerprint: options.fingerprint,
    })
  } catch {
    // 页面仍按本地拒绝处理；后端隔离可在管理员下次访问时重试。
  }
}

export function createPluginScopedApi(options: PluginScopedApiOptions): PluginScopedApi {
  const client = options.apiClient || api

  async function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    assertPluginApiOrigin(config, options.pluginId)
    const url = config.url || ''
    const removedCapability = removedCapabilityForUrl(url)
    if (removedCapability) {
      await reportLiteIncompatibility(client, options, removedCapability)
      throw new PluginLiteApiError(options.pluginId, removedCapability)
    }
    if (options.anonymous && !isAnonymousPathAllowed(url, options.pluginId)) {
      throw new PluginScopeApiError(options.pluginId)
    }
    return client.request<T>(config)
  }

  const withoutBody = (method: string) =>
    <T = unknown>(url: string, config: AxiosRequestConfig = {}) => request<T>({ ...config, method, url })
  const withBody = (method: string) =>
    <T = unknown>(url: string, data?: unknown, config: AxiosRequestConfig = {}) =>
      request<T>({ ...config, data, method, url })

  return Object.freeze({
    delete: withoutBody('DELETE'),
    get: withoutBody('GET'),
    head: withoutBody('HEAD'),
    options: withoutBody('OPTIONS'),
    patch: withBody('PATCH'),
    post: withBody('POST'),
    put: withBody('PUT'),
    request,
  })
}
