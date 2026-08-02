import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import AccountSettingSystem from '@/views/setting/AccountSettingSystem.vue'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  setData: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: {
    get: (...args: unknown[]) => mocks.apiGet(...args),
    post: (...args: unknown[]) => mocks.apiPost(...args),
  },
}))

vi.mock('@/stores', () => ({
  useGlobalSettingsStore: () => ({
    getData: {},
    setData: mocks.setData,
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: mocks.toastError, success: mocks.toastSuccess }),
}))

vi.mock('vuetify', () => ({
  useDisplay: () => ({ mdAndUp: { value: true } }),
}))

vi.mock('@/composables/useSilentSettingRefresh', () => ({
  useSilentSettingRefresh: vi.fn(),
}))

vi.mock('@/@core/utils/navigator', () => ({
  copyToClipboard: vi.fn(),
}))

vi.mock('@/views/setting/AccountSettingDownloader.vue', () => ({
  default: {
    props: { active: Boolean },
    template: '<div data-testid="downloader-settings" />',
  },
}))

const sourcePath = resolve(cwd(), 'src/views/setting/AccountSettingSystem.vue')
const downloaderSourcePath = resolve(cwd(), 'src/views/setting/AccountSettingDownloader.vue')

const passthroughStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

const buttonStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

const dialogStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('section', { ...attrs, 'data-testid': 'advanced-dialog' }, slots.default?.())
  },
})

const systemSettingsStubs = {
  VBtn: buttonStub,
  VDialog: dialogStub,
  VCard: passthroughStub,
  VCardActions: passthroughStub,
  VCardItem: passthroughStub,
  VCardSubtitle: passthroughStub,
  VCardText: passthroughStub,
  VCardTitle: passthroughStub,
  VCol: passthroughStub,
  VCombobox: passthroughStub,
  VDialogCloseBtn: passthroughStub,
  VDivider: passthroughStub,
  VIcon: passthroughStub,
  VRow: passthroughStub,
  VSelect: passthroughStub,
  VSpacer: passthroughStub,
  VSwitch: passthroughStub,
  VTab: passthroughStub,
  VTabs: passthroughStub,
  VTextField: passthroughStub,
  VWindow: passthroughStub,
  VWindowItem: passthroughStub,
}

async function mountSystemSettings() {
  const wrapper = mount(AccountSettingSystem, {
    props: { active: true },
    global: { stubs: systemSettingsStubs },
  })

  await flushPromises()

  return wrapper
}

async function openAdvancedDialog() {
  const wrapper = await mountSystemSettings()
  const advancedButton = wrapper.findAll('button').find(button => button.text().includes('advancedSettings'))

  await advancedButton?.trigger('click')
  await nextTick()

  expect(wrapper.find('[data-testid="advanced-dialog"]').exists()).toBe(true)

  return wrapper
}

async function saveAdvancedSettings() {
  const wrapper = await openAdvancedDialog()
  const saveButton = wrapper.findAll('button').filter(button => button.text() === 'common.save').at(-1)

  await saveButton?.trigger('click')
  await flushPromises()

  return wrapper
}

const advancedSettingKeys = [
  'AUTO_UPDATE_RESOURCE',
  'DEBUG',
  'GITHUB_PROXY',
  'LOG_BACKUP_COUNT',
  'LOG_FILE_FORMAT',
  'LOG_LEVEL',
  'LOG_MAX_FILE_SIZE',
  'MOVIEPILOT_AUTO_UPDATE',
  'PIP_PROXY',
  'PLUGIN_AUTO_RELOAD',
  'PLUGIN_LOCAL_REPO_PATHS',
  'PROXY_HOST',
]

