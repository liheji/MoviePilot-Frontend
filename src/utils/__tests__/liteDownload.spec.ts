import { buildLiteDownloadPayload } from '@/utils/liteDownload'
import { describe, expect, it } from 'vitest'

describe('buildLiteDownloadPayload', () => {
  it('only sends the opaque result handle and manual download choices', () => {
    expect(buildLiteDownloadPayload({
      resultHandle: 'lite-result:opaque',
      downloader: 'qbittorrent',
      savePath: '/downloads/manual',
    })).toEqual({
      result_handle: 'lite-result:opaque',
      downloader: 'qbittorrent',
      save_path: '/downloads/manual',
    })
  })

  it('omits unselected optional values without adding legacy fields', () => {
    expect(buildLiteDownloadPayload({ resultHandle: 'lite-result:opaque' })).toEqual({
      result_handle: 'lite-result:opaque',
    })
  })
})
