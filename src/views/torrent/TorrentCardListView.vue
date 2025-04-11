<script lang="ts" setup>
import { cloneDeepWith } from 'lodash-es'
import type { Context } from '@/api/types'
import TorrentCard from '@/components/cards/TorrentCard.vue'

interface SearchTorrent extends Context {
  more?: Array<Context>
}

// 定义输入参数
const props = defineProps({
  // 数据列表
  items: Array as PropType<SearchTorrent[]>,
})

// 过滤表单
const filterForm: Record<string, string[]> = reactive({
  // 站点
  site: [] as string[],
  // 季
  season: [] as string[],
  // 制作组
  releaseGroup: [] as string[],
  // 视频编码
  videoCode: [] as string[],
  // 促销状态
  freeState: [] as string[],
  // 质量
  edition: [] as string[],
  // 分辨率
  resolution: [] as string[],
})

// 排序选项
const sortField = ref('default')
const sortTitles: Record<string, string> = {
  default: '默认',
  site: '站点',
  size: '大小',
  seeder: '做种数',
}

// 过滤项映射（保持中文标题）
const filterTitles: Record<string, string> = {
  site: '站点',
  season: '季集',
  freeState: '促销状态',
  videoCode: '视频编码',
  edition: '质量',
  resolution: '分辨率',
  releaseGroup: '制作组',
}

// 统一存储过滤选项
const filterOptions: Record<string, string[]> = reactive({
  site: [] as string[],
  season: [] as string[],
  freeState: [] as string[],
  edition: [] as string[],
  resolution: [] as string[],
  videoCode: [] as string[],
  releaseGroup: [] as string[],
})

// 完整的数据列表
let dataList: SearchTorrent[]

// 显示用的数据列表
const displayDataList = ref<Array<SearchTorrent>>([])

// 分组后的数据列表
const groupedDataList = ref<Map<string, Context[]>>()

// 过滤菜单相关
const filterMenuOpen = ref(false)
const currentFilter = ref('site')
const currentFilterTitle = computed(() => filterTitles[currentFilter.value])
const currentFilterOptions = computed(() => {
  if (currentFilter.value === 'season') {
    return sortSeasonFilterOptions.value
  }
  return filterOptions[currentFilter.value]
})

// 初始化过滤选项
function initOptions(data: Context) {
  const { torrent_info, meta_info } = data
  const optionValue = (options: Array<string>, value: string | undefined) => {
    value && !options.includes(value) && options.push(value)
  }
  optionValue(filterOptions.site, torrent_info?.site_name)
  optionValue(filterOptions.season, meta_info?.season_episode)
  optionValue(filterOptions.releaseGroup, meta_info?.resource_team)
  optionValue(filterOptions.videoCode, meta_info?.video_encode)
  optionValue(filterOptions.freeState, torrent_info?.volume_factor)
  optionValue(filterOptions.edition, meta_info?.edition)
  optionValue(filterOptions.resolution, meta_info?.resource_pix)
}

