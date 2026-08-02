<script lang="ts" setup>
import api from '@/api'
import type { Site, TorrentInfo } from '@/api/types'
import { formatDateDifference, formatFileSize } from '@/@core/utils/formatters'
import { openSharedDialog } from '@/composables/useSharedDialog'
import { useToast } from 'vue-toastification'

const AddDownloadDialog = defineAsyncComponent(() => import('@/components/dialog/AddDownloadDialog.vue'))
const route = useRoute()
const toast = useToast()
const { t } = useI18n()

interface LiteTorrentResult {
  enclosure: string
  result_handle: string
  torrent_info: TorrentInfo
}

const keyword = ref(String(route.query.keyword || ''))
const selectedSites = ref<string[]>(String(route.query.sites || '').split(',').filter(Boolean))
const sites = ref<Site[]>([])
const results = ref<LiteTorrentResult[]>([])
const loading = ref(false)
const siteFilter = ref<string[]>([])
const promotionFilter = ref<'all' | 'free' | 'normal'>('all')
const sortBy = ref<'published' | 'size' | 'seeders'>('published')

const siteOptions = computed(() => sites.value
  .filter(site => site.is_active)
  .map(site => ({ title: site.name, value: String(site.id) })))
const promotionOptions = computed(() => [
  { title: t('liteSearch.allPromotions'), value: 'all' },
  { title: t('liteSearch.free'), value: 'free' },
  { title: t('liteSearch.nonFree'), value: 'normal' },
])
const sortOptions = computed(() => [
  { title: t('liteSearch.published'), value: 'published' },
  { title: t('liteSearch.size'), value: 'size' },
  { title: t('liteSearch.seeders'), value: 'seeders' },
])
const resultSiteOptions = computed(() => [...new Map(results.value.map(result => [
  String(result.torrent_info.site || ''),
  result.torrent_info.site_name || String(result.torrent_info.site || ''),
])).entries()].map(([value, title]) => ({ value, title })))

/** 使用用户输入的关键词和已选站点拉取原始种子结果。 */
async function search() {
  const searchKeyword = keyword.value.trim()
  if (!searchKeyword) {
    toast.error(t('liteSearch.keywordRequired'))
    return
  }
  loading.value = true
  try {
    const response = await api.get('search/title', {
      params: { keyword: searchKeyword, sites: selectedSites.value.join(',') || undefined },
    }) as unknown as { success?: boolean; message?: string; data?: LiteTorrentResult[] }
    if (!response.success) {
      results.value = []
      toast.error(response.message || t('liteSearch.noResults'))
      return
    }
    results.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error(error)
    toast.error(error instanceof Error ? error.message : t('liteSearch.searchFailed'))
  } finally {
    loading.value = false
  }
}

/** 加载已启用站点，用于限定搜索范围。 */
async function loadSites() {
  try {
    sites.value = await api.get('site/') as unknown as Site[]
  } catch (error) {
    console.error(error)
  }
}

/** 打开下载确认框，并只传递结果句柄及可展示的种子字段。 */
function openDownload(result: LiteTorrentResult) {
  openSharedDialog(
    AddDownloadDialog,
    {
      resultHandle: result.result_handle || result.enclosure,
      title: result.torrent_info.title,
      torrent: result.torrent_info,
    },
    {
      done: () => toast.success(t('liteSearch.downloadAdded')),
      error: (message: string) => message && toast.error(message),
    },
    { closeOn: ['close', 'done', 'error'] },
  )
}

/** 依据当前筛选与排序控件生成可展示的原始种子列表。 */
const visibleResults = computed(() => results.value
  .filter(result => !siteFilter.value.length || siteFilter.value.includes(String(result.torrent_info.site || '')))
  .filter(result => promotionFilter.value === 'all'
    || (promotionFilter.value === 'free' ? result.torrent_info.downloadvolumefactor === 0 : result.torrent_info.downloadvolumefactor !== 0))
  .toSorted((left, right) => {
    if (sortBy.value === 'size') return (right.torrent_info.size || 0) - (left.torrent_info.size || 0)
    if (sortBy.value === 'seeders') return (right.torrent_info.seeders || 0) - (left.torrent_info.seeders || 0)
    return String(right.torrent_info.pubdate || '').localeCompare(String(left.torrent_info.pubdate || ''))
  }))

