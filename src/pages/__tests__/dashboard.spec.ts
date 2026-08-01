import DashboardPage from '@/pages/dashboard.vue'
import { renderWithProviders } from '@tests/support/render'
import { screen, waitFor } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/api', () => ({
  default: { get: (...args: unknown[]) => mocks.apiGet(...args) },
}))

vi.mock('@/components/misc/DashboardElement.vue', () => ({
  default: {
    props: { config: { required: true, type: Object } },
    template: '<div data-testid="plugin-dashboard">{{ config.id }}:{{ config.key }}</div>',
  },
}))

describe('Lite dashboard', () => {
  it('keeps source states independent and derives failures in source order', async () => {
    let rejectSites!: (reason?: unknown) => void
    let rejectDownloaders!: (reason?: unknown) => void
    let rejectPlugins!: (reason?: unknown) => void
    mocks.apiGet.mockImplementation((path: string) => new Promise((_, reject) => {
      if (path === 'site/') rejectSites = reject
      if (path === 'download/clients') rejectDownloaders = reject
      if (path === 'plugin/?state=installed') rejectPlugins = reject
    }))

    await renderWithProviders(DashboardPage)
    rejectPlugins(new Error('plugins unavailable'))
    rejectDownloaders(new Error('downloaders unavailable'))
    rejectSites(new Error('sites unavailable'))

    await waitFor(() => expect(screen.getByText('sites 状态读取失败')).toBeInTheDocument())
    const renderedIssues = screen.getByRole('listbox').textContent ?? ''
    expect(renderedIssues.indexOf('sites 状态读取失败')).toBeLessThan(renderedIssues.indexOf('downloaders 状态读取失败'))
    expect(renderedIssues.indexOf('downloaders 状态读取失败')).toBeLessThan(renderedIssues.indexOf('plugins 状态读取失败'))
    expect(screen.getAllByText('读取状态失败')).toHaveLength(3)
  })

  it('renders the compatible plugin dashboard extension', async () => {
    mocks.apiGet.mockImplementation((path: string) => {
      if (path === 'site/' || path === 'download/clients' || path === 'plugin/?state=installed') return Promise.resolve([])
      if (path === 'plugin/dashboard/meta') return Promise.resolve([{ id: 'DemoPlugin', key: 'summary', name: '演示插件' }])
      if (path === 'plugin/dashboard/DemoPlugin/summary') {
        return Promise.resolve({ id: 'DemoPlugin', key: 'summary', name: '演示插件', runtime_status: 'running' })
      }
      return Promise.reject(new Error(`Unexpected endpoint: ${path}`))
    })

    await renderWithProviders(DashboardPage)

    expect(await screen.findByRole('heading', { name: '插件扩展' })).toBeInTheDocument()
    expect(screen.getByTestId('plugin-dashboard')).toHaveTextContent('DemoPlugin:summary')
  })
})
