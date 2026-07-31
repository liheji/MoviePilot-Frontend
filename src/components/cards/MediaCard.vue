<script lang="ts">
import { ref } from 'vue'

const activeTouchMediaCardId = ref<number | null>(null)
let mediaCardIdSeed = 0
</script>

<script lang="ts" setup>
import noImage from '@images/no-image.jpeg'
import { getDisplayImageUrl, getLogoUrl } from '@/utils/imageUtils'
import api from '@/api'
import { formatRating } from '@/@core/utils/formatters'
import type { MediaInfo, Site } from '@/api/types'
import router from '@/router'
import { useUserStore, useGlobalSettingsStore } from '@/stores'
import { mediaTypeDict } from '@/api/constants'
import { buildUserPermissionContext, hasPermission } from '@/utils/permission'
import { openSharedDialog } from '@/composables/useSharedDialog'
import { getMediaId as getMediaIdentity } from '@/utils/mediaIdentity'
import {
  getCachedMediaExistsStatus,
  setCachedMediaExistsStatus,
} from '@/utils/mediaStatusCache'

const SearchSiteDialog = defineAsyncComponent(() => import('@/components/dialog/SearchSiteDialog.vue'))

// 国际化
const { t } = useI18n()

interface MediaCardMedia extends MediaInfo {
  total_episode?: number
  episode_count?: number
}

// 输入参数
const props = defineProps({
  media: Object as PropType<MediaCardMedia>,
  width: String,
  height: String,
})

// 从 provide 中获取全局设置
// 全局设置
const globalSettingsStore = useGlobalSettingsStore()
const globalSettings = globalSettingsStore.globalSettings

// 用户 Store
const userStore = useUserStore()
const userPermissions = computed(() => buildUserPermissionContext(userStore.superUser, userStore.permissions))
const canSearch = computed(() => hasPermission(userPermissions.value, 'search'))

// 图片加载状态
const isImageLoaded = ref(false)

// 图片加载失败
const imageLoadError = ref(false)

// 本地存在状态
const isExists = ref(false)

// 来源角标字典
const sourceIconDict: { [key: string]: any } = {
  themoviedb: getLogoUrl('tmdb'),
  douban: getLogoUrl('douban-black'),
  bangumi: getLogoUrl('bangumi'),
}

// 绑定MediaCard元素
const mediaCardRef = ref<HTMLElement | null>(null)

// 创建Intersection Observer实例
const observer = ref<IntersectionObserver | null>(null)

// 所有站点
const allSites = ref<Site[]>([])

// 选中的站点
const selectedSites = ref<number[]>([])

// 搜索菜单显示状态
const searchMenuShow = ref(false)

const mediaCardId = ++mediaCardIdSeed

// 粗指针设备使用点击展开详情，避免 iOS 返回后沿用 VHover 的触摸态。
const isTouchLikePointer = ref(
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: none), (pointer: coarse)').matches),
)

// 打开站点选择弹窗，并把选择结果交回当前媒体卡片继续搜索。
function openSearchSiteDialog() {
  openSharedDialog(
    SearchSiteDialog,
    {
      sites: allSites.value,
      selected: selectedSites.value,
    },
    {
      search: searchSites,
    },
    { closeOn: ['close', 'search'] },
  )
}

// 查询所有站点
async function querySites() {
  try {
    const data: Site[] = await api.get('site/')

    // 过滤站点，只有启用的站点才显示
    allSites.value = data.filter(item => item.is_active)
  } catch (error) {
    console.log(error)
  }
}

// 查询用户选中的站点
async function querySelectedSites() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/public/IndexerSites')
    selectedSites.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 获得mediaid
function getMediaId() {
  return getMediaIdentity(props.media)
}

function getExistsStatusKey() {
  return [
    props.media?.tmdb_id ?? '',
    props.media?.title ?? '',
    props.media?.year ?? '',
    props.media?.season ?? '',
    props.media?.type ?? '',
    props.media?.mediaid_prefix ?? '',
    props.media?.media_id ?? '',
  ].join('::')
}

// 角标颜色
function getChipColor(type: string) {
  if (type === '电影') return 'border-blue-500 bg-blue-600'
  else if (type === '电视剧') return ' bg-indigo-500 border-indigo-600'
  else return 'border-purple-600 bg-purple-600'
}

