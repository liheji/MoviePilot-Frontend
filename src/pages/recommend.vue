<script setup lang="ts">
import api from '@/api'
import { RecommendSource } from '@/api/types'
import MediaCardSlideView from '@/views/discover/MediaCardSlideView.vue'

// 当前选择的分类
const currentCategory = ref('全部')

// 定义分类类型
type CategoryType = '全部' | '电影' | '电视剧' | '动漫' | '榜单'
type CategoryMap = Record<CategoryType, Array<{ apipath: string; linkurl: string; title: string }>>

// 预处理的分类视图数据
const categoryViewsMap = reactive<CategoryMap>({
  全部: [],
  电影: [],
  电视剧: [],
  动漫: [],
  榜单: [],
})

// 按分类过滤视图的映射
const getCategoryForView = (title: string): CategoryType => {
  if (title.includes('电影') || title.includes('热映') || (title.includes('TOP250') && !title.includes('剧集'))) {
    return '电影'
  } else if (title.includes('电视剧') || (title.includes('剧集') && !title.includes('动漫'))) {
    return '电视剧'
  } else if (title.includes('动漫') || title.includes('Bangumi')) {
    return '动漫'
  } else if (title.includes('TOP') || title.includes('榜') || title.includes('趋势')) {
    return '榜单'
  }
  return '电影' // 默认分类
}

const viewList = reactive<{ apipath: string; linkurl: string; title: string }[]>([
  {
    apipath: 'recommend/tmdb_trending',
    linkurl: '/browse/recommend/tmdb_trending?title=流行趋势',
    title: '流行趋势',
  },
  {
    apipath: 'recommend/douban_showing',
    linkurl: '/browse/recommend/douban_showing?title=正在热映',
    title: '正在热映',
  },
  {
    apipath: 'recommend/bangumi_calendar',
    linkurl: '/browse/recommend/bangumi_calendar?title=Bangumi每日放送',
    title: 'Bangumi每日放送',
  },
  {
    apipath: 'recommend/tmdb_movies',
    linkurl: '/browse/recommend/tmdb_movies?title=TMDB热门电影',
    title: 'TMDB热门电影',
  },
  {
    apipath: 'recommend/tmdb_tvs?with_original_language=zh|en|ja|ko',
    linkurl: '/browse/recommend/tmdb_tvs??with_original_language=zh|en|ja|ko&title=TMDB热门电视剧',
    title: 'TMDB热门电视剧',
  },
  {
    apipath: 'recommend/douban_movie_hot',
    linkurl: '/browse/recommend/douban_movie_hot?title=豆瓣热门电影',
    title: '豆瓣热门电影',
  },
  {
    apipath: 'recommend/douban_tv_hot',
    linkurl: '/browse/recommend/douban_tv_hot?title=豆瓣热门电视剧',
    title: '豆瓣热门电视剧',
  },
  {
    apipath: 'recommend/douban_tv_animation',
    linkurl: '/browse/recommend/douban_tv_animation?title=豆瓣热门动漫',
    title: '豆瓣热门动漫',
  },
  {
    apipath: 'recommend/douban_movies',
    linkurl: '/browse/recommend/douban_movies?title=豆瓣最新电影',
    title: '豆瓣最新电影',
  },
  {
    apipath: 'recommend/douban_tvs',
    linkurl: '/browse/recommend/douban_tvs?title=豆瓣最新电视剧',
    title: '豆瓣最新电视剧',
  },
  {
    apipath: 'recommend/douban_movie_top250',
    linkurl: '/browse/recommend/douban_movie_top250?title=电影TOP250',
    title: '豆瓣电影TOP250',
  },
  {
    apipath: 'recommend/douban_tv_weekly_chinese',
    linkurl: '/browse/recommend/douban_tv_weekly_chinese?title=豆瓣国产剧集榜',
    title: '豆瓣国产剧集榜',
  },
  {
    apipath: 'recommend/douban_tv_weekly_global',
    linkurl: '/browse/recommend/douban_tv_weekly_global?title=豆瓣全球剧集榜',
    title: '豆瓣全球剧集榜',
  },
])

// 计算当前分类下显示的视图
const filteredViews = computed(() => {
  if (currentCategory.value === '全部') {
    return viewList.filter(item => enableConfig.value[item.title])
  }
  return categoryViewsMap[currentCategory.value as CategoryType]
})

// 榜单启用配置， 以title为key
const enableConfig = ref<{ [key: string]: boolean }>({
  ...Object.fromEntries(viewList.map(item => [item.title, true])),
})

// 弹窗
const dialog = ref(false)

// 额外的数据源
const extraRecommendSources = ref<RecommendSource[]>([])

// 分类视图
function updateCategoryViews() {
  // 清空所有分类
  ;(Object.keys(categoryViewsMap) as CategoryType[]).forEach(category => {
    categoryViewsMap[category] = []
  })

  // 先把所有启用的视图按照分类归类
  const enabledViews = viewList.filter(item => enableConfig.value[item.title])
  enabledViews.forEach(view => {
    const category = getCategoryForView(view.title)
    categoryViewsMap[category].push(view)
  })
}

