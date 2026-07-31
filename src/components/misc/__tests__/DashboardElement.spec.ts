import DashboardElement from '@/components/misc/DashboardElement.vue'
import { renderWithProviders } from '@tests/support/render'
import { screen, waitFor } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  apiRequest: vi.fn(),
  captured: undefined as Record<string, unknown> | undefined,
  loadRemote: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: {
    post: (...args: unknown[]) => mocks.apiPost(...args),
    request: (...args: unknown[]) => mocks.apiRequest(...args),
  },
}))

vi.mock('@/utils/federationLoader', () => ({
  loadRemoteComponent: (...args: unknown[]) => mocks.loadRemote(...args),
}))

vi.mock('vue-toastification', () => ({ useToast: () => ({}) }))

const RemoteDashboard = defineComponent({
  inheritAttrs: false,
  props: {
    api: Object,
    hostCapabilities: Array,
    pluginId: String,
  },
  setup(props, { attrs }) {
    mocks.captured = { ...props, attrs: { ...attrs } }
    return () => h('div', { 'data-testid': 'remote-dashboard' }, 'dashboard ready')
  },
})

describe('plugin Dashboard host', () => {
  beforeEach(() => {
    mocks.captured = undefined
    mocks.apiPost.mockReset()
    mocks.apiRequest.mockReset()
    mocks.loadRemote.mockReset().mockResolvedValue(RemoteDashboard)
  })

  it('mounts a compatible dashboard with the shared Lite host contract', async () => {
    await renderWithProviders(DashboardElement, {
      props: {
        config: {
          attrs: {},
          cols: {},
          elements: [],
          fingerprint: 'f'.repeat(64),
          id: 'DemoPlugin',
          key: 'main',
          name: 'Demo Dashboard',
          render_mode: 'vue',
          runtime_status: 'running',
        },
      },
    })

    expect(await screen.findByTestId('remote-dashboard')).toBeInTheDocument()
    expect(mocks.loadRemote).toHaveBeenCalledWith('DemoPlugin', 'Dashboard')
    await waitFor(() => expect(mocks.captured?.api).toBeDefined())
    expect(mocks.captured).toMatchObject({
      hostCapabilities: expect.arrayContaining(['plugin.api', 'plugin.dashboard']),
      pluginId: 'DemoPlugin',
    })
    expect(mocks.captured?.attrs).not.toHaveProperty('nativeSubscribe')
  })

  it('does not load failed plugin dashboards', async () => {
    await renderWithProviders(DashboardElement, {
      props: {
        config: {
          attrs: {},
          cols: {},
          elements: [],
          id: 'BrokenPlugin',
          key: 'main',
          name: 'Broken Dashboard',
          render_mode: 'vue',
          runtime_status: 'load_error',
        },
      },
    })

    await waitFor(() => expect(mocks.loadRemote).not.toHaveBeenCalled())
    expect(screen.queryByTestId('remote-dashboard')).not.toBeInTheDocument()
  })
})
