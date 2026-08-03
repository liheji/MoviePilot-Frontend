<script setup lang="ts">
import api from '@/api'
import type { DashboardItem, DownloaderConf, Site } from '@/api/types'
import LitePluginDashboardElement from '@/components/misc/LitePluginDashboardElement.vue'
import LiteIssuesList from '@/views/dashboard/LiteIssuesList.vue'
import LiteStatusPanel from '@/views/dashboard/LiteStatusPanel.vue'

const { t } = useI18n()

type ResourceStatus = 'loading' | 'ready' | 'empty' | 'error'
type StatusSource = 'sites' | 'downloaders'

const statusSources: StatusSource[] = ['sites', 'downloaders']
const pluginDashboards = ref<DashboardItem[]>([])

const sites = ref<Site[]>([])
const downloaders = ref<DownloaderConf[]>([])
const activeSiteCount = computed(() => sites.value.filter(site => site.is_active).length)
const errors = reactive<Record<StatusSource, string | undefined>>({
  sites: undefined,
  downloaders: undefined,
})
const status = reactive<Record<StatusSource, ResourceStatus>>({
  sites: 'loading',
  downloaders: 'loading',
})

function summary(resourceStatus: ResourceStatus, count: number, label: string): string {
  if (resourceStatus === 'loading') return t('liteDashboard.loadingStatus')
  if (resourceStatus === 'error') return t('liteDashboard.readStatusFailed')
  if (resourceStatus === 'empty') return t('liteDashboard.notConfigured', { resource: label })
  return t('liteDashboard.available', { count, resource: label })
}

const currentIssues = computed(() => statusSources
  .flatMap(source => errors[source] ? [errors[source]] : [])
  .slice(0, 10))

async function loadStatus<T>(key: StatusSource, path: string, target: Ref<T[]>): Promise<void> {
  try {
    const data = await api.get(path)
    target.value = Array.isArray(data) ? data : data?.data ?? []
    status[key] = target.value.length ? 'ready' : 'empty'
  } catch {
    status[key] = 'error'
    errors[key] = t('liteDashboard.resourceStatusReadFailed', {
      resource: t(`liteDashboard.${key}`),
    })
  }
}

async function loadPluginDashboards(): Promise<void> {
  try {
    const metadata = await api.get('plugin/dashboard/meta')
    const items = Array.isArray(metadata) ? metadata : metadata?.data ?? []
    const dashboards = await Promise.all(items.map(async (item: { id?: string; key?: string }) => {
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
  void loadStatus('sites', 'site/', sites)
  void loadStatus('downloaders', 'download/clients', downloaders)
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
      <LiteStatusPanel :title="t('liteDashboard.sites')" icon="mdi-web" :status="status.sites" :summary="summary(status.sites, activeSiteCount, t('liteDashboard.sites'))" />
      <LiteStatusPanel :title="t('liteDashboard.downloaders')" icon="mdi-download-outline" :status="status.downloaders" :summary="summary(status.downloaders, downloaders.length, t('liteDashboard.downloaders'))" />
    </div>
    <LiteIssuesList v-if="currentIssues.length" :issues="currentIssues" />
    <section class="lite-dashboard__section" aria-labelledby="dashboard-sites">
      <div class="lite-dashboard__section-heading">
        <h2 id="dashboard-sites">{{ t('liteDashboard.sites') }}</h2>
        <VBtn to="/site" variant="text" size="small">{{ t('liteDashboard.manageSites') }}</VBtn>
      </div>
      <VList v-if="sites.length" class="lite-dashboard__resource-list" data-testid="dashboard-site-list" lines="two">
        <VListItem v-for="site in sites" :key="site.id">
          <template #prepend>
            <VIcon icon="mdi-web" />
          </template>
          <VListItemTitle>{{ site.name }}</VListItemTitle>
          <VListItemSubtitle>{{ site.domain || site.url }}</VListItemSubtitle>
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
      <VList v-if="downloaders.length" class="lite-dashboard__resource-list" data-testid="dashboard-downloader-list" lines="two">
        <VListItem v-for="downloader in downloaders" :key="downloader.name">
          <template #prepend>
            <VIcon icon="mdi-download-outline" />
          </template>
          <VListItemTitle>{{ downloader.name }}</VListItemTitle>
          <VListItemSubtitle>{{ downloader.type }}</VListItemSubtitle>
          <template #append>
            <div class="d-flex align-center ga-2">
              <VChip v-if="downloader.default" color="primary" size="small" variant="tonal">
                {{ t('common.default') }}
              </VChip>
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
      <div class="lite-dashboard__section-heading">
        <h2 id="dashboard-plugins">{{ t('liteDashboard.pluginExtensions') }}</h2>
      </div>
      <div class="lite-dashboard__plugin-grid">
        <LitePluginDashboardElement
          v-for="dashboard in pluginDashboards"
          :key="`${dashboard.id}:${dashboard.key}`"
          :config="dashboard"
        />
      </div>
    </section>
  </section>
</template>

<style scoped>
.lite-dashboard { display: grid; gap: 20px; max-inline-size: 1200px; margin-inline: auto; padding: 24px; }
.lite-dashboard__heading { align-items: center; display: flex; gap: 16px; justify-content: space-between; }
.lite-dashboard__heading h1 { color: rgb(var(--v-theme-on-surface)); font-size: 24px; margin: 0; }
.lite-dashboard__heading p { color: rgb(var(--v-theme-on-surface)); margin: 4px 0 0; opacity: .78; }
.lite-dashboard__status { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.lite-dashboard__section { display: grid; gap: 16px; }
.lite-dashboard__section-heading { align-items: center; display: flex; justify-content: space-between; }
.lite-dashboard__section-heading h2 { color: rgb(var(--v-theme-on-surface)); font-size: 18px; margin: 0; }
.lite-dashboard__section-heading :deep(.v-btn) { color: rgb(var(--v-theme-primary)); font-weight: 600; }
.lite-dashboard__resource-list { border: 1px solid rgb(var(--v-theme-outline)); border-radius: 6px; }
.lite-dashboard__resource-list :deep(.v-list-item + .v-list-item) { border-block-start: 1px solid rgb(var(--v-theme-outline-variant)); }
.lite-dashboard__plugin-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
@media (width <= 768px) { .lite-dashboard { padding: 16px; } .lite-dashboard__status { grid-template-columns: 1fr; } }
</style>