describe('Lite system settings', () => {
  it('does not include Agent, LLM, or MCP settings', () => {
    const source = readFileSync(sourcePath, 'utf-8')

    expect(source).not.toContain('useLlmProviderDirectory')
    expect(source).not.toContain('AgentMcpSettingsDialog')
    expect(source).not.toContain('AI_AGENT_')
    expect(source).not.toContain('LLM_')
  })

  it('uses the basic settings action bar with an advanced settings entry point', () => {
    const source = readFileSync(sourcePath, 'utf-8')
    const saveButtons = source.match(/t\('common\.save'\)/g) ?? []
    const actions = source.slice(source.indexOf('<div class="setting-actions mt-4">'), source.indexOf('</div>', source.indexOf('<div class="setting-actions mt-4">')))

    expect(saveButtons).toHaveLength(2)
    expect(source).toContain('class="setting-actions mt-4"')
    expect(actions).toContain('<VSpacer />')
    expect(source).toContain('class="text-no-wrap setting-actions__secondary"')
    expect(source).toContain('.setting-actions {')
    expect(source).toContain('display: flex')
    expect(source).toContain('prepend-icon="mdi-cog"')
    expect(source).toContain('append-icon="mdi-dots-horizontal"')
    expect(source).toContain('@click="advancedDialog = true"')
  })

  it('keeps Lite advanced settings in a four-tab dialog', () => {
    const source = readFileSync(sourcePath, 'utf-8')
    const tabs = source.match(/<VTab[^>]*\bvalue="([^"]+)"/g) ?? []
    const windows = source.match(/<VWindowItem[^>]*\bvalue="([^"]+)"/g) ?? []

    expect(source).toMatch(
      /<VDialog\s+v-if="advancedDialog"\s+v-model="advancedDialog"\s+scrollable\s+max-width="60rem"/,
    )
    expect(source).toContain(':fullscreen="!display.mdAndUp.value"')
    expect(source).toContain('<VDialogCloseBtn v-model="advancedDialog" />')
    expect(source).toContain('<VTabs')
    expect(source).toContain('<VWindow')
    expect(source).toContain('<VCardActions class="app-dialog-actions">')
    expect(tabs).toHaveLength(4)
    expect(windows).toHaveLength(4)
    for (const value of ['system', 'network', 'log', 'dev']) {
      expect(source).toContain(`<VTab value="${value}"`)
      expect(source).toContain(`<VWindowItem value="${value}"`)
    }
    expect(source).not.toContain('<VTab value="media"')
    expect(source).not.toContain('<VTab value="data"')
    expect(source).not.toContain('<VWindowItem value="media"')
    expect(source).not.toContain('<VWindowItem value="data"')
  })

  it('closes the advanced settings dialog only after a successful save', () => {
    const source = readFileSync(sourcePath, 'utf-8')
    const saveAdvancedSettings = source.slice(source.indexOf('async function saveAdvancedSettings'))

    expect(saveAdvancedSettings).toContain("if (saved) {")
    expect(saveAdvancedSettings).toContain('advancedDialog.value = false')
  })

  it('places Lite advanced fields in their corresponding dialog tabs', () => {
    const source = readFileSync(sourcePath, 'utf-8')
    const template = source.slice(source.indexOf('<template>'))
    const systemTab = template.slice(template.indexOf('<VWindowItem value="system">'), template.indexOf('<VWindowItem value="network">'))
    const networkTab = template.slice(template.indexOf('<VWindowItem value="network">'), template.indexOf('<VWindowItem value="log">'))
    const logTab = template.slice(template.indexOf('<VWindowItem value="log">'), template.indexOf('<VWindowItem value="dev">'))
    const devTab = template.slice(template.indexOf('<VWindowItem value="dev">'))

    for (const field of ['SystemSettings.DEBUG', 'SystemSettings.PLUGIN_AUTO_RELOAD', 'moviePilotAutoUpdate', 'SystemSettings.AUTO_UPDATE_RESOURCE']) {
      expect(systemTab).toContain(field)
    }
    for (const field of ['SystemSettings.PROXY_HOST', 'SystemSettings.GITHUB_PROXY', 'pipProxyDisplay']) {
      expect(networkTab).toContain(field)
    }
    for (const field of [
      'SystemSettings.LOG_LEVEL',
      'SystemSettings.LOG_MAX_FILE_SIZE',
      'SystemSettings.LOG_BACKUP_COUNT',
      'SystemSettings.LOG_FILE_FORMAT',
    ]) {
      expect(logTab).toContain(field)
    }
    expect(devTab).toContain('SystemSettings.PLUGIN_LOCAL_REPO_PATHS')
  })

  it('uses a two-column layout for the four advanced switches', () => {
    const source = readFileSync(sourcePath, 'utf-8')
    const template = source.slice(source.indexOf('<template>'))
    const systemTab = template.slice(template.indexOf('<VWindowItem value="system">'), template.indexOf('<VWindowItem value="network">'))

    expect(systemTab.match(/<VCol cols="12" md="6">/g) ?? []).toHaveLength(4)
    expect(source).toContain("t('setting.system.moviePilotAutoUpdate')")
    expect(source).toContain("t('setting.system.autoUpdateResource')")
    expect(source).toContain("t('setting.system.debugHint')")
    expect(source).toContain("t('setting.system.pluginAutoReloadHint')")
    for (const hint of [
      'appDomainHint',
      'apiTokenHint',
      'githubTokenHint',
      'wallpaperHint',
      'logLevelHint',
      'proxyHostHint',
      'githubProxyHint',
      'pluginLocalRepoPathsHint',
    ]) {
      expect(source).toContain(`t('setting.system.${hint}')`)
    }
    expect(source).toContain("'MOVIEPILOT_AUTO_UPDATE'")
    expect(source).toContain("'AUTO_UPDATE_RESOURCE'")
  })

  it('returns downloader configuration to the system settings page', () => {
    const source = readFileSync(sourcePath, 'utf-8')

    expect(source).toContain("import AccountSettingDownloader from '@/views/setting/AccountSettingDownloader.vue'")
    expect(source).toContain('<AccountSettingDownloader :active="props.active" />')
  })

  it('restores the optional PIP mirror picker with custom values', () => {
    const source = readFileSync(sourcePath, 'utf-8')

    expect(source).toContain('const pipMirrorsItems = [')
    expect(source).toContain('v-model="pipProxyDisplay"')
    expect(source).toContain(':items="pipMirrorsItems"')
    expect(source).toContain('clearable')
    expect(source).toContain("t('setting.system.pipProxyPlaceholder')")
    expect(source).toContain("t('setting.system.pipProxyHint')")
    expect(source).not.toContain('<VTextField v-model="SystemSettings.PIP_PROXY"')
  })

  it('restores semantic icons for Lite system setting fields', () => {
    const source = readFileSync(sourcePath, 'utf-8')

    for (const icon of [
      'mdi-domain',
      'mdi-key',
      'mdi-github',
      'mdi-image',
      'mdi-format-list-bulleted',
      'mdi-server-network',
      'mdi-package',
      'mdi-folder',
    ]) {
      expect(source).toContain(`prepend-inner-icon="${icon}"`)
    }
  })

  it('uses a labeled add button for downloader configuration', () => {
    const source = readFileSync(downloaderSourcePath, 'utf-8')

    expect(source).toContain('prepend-icon="mdi-plus"')
    expect(source).toContain("t('setting.system.addDownloader')")
    expect(source).not.toMatch(/<VBtn[^>]*\sicon="mdi-plus"/)
  })

  it('restores Lite download directory management without media organization fields', () => {
    const source = readFileSync(downloaderSourcePath, 'utf-8')

    expect(source).toContain('DownloadDirectories')
    expect(source).toContain('download_path')
    expect(source).toContain('directorySaveSuccess')
    expect(source).not.toContain('library_path')
    expect(source).not.toContain('scraping')
    expect(source).not.toContain('storage/transtype')
  })

  it('uses folder icons for Lite download directory fields', () => {
    const source = readFileSync(downloaderSourcePath, 'utf-8')

    expect(source).toContain('prepend-inner-icon="mdi-folder-outline"')
    expect(source).toContain('prepend-inner-icon="mdi-folder-download-outline"')
  })
})

describe('Lite advanced settings saves', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    mocks.apiGet.mockResolvedValue({ data: {}, success: true })
  })

  it('closes the dialog and posts only Lite advanced settings after a successful save', async () => {
    mocks.apiPost.mockResolvedValue({ success: true })

    const wrapper = await saveAdvancedSettings()

    expect(mocks.apiPost).toHaveBeenCalledWith('system/env', expect.any(Object))
    expect(Object.keys(mocks.apiPost.mock.calls[0][1]).sort()).toEqual(advancedSettingKeys)
    expect(wrapper.find('[data-testid="advanced-dialog"]').exists()).toBe(false)
  })

  it('keeps the dialog open when the advanced settings save is rejected', async () => {
    mocks.apiPost.mockResolvedValue({ success: false })

    const wrapper = await saveAdvancedSettings()

    expect(wrapper.find('[data-testid="advanced-dialog"]').exists()).toBe(true)
  })

  it('keeps the dialog open when the advanced settings request throws', async () => {
    mocks.apiPost.mockRejectedValue(new Error('network failure'))

    const wrapper = await saveAdvancedSettings()

    expect(wrapper.find('[data-testid="advanced-dialog"]').exists()).toBe(true)
  })
})
