<script setup lang="ts">
import api from '@/api'
import type { DashboardItem, DownloaderConf, Site, SiteStatistic, SiteUserData } from '@/api/types'
import { formatFileSize } from '@/@core/utils/formatters'
import LitePluginDashboardElement from '@/components/misc/LitePluginDashboardElement.vue'
import LiteIssuesList from '@/views/dashboard/LiteIssuesList.vue'
import { getLogoUrl } from '@/utils/imageUtils'
import { getCachedSiteIcon } from '@/utils/siteIconCache'

const { t } = useI18n()

type ResourceStatus = 'loading' | 'ready' | 'empty' | 'error'
type StatusSource = 'sites' | 'downloaders'
type DashboardSite = Site & { icon: string }

interface DownloaderInfo {
  download_speed?: number
  upload_speed?: number
  download_size?: number
  upload_size?: number
  free_space?: number
}

const statusSources: StatusSource[] = ['sites', 'downloaders']
const pluginDashboards = ref<DashboardItem[]>([])
const sites = ref<DashboardSite[]>([])
const downloaders = ref<DownloaderConf[]>([])
const siteStatistics = ref<Record<string, SiteStatistic>>({})
const siteUserData = ref<Record<string, SiteUserData>>({})
const downloaderInfos = ref<Record<string, DownloaderInfo>>({})
const errors = reactive<Record<StatusSource, string | undefined>>({
  sites: undefined,
  downloaders: undefined,
})
const status = reactive<Record<StatusSource, ResourceStatus>>({
  sites: 'loading',
  downloaders: 'loading',
})

const activeSiteCount = computed(() => sites.value.filter(site => site.is_active).length)
const enabledDownloaderCount = computed(() => downloaders.value.filter(downloader => downloader.enabled).length)
const globalFreeSpace = computed<number | undefined>(() => Object.values(downloaderInfos.value)
  .find(info => typeof info.free_space === 'number')?.free_space)

function unwrapArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[]
  if (response && typeof response === 'object' && Array.isArray((response as { data?: unknown }).data)) {
    return (response as { data: T[] }).data
  }
  return []
}

function getSiteStatistic(site: Site): SiteStatistic | undefined {
  return siteStatistics.value[site.domain]
}

function getSiteUserData(site: Site): SiteUserData | undefined {
  const data = siteUserData.value[site.domain]
  return data?.err_msg ? undefined : data
}

function getSiteStatus(site: Site): string {
  const statistic = getSiteStatistic(site)
  if (!statistic) return t('liteDashboard.notFetched')
  if (statistic.lst_state === 1) return t('site.connectionFailed')
  if (statistic.lst_state === 0 && statistic.seconds) {
    return statistic.seconds >= 5 ? t('site.connectionSlow') : t('site.connectionNormal')
  }
  return t('site.connectionUnknown')
}

function getSiteStatusColor(site: Site): string {
  const statistic = getSiteStatistic(site)
  if (statistic?.lst_state === 1) return 'error'
  if (statistic?.lst_state === 0 && statistic.seconds) return statistic.seconds >= 5 ? 'warning' : 'success'
  return 'default'
}

function formatDuration(seconds: number | undefined): string {
  return typeof seconds === 'number' ? `${seconds.toFixed(2)} s` : t('liteDashboard.notFetched')
}

function formatMetric(value: number | undefined): string {
  return typeof value === 'number' ? formatFileSize(value) : t('liteDashboard.notFetched')
}

function formatSpeed(value: number | undefined): string {
  return typeof value === 'number' ? `${formatFileSize(value)}/s` : t('liteDashboard.notFetched')
}

function formatRatio(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(2) : t('liteDashboard.notFetched')
}

function getSiteIcon(site: Site): Promise<string> {
  const defaultIcon = getLogoUrl('site')
  return getCachedSiteIcon(site.id, async () => {
    const response = await api.get(`site/icon/${site.id}`) as { data?: { icon?: string } }
    return response?.data?.icon || defaultIcon
  }).catch(() => defaultIcon)
}