// 加载额外的发现数据源
async function loadExtraRecommendSources() {
  try {
    extraRecommendSources.value = await api.get('recommend/source')
    if (extraRecommendSources.value.length > 0) {
      viewList.push(
        ...extraRecommendSources.value.map(source => ({
          apipath: source.api_path,
          linkurl: `/browse/recommend/${source.api_path}?title=${source.name}`,
          title: source.name,
        })),
      )
      // 添加新视图后更新分类
      updateCategoryViews()
    }
  } catch (error) {
    console.log(error)
  }
}

// 加载面板配置
async function loadConfig() {
  // 显示配置
  const local_enable = localStorage.getItem('MP_RECOMMEND')
  if (local_enable) {
    enableConfig.value = JSON.parse(local_enable)
  } else {
    const response = await api.get('/user/config/Recommend')
    if (response && response.data && response.data.value) {
      enableConfig.value = response.data.value
      localStorage.setItem('MP_RECOMMEND', JSON.stringify(response.data.value))
    }
  }
  // 配置加载后更新分类
  updateCategoryViews()
}

// 设置项目
async function saveConfig() {
  // 启用配置
  const enableString = JSON.stringify(enableConfig.value)
  localStorage.setItem('MP_RECOMMEND', enableString)

  // 保存到服务端
  try {
    await api.post('/user/config/Recommend', enableConfig.value)
  } catch (error) {
    console.error(error)
  }
  dialog.value = false

  // 保存后更新分类
  updateCategoryViews()
}

// 标签图标映射
const categoryIcons: Record<CategoryType, string> = {
  全部: 'mdi-filmstrip-box-multiple',
  电影: 'mdi-movie',
  电视剧: 'mdi-television-classic',
  动漫: 'mdi-animation',
  榜单: 'mdi-trophy',
}

onBeforeMount(async () => {
  await loadConfig()
})

onMounted(async () => {
  await loadExtraRecommendSources()
})

onActivated(async () => {
  loadExtraRecommendSources()
})

// 监听分类变更，平滑过渡
watch(currentCategory, () => {
  // 当分类变更时，应用渐变动画
  const contentGroups = document.querySelectorAll('.content-group')
  contentGroups.forEach(group => {
    group.classList.add('fade-transition')
  })
})
</script>

<template>
  <div class="mp-recommend">
    <!-- 页面顶部控制栏 -->
    <div class="recommend-header">
      <div class="header-tabs">
        <div
          v-for="(category, idx) in ['全部', '电影', '电视剧', '动漫', '榜单']"
          :key="idx"
          class="header-tab"
          :class="{ 'active': currentCategory === category }"
          @click="currentCategory = category"
        >
          <VIcon :icon="categoryIcons[category as CategoryType]" size="small" class="header-tab-icon" />
          <span>{{ category }}</span>
        </div>
      </div>

      <button class="tune-button" @click="dialog = true">
        <div class="tune-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="tune-text">显示设置</span>
      </button>
    </div>

    <!-- 滚动内容区域 -->
    <div class="recommend-content">
      <TransitionGroup name="fade">
        <MediaCardSlideView v-for="item in filteredViews" :key="item.title" v-bind="item" class="content-group" />
      </TransitionGroup>

      <div v-if="filteredViews.length === 0" class="empty-category">
        <VIcon icon="mdi-alert-circle-outline" size="large" class="empty-icon" />
        <p class="empty-text">当前分类下没有可显示的内容</p>
        <VBtn color="primary" variant="tonal" size="small" @click="dialog = true"> 设置显示内容 </VBtn>
      </div>
    </div>

    <!-- 设置面板 -->
    <VDialog v-model="dialog" width="40rem" class="settings-dialog" scrollable>
      <VCard class="settings-card">
        <VCardItem class="settings-card-header">
          <VCardTitle>
            <VIcon icon="mdi-tune" size="small" class="me-2" />
            自定义内容
          </VCardTitle>
          <template #append>
            <VBtn icon="mdi-close" variant="text" @click="dialog = false" />
          </template>
        </VCardItem>
        <VDivider />
        <VCardText>
          <p class="settings-hint">选择您想在页面显示的内容</p>
          <div class="settings-grid">
            <div
              v-for="(item, index) in viewList"
              :key="index"
              class="setting-item"
              :class="{
                'enabled': enableConfig[item.title],
                [getCategoryForView(item.title)]: true,
              }"
              @click="enableConfig[item.title] = !enableConfig[item.title]"
            >
              <div class="setting-item-inner">
                <div class="setting-check">
                  <VIcon
                    :icon="enableConfig[item.title] ? 'mdi-check-circle' : 'mdi-circle-outline'"
                    :color="enableConfig[item.title] ? 'primary' : undefined"
                    size="small"
                  />
                </div>
                <span class="setting-label">{{ item.title }}</span>
              </div>
            </div>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions class="mt-3">
          <VBtn variant="text" @click="Object.keys(enableConfig).forEach(key => (enableConfig[key] = true))">
            全选
          </VBtn>
          <VBtn variant="text" @click="Object.keys(enableConfig).forEach(key => (enableConfig[key] = false))">
            全不选
          </VBtn>
          <VSpacer />
          <VBtn variant="text" @click="dialog = false">取消</VBtn>
          <VBtn color="primary" variant="tonal" class="px-3" @click="saveConfig"> 保存设置 </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 快速滚动到顶部按钮 -->
    <VScrollToTopBtn />
  </div>