// 对季过滤选项进行排序
const sortSeasonFilterOptions = computed(() => {
  // 预解析所有选项
  const parsedOptions = filterOptions.season.map((option, index) => {
    const parseSeasonEpisode = (str: string) => {
      const match = str.match(/^S(\d+)(?:-S(\d+))?(?:\s*E(\d+)(?:-E(\d+))?)?$/)

      if (!match) {
        // 如果字符串格式不正确，返回默认值
        return {
          original: str,
          seasonStart: 0,
          seasonEnd: 0,
          episodeStart: 0,
          episodeEnd: 0,
          maxSeason: 0,
          maxEpisode: 0,
          index,
        }
      }

      const seasonStart = match[1] ? parseInt(match[1], 10) : 0
      const seasonEnd = match[2] ? parseInt(match[2], 10) : 0
      const episodeStart = match[3] ? parseInt(match[3], 10) : 0
      const episodeEnd = match[4] ? parseInt(match[4], 10) : 0
      const maxSeason = seasonEnd > 0 ? seasonEnd : seasonStart
      const maxEpisode = episodeEnd > 0 ? episodeEnd : episodeStart

      return {
        original: str,
        seasonStart,
        seasonEnd,
        episodeStart,
        episodeEnd,
        maxSeason,
        maxEpisode,
        index,
      }
    }

    return parseSeasonEpisode(option)
  })

  // 定义判断是否为整季或季范围的函数
  const isWholeSeason = (parsed: (typeof parsedOptions)[0]) =>
    parsed.seasonStart > 0 &&
    (parsed.seasonEnd === 0 || parsed.seasonEnd > parsed.seasonStart) &&
    parsed.episodeStart === 0 &&
    parsed.episodeEnd === 0

  // 定义判断是否包含集数的函数
  const hasEpisodes = (parsed: (typeof parsedOptions)[0]) => parsed.episodeStart > 0 || parsed.episodeEnd > 0

  // 排序逻辑
  parsedOptions.sort((a, b) => {
    const aIsWhole = isWholeSeason(a)
    const bIsWhole = isWholeSeason(b)
    const aHasEpisodes = hasEpisodes(a)
    const bHasEpisodes = hasEpisodes(b)

    // 优先级1：整季和季范围选项优先于带有集数的选项
    if (aIsWhole && !bIsWhole) return -1
    if (!aIsWhole && bIsWhole) return 1

    // 优先级2：如果都是整季或季范围选项，按 maxSeason 降序排列
    if (aIsWhole && bIsWhole) {
      if (b.maxSeason !== a.maxSeason) {
        return b.maxSeason - a.maxSeason
      }
      // 如果 maxSeason 相同，则按原始索引
      return a.index - b.index
    }

    // 优先级3：如果都是带有集数的选项，先按 maxSeason 降序，再按 maxEpisode 降序
    if (aHasEpisodes && bHasEpisodes) {
      if (b.maxSeason !== a.maxSeason) {
        return b.maxSeason - a.maxSeason
      }
      if (b.maxEpisode !== a.maxEpisode) {
        return b.maxEpisode - a.maxEpisode
      }
      // 如果 maxSeason 和 maxEpisode 相同，则按原始索引
      return a.index - b.index
    }

    // 优先级4：如果一个有集数，一个没有，优先有集数的选项
    if (aHasEpisodes && !bHasEpisodes) return -1
    if (!aHasEpisodes && bHasEpisodes) return 1

    // 优先级5：对于没有集数且不是整季的选项，按 seasonStart 和 seasonEnd 降序排序
    if (b.seasonStart !== a.seasonStart) {
      return b.seasonStart - a.seasonStart
    }
    if (b.seasonEnd !== a.seasonEnd) {
      return b.seasonEnd - a.seasonEnd
    }

    // 优先级6：按 episodeStart 和 episodeEnd 降序排序
    if (b.episodeStart !== a.episodeStart) {
      return b.episodeStart - a.episodeStart
    }
    if (b.episodeEnd !== a.episodeEnd) {
      return b.episodeEnd - a.episodeEnd
    }

    // 优先级7：兜底按字母降序排列
    if (a.original !== b.original) {
      return b.original.localeCompare(a.original)
    }

    // 优先级8：如果所有条件都相同，则按原始索引
    return a.index - b.index
  })

  // 返回排序后的原始字符串数组
  return parsedOptions.map(option => option.original)
})

// 计算分组后的列表
onMounted(() => {
  // 数据分组
  const groupMap = new Map<string, Context[]>()
  // 遍历数据
  props.items?.forEach(item => {
    const { torrent_info, meta_info } = item
    // init options
    initOptions(item)
    // group data
    const key = `${meta_info.name}_${meta_info.resource_pix}_${meta_info.edition}_${meta_info.resource_team}_${meta_info.season_episode}_${torrent_info.size}`
    if (groupMap.has(key)) {
      // 已入库相同标题和大小的分组，将当前上下文信息添加到分组中
      const group = groupMap.get(key)
      group?.push(item)
    } else {
      // 创建新的分组，并将当前上下文信息添加到分组中
      groupMap.set(key, [item])
    }
  })
  groupedDataList.value = groupMap
})

// 修改watch监听，同时监听排序字段的变化
watch([filterForm, groupedDataList, sortField], filterData)

