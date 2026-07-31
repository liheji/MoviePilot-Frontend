import PluginCard from '@/components/cards/PluginCard.vue'
import type { Plugin } from '@/api/types'
import { renderWithProviders } from '@tests/support/render'
import { fireEvent, screen, waitFor } from '@testing-library/vue'
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

  it('updates remote menu actions when a running plugin becomes unavailable', async () => {
    const { container, rerender } = await renderWithProviders(PluginCard, {
      global: {
        stubs: {
          VIcon: { props: ['icon'], template: '<span :data-icon="icon" />' },
          VListItem: { template: '<div class="test-menu-item"><slot name="prepend" /><slot /></div>' },
          VMenu: { template: '<div><slot /></div>' },
        },
      },
      props: {
        plugin: { ...basePlugin, has_update: true, runtime_status: 'running' },
      },
    })

    const menuItem = (icon: string) =>
      container.querySelector(`[data-icon="${icon}"]`)?.closest('.test-menu-item') as HTMLElement
    await waitFor(() => expect(menuItem('mdi-cog-outline')).toBeVisible())

    await rerender({
      plugin: { ...basePlugin, has_update: true, runtime_status: 'load_error' },
    })

    await waitFor(() => expect(menuItem('mdi-cog-outline')).not.toBeVisible())
    expect(menuItem('mdi-information-outline')).not.toBeVisible()
    expect(menuItem('mdi-cancel')).not.toBeVisible()
    expect(menuItem('mdi-arrow-up-circle-outline')).toBeVisible()
    expect(menuItem('mdi-trash-can-outline')).toBeVisible()
  })
})
