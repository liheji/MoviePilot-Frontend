import PluginAppPage from '@/pages/plugin-app.vue'
import i18n from '@/plugins/i18n'
import vuetify from '@/plugins/vuetify'
import { createTestingPinia } from '@pinia/testing'
import { render, screen, waitFor } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiRequest: vi.fn(),
  captured: undefined as Record<string, unknown> | undefined,
  loadRemote: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: {
    get: (...args: unknown[]) => mocks.apiGet(...args),
    post: (...args: unknown[]) => mocks.apiPost(...args),
    request: (...args: unknown[]) => mocks.apiRequest(...args),
  },
}))

vi.mock('@/utils/federationLoader', () => ({
  loadRemoteAppPageComponent: (...args: unknown[]) => mocks.loadRemote(...args),
}))

vi.mock('vue-toastification', () => ({ useToast: () => ({}) }))

const RemoteView = defineComponent({
  inheritAttrs: false,
  props: {
    api: Object,
    hostCapabilities: Array,
    navKey: String,
    pluginId: String,
  },
  setup(props, { attrs }) {
    mocks.captured = { ...props, attrs: { ...attrs } }
    return () => h('div', { 'data-testid': 'remote-app-page' }, 'remote ready')
  },
})

async function renderPluginApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/plugin/:pluginId/:navKey?', component: PluginAppPage }],
  })
  await router.push('/plugin/DemoPlugin/settings')
  await router.isReady()
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    initialState: { user: { superUser: true } },
    stubActions: true,
  })

  return render(PluginAppPage, {
    global: { plugins: [vuetify, i18n, pinia, router] },
  })
}

describe('plugin AppPage host', () => {
  beforeEach(() => {
    mocks.captured = undefined
    mocks.apiGet.mockReset()
    mocks.apiPost.mockReset()
    mocks.apiRequest.mockReset()
    mocks.loadRemote.mockReset().mockResolvedValue(RemoteView)
  })

  it('mounts a compatible remote with the Lite host contract', async () => {
    mocks.apiGet.mockResolvedValue([
      {
        fingerprint: 'f'.repeat(64),
        id: 'DemoPlugin',
        plugin_name: 'Demo Plugin',
        runtime_status: 'running',
      },
    ])
    await renderPluginApp()

    expect(await screen.findByTestId('remote-app-page')).toBeInTheDocument()
    expect(mocks.loadRemote).toHaveBeenCalledWith('DemoPlugin', 'settings')
    expect(mocks.captured).toMatchObject({
      hostCapabilities: expect.arrayContaining(['plugin.api', 'torrent.search', 'download.task']),
      navKey: 'settings',
      pluginId: 'DemoPlugin',
    })
    expect(mocks.captured?.api).toBeDefined()
    expect(mocks.captured?.attrs).not.toHaveProperty('nativeSubscribe')
  })

  it('does not load an incompatible remote', async () => {
    mocks.apiGet.mockResolvedValue([
      {
        fingerprint: 'f'.repeat(64),
        id: 'DemoPlugin',
        plugin_name: 'Demo Plugin',
        runtime_status: 'lite_incompatible',
      },
    ])
    await renderPluginApp()

    await waitFor(() => expect(screen.getByText(i18n.global.t('litePlugin.loadErrorText'))).toBeInTheDocument())
    expect(mocks.loadRemote).not.toHaveBeenCalled()
  })
})
