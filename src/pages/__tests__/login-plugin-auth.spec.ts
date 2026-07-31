import LoginPage from '@/pages/login.vue'
import { renderWithProviders } from '@tests/support/render'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiRequest: vi.fn(),
  captured: undefined as Record<string, unknown> | undefined,
  loadRemote: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: {
    get: (...args: unknown[]) => mocks.apiGet(...args),
    post: (...args: unknown[]) => mocks.apiPost(...args),
    request: (...args: unknown[]) => mocks.apiRequest(...args),
  },
}))

vi.mock('@/router', () => ({
  default: {
    currentRoute: { value: { query: {} } },
    push: (...args: unknown[]) => mocks.push(...args),
  },
}))

vi.mock('@/utils/federationLoader', () => ({
  loadRemoteComponentFromModule: (...args: unknown[]) => mocks.loadRemote(...args),
}))

const RemoteAuthView = defineComponent({
  inheritAttrs: false,
  props: {
    api: Object,
    hostCapabilities: Array,
    pluginId: String,
    provider: Object,
  },
  setup(props, { attrs }) {
    mocks.captured = { ...props, attrs: { ...attrs } }
    return () => h('div', { 'data-testid': 'remote-auth-page' }, 'auth ready')
  },
})

describe('plugin AuthPage host', () => {
  beforeEach(() => {
    mocks.captured = undefined
    mocks.apiGet.mockReset()
    mocks.apiPost.mockReset()
    mocks.apiRequest.mockReset()
    mocks.loadRemote.mockReset().mockResolvedValue(RemoteAuthView)
    mocks.push.mockReset()
    vi.stubGlobal('PublicKeyCredential', undefined)
  })

  it('filters failed providers and mounts AuthPage with an anonymous scoped client', async () => {
    mocks.apiGet.mockImplementation((url: string) => {
      if (url !== 'auth/providers') throw new Error(`Unexpected GET ${url}`)
      return [
        {
          component: 'AuthPage',
          enabled: true,
          id: 'plugin:DemoPlugin',
          name: 'Demo Login',
          plugin_id: 'DemoPlugin',
          remote: { id: 'DemoPlugin', url: '/remoteEntry.js' },
          runtime_status: 'running',
          type: 'plugin',
        },
        {
          component: 'AuthPage',
          enabled: true,
          id: 'plugin:BrokenPlugin',
          name: 'Broken Login',
          plugin_id: 'BrokenPlugin',
          remote: { id: 'BrokenPlugin', url: '/broken.js' },
          runtime_status: 'load_error',
          type: 'plugin',
        },
      ]
    })

    await renderWithProviders(LoginPage, { initialRoute: '/login' })
    expect(await screen.findByRole('button', { name: /Demo Login/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Broken Login/ })).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /Demo Login/ }))
    expect(await screen.findByTestId('remote-auth-page')).toBeInTheDocument()
    await waitFor(() => expect(mocks.captured?.api).toBeDefined())
    expect(mocks.captured).toMatchObject({
      hostCapabilities: ['auth', 'plugin.api'],
      pluginId: 'DemoPlugin',
    })
    expect(mocks.captured?.attrs).not.toHaveProperty('nativeSubscribe')
  })
})
