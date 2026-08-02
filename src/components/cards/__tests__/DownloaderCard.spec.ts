import downloaderCardSource from '@/components/cards/DownloaderCard.vue?raw'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'

describe('DownloaderCard layout', () => {
  it('keeps the drag and remove controls separated', () => {
    const commonStylesSource = readFileSync(resolve(cwd(), 'src/styles/common.scss'), 'utf-8')

    expect(downloaderCardSource).toContain('app-card-top-action')
    expect(commonStylesSource).toContain('inset-inline-end: 4rem')
    expect(commonStylesSource).toContain('padding-inline-end: 6rem')
  })

  it('does not poll the removed dashboard downloader endpoint', () => {
    expect(downloaderCardSource).not.toContain("dashboard/downloader")
    expect(downloaderCardSource).not.toContain('useConditionalDataRefresh')
  })
})