function filterData() {
  // 清空列表
  dataList = []
  displayDataList.value = []
  // 匹配过滤函数，filter中有任一值包含value则返回true
  const match = (filter: Array<string>, value: string | undefined) =>
    filter.length === 0 || (value && filter.includes(value))

  // 筛选数据
  const filteredData: SearchTorrent[] = []

  groupedDataList.value?.forEach(value => {
    if (value.length > 0) {
      const matchData = value.filter(data => {
        const { meta_info, torrent_info } = data
        // 季、制作组、视频编码
        return (
          // 站点过滤
          match(filterForm.site, torrent_info.site_name) &&
          // 促销状态过滤
          match(filterForm.freeState, torrent_info.volume_factor) &&
          // 季过滤
          match(filterForm.season, meta_info.season_episode) &&
          // 制作组过滤
          match(filterForm.releaseGroup, meta_info.resource_team) &&
          // 视频编码过滤
          match(filterForm.videoCode, meta_info.video_encode) &&
          // 分辨率过滤
          match(filterForm.resolution, meta_info.resource_pix) &&
          // 质量过滤
          match(filterForm.edition, meta_info.edition)
        )
      })
      if (matchData.length > 0) {
        const firstData = cloneDeepWith(matchData[0]) as SearchTorrent
        if (matchData.length > 1) firstData.more = matchData.slice(1)
        filteredData.push(firstData)
      }
    }
  })

  // 排序数据
  if (sortField.value !== 'default') {
    filteredData.sort((a, b) => {
      if (sortField.value === 'site') {
        // 按站点名称排序
        return (a.torrent_info.site_name || '').localeCompare(b.torrent_info.site_name || '')
      } else if (sortField.value === 'size') {
        // 按文件大小排序（降序）
        return (Number(b.torrent_info.size) || 0) - (Number(a.torrent_info.size) || 0)
      } else if (sortField.value === 'seeder') {
        // 按做种数排序（降序）
        return (Number(b.torrent_info.seeders) || 0) - (Number(a.torrent_info.seeders) || 0)
      }
      return 0
    })
  }

  // 显示前20个
  displayDataList.value = filteredData.slice(0, 20)
  // 保存剩余数据
  dataList = filteredData.slice(20)
}

// 给定过滤类型返回不同图标
function getFilterIcon(key: string) {
  const icons: Record<string, string> = {
    site: 'mdi-server-network',
    season: 'mdi-television-classic',
    freeState: 'mdi-gift-outline',
    resolution: 'mdi-monitor-screenshot',
    videoCode: 'mdi-video-vintage',
    edition: 'mdi-quality-high',
    releaseGroup: 'mdi-account-group-outline',
  }
  return icons[key] || 'mdi-filter-variant'
}

// 开关筛选菜单
function toggleFilterMenu(key: string) {
  if (currentFilter.value === key && filterMenuOpen.value) {
    filterMenuOpen.value = false
  } else {
    currentFilter.value = key
    filterMenuOpen.value = true
  }
}

// 清除所有过滤条件
function clearAllFilters() {
  for (const key in filterForm) {
    filterForm[key] = []
  }
}

// 清除某个过滤项
function clearFilter(key: string) {
  filterForm[key] = []
}

// 全选某个过滤项
function selectAll(key: string) {
  if (key === 'season') {
    filterForm[key] = [...sortSeasonFilterOptions.value]
  } else {
    filterForm[key] = [...filterOptions[key]]
  }
}

// 计算已选择的过滤条件数量
const getFilterCount = computed(() => {
  let count = 0
  for (const key in filterForm) {
    count += filterForm[key].length
  }
  return count
})

// 计算已选择的过滤条件
const getSelectedFilters = computed(() => {
  const filters: Record<string, string[]> = {}
  for (const key in filterForm) {
    if (filterForm[key].length > 0) {
      filters[key] = [...filterForm[key]]
    }
  }
  return filters
})

// 移除单个过滤条件
function removeFilter(key: string, value: string) {
  const index = filterForm[key].indexOf(value)
  if (index !== -1) {
    filterForm[key].splice(index, 1)
  }
}

function loadMore({ done }: { done: any }) {
  // 从 dataList 中获取最前面的 20 个元素
  const itemsToMove = dataList.splice(0, 20)
  displayDataList.value.push(...itemsToMove)
  done('ok')
}
</script>

