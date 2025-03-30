<script lang="ts" setup>
import type { Context } from '@/api/types'
import TorrentItem from '@/components/cards/TorrentItem.vue'
import { useDisplay } from 'vuetify'

// 设备模式
const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

// 定义输入参数
const props = defineProps({
  items: Array as PropType<Context[]>,
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

// 排序中文名
const sortTitles: Record<string, string> = {
  default: '默认',
  site: '站点',
  size: '大小',
  seeder: '做种数',
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

// 非空值的过滤选项
const filterOptionsNotEmpty = computed(() => {
  const options: Record<string, string[]> = {}
  for (const key in filterOptions) {
    if (filterOptions[key].length > 0) options[key] = filterOptions[key]
  }
  return options
})

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

// 列表样式
const listStyle = computed(() => {
  return appMode
    ? 'height: calc(100vh - 7.5rem - env(safe-area-inset-bottom) - 3.5rem)'
    : 'height: calc(100vh - 6.5rem - env(safe-area-inset-bottom)'
})

// 排序字段
const sortField = ref('default')

// 数据列表
const dataList = ref<Array<Context>>([])

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

// 清除所有过滤条件
function clearAllFilters() {
  for (const key in filterForm) {
    filterForm[key] = []
  }
}

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

// 监听数据列表，进行排序
watchEffect(() => {
  const list = dataList.value
  if (sortField.value === 'default') {
    dataList.value = list.sort((a, b) => b.torrent_info.pri_order - a.torrent_info.pri_order)
  } else if (sortField.value === 'site') {
    dataList.value = list.sort((a, b) => (a.torrent_info.site_name || '').localeCompare(b.torrent_info.site_name || ''))
  } else if (sortField.value === 'size') {
    dataList.value = list.sort((a, b) => b.torrent_info.size - a.torrent_info.size)
  } else if (sortField.value === 'seeder') {
    dataList.value = list.sort((a, b) => b.torrent_info.seeders - a.torrent_info.seeders)
  }
})

// 计算过滤后的列表
watchEffect(() => {
  // 清空列表
  dataList.value = []
  // 匹配过滤函数
  const match = (filter: Array<string>, value: string | undefined) =>
    filter.length === 0 || (value && filter.includes(value))

  // 先收集所有过滤选项，再过滤数据
  if (props.items?.length) {
    // 首先收集所有过滤选项
    props.items.forEach(data => {
      const { meta_info, torrent_info } = data
      initOptions(data)
    })

    // 然后根据过滤条件筛选数据
    props.items.forEach(data => {
      const { meta_info, torrent_info } = data
      if (
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
      ) {
        dataList.value.push(data)
      }
    })
  }
})

// 切换过滤器选项
function toggleFilter(key: string, value: string) {
  const index = filterForm[key].indexOf(value)
  if (index === -1) {
    filterForm[key].push(value)
  } else {
    filterForm[key].splice(index, 1)
  }
}

// 过滤菜单相关
const filterMenuOpen = ref(false)
const filterMenuAnchor = ref(null)
const currentFilter = ref('site')
const currentFilterTitle = computed(() => filterTitles[currentFilter.value])
const currentFilterOptions = computed(() => {
  if (currentFilter.value === 'season') {
    return sortSeasonFilterOptions.value
  }
  return filterOptions[currentFilter.value]
})

// 打开过滤菜单
function openFilterMenu(key: string) {
  currentFilter.value = key
  filterMenuOpen.value = true
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

// 全选某个过滤项
function selectAll(key: string) {
  if (key === 'season') {
    filterForm[key] = [...sortSeasonFilterOptions.value]
  } else {
    filterForm[key] = [...filterOptions[key]]
  }
}

// 清除某个过滤项
function clearFilter(key: string) {
  filterForm[key] = []
}

// 添加toggleFilterMenu函数
function toggleFilterMenu(key: string) {
  if (currentFilter.value === key && filterMenuOpen.value) {
    filterMenuOpen.value = false
  } else {
    currentFilter.value = key
    filterMenuOpen.value = true
  }
}
</script>

<template>
  <div class="torrent-view">
    <!-- 搜索头部容器 - 新增，用于固定在顶部 -->
    <div class="search-header d-none d-sm-block">
      <!-- PC端页面头部和筛选栏 -->
      <div class="view-header mb-3">
        <div class="d-flex align-center flex-wrap">
          <VChip color="primary" variant="flat" size="small" class="search-count me-3" prepend-icon="mdi-magnify">
            {{ dataList.length }} 个资源
          </VChip>

          <div class="filter-bar">
            <!-- 排序选择 -->
            <VSelect
              v-model="sortField"
              :items="Object.entries(sortTitles).map(([key, title]) => ({ title, value: key }))"
              item-title="title"
              item-value="value"
              variant="plain"
              density="compact"
              hide-details
              class="sort-select"
            >
              <template v-slot:prepend>
                <VIcon size="small" icon="mdi-sort"></VIcon>
              </template>
            </VSelect>

            <div class="filter-divider"></div>

            <!-- 筛选按钮 -->
            <VBtn
              v-for="(title, key) in filterTitles"
              v-show="filterOptions[key].length > 0"
              :key="key"
              variant="tonal"
              size="small"
              :color="filterForm[key].length > 0 ? 'primary' : undefined"
              :prepend-icon="getFilterIcon(key)"
              @click="toggleFilterMenu(key)"
              class="filter-btn"
              rounded="pill"
            >
              {{ title }}
              <VChip v-if="filterForm[key].length > 0" size="x-small" color="primary" class="ms-1" variant="elevated">{{
                filterForm[key].length
              }}</VChip>
            </VBtn>

            <!-- 清除全部筛选按钮 -->
            <VBtn
              v-if="getFilterCount > 0"
              variant="text"
              size="small"
              color="error"
              @click="clearAllFilters"
              class="filter-btn"
              prepend-icon="mdi-close-circle-outline"
            >
              清除筛选
            </VBtn>
          </div>
        </div>
      </div>

      <!-- 已选择的过滤项显示 -->
      <div v-if="getFilterCount > 0" class="selected-filters mb-3">
        <div class="d-flex flex-wrap align-center">
          <template v-for="(values, key) in getSelectedFilters" :key="key">
            <VChip
              v-for="(value, index) in values"
              :key="`${key}-${index}`"
              color="primary"
              size="small"
              closable
              variant="elevated"
              class="me-1 mb-1 mt-1 filter-tag"
              @click:close="removeFilter(key, value)"
            >
              <VIcon size="x-small" :icon="getFilterIcon(key)" class="me-1"></VIcon>
              <strong>{{ filterTitles[key] }}:</strong> {{ value }}
            </VChip>
          </template>
        </div>
      </div>
    </div>

    <!-- 移动端头部和筛选区域 -->
    <div class="d-block d-sm-none search-header-mobile">
      <!-- 移动端头部 -->
      <div class="view-header mb-2">
        <div class="d-flex align-center flex-wrap pa-2">
          <div class="d-flex align-center w-100 mb-1">
            <VChip
              color="primary"
              variant="elevated"
              size="x-small"
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
              variant="outlined"
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
              <VIcon :icon="getFilterIcon(key)" class="filter-icon"></VIcon>
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
    </div>

    <!-- 筛选菜单 -->
    <VDialog v-model="filterMenuOpen" max-width="400px" location="center">
      <VCard>
        <VCardTitle class="py-2 d-flex align-center">
          <VIcon :icon="getFilterIcon(currentFilter)" class="me-2"></VIcon>
          <span>{{ currentFilterTitle }} 筛选</span>
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

    <!-- 资源列表容器 -->
    <div class="resource-list-container">
      <!-- 无结果时显示 -->
      <div v-if="dataList.length === 0" class="no-results">
        <VIcon icon="mdi-file-search-outline" size="64" color="grey-lighten-1" />
        <div class="text-h6 text-grey mt-4">暂无符合条件的资源</div>
      </div>

      <!-- 资源列表 -->
      <div v-else class="resource-list">
        <div v-for="(item, index) in dataList" :key="`${item.torrent_info?.enclosure || ''}-${index}`">
          <TorrentItem :torrent="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.torrent-view {
  position: relative;
  height: 100%;
}

.search-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(var(--v-theme-background), 0.95);
  backdrop-filter: blur(10px);
}

.search-header-mobile {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(var(--v-theme-background), 0.95);
  backdrop-filter: blur(10px);
}

.view-header {
  padding: 12px 16px;
  background-color: rgb(var(--v-theme-surface));
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: none;
  overflow: hidden;
}

.search-count {
  font-weight: 500;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.filter-divider {
  width: 1px;
  height: 24px;
  background-color: rgba(var(--v-theme-on-surface), 0.12);
  margin: 0 8px;
}

.filter-btn {
  min-width: 0;
  transition: transform 0.2s;
}

.filter-btn:hover {
  transform: translateY(-2px);
}

.sort-select {
  font-size: 0.875rem;
  min-width: 100px;
  max-width: 120px;
}

.filter-menu-content {
  max-height: 50vh;
  overflow-y: auto;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
}

.filter-chip {
  margin: 4px;
  transition: all 0.2s ease;
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  color: rgba(var(--v-theme-on-surface), 0.9) !important;
  font-weight: 500;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.filter-chip:hover {
  transform: translateY(-2px);
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
}

.filter-chip.v-chip--selected {
  background-color: rgba(var(--v-theme-primary), 0.85) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(var(--v-theme-primary), 0.3);
}

.filter-tag {
  font-weight: 500;
  transition: all 0.2s;
}

.filter-tag:hover {
  transform: translateY(-2px);
}

.selected-filters {
  background-color: rgba(var(--v-theme-surface-variant), 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
  overflow: hidden;
}

.resource-list-container {
  border-radius: 12px;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 8px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.mobile-sort-select {
  min-width: 110px;
  max-width: 130px;
  font-size: 0.8rem;
}

.filter-buttons-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.filter-btn-mobile {
  height: auto;
  min-height: 48px;
  padding: 4px 0;
  background-color: rgba(var(--v-theme-surface), 1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.filter-icon {
  margin-bottom: 2px;
  font-size: 18px;
}

.filter-label {
  font-size: 0.7rem;
  text-align: center;
}

@media (max-width: 600px) {
  .filter-btn {
    font-size: 0.75rem;
  }

  .sort-select {
    min-width: 100px;
  }
}
</style>
