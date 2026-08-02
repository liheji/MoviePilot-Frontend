import { getNavMenus, getSettingTabs } from '@/router/i18n-menu'
import userCardSource from '@/components/cards/UserCard.vue?raw'
import routerSource from '@/router/index.ts?raw'
import setupSource from '@/pages/setup.vue?raw'
import dashboardSource from '@/pages/dashboard.vue?raw'
import systemSettingSource from '@/views/setting/AccountSettingSystem.vue?raw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/stores', () => ({
  useGlobalSettingsStore: () => ({ get: mocks.get }),
}))

describe('Lite route surface', () => {
  beforeEach(() => {
    mocks.get.mockReturnValue(false)
  })

  it('removes workflow and subscription navigation while retaining plugin navigation', () => {
    const translate = ((key: string) => key) as Parameters<typeof getNavMenus>[0]
    const paths = getNavMenus(translate).map(item => item.to)

    expect(paths).not.toContain('/workflow')
    expect(paths).not.toContain('/subscribe/movie')
    expect(paths).not.toContain('/subscribe/tv')
    expect(paths).not.toContain('/subscribe-share')
    expect(paths).not.toContain('/calendar')
    expect(paths).toContain('/plugins')
  })

  it('removes media discovery routes and retained user surfaces do not request subscriptions', () => {
    for (const path of ['/recommend', '/discover', '/browse', '/media', '/person', '/credits']) {
      expect(routerSource).not.toContain(`path: '${path}`)
    }
    expect(userCardSource).not.toContain('subscribe/')
  })

  it('keeps downloading while removing organize, storage, and media server surfaces', () => {
    expect(routerSource).toContain("path: '/downloading'")
    expect(routerSource).not.toContain("path: '/history'")
    expect(routerSource).not.toContain("path: '/filemanager'")
    expect(setupSource).not.toContain('StorageSettingsStep')
    expect(setupSource).not.toContain('MediaServerSettingsStep')

    for (const id of ['storage', 'library', 'playing', 'latest', 'recentImports', 'quickActions']) {
      expect(dashboardSource).not.toContain(`id: '${id}'`)
    }
  })

  it('keeps original status cards on the dashboard and moves downloader configuration into system settings', () => {
    const translate = ((key: string) => key) as Parameters<typeof getNavMenus>[0]
    const settingTabs = getSettingTabs(translate).map(item => item.tab)

    expect(dashboardSource).toContain("@/components/cards/SiteCard.vue")
    expect(dashboardSource).toContain("@/components/cards/DownloaderCard.vue")
    expect(dashboardSource).toContain('plugin/dashboard/meta')
    expect(dashboardSource).toContain('LitePluginDashboardElement.vue')
    expect(settingTabs).not.toContain('downloader')
    expect(systemSettingSource).toContain('AccountSettingDownloader')
  })
})