// 查询当前媒体是否已入库
async function handleCheckExists() {
  try {
    const exists = await getCachedMediaExistsStatus(getExistsStatusKey(), async () => {
      const result: { [key: string]: any } = await api.get('mediaserver/exists', {
        params: {
          tmdbid: props.media?.tmdb_id,
          title: props.media?.title,
          year: props.media?.year,
          season: props.media?.season,
          mtype: props.media?.type,
        },
      })

      return Boolean(result.success)
    })

    isExists.value = exists
    setCachedMediaExistsStatus(getExistsStatusKey(), exists)
  } catch (error) {
    console.error(error)
  }
}

// 打开详情页
function goMediaDetail(isHovering = false) {
  if (isHovering) {
    resetMediaCardDetailState()

    if (props.media?.collection_id) {
      // 跳转到合集列表
      router.push({
        path: `/browse/tmdb/collection/${props.media?.collection_id}`,
        query: {
          title: props.media?.title,
        },
      })
    } else {
      // 跳转到媒体详情页
      router.push({
        path: '/media',
        query: {
          mediaid: getMediaId(),
          title: props.media?.title,
          year: props.media?.year,
          type: props.media?.type,
        },
      })
    }
  }
}

// 当前卡片是否进入可操作详情态，桌面使用 hover，触摸端使用显式点击态。
function isMediaCardActive(isHovering: boolean | null | undefined) {
  return activeTouchMediaCardId.value === mediaCardId || (!isTouchLikePointer.value && Boolean(isHovering))
}

// 当前卡片详情层是否显示，保留图片错误和站点选择时的强制显示。
function isMediaCardDetailVisible(isHovering: boolean | null | undefined) {
  return isMediaCardActive(isHovering) || imageLoadError.value || searchMenuShow.value
}

// 清理移动端详情层展开态，避免路由返回后继续显示上一次的详情层。
function resetMediaCardDetailState() {
  if (activeTouchMediaCardId.value === mediaCardId) {
    activeTouchMediaCardId.value = null
  }
}

// 处理媒体卡片点击：触摸端第一次点击展开，展开后再次点击进入详情。
function handleMediaCardClick(isHovering: boolean | null | undefined) {
  if (isTouchLikePointer.value && !isMediaCardDetailVisible(isHovering)) {
    activeTouchMediaCardId.value = mediaCardId
    return
  }

  goMediaDetail(isMediaCardActive(isHovering) || isMediaCardDetailVisible(isHovering))
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isTouchLikePointer.value || activeTouchMediaCardId.value !== mediaCardId) return
  if (!(event.target instanceof Node)) return
  if (mediaCardRef.value?.contains(event.target)) return

  resetMediaCardDetailState()
}

// 点击搜索
async function clickSearch() {
  if (allSites.value?.length == 0) {
    await querySites()
    await querySelectedSites()
  }
  if (allSites.value?.length > 0) {
    openSearchSiteDialog()
  } else {
    handleSearch()
  }
}

// 开始搜索
function handleSearch() {
  router.push({
    path: '/resource',
    query: {
      keyword: getMediaId(),
      type: props.media?.type,
      area: 'title',
      title: props.media?.title,
      year: props.media?.year,
      season: props.media?.season,
      sites: selectedSites.value.join(','),
    },
  })
}

// 搜索多站点
function searchSites(sites: number[]) {
  selectedSites.value = sites
  handleSearch()
}

// 懒加载检查
function handleCheckLazy() {
  if (props.media?.collection_id) {
    return
  }
  handleCheckExists()
}

// 在元素进入视窗时触发懒加载函数
function setupIntersectionObserver() {
  if (mediaCardRef.value) {
    observer.value = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 只要MediaCard进入视窗，就调用懒加载的操作
            handleCheckLazy()
            // 加载后销毁观察者实例
            observer.value?.disconnect()
            observer.value = null
          }
        })
      },
      { threshold: 0.1 },
    )
    observer.value.observe(mediaCardRef.value)
  }
}

// 计算图片地址
const getImgUrl: Ref<string> = computed(() => {
  if (imageLoadError.value) return noImage
  const url = props.media?.poster_path?.replace('original', 'w500') ?? noImage
  return getDisplayImageUrl(url, globalSettings.GLOBAL_IMAGE_CACHE)
})

// 获取媒体类型文本
function getMediaTypeText(type: string | undefined) {
  if (!type) return ''
  return mediaTypeDict[type]
}

watch(
  () => props.media,
  () => {
    resetMediaCardDetailState()
  },
)