function addError(source: StatusSource): void {
  errors[source] = t('liteDashboard.resourceStatusReadFailed', {
    resource: t(`liteDashboard.${source}`),
  })
}

async function loadSites(): Promise<void> {
  try {
    const response = await api.get('site/')
    const configuredSites = unwrapArray<Site>(response)
    sites.value = await Promise.all(configuredSites.map(async site => ({
      ...site,
      icon: await getSiteIcon(site),
    })))
    status.sites = sites.value.length ? 'ready' : 'empty'
  } catch {
    status.sites = 'error'
    addError('sites')
    return
  }

  const [statisticsResult, userDataResult] = await Promise.allSettled([
    api.get('site/statistic'),
    api.get('site/userdata/latest'),
  ])
  if (statisticsResult.status === 'fulfilled') {
    siteStatistics.value = Object.fromEntries(unwrapArray<SiteStatistic>(statisticsResult.value)
      .filter(statistic => statistic.domain)
      .map(statistic => [statistic.domain as string, statistic]))
  } else {
    addError('sites')
  }
  if (userDataResult.status === 'fulfilled') {
    siteUserData.value = Object.fromEntries(unwrapArray<SiteUserData>(userDataResult.value)
      .filter(data => data.domain)
      .map(data => [data.domain as string, data]))
  } else {
    addError('sites')
  }
}

async function loadDownloaders(): Promise<void> {
  try {
    const response = await api.get('system/setting/Downloaders')
    downloaders.value = unwrapArray<DownloaderConf>(response)
    status.downloaders = downloaders.value.length ? 'ready' : 'empty'
  } catch {
    status.downloaders = 'error'
    addError('downloaders')
    return
  }

  const results = await Promise.allSettled(downloaders.value.map(async downloader => ({
    name: downloader.name,
    info: await api.get(`dashboard/downloader?name=${encodeURIComponent(downloader.name)}`) as DownloaderInfo,
  })))
  const infos: Record<string, DownloaderInfo> = {}
  for (const result of results) {
    if (result.status === 'fulfilled') infos[result.value.name] = result.value.info
    else addError('downloaders')
  }
  downloaderInfos.value = infos
}

const currentIssues = computed(() => statusSources
  .flatMap(source => errors[source] ? [errors[source]] : [])
  .slice(0, 10))

async function loadPluginDashboards(): Promise<void> {
  try {
    const metadata = await api.get('plugin/dashboard/meta')
    const items = unwrapArray<{ id?: string; key?: string }>(metadata)
    const dashboards = await Promise.all(items.map(async item => {
      if (!item?.id) return null
      const key = item.key || ''
      const path = key
        ? `plugin/dashboard/${encodeURIComponent(item.id)}/${encodeURIComponent(key)}`
        : `plugin/dashboard/${encodeURIComponent(item.id)}`
      try {
        return await api.get(path) as DashboardItem
      } catch {
        return null
      }
    }))
    pluginDashboards.value = dashboards.filter((item): item is DashboardItem => Boolean(item?.id))
  } catch {
    pluginDashboards.value = []
  }
}

onMounted(() => {
  void loadSites()
  void loadDownloaders()
  void loadPluginDashboards()
})
</script>

