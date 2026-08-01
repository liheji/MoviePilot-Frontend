<script setup lang="ts">
import api from '@/api'
import type { DashboardItem } from '@/api/types'
import DashboardElement from '@/components/misc/DashboardElement.vue'
import LiteIssuesList from '@/views/dashboard/LiteIssuesList.vue'
import LiteStatusPanel from '@/views/dashboard/LiteStatusPanel.vue'

type ResourceStatus = 'loading' | 'ready' | 'empty' | 'error'
type StatusSource = 'sites' | 'downloaders' | 'plugins'
type PluginDashboardMeta = Pick<DashboardItem, 'id' | 'key' | 'name'>

const statusSources: StatusSource[] = ['sites', 'downloaders', 'plugins']

const sites = ref<unknown[]>([])
const downloaders = ref<unknown[]>([])
const plugins = ref<unknown[]>([])
const pluginDashboards = ref<DashboardItem[]>([])
const errors = reactive<Record<StatusSource, string | undefined>>({
  sites: undefined,
  downloaders: undefined,
  plugins: undefined,
})
const status = reactive<Record<StatusSource, ResourceStatus>>({
  sites: 'loading',
  downloaders: 'loading',
  plugins: 'loading',
})

function summary(resourceStatus: ResourceStatus, count: number, label: string): string {
  if (resourceStatus === 'loading') return '正在读取状态'
  if (resourceStatus === 'error') return '读取状态失败'
  if (resourceStatus === 'empty') return `尚未配置${label}`
  return `${count} 个${label}可用`
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
    errors[key] = `${key} 状态读取失败`
  }
}

async function loadPluginDashboards(): Promise<void> {
  try {
    const metadata = await api.get('plugin/dashboard/meta') as unknown as PluginDashboardMeta[]
    const dashboards = await Promise.all(
      metadata.map(async ({ id, key, name }) => {
        const config = await api.get(`plugin/dashboard/${id}/${key}`) as unknown as DashboardItem | null
        return config ? { ...config, id, key, name } : undefined
      }),
    )
    pluginDashboards.value = dashboards.filter((config): config is DashboardItem => Boolean(config))
  } catch {
    errors.plugins ??= '插件扩展读取失败'
  }
}

onMounted(() => {
  void loadStatus('sites', 'site/', sites)
  void loadStatus('downloaders', 'download/clients', downloaders)
  void loadStatus('plugins', 'plugin/?state=installed', plugins)
  void loadPluginDashboards()
})
</script>

<template>
  <section class="lite-dashboard">
    <div class="lite-dashboard__heading">
      <div>
        <h1>仪表盘</h1>
        <p>站点搜索与下载状态</p>
      </div>
      <VBtn to="/resource" color="primary" prepend-icon="mdi-magnify">搜索种子</VBtn>
    </div>
    <div class="lite-dashboard__status">
      <LiteStatusPanel title="站点" icon="mdi-web" :status="status.sites" :summary="summary(status.sites, sites.length, '站点')" />
      <LiteStatusPanel title="下载器" icon="mdi-download-outline" :status="status.downloaders" :summary="summary(status.downloaders, downloaders.length, '下载器')" />
      <LiteStatusPanel title="插件" icon="mdi-puzzle-outline" :status="status.plugins" :summary="summary(status.plugins, plugins.length, '插件')" />
    </div>
    <LiteIssuesList :issues="currentIssues" />
    <section v-if="pluginDashboards.length" class="lite-dashboard__plugins">
      <h2>插件扩展</h2>
      <div class="lite-dashboard__plugin-grid">
        <DashboardElement v-for="config in pluginDashboards" :key="`${config.id}:${config.key}`" :config="config" :allow-refresh="false" />
      </div>
    </section>
  </section>
</template>

<style scoped>
.lite-dashboard { display: grid; gap: 24px; max-inline-size: 1200px; margin-inline: auto; padding: 24px; }
.lite-dashboard__heading { align-items: center; display: flex; gap: 16px; justify-content: space-between; }
.lite-dashboard__heading h1 { font-size: 24px; margin: 0; }
.lite-dashboard__heading p { color: rgb(var(--v-theme-on-surface-variant)); margin: 4px 0 0; }
.lite-dashboard__status { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lite-dashboard__plugins { display: grid; gap: 16px; }
.lite-dashboard__plugins h2 { font-size: 18px; margin: 0; }
.lite-dashboard__plugin-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
@media (width <= 768px) { .lite-dashboard { padding: 16px; } .lite-dashboard__status { grid-template-columns: 1fr; } }
</style>
