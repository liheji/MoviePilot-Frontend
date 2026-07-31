import type { Plugin } from '@/api/types'
import {
  LITE_HOST_CAPABILITIES,
  PluginApiOriginError,
  PluginLiteApiError,
  PluginScopeApiError,
  createPluginHost,
  filterPluginRemoteItems,
  isPluginRemoteAvailable,
} from '@/utils/pluginLite'
import { describe, expect, it, vi } from 'vitest'

const compatiblePlugin: Plugin = {
  id: 'DemoPlugin',
  fingerprint: 'f'.repeat(64),
  plugin_name: 'Demo Plugin',
  runtime_status: 'running',
}

function createApiClient() {
  return {
    post: vi.fn().mockResolvedValue({ success: true }),
    request: vi.fn().mockResolvedValue({ success: true }),
  }
}

describe('Lite plugin host', () => {
  it('publishes the fixed immutable capability list', () => {
    expect(LITE_HOST_CAPABILITIES).toEqual([
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
    ])
    expect(Object.isFrozen(LITE_HOST_CAPABILITIES)).toBe(true)

    const host = createPluginHost(compatiblePlugin, {
      apiClient: createApiClient(),
      isAdmin: true,
      navKey: 'settings',
      surface: 'app-page',
    })

    expect(host.pluginId).toBe('DemoPlugin')
    expect(host.navKey).toBe('settings')
    expect(host.hostCapabilities).toBe(LITE_HOST_CAPABILITIES)
    expect(Object.isFrozen(host)).toBe(true)
  })

  it.each(['media', 'subscribe', 'transfer', 'storage', 'mediaserver', 'workflow', 'agent'] as const)(
    'rejects removed %s APIs locally and reports the current fingerprint for administrators',
    async capability => {
      const apiClient = createApiClient()
      const host = createPluginHost(compatiblePlugin, {
        apiClient,
        isAdmin: true,
        surface: 'page',
      })

      await expect(host.api.get(`/${capability}/items`)).rejects.toMatchObject({
        capability,
        code: 'PLUGIN_LITE_INCOMPATIBLE',
        pluginId: 'DemoPlugin',
      })
      expect(apiClient.request).not.toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledWith('plugin/DemoPlugin/lite-incompatible', {
        capability,
        code: 'PLUGIN_LITE_INCOMPATIBLE',
        fingerprint: 'f'.repeat(64),
      })
    },
  )

  it('does not persist a controlled rejection for a regular user', async () => {
    const apiClient = createApiClient()
    const host = createPluginHost(compatiblePlugin, {
      apiClient,
      isAdmin: false,
      surface: 'dashboard',
    })

    await expect(host.api.get('/workflow/actions')).rejects.toBeInstanceOf(PluginLiteApiError)
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('does not reinterpret ordinary API failures as Lite incompatibility', async () => {
    const apiClient = createApiClient()
    const notFound = new Error('404')
    apiClient.request.mockRejectedValueOnce(notFound)
    const host = createPluginHost(compatiblePlugin, {
      apiClient,
      isAdmin: true,
      surface: 'config',
    })

    await expect(host.api.get('plugin/DemoPlugin/missing')).rejects.toBe(notFound)
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it.each([
    ['an absolute cross-origin URL', { url: 'https://evil.example/api/v1/site/' }],
    ['a protocol-relative cross-origin URL', { url: '//evil.example/api/v1/site/' }],
    ['a caller-provided baseURL', { baseURL: 'https://evil.example/api/v1/', url: 'site/' }],
  ])('rejects %s before the authenticated API client receives it', async (_label, config) => {
    const apiClient = createApiClient()
    const host = createPluginHost(compatiblePlugin, {
      apiClient,
      isAdmin: true,
      surface: 'page',
    })

    await expect(host.api.request(config)).rejects.toBeInstanceOf(PluginApiOriginError)
    expect(apiClient.request).not.toHaveBeenCalled()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('limits the anonymous AuthPage client to auth and the current plugin API', async () => {
    const apiClient = createApiClient()
    const host = createPluginHost(compatiblePlugin, {
      apiClient,
      isAdmin: false,
      surface: 'auth-page',
    })

    await host.api.post('auth/start', {})
    await host.api.get('plugin/DemoPlugin/callback')
    expect(apiClient.request).toHaveBeenCalledTimes(2)

    await expect(host.api.get('site/')).rejects.toBeInstanceOf(PluginScopeApiError)
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})

describe('Lite plugin remote status', () => {
  it.each(['running', 'stopped'] as const)('allows the %s state', runtimeStatus => {
    expect(isPluginRemoteAvailable({ ...compatiblePlugin, runtime_status: runtimeStatus })).toBe(true)
  })

  it.each(['not_loaded', 'load_error', 'lite_incompatible'] as const)('blocks the %s state', runtimeStatus => {
    expect(isPluginRemoteAvailable({ ...compatiblePlugin, runtime_status: runtimeStatus })).toBe(false)
  })

  it('filters failed entries while retaining legacy entries without a runtime field', () => {
    expect(
      filterPluginRemoteItems([
        { id: 'Running', runtime_status: 'running' as const },
        { id: 'Stopped', runtime_status: 'stopped' as const },
        { id: 'Broken', runtime_status: 'load_error' as const },
        { id: 'Incompatible', runtime_status: 'lite_incompatible' as const },
        { id: 'Legacy' },
      ]).map(item => item.id),
    ).toEqual(['Running', 'Stopped', 'Legacy'])
  })
})
