import PluginCard from '@/components/cards/PluginCard.vue'
import type { Plugin } from '@/api/types'
import { renderWithProviders } from '@tests/support/render'
import { fireEvent, screen } from '@testing-library/vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  openSharedDialog: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/api', () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('@/composables/useSharedDialog', () => ({
  openSharedDialog: (...args: unknown[]) => mocks.openSharedDialog(...args),
}))

vi.mock('@/composables/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))

vi.mock('@/composables/useCardAccentColor', () => ({
  getCardAccentRgbFromImage: vi.fn().mockResolvedValue('40, 169, 225'),
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: mocks.toastError, success: vi.fn() }),
}))

const basePlugin: Plugin = {
  has_page: true,
  id: 'DemoPlugin',
  plugin_author: 'MoviePilot',
  plugin_desc: 'Demo',
  plugin_name: 'Demo Plugin',
  plugin_version: '1.0.0',
  state: false,
}

describe('Lite plugin card status', () => {
  beforeEach(() => {
    mocks.openSharedDialog.mockReset()
    mocks.toastError.mockReset()
  })

  it.each([
    ['lite_incompatible', '不兼容 Lite'],
    ['load_error', '加载失败'],
  ] as const)('shows %s and does not open unavailable remote UI', async (runtimeStatus, label) => {
    const { container } = await renderWithProviders(PluginCard, {
      props: {
        plugin: { ...basePlugin, runtime_status: runtimeStatus },
      },
    })

    expect(screen.getByText(label)).toBeInTheDocument()
    await fireEvent.click(container.querySelector('.plugin-card') as HTMLElement)
    expect(mocks.openSharedDialog).not.toHaveBeenCalled()
  })

  it('keeps compatible stopped plugins configurable', async () => {
    const { container } = await renderWithProviders(PluginCard, {
      props: {
        plugin: { ...basePlugin, runtime_status: 'stopped' },
      },
    })

    await fireEvent.click(container.querySelector('.plugin-card') as HTMLElement)
    expect(mocks.openSharedDialog).toHaveBeenCalledOnce()
  })
})