onMounted(async () => {
  await loadSites()
  if (keyword.value.trim()) await search()
})
</script>

<template>
  <div class="resource-workbench" data-glass-optical-mode="static-material">
    <VCard class="mb-4" flat border>
      <VCardText class="d-flex flex-wrap align-center gap-3">
        <VTextField
          v-model="keyword"
          class="keyword-field"
          density="compact"
          :label="t('liteSearch.keyword')"
          hide-details
          prepend-inner-icon="mdi-magnify"
          @keyup.enter="search"
        />
        <VSelect
          v-model="selectedSites"
          class="site-field"
          density="compact"
          :items="siteOptions"
          :label="t('liteSearch.sites')"
          multiple
          clearable
          hide-details
          prepend-inner-icon="mdi-server-network"
        />
        <VBtn color="primary" prepend-icon="mdi-magnify" :loading="loading" @click="search">{{ t('liteSearch.search') }}</VBtn>
      </VCardText>
    </VCard>

    <div v-if="results.length" class="d-flex flex-wrap align-center gap-3 mb-4">
      <VSelect v-model="siteFilter" class="filter-field" :items="resultSiteOptions" :label="t('liteSearch.resultSites')" multiple clearable hide-details />
      <VSelect
        v-model="promotionFilter"
        class="filter-field"
        :items="promotionOptions"
        :label="t('liteSearch.promotion')"
        hide-details
      />
      <VSelect
        v-model="sortBy"
        class="filter-field"
        :items="sortOptions"
        :label="t('liteSearch.sort')"
        hide-details
      />
      <span class="text-medium-emphasis text-body-2">{{ t('liteSearch.resultCount', { count: visibleResults.length }) }}</span>
    </div>

    <div v-if="visibleResults.length" class="result-list">
      <VCard v-for="result in visibleResults" :key="result.result_handle" flat border class="result-row">
        <VCardText class="d-flex flex-wrap align-center gap-4 py-3">
          <div class="result-copy">
            <div class="font-weight-medium break-all">{{ result.torrent_info.title }}</div>
            <div v-if="result.torrent_info.description" class="text-body-2 text-medium-emphasis break-all mt-1">
              {{ result.torrent_info.description }}
            </div>
            <div class="d-flex flex-wrap gap-2 mt-2 text-body-2 text-medium-emphasis">
              <span>{{ result.torrent_info.site_name }}</span>
              <span v-if="result.torrent_info.size">{{ formatFileSize(result.torrent_info.size) }}</span>
              <span v-if="result.torrent_info.pubdate">{{ formatDateDifference(result.torrent_info.pubdate) }}</span>
              <span>↑ {{ result.torrent_info.seeders || 0 }}</span>
              <span>↓ {{ result.torrent_info.peers || 0 }}</span>
              <VChip v-if="result.torrent_info.downloadvolumefactor === 0" size="x-small" color="success">{{ t('liteSearch.free') }}</VChip>
              <VChip v-else-if="result.torrent_info.volume_factor && result.torrent_info.volume_factor !== '未知'" size="x-small">{{ result.torrent_info.volume_factor }}</VChip>
            </div>
          </div>
          <VSpacer />
          <VBtn color="primary" prepend-icon="mdi-download" @click="openDownload(result)">{{ t('liteSearch.download') }}</VBtn>
        </VCardText>
      </VCard>
    </div>

    <VEmptyState v-else-if="!loading" icon="mdi-magnify" :title="t('liteSearch.emptyTitle')" :text="t('liteSearch.emptyText')" />
  </div>
</template>

<style scoped>
.resource-workbench { max-width: 1280px; margin: 0 auto; }
.keyword-field { min-width: min(100%, 18rem); flex: 1 1 18rem; }
.site-field { min-width: min(100%, 14rem); flex: 1 1 14rem; }
.filter-field { min-width: min(100%, 11rem); flex: 1 1 11rem; }
.result-list { display: grid; gap: 0.75rem; }
.result-row { border-radius: 6px; }
.result-copy { min-width: 0; flex: 1 1 30rem; }

@media (max-width: 480px) {
  .filter-field:first-child { min-width: 100%; flex-basis: 100%; }
}
</style>
