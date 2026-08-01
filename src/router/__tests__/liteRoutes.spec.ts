import { getNavMenus } from '@/router/i18n-menu'
import mediaCardSource from '@/components/cards/MediaCard.vue?raw'
import searchBarSource from '@/components/dialog/SearchBarDialog.vue?raw'
import userCardSource from '@/components/cards/UserCard.vue?raw'
import mediaDetailSource from '@/views/discover/MediaDetailView.vue?raw'
import routerSource from '@/router/index.ts?raw'
import setupSource from '@/pages/setup.vue?raw'
import dashboardSource from '@/pages/dashboard.vue?raw'
import dashboardElementSource from '@/components/misc/DashboardElement.vue?raw'
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

  it('removes subscription requests, redirects, and compatibility composables from retained media surfaces', () => {
    const sources = [userCardSource, mediaCardSource, mediaDetailSource, searchBarSource]

    for (const source of sources) {
      expect(source).not.toContain('subscribe/')
      expect(source).not.toMatch(/path:\s*['"]\/subscribe/)
    }
    expect(mediaCardSource).not.toContain('useMediaSubscribe')
    expect(mediaDetailSource).not.toContain('useMediaSubscribe')
  })

  it('keeps downloading while removing organize, storage, and media server surfaces', () => {
    expect(routerSource).toContain("path: '/downloading'")
    expect(routerSource).not.toContain("path: '/history'")
    expect(routerSource).not.toContain("path: '/filemanager'")
    expect(setupSource).not.toContain('StorageSettingsStep')
    expect(setupSource).not.toContain('MediaServerSettingsStep')

    for (const id of ['storage', 'library', 'playing', 'latest', 'recentImports', 'quickActions']) {
      expect(dashboardSource).not.toContain(`id: '${id}'`)
      expect(dashboardElementSource).not.toContain(`'${id}'`)
    }
  })
})
