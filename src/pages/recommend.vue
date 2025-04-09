<script setup lang="ts">
import api from '@/api'
import { RecommendSource } from '@/api/types'
import MediaCardSlideView from '@/views/discover/MediaCardSlideView.vue'

// 当前选择的分类
const currentCategory = ref('全部')

const viewList = reactive<{ apipath: string; linkurl: string; title: string; type: string }[]>([
  {
    apipath: 'recommend/tmdb_trending',
    linkurl: '/browse/recommend/tmdb_trending?title=流行趋势',
    title: '流行趋势',
    type: '榜单',
  },
  {
    apipath: 'recommend/douban_showing',
    linkurl: '/browse/recommend/douban_showing?title=正在热映',
    title: '正在热映',
    type: '电影',
  },
  {
    apipath: 'recommend/bangumi_calendar',
    linkurl: '/browse/recommend/bangumi_calendar?title=Bangumi每日放送',
    title: 'Bangumi每日放送',
    type: '动漫',
  },
  {
    apipath: 'recommend/tmdb_movies',
    linkurl: '/browse/recommend/tmdb_movies?title=TMDB热门电影',
    title: 'TMDB热门电影',
    type: '电影',
  },
  {
    apipath: 'recommend/tmdb_tvs?with_original_language=zh|en|ja|ko',
    linkurl: '/browse/recommend/tmdb_tvs??with_original_language=zh|en|ja|ko&title=TMDB热门电视剧',
    title: 'TMDB热门电视剧',
    type: '电视剧',
  },
  {
    apipath: 'recommend/douban_movie_hot',
    linkurl: '/browse/recommend/douban_movie_hot?title=豆瓣热门电影',
    title: '豆瓣热门电影',
    type: '电影',
  },
  {
    apipath: 'recommend/douban_tv_hot',
    linkurl: '/browse/recommend/douban_tv_hot?title=豆瓣热门电视剧',
    title: '豆瓣热门电视剧',
    type: '电视剧',
  },
  {
    apipath: 'recommend/douban_tv_animation',
    linkurl: '/browse/recommend/douban_tv_animation?title=豆瓣热门动漫',
    title: '豆瓣热门动漫',
    type: '动漫',
  },
  {
    apipath: 'recommend/douban_movies',
    linkurl: '/browse/recommend/douban_movies?title=豆瓣最新电影',
    title: '豆瓣最新电影',
    type: '电影',
  },
  {
    apipath: 'recommend/douban_tvs',
    linkurl: '/browse/recommend/douban_tvs?title=豆瓣最新电视剧',
    title: '豆瓣最新电视剧',
    type: '电视剧',
  },
  {
    apipath: 'recommend/douban_movie_top250',
    linkurl: '/browse/recommend/douban_movie_top250?title=电影TOP250',
    title: '豆瓣电影TOP250',
    type: '榜单',
  },
  {
    apipath: 'recommend/douban_tv_weekly_chinese',
    linkurl: '/browse/recommend/douban_tv_weekly_chinese?title=豆瓣国产剧集榜',
    title: '豆瓣国产剧集榜',
    type: '榜单',
  },
  {
    apipath: 'recommend/douban_tv_weekly_global',
    linkurl: '/browse/recommend/douban_tv_weekly_global?title=豆瓣全球剧集榜',
    title: '豆瓣全球剧集榜',
    type: '榜单',
  },
])

// 计算当前分类下显示的视图
const filteredViews = computed(() => {
  if (currentCategory.value === '全部') {
    return viewList.filter(item => enableConfig.value[item.title])
  }
  return viewList.filter(item => enableConfig.value[item.title] && item.type === currentCategory.value)
})

// 榜单启用配置， 以title为key
const enableConfig = ref<{ [key: string]: boolean }>({
  ...Object.fromEntries(viewList.map(item => [item.title, true])),
})

// 弹窗
const dialog = ref(false)

