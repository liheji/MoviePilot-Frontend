import type { PluginApiClient, PluginScopedApi } from '@/api/plugin'
import {
  createPluginScopedApi,
  PluginApiOriginError,
  PluginLiteApiError,
  PluginScopeApiError,
} from '@/api/plugin'

export const LITE_HOST_CAPABILITIES = Object.freeze([
  'auth',
  'plugin.api',
  'plugin.data',
  'plugin.static',
  'plugin.dashboard',
  'plugin.sidebar',
  'site',
  'torrent.search',
  'download.task',
  'message',
] as const)

export const LITE_ANONYMOUS_HOST_CAPABILITIES = Object.freeze(['auth', 'plugin.api'] as const)

export type PluginHostSurface = 'app-page' | 'auth-page' | 'config' | 'dashboard' | 'page'

export interface PluginRuntimeDescriptor {
  fingerprint?: string | null
  id: string
  runtime_status?: 'not_loaded' | 'running' | 'stopped' | 'load_error' | 'lite_incompatible' | null
  state?: boolean
}

export interface PluginHostOptions {
  apiClient?: PluginApiClient
  isAdmin: boolean
  navKey?: string
  surface: PluginHostSurface
}

export interface PluginHost {
  api: PluginScopedApi
  hostCapabilities: typeof LITE_HOST_CAPABILITIES | typeof LITE_ANONYMOUS_HOST_CAPABILITIES
  navKey?: string
  pluginId: string
}

export function isPluginRemoteAvailable(plugin?: Partial<PluginRuntimeDescriptor> | null): boolean {
  if (!plugin) return false
  if (!plugin.runtime_status) return plugin.state !== false
  return plugin.runtime_status === 'running' || plugin.runtime_status === 'stopped'
}

export function filterPluginRemoteItems<T extends Partial<PluginRuntimeDescriptor>>(items: readonly T[]): T[] {
  return items.filter(item => isPluginRemoteAvailable(item))
}

export function createPluginHost(plugin: PluginRuntimeDescriptor, options: PluginHostOptions): PluginHost {
  const anonymous = options.surface === 'auth-page'
  return Object.freeze({
    api: createPluginScopedApi({
      anonymous,
      apiClient: options.apiClient,
      fingerprint: plugin.fingerprint || undefined,
      isAdmin: options.isAdmin,
      pluginId: plugin.id,
    }),
    hostCapabilities: anonymous ? LITE_ANONYMOUS_HOST_CAPABILITIES : LITE_HOST_CAPABILITIES,
    navKey: options.navKey,
    pluginId: plugin.id,
  })
}

export { PluginApiOriginError, PluginLiteApiError, PluginScopeApiError }
