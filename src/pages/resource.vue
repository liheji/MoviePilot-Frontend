<script lang="ts" setup>
import api from '@/api'
import type { Site, TorrentInfo } from '@/api/types'
import { formatDateDifference, formatFileSize } from '@/@core/utils/formatters'
import { openSharedDialog } from '@/composables/useSharedDialog'
import { useToast } from 'vue-toastification'

const AddDownloadDialog = defineAsyncComponent(() => import('@/components/dialog/AddDownloadDialog.vue'))
const route = useRoute()
const toast = useToast()

interface LiteTorrentResult {
  enclosure: string
  meta_info: { subtitle?: string | null; title?: string | null }
  media_info: null
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

const siteOptions = computed(() => sites.value.map(site => ({ title: site.name, value: String(site.id) })))
const resultSiteOptions = computed(() => [...new Map(results.value.map(result => [
  String(result.torrent_info.site || ''),
  result.torrent_info.site_name || String(result.torrent_info.site || ''),
])).entries()].map(([value, title]) => ({ value, title })))

/** 使用用户输入的关键词和已选站点拉取原始种子结果。 */
async function search() {
  const searchKeyword = keyword.value.trim()
  if (!searchKeyword) {
    toast.error('请输入搜索关键词')
    return
  }
  loading.value = true
  try {
    const response = await api.get('search/title', {
      params: { keyword: searchKeyword, sites: selectedSites.value.join(',') || undefined },
    }) as unknown as { success?: boolean; message?: string; data?: LiteTorrentResult[] }
    if (!response.success) {
      results.value = []
      toast.error(response.message || '未找到资源')
      return
    }
    results.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error(error)
    toast.error(error instanceof Error ? error.message : '搜索失败')
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
      title: result.meta_info.title,
      torrent: result.torrent_info,
    },
    {
      done: () => toast.success('下载任务已添加'),
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
          label="关键词"
          hide-details
          prepend-inner-icon="mdi-magnify"
          @keyup.enter="search"
        />
        <VSelect
          v-model="selectedSites"
          class="site-field"
          :items="siteOptions"
          label="站点"
          multiple
          clearable
          hide-details
          prepend-inner-icon="mdi-server-network"
        />
        <VBtn color="primary" prepend-icon="mdi-magnify" :loading="loading" @click="search">搜索</VBtn>
      </VCardText>
    </VCard>

    <div v-if="results.length" class="d-flex flex-wrap align-center gap-3 mb-4">
      <VSelect v-model="siteFilter" class="filter-field" :items="resultSiteOptions" label="结果站点" multiple clearable hide-details />
      <VSelect
        v-model="promotionFilter"
        class="filter-field"
        :items="[{ title: '全部促销', value: 'all' }, { title: '免费', value: 'free' }, { title: '非免费', value: 'normal' }]"
        label="促销"
        hide-details
      />
      <VSelect
        v-model="sortBy"
        class="filter-field"
        :items="[{ title: '发布时间', value: 'published' }, { title: '大小', value: 'size' }, { title: '做种数', value: 'seeders' }]"
        label="排序"
        hide-details
      />
      <span class="text-medium-emphasis text-body-2">{{ visibleResults.length }} 个结果</span>
    </div>

    <div v-if="visibleResults.length" class="result-list">
      <VCard v-for="result in visibleResults" :key="result.result_handle" flat border class="result-row">
        <VCardText class="d-flex flex-wrap align-center gap-4 py-3">
          <div class="result-copy">
            <div class="font-weight-medium break-all">{{ result.torrent_info.title }}</div>
            <div v-if="result.meta_info.subtitle || result.torrent_info.description" class="text-body-2 text-medium-emphasis break-all mt-1">
              {{ result.meta_info.subtitle || result.torrent_info.description }}
            </div>
            <div class="d-flex flex-wrap gap-2 mt-2 text-body-2 text-medium-emphasis">
              <span>{{ result.torrent_info.site_name }}</span>
              <span v-if="result.torrent_info.size">{{ formatFileSize(result.torrent_info.size) }}</span>
              <span v-if="result.torrent_info.pubdate">{{ formatDateDifference(result.torrent_info.pubdate) }}</span>
              <span>↑ {{ result.torrent_info.seeders || 0 }}</span>
              <span>↓ {{ result.torrent_info.peers || 0 }}</span>
              <VChip v-if="result.torrent_info.downloadvolumefactor === 0" size="x-small" color="success">免费</VChip>
              <VChip v-else-if="result.torrent_info.volume_factor" size="x-small">{{ result.torrent_info.volume_factor }}</VChip>
            </div>
          </div>
          <VSpacer />
          <VBtn color="primary" prepend-icon="mdi-download" @click="openDownload(result)">下载</VBtn>
        </VCardText>
      </VCard>
    </div>

    <VEmptyState v-else-if="!loading" icon="mdi-magnify" title="搜索站点种子" text="输入关键词后查看原始种子结果" />
  </div>
</template>

<style scoped>
.resource-workbench { max-width: 1280px; margin: 0 auto; }
.keyword-field { min-width: min(100%, 22rem); flex: 1 1 22rem; }
.site-field { min-width: min(100%, 16rem); flex: 1 1 16rem; }
.filter-field { min-width: min(100%, 11rem); flex: 1 1 11rem; }
.result-list { display: grid; gap: 0.75rem; }
.result-row { border-radius: 6px; }
.result-copy { min-width: 0; flex: 1 1 30rem; }
</style>
