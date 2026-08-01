import addDownloadDialogSource from '@/components/dialog/AddDownloadDialog.vue?raw'
import downloadingCardSource from '@/components/cards/DownloadingCard.vue?raw'
import pluginCardSource from '@/components/cards/PluginCard.vue?raw'
import routerSource from '@/router/index.ts?raw'
import downloadingSource from '@/pages/downloading.vue?raw'
import resourceSource from '@/pages/resource.vue?raw'
import downloadingListSource from '@/views/reorganize/DownloadingListView.vue?raw'
import { describe, expect, it } from 'vitest'

describe('Lite frontend acceptance surface', () => {
  it('keeps the keyword search to manual download workflow', () => {
    expect(resourceSource).toContain("api.get('search/title'")
    expect(resourceSource).toContain('resultHandle: result.result_handle || result.enclosure')
    expect(resourceSource).toContain('media_info: null')
    expect(resourceSource).toContain('搜索站点种子')
    expect(addDownloadDialogSource).toContain("'download/add'")
  })

  it('keeps download task controls while removing media workflow routes', () => {
    expect(downloadingSource).toContain("api.get('download/clients')")
    expect(downloadingListSource).toContain("api.get('download/'")
    expect(downloadingCardSource).toContain("isDownloading.value ? 'stop' : 'start'")
    expect(downloadingCardSource).toContain('`download/${operation}/${props.info?.hash}`')
    expect(downloadingCardSource).toContain('api.delete(`download/${props.info?.hash}`')
    expect(downloadingCardSource).toContain('api.put(`download/${props.info?.hash}`')

    for (const removedPath of ['/workflow', '/subscribe/movie', '/history', '/filemanager'])
      expect(routerSource).not.toContain(`path: '${removedPath}`)
  })

  it('shows incompatible plugins as installed but non-runnable', () => {
    expect(pluginCardSource).toContain("runtime_status === 'lite_incompatible'")
    expect(pluginCardSource).toContain('不兼容 Lite')
    expect(pluginCardSource).toContain('remoteUiAvailable.value')
  })
})