<template>
  <section class="lite-dashboard">
    <div class="lite-dashboard__heading">
      <div>
        <h1>{{ t('liteDashboard.title') }}</h1>
        <p>{{ t('liteDashboard.description') }}</p>
      </div>
    </div>

    <div class="lite-dashboard__status" :aria-label="t('liteDashboard.resourceStatus')">
      <VCard class="lite-dashboard__summary-card" variant="outlined">
        <VCardText>
          <div class="lite-dashboard__summary-heading">
            <div class="lite-dashboard__resource-icons" aria-hidden="true">
              <VAvatar v-for="site in sites.slice(0, 4)" :key="site.id" size="32" rounded="lg">
                <VImg :src="site.icon" :alt="site.name" cover />
              </VAvatar>
              <VAvatar v-if="!sites.length" size="32" rounded="lg">
                <VImg :src="getLogoUrl('site')" cover />
              </VAvatar>
            </div>
            <span class="text-body-1 font-weight-medium">{{ t('liteDashboard.sites') }}</span>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-3">
            <VProgressLinear v-if="status.sites === 'loading'" indeterminate color="primary" />
            <span v-else-if="status.sites === 'ready'">
              {{ t('liteDashboard.configuredSummary', { configured: sites.length, enabled: activeSiteCount }) }}
            </span>
            <span v-else-if="status.sites === 'empty'">{{ t('liteDashboard.notConfigured', { resource: t('liteDashboard.sites') }) }}</span>
            <span v-else>{{ t('liteDashboard.readStatusFailed') }}</span>
          </div>
        </VCardText>
      </VCard>
      <VCard class="lite-dashboard__summary-card" variant="outlined">
        <VCardText>
          <div class="lite-dashboard__summary-heading">
            <div class="lite-dashboard__resource-icons" aria-hidden="true">
              <VAvatar v-for="downloader in downloaders.slice(0, 4)" :key="downloader.name" size="32" rounded="lg">
                <VImg :src="getLogoUrl(downloader.type) || getLogoUrl('downloader')" :alt="downloader.name" contain />
              </VAvatar>
              <VAvatar v-if="!downloaders.length" size="32" rounded="lg">
                <VImg :src="getLogoUrl('downloader')" contain />
              </VAvatar>
            </div>
            <span class="text-body-1 font-weight-medium">{{ t('liteDashboard.downloaders') }}</span>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-3">
            <VProgressLinear v-if="status.downloaders === 'loading'" indeterminate color="primary" />
            <span v-else-if="status.downloaders === 'ready'">
              {{ t('liteDashboard.configuredSummary', { configured: downloaders.length, enabled: enabledDownloaderCount }) }}
            </span>
            <span v-else-if="status.downloaders === 'empty'">{{ t('liteDashboard.notConfigured', { resource: t('liteDashboard.downloaders') }) }}</span>
            <span v-else>{{ t('liteDashboard.readStatusFailed') }}</span>
          </div>
        </VCardText>
      </VCard>
    </div>

    <LiteIssuesList v-if="currentIssues.length" :issues="currentIssues" />

    <section class="lite-dashboard__section" aria-labelledby="dashboard-sites">
      <div class="lite-dashboard__section-heading">
        <h2 id="dashboard-sites">{{ t('liteDashboard.sites') }}</h2>
        <VBtn to="/site" variant="text" size="small">{{ t('liteDashboard.manageSites') }}</VBtn>
      </div>
      <VList v-if="sites.length" class="lite-dashboard__resource-list" data-testid="dashboard-site-list">
        <VListItem v-for="site in sites" :key="site.id" class="lite-dashboard__resource-row">
          <template #prepend>
            <VAvatar size="40" rounded="lg">
              <VImg :src="site.icon" :alt="site.name" cover />
            </VAvatar>
          </template>
          <VListItemTitle class="lite-dashboard__resource-title">
            <span class="text-truncate">{{ site.name }}</span>
            <div class="d-flex align-center ga-1" aria-hidden="true">
              <VIcon v-if="site.limit_interval" icon="mdi-speedometer" size="16" />
              <VIcon v-if="site.proxy" icon="mdi-network-outline" size="16" />
              <VIcon v-if="site.filter" icon="mdi-filter-cog-outline" size="16" />
            </div>
          </VListItemTitle>
          <VListItemSubtitle>{{ site.domain || site.url }}</VListItemSubtitle>
          <div class="lite-dashboard__site-metrics">
            <div><span>{{ t('liteDashboard.connection') }}</span><VChip :color="getSiteStatusColor(site)" size="x-small" variant="tonal">{{ getSiteStatus(site) }}</VChip></div>
            <div><span>{{ t('liteDashboard.responseTime') }}</span><strong>{{ formatDuration(getSiteStatistic(site)?.seconds) }}</strong></div>
            <div><span>{{ t('liteDashboard.ratio') }}</span><strong>{{ formatRatio(getSiteUserData(site)?.ratio) }}</strong></div>
            <div><span>{{ t('liteDashboard.seeding') }}</span><strong>{{ getSiteUserData(site)?.seeding ?? t('liteDashboard.notFetched') }}</strong></div>
            <div><span>{{ t('liteDashboard.bonus') }}</span><strong>{{ getSiteUserData(site)?.bonus ?? t('liteDashboard.notFetched') }}</strong></div>
          </div>
          <template #append>
            <VChip :color="site.is_active ? 'success' : 'default'" size="small" variant="tonal">
              {{ site.is_active ? t('common.active') : t('common.inactive') }}
            </VChip>
          </template>
        </VListItem>
      </VList>
      <VAlert v-else-if="status.sites === 'empty'" type="info" variant="tonal">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <span>{{ t('liteDashboard.notConfigured', { resource: t('liteDashboard.sites') }) }}</span>
          <VBtn to="/site" size="small" variant="text">{{ t('liteDashboard.addSite') }}</VBtn>
        </div>
      </VAlert>
    </section>

    <section class="lite-dashboard__section" aria-labelledby="dashboard-downloaders">
      <div class="lite-dashboard__section-heading">
        <h2 id="dashboard-downloaders">{{ t('liteDashboard.downloaders') }}</h2>
        <VBtn to="/setting?tab=system" variant="text" size="small">{{ t('liteDashboard.configureDownloaders') }}</VBtn>
      </div>
      <VList v-if="downloaders.length" class="lite-dashboard__resource-list" data-testid="dashboard-downloader-list">
        <VListSubheader class="lite-dashboard__free-space">
          <span>{{ t('liteDashboard.downloadDirectoryFreeSpace') }}</span>
          <strong>{{ formatMetric(globalFreeSpace) }}</strong>
        </VListSubheader>
        <VListItem v-for="downloader in downloaders" :key="downloader.name" class="lite-dashboard__resource-row">
          <template #prepend>
            <VAvatar size="40" rounded="lg">
              <VImg :src="getLogoUrl(downloader.type) || getLogoUrl('downloader')" :alt="downloader.name" contain />
            </VAvatar>
          </template>
          <VListItemTitle>{{ downloader.name }}</VListItemTitle>
          <div class="lite-dashboard__downloader-metrics">
            <div><span>{{ t('liteDashboard.downloadSpeed') }}</span><strong>{{ formatSpeed(downloaderInfos[downloader.name]?.download_speed) }}</strong></div>
            <div><span>{{ t('liteDashboard.uploadSpeed') }}</span><strong>{{ formatSpeed(downloaderInfos[downloader.name]?.upload_speed) }}</strong></div>
            <div><span>{{ t('liteDashboard.accumulatedDownload') }}</span><strong>{{ formatMetric(downloaderInfos[downloader.name]?.download_size) }}</strong></div>
            <div><span>{{ t('liteDashboard.accumulatedUpload') }}</span><strong>{{ formatMetric(downloaderInfos[downloader.name]?.upload_size) }}</strong></div>
            <VTooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps" tabindex="0"><span>{{ t('liteDashboard.pathMappings') }}</span><strong>{{ t('liteDashboard.pathMappingCount', { count: downloader.path_mapping?.length || 0 }) }}</strong></div>
              </template>
              <template v-if="downloader.path_mapping?.length">
                <div v-for="mapping in downloader.path_mapping" :key="`${mapping[0]}-${mapping[1]}`">{{ mapping[0] }} -> {{ mapping[1] }}</div>
              </template>
              <span v-else>{{ t('liteDashboard.noPathMappings') }}</span>
            </VTooltip>
          </div>
          <template #append>
            <div class="d-flex align-center ga-2">
              <VChip v-if="downloader.default" color="primary" size="small" variant="tonal">{{ t('common.default') }}</VChip>
              <VChip :color="downloader.enabled ? 'success' : 'default'" size="small" variant="tonal">
                {{ downloader.enabled ? t('common.active') : t('common.inactive') }}
              </VChip>
            </div>
          </template>
        </VListItem>
      </VList>
      <VAlert v-else-if="status.downloaders === 'empty'" type="info" variant="tonal">
        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <span>{{ t('liteDashboard.notConfigured', { resource: t('liteDashboard.downloaders') }) }}</span>
          <VBtn to="/setting?tab=system" size="small" variant="text">{{ t('liteDashboard.addDownloader') }}</VBtn>
        </div>
      </VAlert>
    </section>

    <section v-if="pluginDashboards.length" class="lite-dashboard__section" aria-labelledby="dashboard-plugins">
      <div class="lite-dashboard__section-heading"><h2 id="dashboard-plugins">{{ t('liteDashboard.pluginExtensions') }}</h2></div>
      <div class="lite-dashboard__plugin-grid">
        <LitePluginDashboardElement v-for="dashboard in pluginDashboards" :key="`${dashboard.id}:${dashboard.key}`" :config="dashboard" />
      </div>
    </section>
  </section>