</template>

<style lang="scss" scoped>
.mp-recommend {
  position: relative;
  padding: 0;
  max-inline-size: 100%;
}

.recommend-header {
  position: sticky;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(10px);
  background-color: rgba(var(--v-theme-primary), 0.02);
  border-block-end: 1px solid rgba(var(--v-theme-primary), 0.1);
  inset-block-start: 0;
  margin-block-end: 16px;
  padding-block: 12px;
  padding-inline: 16px;
}

.header-tabs {
  display: flex;
  padding: 4px;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.header-tab-icon {
  color: rgba(var(--v-theme-on-background), 0.6);
  margin-inline-end: 6px;
  transition: color 0.2s ease;
}

.header-tab {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 20px;
  background-color: transparent;
  color: rgba(var(--v-theme-on-background), 0.7);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  padding-block: 6px;
  padding-inline: 14px;
  transition: all 0.2s ease;
  white-space: nowrap;

  &::after {
    position: absolute;
    border-radius: 3px;
    background-color: rgb(var(--v-theme-primary));
    block-size: 3px;
    content: '';
    inline-size: 70%;
    inset-block-end: -4px;
    inset-inline-start: 50%;
    transform: translateX(-50%) scaleX(0);
    transition: transform 0.2s ease;
  }

  &.active {
    color: rgb(var(--v-theme-primary));

    &::after {
      transform: translateX(-50%) scaleX(1);
    }

    .header-tab-icon {
      color: rgb(var(--v-theme-primary));
    }
  }

  &:hover:not(.active) {
    background-color: rgba(var(--v-theme-primary), 0.05);
    color: rgba(var(--v-theme-on-background), 1);
  }
}

.settings-btn {
  border-radius: 50%;
  block-size: 48px;
  inline-size: 48px;
  min-inline-size: auto;
}

.recommend-content {
  min-block-size: 300px;
  padding-block: 0;
  padding-inline: 8px;
}

.empty-category {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  background-color: rgba(var(--v-theme-surface), 0.5);
  block-size: 300px;
  margin-block: 20px;
  margin-inline: 0;
}

.empty-icon {
  margin-block-end: 12px;
  opacity: 0.5;
}

.empty-text {
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-block-end: 16px;
}

.content-group {
  margin-block-end: 24px;
}

.settings-card {
  overflow: hidden;
  border-radius: 12px;
}

.settings-card-header {
  background-color: rgba(var(--v-theme-primary), 0.03);
}

.settings-hint {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.9rem;
  margin-block-end: 16px;
}

.settings-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.setting-item-inner {
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface), 1);
  padding-block: 10px;
  padding-inline: 12px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
}

.setting-item {
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.enabled {
    .setting-item-inner {
      border-color: rgba(var(--v-theme-primary), 0.2);
      background-color: rgba(var(--v-theme-primary), 0.08);
    }
  }

  &.电影 .setting-item-inner {
    border-inline-start: 3px solid #3b82f6;
  }

  &.电视剧 .setting-item-inner {
    border-inline-start: 3px solid #6366f1;
  }

  &.动漫 .setting-item-inner {
    border-inline-start: 3px solid #a855f7;
  }

  &.榜单 .setting-item-inner {
    border-inline-start: 3px solid #f59e0b;
  }
}

.setting-check {
  margin-inline-end: 8px;
}

.setting-label {
  overflow: hidden;
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fade-move {
  transition: transform 0.5s ease;
}

.fade-transition {
  animation: fadeInOut 0.5s ease;
}

@keyframes fadeinout {
  0% {
    opacity: 0.5;
    transform: translateY(10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.tune-button {
  display: flex;
  align-items: center;
  border: none;
  border-radius: 30px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  padding-block: 8px;
  padding-inline: 16px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.2);
    transform: translateY(-2px);
  }

  .tune-icon {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    block-size: 16px;
    inline-size: 16px;
    margin-inline-end: 8px;

    span {
      display: block;
      border-radius: 2px;
      background-color: rgb(var(--v-theme-primary));
      block-size: 2px;
      transition: all 0.3s ease;

      &:nth-child(1) {
        inline-size: 60%;
      }

      &:nth-child(2) {
        inline-size: 80%;
      }

      &:nth-child(3) {
        inline-size: 40%;
      }
    }
  }

  .tune-text {
    font-size: 0.9rem;
    font-weight: 500;
  }

  &:hover .tune-icon span {
    &:nth-child(1) {
      inline-size: 100%;
    }

    &:nth-child(2) {
      inline-size: 60%;
    }

    &:nth-child(3) {
      inline-size: 80%;
    }
  }
}
</style>