<template>
  <div class="search-header d-none d-sm-flex">
    <!-- 页面头部和筛选栏 -->
    <VCard class="view-header rounded-xl">
      <div class="d-flex align-center flex-wrap pa-3">
        <VChip color="primary" variant="elevated" size="small" class="search-count me-3" prepend-icon="mdi-magnify">
          {{ props.items?.length || 0 }} 个资源
        </VChip>
        <!-- 排序选择 -->
        <div class="sort-container me-4">
          <VSelect
            v-model="sortField"
            :items="Object.entries(sortTitles).map(([key, title]) => ({ title, value: key }))"
            item-title="title"
            item-value="value"
            density="compact"
            hide-details
            class="sort-select"
            prepend-icon="mdi-sort"
          ></VSelect>
        </div>

        <!-- 筛选按钮组 -->
        <div class="filter-bar">
          <VBtn
            v-for="(title, key) in filterTitles"
            v-show="filterOptions[key].length > 0"
            :key="key"
            variant="tonal"
            size="small"
            :color="filterForm[key].length > 0 ? 'primary' : undefined"
            :prepend-icon="getFilterIcon(key)"
            class="filter-btn"
            rounded="pill"
          >
            {{ title }}
            <VChip v-if="filterForm[key].length > 0" size="small" color="primary" class="ms-1" variant="elevated">
              {{ filterForm[key].length }}
            </VChip>
            <VMenu activator="parent" :close-on-content-click="false">
              <VCard max-width="25rem">
                <VCardText class="filter-menu-content">
                  <div class="flex justify-between">
                    <VBtn variant="text" size="small" color="primary" @click="selectAll(key)"> 全选 </VBtn>
                    <VBtn
                      v-if="filterForm[key].length > 0"
                      variant="text"
                      size="small"
                      color="error"
                      @click="clearFilter(key)"
                    >
                      清除
                    </VBtn>
                  </div>
                  <VChipGroup v-model="filterForm[key]" column multiple class="filter-options">
                    <VChip
                      v-for="option in filterOptions[key]"
                      :key="option"
                      :value="option"
                      filter
                      variant="elevated"
                      class="ma-1 filter-chip"
                      size="small"
                    >
                      {{ option }}
                    </VChip>
                  </VChipGroup>
                </VCardText>
              </VCard>
            </VMenu>
          </VBtn>

          <!-- 清除全部筛选按钮 -->
          <VBtn
            v-if="getFilterCount > 0"
            variant="tonal"
            size="small"
            color="error"
            @click="clearAllFilters"
            class="filter-btn"
            prepend-icon="mdi-close-circle-outline"
            rounded="pill"
          >
            清除筛选
          </VBtn>
        </div>
      </div>

      <!-- 已选择的过滤项显示 -->
      <div v-if="getFilterCount > 0" class="selected-filters pa-3 pt-0">
        <div class="d-flex flex-wrap align-center">
          <template v-for="(values, key) in getSelectedFilters" :key="key">
            <VChip
              v-for="(value, index) in values"
              :key="`${key}-${index}`"
              color="primary"
              size="small"
              closable
              variant="elevated"
              class="me-1 mt-2 filter-tag"
              @click:close="removeFilter(key, value)"
            >
              <VIcon size="small" :icon="getFilterIcon(key)" class="me-1"></VIcon>
              <strong>{{ filterTitles[key] }}:</strong> {{ value }}
            </VChip>
          </template>
        </div>
      </div>
    </VCard>
  </div>

  <!-- 移动端头部和筛选区域 -->
  <VCard class="d-block d-sm-none search-header-mobile">
    <!-- 移动端头部 -->
    <div class="view-header">
      <div class="d-flex align-center flex-wrap pa-2">
        <div class="d-flex align-center w-100 mb-2">
          <VChip
            color="primary"
            variant="elevated"
            size="small"
            class="search-count me-auto"
            prepend-icon="mdi-magnify"
          >
            {{ props.items?.length || 0 }} 个资源
          </VChip>

          <!-- 排序选择 -->
          <VSelect
            v-model="sortField"
            :items="Object.entries(sortTitles).map(([key, title]) => ({ title, value: key }))"
            item-title="title"
            item-value="value"
            density="compact"
            hide-details
            class="mobile-sort-select"
            prepend-icon="mdi-sort"
          ></VSelect>
        </div>

        <!-- 筛选图标按钮区域 -->
        <div class="filter-buttons-grid w-100">
          <VBtn
            v-for="(title, key) in filterTitles"
            v-show="filterOptions[key].length > 0"
            variant="text"
            color="primary"
            class="filter-btn-mobile"
            @click="toggleFilterMenu(key)"
          >
            <VIcon :icon="getFilterIcon(key)" class="filter-icon me-1"></VIcon>
            <span class="filter-label">
              {{ title }}
            </span>
            <VBadge
              v-if="filterForm[key].length > 0"
              :content="filterForm[key].length"
              color="primary"
              location="top end"
              offset-x="-10"
              offset-y="-10"
            ></VBadge>
          </VBtn>
        </div>
      </div>
    </div>
  </VCard>

  <!-- 筛选菜单 -->
  <VDialog v-model="filterMenuOpen" max-width="25rem" max-height="80%" location="center">
    <VCard>
      <VCardTitle class="py-2 d-flex align-center">
        <VIcon :icon="getFilterIcon(currentFilter)" class="me-2"></VIcon>
        <span>{{ currentFilterTitle }}</span>
        <VSpacer />
        <VBtn
          v-if="filterForm[currentFilter].length > 0"
          variant="text"
          size="small"
          color="error"
          @click="clearFilter(currentFilter)"
        >
          清除
        </VBtn>
        <VBtn variant="text" size="small" color="primary" @click="selectAll(currentFilter)"> 全选 </VBtn>
      </VCardTitle>
      <VDivider />
      <VCardText class="filter-menu-content pt-4">
        <VChipGroup v-model="filterForm[currentFilter]" column multiple class="filter-options">
          <VChip
            v-for="option in currentFilterOptions"
            :key="option"
            :value="option"
            filter
            variant="elevated"
            class="ma-1 filter-chip"
            size="small"
          >
            {{ option }}
          </VChip>
        </VChipGroup>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="elevated" color="primary" @click="filterMenuOpen = false"> 确定 </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 资源列表 -->
  <VInfiniteScroll mode="intersect" side="end" :items="displayDataList" class="overflow-hidden" @load="loadMore">
    <template #loading />
    <template #empty />
    <div class="grid gap-4 grid-torrent-card items-start">
      <TorrentCard
        v-for="item in displayDataList"
        :key="`${item.torrent_info.page_url}`"
        :torrent="item"
        :more="item.more"
      />
    </div>
  </VInfiniteScroll>
