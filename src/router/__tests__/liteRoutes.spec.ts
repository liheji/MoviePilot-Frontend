import { getNavMenus } from '@/router/i18n-menu'
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

  it('removes workflow navigation while retaining plugin navigation', () => {
    const translate = ((key: string) => key) as Parameters<typeof getNavMenus>[0]
    const paths = getNavMenus(translate).map(item => item.to)

    expect(paths).not.toContain('/workflow')
    expect(paths).toContain('/plugins')
  })
})
