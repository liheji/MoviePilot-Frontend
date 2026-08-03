import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const menuPath = resolve(process.cwd(), 'src/router/i18n-menu.ts')
const layoutPath = resolve(process.cwd(), 'src/layouts/default/components/DefaultLayout.vue')
const siteCardPath = resolve(process.cwd(), 'src/components/cards/SiteCard.vue')
const viteConfigPath = resolve(process.cwd(), 'vite.config.ts')
const packagePath = resolve(process.cwd(), 'package.json')
const lockfilePath = resolve(process.cwd(), 'yarn.lock')
const mainPath = resolve(process.cwd(), 'src/main.ts')
const stylesPath = resolve(process.cwd(), 'src/styles/main.scss')
const shimsPath = resolve(process.cwd(), 'shims.d.ts')
const apiTypesPath = resolve(process.cwd(), 'src/api/types.ts')
const imageUtilsPath = resolve(process.cwd(), 'src/utils/imageUtils.ts')
const footerPath = resolve(process.cwd(), 'src/layouts/default/components/Footer.vue')
const aboutDialogPath = resolve(process.cwd(), 'src/components/dialog/AboutDialog.vue')
const addDownloadDialogPath = resolve(process.cwd(), 'src/components/dialog/AddDownloadDialog.vue')
const siteAddEditDialogPath = resolve(process.cwd(), 'src/components/dialog/SiteAddEditDialog.vue')
const siteCardListPath = resolve(process.cwd(), 'src/views/site/SiteCardListView.vue')
const notificationPath = resolve(process.cwd(), 'src/layouts/default/components/UserNotification.vue')
const notificationSettingPath = resolve(process.cwd(), 'src/views/setting/AccountSettingNotification.vue')
const constantsPath = resolve(process.cwd(), 'src/api/constants.ts')
const commonStylesPath = resolve(process.cwd(), 'src/styles/common.scss')
const transparentStylesPath = resolve(process.cwd(), 'src/styles/themes/transparent.scss')
const glassStylesPath = resolve(process.cwd(), 'src/styles/themes/glass.scss')
const pluginApiPath = resolve(process.cwd(), 'src/api/plugin.ts')
const userProfilePath = resolve(process.cwd(), 'src/views/user/UserProfileView.vue')
const userAddEditDialogPath = resolve(process.cwd(), 'src/components/dialog/UserAddEditDialog.vue')
const setupPath = resolve(process.cwd(), 'src/pages/setup.vue')
const setupComposablePath = resolve(process.cwd(), 'src/composables/useSetupWizard.ts')
const netTestPath = resolve(process.cwd(), 'src/views/system/NetTestView.vue')
const dashboardPath = resolve(process.cwd(), 'src/pages/dashboard.vue')
const formattersPath = resolve(process.cwd(), 'src/@core/utils/formatters.ts')
const mediaIdentityPath = resolve(process.cwd(), 'src/utils/mediaIdentity.ts')
const pathInputPath = resolve(process.cwd(), 'src/components/input/PathInput.vue')
const u115AuthDialogPath = resolve(process.cwd(), 'src/components/dialog/U115AuthDialog.vue')
const buildWorkflowPath = resolve(process.cwd(), '.github/workflows/build.yml')
const localePaths = ['zh-CN.ts', 'zh-TW.ts', 'en-US.ts'].map(filePath => resolve(process.cwd(), 'src/locales', filePath))