</template>

<style scoped>
.lite-dashboard { display: grid; gap: 20px; max-inline-size: 1200px; margin-inline: auto; padding: 24px; }
.lite-dashboard__heading h1 { color: rgb(var(--v-theme-on-surface)); font-size: 24px; margin: 0; }
.lite-dashboard__heading p { color: rgb(var(--v-theme-on-surface)); margin: 4px 0 0; opacity: .78; }
.lite-dashboard__status { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.lite-dashboard__summary-card { min-block-size: 118px; }
.lite-dashboard__summary-heading { align-items: center; display: flex; gap: 12px; }
.lite-dashboard__resource-icons { align-items: center; display: flex; min-inline-size: 40px; }
.lite-dashboard__resource-icons .v-avatar + .v-avatar { margin-inline-start: -8px; outline: 2px solid rgb(var(--v-theme-surface)); }
.lite-dashboard__section { display: grid; gap: 12px; }
.lite-dashboard__section-heading { align-items: center; display: flex; justify-content: space-between; }
.lite-dashboard__section-heading h2 { color: rgb(var(--v-theme-on-surface)); font-size: 18px; margin: 0; }
.lite-dashboard__resource-list { border: 1px solid rgb(var(--v-theme-outline)); border-radius: 6px; }
.lite-dashboard__resource-list :deep(.v-list-item + .v-list-item) { border-block-start: 1px solid rgb(var(--v-theme-outline-variant)); }
.lite-dashboard__resource-row { align-items: start; padding-block: 14px; }
.lite-dashboard__resource-title { align-items: center; display: flex; gap: 8px; }
.lite-dashboard__site-metrics, .lite-dashboard__downloader-metrics { display: grid; gap: 8px 16px; grid-template-columns: repeat(3, minmax(86px, 1fr)); margin-block-start: 12px; }
.lite-dashboard__downloader-metrics { grid-template-columns: repeat(5, minmax(96px, 1fr)); }
.lite-dashboard__site-metrics > div, .lite-dashboard__downloader-metrics > div { display: grid; gap: 3px; min-inline-size: 0; }
.lite-dashboard__site-metrics span, .lite-dashboard__downloader-metrics span { color: rgb(var(--v-theme-on-surface)); font-size: 12px; opacity: .68; }
.lite-dashboard__site-metrics strong, .lite-dashboard__downloader-metrics strong { color: rgb(var(--v-theme-on-surface)); font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lite-dashboard__free-space { display: flex; gap: 8px; justify-content: end; padding-inline: 16px; }
.lite-dashboard__plugin-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
@media (width <= 960px) { .lite-dashboard__downloader-metrics { grid-template-columns: repeat(3, minmax(96px, 1fr)); } }
@media (width <= 768px) { .lite-dashboard { padding: 16px; } .lite-dashboard__status { grid-template-columns: 1fr; } .lite-dashboard__site-metrics, .lite-dashboard__downloader-metrics { grid-template-columns: repeat(2, minmax(110px, 1fr)); } }
</style>
