import DashboardPage from '@/pages/dashboard.vue'
import { renderWithProviders } from '@tests/support/render'
import { screen, waitFor } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/api', () => ({
  default: { get: (...args: unknown[]) => mocks.apiGet(...args) },
}))

vi.mock('@/components/misc/LitePluginDashboardElement.vue', () => ({
  default: { template: '<div data-testid="plugin-dashboard" />' },
}))

describe('Lite dashboard', () => {
  it('keeps source states independent and derives failures in source order', async () => {
    let rejectSites!: (reason?: unknown) => void
    let rejectDownloaders!: (reason?: unknown) => void
    mocks.apiGet.mockImplementation((path: string) => new Promise((_, reject) => {
      if (path === 'site/') rejectSites = reject
      if (path === 'download/clients') rejectDownloaders = reject
      if (path === 'plugin/dashboard/meta') return Promise.resolve([])
      return Promise.resolve([])
    }))

    await renderWithProviders(DashboardPage)
    rejectDownloaders(new Error('downloaders unavailable'))
    rejectSites(new Error('sites unavailable'))

    await waitFor(() => expect(screen.getByText('站点状态读取失败')).toBeInTheDocument())
    const renderedIssues = screen.getByRole('listbox').textContent ?? ''
    expect(renderedIssues.indexOf('站点状态读取失败')).toBeLessThan(renderedIssues.indexOf('下载器状态读取失败'))
    expect(screen.getAllByText('读取状态失败')).toHaveLength(2)
  })

  it('uses read-only site and downloader lists and loads plugin dashboard extensions', async () => {
    mocks.apiGet.mockImplementation((path: string) => {
      if (path === 'site/') return Promise.resolve([{ id: 1, name: '测试站点' }])
      if (path === 'download/clients') return Promise.resolve([{ name: 'qBittorrent', enabled: true }])
      if (path === 'plugin/dashboard/meta') return Promise.resolve([])
      return Promise.reject(new Error(`Unexpected endpoint: ${path}`))
    })

    await renderWithProviders(DashboardPage)

    expect(await screen.findByTestId('dashboard-site-list')).toHaveTextContent('测试站点')
    expect(screen.getByTestId('dashboard-downloader-list')).toHaveTextContent('qBittorrent')
    expect(screen.queryByText('当前没有需要处理的问题')).not.toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('plugin/dashboard/meta')
    expect(mocks.apiGet).not.toHaveBeenCalledWith('plugin/?state=installed')
  })
})