describe('Lite 前端表面', () => {
  it('只展示 Lite 导航分组和保留的任务入口', () => {
    const menu = readFileSync(menuPath, 'utf8')
    const layout = readFileSync(layoutPath, 'utf8')

    expect(menu).toContain("title: t('navItems.torrentSearch')")
    expect(menu).toContain("title: t('navItems.downloadTasks')")
    expect(menu).toContain("header: t('menu.management')")
    expect(menu).toContain("header: t('menu.settings')")
    expect(menu).not.toContain("header: t('menu.organize')")
    expect(menu).not.toContain("header: t('menu.system')")
    expect(layout).toContain('managementMenus')
    expect(layout).toContain('settingsMenus')
    expect(layout).not.toContain('organizeMenus')
    expect(layout).not.toContain('systemMenus')
  })

  it('不再把推荐和探索写入 Lite PWA 或覆盖范围', () => {
    const viteConfig = readFileSync(viteConfigPath, 'utf8')

    expect(viteConfig).not.toContain("'url': './recommend'")
    expect(viteConfig).not.toContain("'url': './discover'")
    expect(viteConfig).not.toContain("'src/pages/recommend.vue'")
    expect(viteConfig).not.toContain("'src/pages/discover.vue'")
    expect(viteConfig).not.toContain("'src/pages/subscribe.vue'")
  })

  it('保留站点卡不再加载媒体资源浏览弹窗', () => {
    const siteCard = readFileSync(siteCardPath, 'utf8')

    expect(siteCard).not.toContain('SiteResourceDialog')
    expect(siteCard).not.toContain('handleResourceBrowse')
  })

  it('不再构建已删除工作流和引导功能专属依赖', () => {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    const lockfile = readFileSync(lockfilePath, 'utf8')
    const main = readFileSync(mainPath, 'utf8')
    const styles = readFileSync(stylesPath, 'utf8')
    const shims = readFileSync(shimsPath, 'utf8')

    for (const dependency of [
      '@vue-js-cron/vuetify',
      'gridstack',
      'http-proxy-middleware',
      'mousetrap',
      'vue-shepherd',
      '@types/mousetrap',
    ]) {
      expect(packageJson.dependencies[dependency]).toBeUndefined()
      expect(packageJson.devDependencies[dependency]).toBeUndefined()
      expect(lockfile).not.toContain(`${dependency}@`)
    }

    expect(main).not.toContain('VCronVuetify')
    expect(main).not.toContain('VCronField')
    expect(styles).not.toContain('@vue-js-cron/vuetify')
    expect(shims).not.toContain('vue-shepherd')
    expect(existsSync(resolve(process.cwd(), 'src/components/input/CronInput.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/field/CronField.vue'))).toBe(false)
  })

  it('不保留未接入 Lite 前端的历史构建与加密依赖', () => {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    for (const dependency of [
      'crypto-js',
      '@types/crypto-js',
      'js-cookie',
      '@types/js-cookie',
      'type-fest',
      'unplugin-vue-define-options',
      'vite-plugin-pages',
      'vite-plugin-vue-layouts',
    ]) {
      expect(packageJson.dependencies[dependency]).toBeUndefined()
      expect(packageJson.devDependencies[dependency]).toBeUndefined()
    }
  })

  it('不保留整理、存储、媒体服务器和发现排序的前端死代码', () => {
    const apiTypes = readFileSync(apiTypesPath, 'utf8')
    const imageUtils = readFileSync(imageUtilsPath, 'utf8')
    const footer = readFileSync(footerPath, 'utf8')

    for (const typeName of [
      'TransferHistory',
      'StorageConf',
      'MediaServerPlayItem',
      'MediaServerLibrary',
      'MediaServerConf',
      'TransferDirectoryConf',
      'TransferForm',
      'ManualTransferPayload',
      'ManualTransferTargetPathData',
      'ManualTransferHistoryInfo',
      'ManualTransferPreviewSummary',
      'ManualTransferPreviewItem',
      'ManualTransferPreviewData',
      'TransferQueue',
      'DiscoverSource',
    ]) {
      expect(apiTypes).not.toContain(`interface ${typeName}`)
    }

    expect(imageUtils).not.toContain('mediaserverLogo')
    expect(imageUtils).not.toContain('mediaserver:')
    expect(footer).not.toContain('components.transferQueue.title')
    expect(existsSync(resolve(process.cwd(), 'src/components/dialog/RcloneConfigDialog.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/dialog/TransferQueueDialog.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/dialog/DiscoverTabOrderDialog.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/dialog/__tests__/DiscoverTabOrderDialog.spec.ts'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/misc/DashboardMediaState.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/assets/images/logos/mediaserver.png'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/assets/images/misc/rclone.png'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/assets/images/misc/storage.png'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/utils/appDeepLink.ts'))).toBe(false)
    expect(existsSync(mediaIdentityPath)).toBe(false)
    expect(existsSync(pathInputPath)).toBe(false)
    expect(existsSync(u115AuthDialogPath)).toBe(false)
    expect(imageUtils).not.toContain('embyLogo')
    expect(imageUtils).not.toContain('jellyfinLogo')
    expect(imageUtils).not.toContain('plexLogo')
    expect(imageUtils).not.toContain('tmdbLogo')
    expect(imageUtils).not.toContain('fanartLogo')
    expect(imageUtils).not.toContain('bangumiLogo')
    expect(imageUtils).not.toContain('doubanLogo')
    expect(imageUtils).not.toContain('isBangumiImageUrl')
    expect(imageUtils).not.toContain('doubanio.com')
    expect(readFileSync(netTestPath, 'utf8')).not.toContain('thetvdb')

    for (const logo of [
      'emby.png', 'zspace.webp', 'jellyfin.png', 'plex.png', 'trimemedia.png',
      'ugreen.png', 'douban.png', 'tmdb.png', 'fanart.webp', 'bangumi.png',
      'douban-black.png', 'thetvdb.jpeg',
    ])
      expect(existsSync(resolve(process.cwd(), 'src/assets/images/logos', logo))).toBe(false)
  })

  it('不再调用已删除的仪表盘和存储接口', () => {
    const aboutDialog = readFileSync(aboutDialogPath, 'utf8')

    expect(aboutDialog).not.toContain('dashboard/processes')
    expect(aboutDialog).not.toContain('querySystemUptime')
  })

  it('不暴露已删除 RSS、媒体偏好、豆瓣账号或媒体通知语义', () => {
    const apiTypes = readFileSync(apiTypesPath, 'utf8')
    const siteDialog = readFileSync(siteAddEditDialogPath, 'utf8')
    const siteCardList = readFileSync(siteCardListPath, 'utf8')
    const notification = readFileSync(notificationPath, 'utf8')
    const notificationSetting = readFileSync(notificationSettingPath, 'utf8')
    const constants = readFileSync(constantsPath, 'utf8')
    const userProfile = readFileSync(userProfilePath, 'utf8')
    const userDialog = readFileSync(userAddEditDialogPath, 'utf8')
    const setup = readFileSync(setupPath, 'utf8')

    expect(siteDialog).not.toContain('siteForm.rss')
    expect(apiTypes).not.toContain('rss?: string')
    expect(siteCardList).not.toContain('rss: site.rss')
    expect(notification).not.toContain("'media'")
    expect(notification).not.toContain('整理入库')
    expect(notification).not.toContain("'订阅'")
    expect(notification).not.toContain("'智能体'")
    expect(notificationSetting).not.toContain('organizeSuccess')
    expect(constants).not.toContain('actionStepOptions')
    expect(userProfile).not.toContain('douban_userid')
    expect(userDialog).not.toContain('douban_userid')
    expect(setup).not.toContain('PreferencesSettingsStep')
    expect(existsSync(resolve(process.cwd(), 'src/views/setting/AccountSettingRule.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/views/setup/PreferencesSettingsStep.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/dialog/TorrentMoreSourcesDialog.vue'))).toBe(false)

    for (const typeName of [
      'ManualScrapeOptions',
      'WorkflowShare',
      'MediaInfo',
      'MediaSeason',
      'TmdbSeason',
      'MediaRelease',
      'TmdbEpisode',
      'Person',
      'Context',
      'FilterRuleGroup',
      'RuleTestData',
      'RecommendSource',
      'Workflow',
    ]) {
      expect(apiTypes).not.toContain(`interface ${typeName}`)
    }

    expect(apiTypes).not.toContain('type MediaDataSource')
    expect(apiTypes).not.toContain('interface RecognitionCacheItem')
    expect(apiTypes).not.toContain('interface RecognitionCacheData')
    expect(constants).not.toContain('export const innerFilterRules')
    expect(constants).not.toContain('export const qualityOptions')
    expect(constants).not.toContain('export const mediaTypeOptions')
  })

  it('不保留 Agent、订阅或整理页面的全局主题选择器', () => {
    const commonStyles = readFileSync(commonStylesPath, 'utf8')
    const transparentStyles = readFileSync(transparentStylesPath, 'utf8')
    const glassStyles = readFileSync(glassStylesPath, 'utf8')
    const pluginApi = readFileSync(pluginApiPath, 'utf8')

    expect(commonStyles).not.toContain('data-agent-assistant-open')
    expect(transparentStyles).not.toContain('.subscribe-files-dialog')
    expect(transparentStyles).not.toContain('.agent-assistant-panel')
    expect(glassStyles).not.toContain('.agent-assistant-panel')
    expect(glassStyles).not.toContain('.transfer-history-mobile-page')
    expect(glassStyles).not.toContain('.recognition-cache-mobile-item')
    expect(pluginApi).toContain("'browser'")
    expect(pluginApi).toContain("'subtitle'")
    expect(pluginApi).toContain("'rss'")
  })

  it('为 Lite 下载目录提供本地化标签并使用有效设置入口', () => {
    const addDownloadDialog = readFileSync(addDownloadDialogPath, 'utf8')
    const dashboard = readFileSync(dashboardPath, 'utf8')

    expect(addDownloadDialog).toContain("t('dialog.addDownload.saveDirectory')")
    expect(addDownloadDialog).not.toContain("t('dialog.addDownload.savePath')")
    expect(dashboard).toContain('to="/setting?tab=system"')
  })

  it('仪表盘可用站点统计只计入已启用站点', () => {
    const dashboard = readFileSync(dashboardPath, 'utf8')

    expect(dashboard).toContain('const activeSiteCount = computed(() => sites.value.filter(site => site.is_active).length)')
    expect(dashboard).toContain("t('liteDashboard.configuredSummary', { configured: sites.length, enabled: activeSiteCount })")
  })

  it('不保留季集匹配或高级种子筛选的孤立前端代码', () => {
    const formatters = readFileSync(formattersPath, 'utf8')

    expect(formatters).not.toContain('formatSeasonEpisode')
    expect(formatters).not.toContain('formatSeason =')
    expect(formatters).not.toContain('formatEp(')
    expect(existsSync(resolve(process.cwd(), 'src/@core/utils/season.ts'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/dialog/TorrentAllFiltersDialog.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/dialog/TorrentSingleFilterDialog.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/components/dialog/SearchSiteDialog.vue'))).toBe(false)
    for (const localePath of localePaths)
      expect(readFileSync(localePath, 'utf8')).not.toContain('\n  torrent:')
  })

  it('使用现有用户更新接口保存向导密码', () => {
    const setupComposable = readFileSync(setupComposablePath, 'utf8')

    expect(setupComposable).toContain("api.put('user/', { ...userData, id: currentUser.id })")
    expect(setupComposable).not.toContain('api.put(`user/${currentUser.id}`, userData)')
  })

  it('发布工作流覆盖所有 Vite 构建输入', () => {
    const workflow = readFileSync(buildWorkflowPath, 'utf8')

    expect(workflow).toContain("- 'index.html'")
    expect(workflow).toContain("- 'postcss.config.js'")
  })

  it('不保留已删除能力的本地化命名空间', () => {
    for (const localePath of localePaths) {
      const locale = readFileSync(localePath, 'utf8')

      expect(locale).not.toContain('\n  discoverTabs:')
      expect(locale).not.toContain('\n    rcloneConfig:')
      expect(locale).not.toContain('\n    transferQueue: {')
      expect(locale).not.toContain('\n  mediaserver:')
      expect(locale).not.toContain('\n    mediaServer: {')

      for (const namespace of [
        'mediaType',
        'actionStep',
        'subscribeTabs',
        'workflowTabs',
        'agentAssistant',
        'workflow',
        'media',
        'subscribe',
        'recommend',
        'discover',
        'calendar',
        'filterRules',
        'transferType',
        'transferHistory',
        'customRule',
        'filterRule',
        'bangumi',
        'anilist',
        'tmdb',
        'douban',
        'directory',
        'file',
        'person',
      ])
        expect(locale).not.toContain(`\n  ${namespace}:`)
    }
  })
})
