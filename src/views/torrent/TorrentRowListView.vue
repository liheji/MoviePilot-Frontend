<script lang="ts" setup>
import type { Context } from '@/api/types'
import TorrentItem from '@/components/cards/TorrentItem.vue'
import FilterOption from '@/components/misc/FilterOption.vue'
import { useDisplay } from 'vuetify'

// 设备模式
const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

// 过滤弹窗
const filterDialog = ref(false)

// 定义输入参数
const props = defineProps({
  items: Array as PropType<Context[]>,
})

// 过滤表单
const filterForm: Record<string, string[]> = reactive({
  site: [] as string[],
  season: [] as string[],
  releaseGroup: [] as string[],
  videoCode: [] as string[],
  freeState: [] as string[],
  edition: [] as string[],
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

  props.items?.forEach(data => {
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
    )
      dataList.value.push(data)
  })
})

// 初始化过滤选项
onMounted(() => {
  props.items?.forEach(initOptions)
})
</script>

<template>
  <div>
    <VRow>
      <VCol>
        <VList v-if="dataList.length === 0" lines="three" class="rounded p-0 shadow-lg">
          <VListItem>
            <VListItemTitle>没有符合当前过滤条件的资源。</VListItemTitle>
          </VListItem>
        </VList>
        <VList v-else lines="three" class="rounded p-0 torrent-list-vscroll shadow-lg">
          <VVirtualScroll :items="dataList" :style="listStyle">
            <template #default="{ item }">
              <TorrentItem :torrent="item" :key="item.torrent_info.page_url" />
            </template>
          </VVirtualScroll>
        </VList>
      </VCol>
      <!-- 排序 & 过滤列表 -->
      <VCol xl="2" md="3" v-if="display.mdAndUp.value">
        <VList lines="one" class="rounded shadow-lg" :style="listStyle">
          <FilterOption title="排序">
            <VChipGroup column v-model="sortField">
              <VChip
                v-for="(title, key) in sortTitles"
                :key="key"
                :color="sortField === key ? 'primary' : ''"
                filter
                variant="outlined"
                :value="key"
              >
                {{ title }}
              </VChip>
            </VChipGroup>
          </FilterOption>
          <!-- 过滤选项 -->
          <FilterOption v-for="(options, key) in filterOptionsNotEmpty" :key="key" :title="filterTitles[key]">
            <VChipGroup v-model="filterForm[key]" column multiple>
              <VChip
                v-for="option in options"
                :key="option"
                :color="filterForm[key].includes(option) ? 'primary' : ''"
                filter
                variant="outlined"
                :value="option"
              >
                {{ option }}
              </VChip>
            </VChipGroup>
          </FilterOption>
        </VList>
      </VCol>
    </VRow>

    <!-- 过滤弹窗 -->
    <VDialog v-model="filterDialog" max-width="40rem">
      <VCard title="排序 & 过滤" class="rounded-t">
        <DialogCloseBtn v-model="filterDialog" />
        <VDivider />
        <VList lines="one">
          <FilterOption title="排序">
            <VChipGroup column v-model="sortField">
              <VChip
                v-for="(title, key) in sortTitles"
                :key="key"
                :color="sortField === key ? 'primary' : ''"
                filter
                variant="outlined"
                :value="key"
              >
                {{ title }}
              </VChip>
            </VChipGroup>
          </FilterOption>
          <!-- 过滤选项 -->
          <FilterOption
            v-for="(options, key) in filterOptionsNotEmpty"
            v-show="options.length > 0"
            :key="key"
            :title="filterTitles[key]"
          >
            <VChipGroup v-model="filterForm[key]" column multiple>
              <VChip
                v-for="option in options"
                v-show="options.length > 0"
                :key="option"
                :color="filterForm[key].includes(option) ? 'primary' : ''"
                filter
                variant="outlined"
                :value="option"
              >
                {{ option }}
              </VChip>
            </VChipGroup>
          </FilterOption>
        </VList>
      </VCard>
    </VDialog>

    <!-- 底部操作按钮 -->
    <div v-if="props.items">
      <VFab
        v-if="!display.mdAndUp.value"
        icon="mdi-filter"
        color="info"
        location="bottom"
        :class="appMode ? 'mb-28' : 'mb-16'"
        size="x-large"
        fixed
        app
        appear
        @click="filterDialog = true"
      />
    </div>
  </div>
</template>
