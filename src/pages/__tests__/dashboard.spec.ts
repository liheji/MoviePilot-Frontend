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
      if (path === 'system/setting/Downloaders') rejectDownloaders = reject
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
      if (path === 'site/') return Promise.resolve([{ id: 1, name: '测试站点', domain: 'example.test', is_active: true }])
      if (path === 'site/icon/1') return Promise.resolve({ data: { icon: '/site-icon.png' } })
      if (path === 'site/statistic') return Promise.resolve([{ domain: 'example.test', lst_state: 0, seconds: 1 }])
      if (path === 'site/userdata/latest') return Promise.resolve([{ domain: 'example.test', bonus: 100, ratio: 1, seeding: 2 }])
      if (path === 'system/setting/Downloaders') return Promise.resolve([{ name: 'qBittorrent', type: 'qbittorrent', enabled: true, path_mapping: [] }])
      if (path === 'dashboard/downloader?name=qBittorrent') return Promise.resolve({ download_speed: 1024, upload_speed: 0, download_size: 2048, upload_size: 4096, free_space: 8192 })
      if (path === 'plugin/dashboard/meta') return Promise.resolve([])
      return Promise.reject(new Error(`Unexpected endpoint: ${path}`))
    })

    await renderWithProviders(DashboardPage)

    expect(await screen.findByTestId('dashboard-site-list')).toHaveTextContent('测试站点')
    expect(screen.getByTestId('dashboard-downloader-list')).toHaveTextContent('qBittorrent')
    expect(screen.queryByText('当前没有需要处理的问题')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-downloader-list')).toHaveTextContent('下载目录可用空间')
    expect(mocks.apiGet).toHaveBeenCalledWith('plugin/dashboard/meta')
    expect(mocks.apiGet).toHaveBeenCalledWith('system/setting/Downloaders')
    expect(mocks.apiGet).toHaveBeenCalledWith('dashboard/downloader?name=qBittorrent')
    expect(mocks.apiGet).not.toHaveBeenCalledWith('plugin/?state=installed')
  })
})