// 额外的数据源
const extraRecommendSources = ref<RecommendSource[]>([])

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
          type: source.type,
        })),
      )
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
}

// 标签图标映射
const categoryItems: Record<string, string>[] = [
  {
    title: '全部',
    icon: 'mdi-filmstrip-box-multiple',
    key: 'all',
  },
  {
    title: '电影',
    icon: 'mdi-movie',
    key: 'movie',
  },
  {
    title: '电视剧',
    icon: 'mdi-television-classic',
    key: 'tv',
  },
  {
    title: '动漫',
    icon: 'mdi-animation',
    key: 'anime',
  },
  {
    title: '榜单',
    icon: 'mdi-trophy',
    key: 'rank',
  },
]

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
    <VHeaderTab :items="categoryItems" v-model="currentCategory">
      <template #append>
        <VBtn
          icon="mdi-tune"
          variant="text"
          color="primary"
          size="default"
          class="settings-icon-button"
          @click="dialog = true"
        />
      </template>
    </VHeaderTab>

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
    <VDialog v-model="dialog" width="35rem" class="settings-dialog" scrollable>
      <VCard class="settings-card">
        <VCardItem class="settings-card-header">
          <VCardTitle>
            <VIcon icon="mdi-tune" size="small" class="me-2" />
            自定义内容
          </VCardTitle>
          <DialogCloseBtn @click="dialog = false" />
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
                [item.type]: true,
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
        <VCardActions class="pt-5">
          <VBtn variant="text" @click="Object.keys(enableConfig).forEach(key => (enableConfig[key] = true))">
            全选
          </VBtn>
          <VBtn variant="text" @click="Object.keys(enableConfig).forEach(key => (enableConfig[key] = false))">
            全不选
          </VBtn>
          <VSpacer />
          <VBtn @click="saveConfig" variant="elevated" color="primary" class="px-5">
            <template #prepend>
              <VIcon icon="mdi-content-save" />
            </template>
            保存
          </VBtn>
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

.recommend-content {
  padding-block: 0;
  padding-inline: 16px;
}

/* Fade transition for content groups */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.content-group {
  margin-block-end: 24px;
  transition: opacity 0.3s ease;
}

.empty-category {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
}

.empty-icon {
  margin-block-end: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1rem;
  margin-block-end: 16px;
}

/* Settings Dialog Styles */
.settings-card-header {
  padding-block: 16px;
  padding-inline: 20px;
}

.settings-hint {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.9rem;
  margin-block-end: 16px;
}

.settings-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.setting-label {
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.setting-item {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  cursor: pointer;
  padding-block: 10px;
  padding-inline: 12px;
  transition: all 0.2s ease;

  &::before {
    position: absolute;
    background-color: transparent;
    block-size: 100%;
    content: '';
    inline-size: 4px;
    inset-block-start: 0;
    inset-inline-start: 0;
    transition: background-color 0.3s ease;
  }

  &.电影::before {
    background-color: #4caf50;
  } // Green
  &.电视剧::before {
    background-color: #2196f3;
  } // Blue
  &.动漫::before {
    background-color: #ff9800;
  } // Orange
  &.榜单::before {
    background-color: #9c27b0;
  } // Purple

  &:hover {
    border-color: rgba(var(--v-theme-on-surface), 0.15);
    background-color: rgba(var(--v-theme-surface-variant), 0.6);
  }

  &.enabled {
    border-color: rgba(var(--v-theme-primary), 0.5);
    background-color: rgba(var(--v-theme-primary), 0.05);

    .setting-label {
      color: rgb(var(--v-theme-primary));
      font-weight: 500;
    }
  }
}

.setting-item-inner {
  display: flex;
  align-items: center;
}

.setting-check {
  margin-inline-end: 8px;
}

/* Remove old tune button styles if they exist */
.tune-button {
  display: none; // Hide the old button definitively
}
</style>
