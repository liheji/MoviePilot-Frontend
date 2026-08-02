import LiteIssuesList from '@/views/dashboard/LiteIssuesList.vue'
import LiteStatusPanel from '@/views/dashboard/LiteStatusPanel.vue'
import { renderWithProviders } from '@tests/support/render'
import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

describe('LiteStatusPanel', () => {
  it.each([
    ['loading', '正在读取状态'],
    ['ready', '2 个站点可用'],
    ['empty', '尚未配置站点'],
    ['error', '读取状态失败'],
  ] as const)('renders the %s state summary', async (status, summary) => {
    await renderWithProviders(LiteStatusPanel, {
      props: {
        icon: 'mdi-web',
        status,
        summary,
        title: '站点',
      },
    })

    expect(screen.getByText('站点')).toBeInTheDocument()
    expect(screen.getByText(summary)).toBeInTheDocument()
  })

  it('uses readable status text and compact panel sizing', () => {
    const source = readFileSync(resolve(cwd(), 'src/views/dashboard/LiteStatusPanel.vue'), 'utf-8')

    expect(source).toContain('lite-status-panel__summary')
    expect(source).toContain('min-block-size: 96px')
  })
})

describe('LiteIssuesList', () => {
  it('shows no more than ten current issues', async () => {
    const issues = Array.from({ length: 11 }, (_, index) => `问题 ${index + 1}`)

    await renderWithProviders(LiteIssuesList, { props: { issues } })

    expect(screen.getByText('问题 10')).toBeInTheDocument()
    expect(screen.queryByText('问题 11')).not.toBeInTheDocument()
  })
})
