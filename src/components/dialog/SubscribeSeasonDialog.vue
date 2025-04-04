<script lang="ts" setup>
import api from '@/api'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import { MediaInfo, MediaSeason, NotExistMediaInfo } from '@/api/types'
import { PropType } from 'vue'
import NoDataFound from '@/components/NoDataFound.vue'

// 定义事件
const emit = defineEmits(['subscribe', 'close'])

// 定义输入
const props = defineProps({
  media: Object as PropType<MediaInfo>,
  noexists: {
    type: Object as PropType<{ [key: number]: number }>,
    default: {},
  },
})

// 从 provide 中获取全局设置
const globalSettings: any = inject('globalSettings')

// 季详情
const seasonInfos = ref<MediaSeason[]>([])

// 选中的订阅季
const seasonsSelected = ref<MediaSeason[]>([])

// 各季缺失状态：0-已入库 1-部分缺失 2-全部缺失，没有数据也是已入库
const seasonsNotExisted = ref<{ [key: number]: number }>({})

// 是否刷新过
const isRefreshed = ref(false)

// 获得mediaid
function getMediaId() {
  if (props.media?.tmdb_id) return `tmdb:${props.media?.tmdb_id}`
  else if (props.media?.douban_id) return `douban:${props.media?.douban_id}`
  else if (props.media?.bangumi_id) return `bangumi:${props.media?.bangumi_id}`
  else return `${props.media?.mediaid_prefix}:${props.media?.media_id}`
}

// 查询TMDB的所有季信息
async function getMediaSeasons() {
  startNProgress()
  try {
    seasonInfos.value = await api.get('media/seasons', {
      params: {
        mediaid: getMediaId(),
        title: props.media?.title,
        year: props.media?.year,
        season: props.media?.season,
      },
    })
    isRefreshed.value = true
  } catch (error) {
    console.error(error)
  }
  doneNProgress()
}

// 检查所有季的缺失状态（数据库）
async function checkSeasonsNotExists() {
  // 开始处理
  startNProgress()
  try {
    const result: NotExistMediaInfo[] = await api.post('mediaserver/notexists', props.media)
    if (result) {
      result.forEach(item => {
        // 0-已入库 1-部分缺失 2-全部缺失
        let state = 0
        if (item.episodes.length === 0) state = 2
        else if (item.episodes.length < item.total_episode) state = 1
        seasonsNotExisted.value[item.season] = state
      })
    }
  } catch (error) {
    console.error(error)
  } finally {
    // 处理完成
    doneNProgress()
  }
}

// 计算存在状态的颜色
function getExistColor(season: number) {
  const state = props.noexists[season]
  if (!state) return 'success'

  if (state === 1) return 'warning'
  else if (state === 2) return 'error'
  else return 'success'
}

// 计算存在状态的文本
function getExistText(season: number) {
  const state = props.noexists[season]
  if (!state) return '已入库'

  if (state === 1) return '部分缺失'
  else if (state === 2) return '缺失'
  else return '已入库'
}

// 拼装季图片地址
function getSeasonPoster(posterPath: string) {
  if (!posterPath) return ''
  return `https://${globalSettings.TMDB_IMAGE_DOMAIN}/t/p/w500${posterPath}`
}

// 将yyyy-mm-dd转换为yyyy年mm月dd日
function formatAirDate(airDate: string) {
  if (!airDate) return ''
  const date = new Date(airDate.replaceAll(/-/g, '/'))
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

// 从yyyy-mm-dd中提取年份
function getYear(airDate: string) {
  if (!airDate) return ''
  const date = new Date(airDate.replaceAll(/-/g, '/'))
  return date.getFullYear()
}

function subscribeSeasons() {
  emit('subscribe', seasonsSelected.value, seasonsNotExisted.value)
}

onMounted(async () => {
  getMediaSeasons()
  checkSeasonsNotExists()
})
</script>

<template>
  <VBottomSheet inset scrollable>
    <VCard class="rounded-t">
      <DialogCloseBtn @click="emit('close')" />
      <VCardItem>
        <VCardTitle class="pe-10"> 订阅 - {{ props.media?.title }} </VCardTitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <LoadingBanner v-if="!isRefreshed" class="mt-5" />
        <VList
          v-else-if="seasonInfos.length > 0"
          v-model:selected="seasonsSelected"
          lines="three"
          select-strategy="classic"
        >
          <VListItem v-for="(item, i) in seasonInfos" :key="i" :value="item">
            <template #prepend>
              <VImg
                height="90"
                width="60"
                :src="getSeasonPoster(item.poster_path || '')"
                aspect-ratio="2/3"
                class="object-cover rounded shadow ring-gray-500 me-3"
                cover
              >
                <template #placeholder>
                  <div class="w-full h-full">
                    <VSkeletonLoader class="object-cover aspect-w-2 aspect-h-3" />
                  </div>
                </template>
              </VImg>
            </template>
            <VListItemTitle> 第 {{ item.season_number }} 季 </VListItemTitle>
            <VListItemSubtitle class="mt-1 me-2">
              <VChip v-if="item.vote_average" color="primary" size="small" class="mb-1">
                <VIcon icon="mdi-star" /> {{ item.vote_average }}
              </VChip>
              {{ getYear(item.air_date || '') }} • {{ item.episode_count }} 集
            </VListItemSubtitle>
            <VListItemSubtitle>
              《{{ media?.title }}》第 {{ item.season_number }} 季于 {{ formatAirDate(item.air_date || '') }} 首播。
            </VListItemSubtitle>
            <VListItemSubtitle>
              <VChip v-if="noexists" class="mt-2" size="small" :color="getExistColor(item.season_number || 0)">
                {{ getExistText(item.season_number || 0) }}
              </VChip>
            </VListItemSubtitle>
            <template #append="{ isSelected }">
              <VListItemAction start>
                <VSwitch :model-value="isSelected" />
              </VListItemAction>
            </template>
          </VListItem>
        </VList>
        <NoDataFound v-else errorTitle="出错啦！" :errorDescription="`${props.media?.title} 无法识别TMDB媒体信息！`" />
      </VCardText>
      <div class="my-2 text-center">
        <VBtn :disabled="seasonsSelected.length === 0" width="30%" @click="subscribeSeasons">
          {{ seasonsSelected.length === 0 ? '请选择订阅季' : '提交订阅' }}
        </VBtn>
      </div>
    </VCard>
  </VBottomSheet>
</template>
