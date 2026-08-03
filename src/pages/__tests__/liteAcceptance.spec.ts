import addDownloadDialogSource from '@/components/dialog/AddDownloadDialog.vue?raw'
import downloadingCardSource from '@/components/cards/DownloadingCard.vue?raw'
import downloadingTypesSource from '@/api/types.ts?raw'
import pluginCardSource from '@/components/cards/PluginCard.vue?raw'
import aceConfigSource from '@/ace-config.ts?raw'
import routerSource from '@/router/index.ts?raw'
import downloadingSource from '@/pages/downloading.vue?raw'
import resourceSource from '@/pages/resource.vue?raw'
import accountSettingSearchSource from '@/views/setting/AccountSettingSearch.vue?raw'
import accountSettingSiteSource from '@/views/setting/AccountSettingSite.vue?raw'
import pluginAppSource from '@/pages/plugin-app.vue?raw'
import litePluginDashboardSource from '@/components/misc/LitePluginDashboardElement.vue?raw'
import downloadingListSource from '@/views/reorganize/DownloadingListView.vue?raw'
import dashboardSource from '@/pages/dashboard.vue?raw'
import basicSettingsStepSource from '@/views/setup/BasicSettingsStep.vue?raw'
import setupWizardSource from '@/composables/useSetupWizard.ts?raw'
import enUsLocaleSource from '@/locales/en-US.ts?raw'
import zhCnLocaleSource from '@/locales/zh-CN.ts?raw'
import zhTwLocaleSource from '@/locales/zh-TW.ts?raw'
import { describe, expect, it } from 'vitest'

describe('Lite frontend acceptance surface', () => {
  it('keeps the keyword search to manual download workflow', () => {
    expect(resourceSource).toContain("api.get('search/title'")
    expect(resourceSource).toContain('resultHandle: result.result_handle || result.enclosure')
    expect(resourceSource).not.toContain('media_info')
    expect(resourceSource).not.toContain('meta_info')
    expect(resourceSource).toContain("t('liteSearch.emptyTitle')")
    expect(addDownloadDialogSource).toContain("'download/add'")
  })

  it('keeps the primary search controls compact and coordinated', () => {
    expect(resourceSource).toMatch(/class="keyword-field"[\s\S]*density="compact"/)
    expect(resourceSource).toMatch(/class="site-field"[\s\S]*density="compact"/)
  })

  it('only offers active sites as keyword search scope', () => {
    expect(resourceSource).toMatch(/sites\.value\s*\.filter\(site => site\.is_active\)/)
  })

  it('gives the result-site filter a full row on narrow screens', () => {
    expect(resourceSource).toMatch(/@media \(max-width: 480px\)[\s\S]*\.filter-field:first-child \{ min-width: 100%; flex-basis: 100%; \}/)
  })

  it('does not render a placeholder promotion value as torrent metadata', () => {
    expect(resourceSource).toContain("result.torrent_info.volume_factor !== '未知'")
  })

  it('uses the existing locale contract for Lite dashboard and search copy', () => {
    expect(dashboardSource).toContain("t('liteDashboard.title')")
    expect(dashboardSource).not.toContain("t('liteDashboard.searchTorrents')")
    expect(dashboardSource).not.toContain('SiteCard')
    expect(dashboardSource).not.toContain('DownloaderCard')
    expect(dashboardSource).toContain('data-testid="dashboard-site-list"')
    expect(dashboardSource).toContain('data-testid="dashboard-downloader-list"')
    expect(resourceSource).toContain("t('liteSearch.keyword')")
    expect(resourceSource).toContain("t('liteSearch.emptyTitle')")
  })

  it('does not expose the removed media search source setting', () => {
    expect(accountSettingSearchSource).not.toContain('SEARCH_SOURCE')
    expect(accountSettingSearchSource).not.toContain('mediaSourcesDict')
    expect(accountSettingSearchSource).not.toContain("setting.search.mediaSource")
  })

  it('keeps the OCR service setting without restoring browser emulation', () => {
    expect(basicSettingsStepSource).toContain('wizardData.basic.ocrHost')
    expect(setupWizardSource).toContain('OCR_HOST: wizardData.value.basic.ocrHost')
    expect(setupWizardSource).toContain('result.data.OCR_HOST')
    expect(accountSettingSiteSource).not.toContain('browserSimulation')
  })

  it('does not advertise removed media or transfer variables in notification templates', () => {
    for (const removedVariable of ['tmdbid', 'doubanid', 'season_episode', '__mediainfo__', '__transferinfo__']) {
      expect(aceConfigSource).not.toContain(removedVariable)
    }
  })

  it('uses localized copy in retained download and plugin error surfaces', () => {
    expect(downloadingCardSource).toContain("t('liteDownloadTask.category')")
    expect(pluginAppSource).toContain("t('litePlugin.loadErrorTitle')")
    expect(litePluginDashboardSource).toContain("t('litePlugin.dashboardLoadFailed')")
  })

  it('keeps download-task display to the downloader original title without media recognition fields', () => {
    const downloadingInfo = downloadingTypesSource.match(/export interface DownloadingInfo \{[\s\S]*?\n\}/)?.[0]

    expect(downloadingInfo).toBeDefined()
    for (const removedField of ['name', 'year', 'season_episode', 'media']) {
      expect(downloadingInfo).not.toMatch(new RegExp(`\\n  ${removedField}(?:\\?|):`))
    }
    expect(downloadingCardSource).toContain('props.info?.title')
    expect(downloadingCardSource).not.toContain('props.info?.name')
  })

  it('uses localized Lite search settings copy without subscription terminology', () => {
    expect(accountSettingSearchSource).not.toContain('订阅站点')
    expect(accountSettingSearchSource).not.toMatch(/\$toast\.(success|error)\(['"]/)
    expect(accountSettingSearchSource).toContain("t('setting.search.saveSuccess')")
    expect(accountSettingSearchSource).toContain("t('setting.search.saveFailed')")
  })

  it('describes settings as keyword site search instead of removed media classification', () => {
    expect(accountSettingSearchSource).toContain("t('liteSearch.settings.basicDescription')")
    expect(accountSettingSearchSource).toContain("t('liteSearch.settings.siteScopeDescription')")
    expect(accountSettingSearchSource).not.toContain("t('setting.search.basicSettingsDesc')")
    expect(accountSettingSearchSource).not.toContain("t('setting.search.downloadSiteDesc')")

    for (const localeSource of [enUsLocaleSource, zhCnLocaleSource, zhTwLocaleSource]) {
      expect(localeSource).toContain('basicDescription:')
      expect(localeSource).toContain('siteScopeDescription:')
    }
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