</template>

<style scoped>
.search-header {
  position: sticky;
  z-index: 10;
  backdrop-filter: blur(10px);
  background-color: rgba(var(--v-theme-background), 0.95);
  inset-block-start: 0;
}

.view-header {
  overflow: hidden;
}

.sort-container {
  border-inline-end: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding-inline-end: 12px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.filter-btn {
  min-inline-size: 0;
  transition: transform 0.2s;
}

.filter-btn:hover {
  transform: translateY(-2px);
}

.sort-select {
  font-size: 0.9rem;
  font-weight: 500;
  max-inline-size: 160px;
  min-inline-size: 120px;
}

.sort-select :deep(.v-field__input) {
  min-block-size: 36px;
  padding-block: 5px;
}

.selected-filters {
  overflow: hidden;
  border-radius: 0 0 12px 12px;
  background-color: rgba(var(--v-theme-surface-variant), 0.08);
}

.filter-menu-content {
  overflow-y: auto;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
}

.filter-chip {
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  margin: 4px;
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  color: rgba(var(--v-theme-on-surface), 0.9) !important;
  font-weight: 500;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
  transform: translateY(-2px);
}

.filter-chip.v-chip--selected {
  background-color: rgba(var(--v-theme-primary), 0.85) !important;
  box-shadow: 0 2px 4px rgba(var(--v-theme-primary), 0.3);
  color: rgb(var(--v-theme-on-primary)) !important;
  font-weight: 600;
}

.filter-tag {
  font-weight: 500;
  transition: all 0.2s;
}

.filter-tag:hover {
  transform: translateY(-2px);
}

.search-count {
  font-weight: 600;
}

.grid-torrent-card {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

@media (width <= 600px) {
  .sort-select {
    max-inline-size: 120px;
    min-inline-size: 100px;
  }

  .filter-btn {
    font-size: 0.75rem;
  }

  .sort-container {
    border-inline-end: none;
    inline-size: 100%;
    margin-block-end: 8px;
    padding-inline-end: 0;
  }

  .sort-select {
    inline-size: 100%;
  }

  .filter-bar {
    inline-size: 100%;
    margin-block-start: 8px;
  }
}

.mobile-sort-select {
  max-inline-size: 130px;
  min-inline-size: 110px;
}

.filter-buttons-grid {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(3, 1fr);
}

.filter-btn-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface), 1);
  block-size: auto;
  min-block-size: 48px;
  padding-block: 4px;
  padding-inline: 0;
}

.filter-icon {
  font-size: 18px;
  margin-block-end: 2px;
}

.filter-label {
  font-size: 0.8rem;
  text-align: center;
}

.search-header-mobile {
  position: sticky;
  z-index: 10;
  backdrop-filter: blur(10px);
  background-color: rgba(var(--v-theme-background), 0.95);
  inset-block-start: 0;
}
</style>
