import PluginConfigDialog from '@/components/dialog/PluginConfigDialog.vue'
import PluginDataDialog from '@/components/dialog/PluginDataDialog.vue'
import type { Plugin } from '@/api/types'
import { renderWithProviders } from '@tests/support/render'
import { screen, waitFor } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiRequest: vi.fn(),
  captured: [] as Array<Record<string, unknown>>,
  loadRemote: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: {
    get: (...args: unknown[]) => mocks.apiGet(...args),
    post: (...args: unknown[]) => mocks.apiPost(...args),
    put: (...args: unknown[]) => mocks.apiPut(...args),
    request: (...args: unknown[]) => mocks.apiRequest(...args),
  },
}))

vi.mock('@/utils/federationLoader', () => ({
  loadRemoteComponent: (...args: unknown[]) => mocks.loadRemote(...args),
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

const RemoteView = defineComponent({
  inheritAttrs: false,
  props: {
    api: Object,
    hostCapabilities: Array,
    pluginId: String,
  },
  setup(props, { attrs }) {
    mocks.captured.push({ ...props, attrs: { ...attrs } })
    return () => h('div', { 'data-testid': 'remote-plugin-dialog' }, 'dialog ready')
  },
})

const plugin: Plugin = {
  fingerprint: 'f'.repeat(64),
  has_page: true,
  id: 'DemoPlugin',
  plugin_name: 'Demo Plugin',
  runtime_status: 'running',
  state: true,
}

describe('plugin Page and Config hosts', () => {
  beforeEach(() => {
    mocks.captured = []
    mocks.apiGet.mockReset().mockImplementation((url: string) => {
      if (url === 'plugin/page/DemoPlugin') return { page: [], render_mode: 'vue' }
      if (url === 'plugin/form/DemoPlugin') return { conf: [], model: {}, render_mode: 'vue' }
      throw new Error(`Unexpected GET ${url}`)
    })
    mocks.apiPost.mockReset()
    mocks.apiPut.mockReset()
    mocks.apiRequest.mockReset()
    mocks.loadRemote.mockReset().mockResolvedValue(RemoteView)
  })

  it.each([
    [PluginDataDialog, 'Page'],
    [PluginConfigDialog, 'Config'],
  ])('mounts %s through the shared Lite host', async (component, surface) => {
    await renderWithProviders(component, {
      props: { modelValue: true, plugin, show_switch: false },
      global: { stubs: { VDialogCloseBtn: true } },
    })

    expect(await screen.findByTestId('remote-plugin-dialog')).toBeInTheDocument()
    expect(mocks.loadRemote).toHaveBeenCalledWith('DemoPlugin', surface)
    await waitFor(() => expect(mocks.captured).toHaveLength(1))
    expect(mocks.captured[0]).toMatchObject({
      hostCapabilities: expect.arrayContaining(['plugin.api', 'plugin.data', 'plugin.static']),
      pluginId: 'DemoPlugin',
    })
    expect(mocks.captured[0].api).toBeDefined()
    expect(mocks.captured[0].attrs).not.toHaveProperty('nativeSubscribe')
  })
})