onMounted(() => {
  setupIntersectionObserver()
  if (isTouchLikePointer.value) {
    document.addEventListener('pointerdown', handleDocumentPointerDown)
  }
})

onActivated(resetMediaCardDetailState)
onDeactivated(resetMediaCardDetailState)

onBeforeUnmount(() => {
  resetMediaCardDetailState()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  observer.value?.disconnect()
  observer.value = null
})
</script>

<template>
  <VHover>
    <template #default="hover">
      <!-- Hover 命中区域保持静止，避免卡片上浮后底边反复触发 mouseleave。 -->
      <div ref="mediaCardRef" v-bind="hover.props" class="media-card-hover-area">
        <VCard
          :height="props.height"
          :width="props.width"
          :ripple="false"
          class="app-hover-lift-card outline-none ring-gray-500 media-card"
          :class="{
            'app-hover-lift-card--hovering': isMediaCardActive(hover.isHovering),
            'media-card--image-loaded': isImageLoaded,
            'ring-1': isImageLoaded,
          }"
          @click.stop="handleMediaCardClick(hover.isHovering)"
        >
          <VImg
            aspect-ratio="2/3"
            :src="getImgUrl"
            class="object-cover aspect-w-2 aspect-h-3"
            cover
            @load="isImageLoaded = true"
            @error="imageLoadError = true"
          >
            <template #placeholder>
              <div class="w-full h-full">
                <VSkeletonLoader class="object-cover aspect-w-2 aspect-h-3" />
              </div>
            </template>
          </VImg>

          <!-- 详情 -->
          <VCardText
            v-show="isMediaCardDetailVisible(hover.isHovering)"
            class="w-full h-full flex flex-col flex-wrap justify-end align-left text-white absolute bottom-0 cursor-pointer pa-2"
            style="background: linear-gradient(rgba(45, 55, 72, 40%) 0%, rgba(45, 55, 72, 90%) 100%)"
          >
            <span class="font-semibold text-sm">{{ props.media?.year }}</span>
            <h1 class="media-card-title font-bold mb-2 text-white line-clamp-2 overflow-hidden text-ellipsis ...">
              {{ props.media?.title }}
            </h1>
            <p class="media-card-overview line-clamp-3 overflow-hidden text-ellipsis ...">
              {{ props.media?.overview }}
            </p>
            <div v-if="props.media?.collection_id" class="mb-3" @click.stop=""></div>
            <div v-else class="flex align-center justify-between">
              <IconBtn v-if="canSearch" icon="mdi-magnify" color="white" size="small" @click.stop="clickSearch" />
              <VSpacer />
            </div>
          </VCardText>
          <!-- 类型角标 -->
          <VChip
            v-show="isImageLoaded"
            variant="elevated"
            size="small"
            :class="getChipColor(props.media?.type || '')"
            class="absolute left-2 top-2 bg-opacity-80 text-white font-bold"
          >
            {{ getMediaTypeText(props.media?.type) }}
          </VChip>
          <!-- 本地存在标识 -->
          <ExistIcon v-if="isExists && !isMediaCardActive(hover.isHovering)" />
          <!-- 评分角标 -->
          <VChip
            v-if="isImageLoaded && props.media?.vote_average && !(isExists && !isMediaCardActive(hover.isHovering))"
            variant="elevated"
            size="small"
            :class="getChipColor('rating')"
            class="absolute right-2 top-2 bg-opacity-80 text-white font-bold"
          >
            {{ formatRating(props.media?.vote_average) }}
          </VChip>
          <!--来源图标-->
          <VAvatar
            size="24"
            variant="plain"
            density="compact"
            class="absolute bottom-1 right-1"
            tile
            v-if="!isMediaCardActive(hover.isHovering) && isImageLoaded && props.media?.source && !imageLoadError"
          >
            <VIcon v-if="props.media?.source === 'anilist'" color="#02a9ff" icon="mdi-alpha-a-circle" size="24" />
            <VImg v-else cover :src="sourceIconDict[props.media?.source]" class="shadow-lg" />
          </VAvatar>
        </VCard>
      </div>
    </template>
  </VHover>
</template>
<style scoped>
.media-card-hover-area {
  inline-size: 100%;
}

.media-card-title {
  font-size: 1.125rem;
  line-height: 1.25rem;
}

.media-card-overview {
  font-size: 0.875rem;
  line-height: 1rem;
}

</style>
