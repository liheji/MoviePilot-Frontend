<script setup lang="ts">
import api from '@/api'
import { RecommendSource } from '@/api/types'
import MediaCardSlideView from '@/views/discover/MediaCardSlideView.vue'
import { useDisplay } from 'vuetify'

// APP
const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

// 当前选择的分类
const currentCategory = ref('电影')

// 定义分类类型
type CategoryType = '电影' | '电视剧' | '动漫' | '榜单'
type CategoryMap = Record<CategoryType, Array<{apipath: string; linkurl: string; title: string}>>

// 预处理的分类视图数据
const categoryViewsMap = reactive<CategoryMap>({
  电影: [],
  电视剧: [],
  动漫: [],
  榜单: []
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
  (Object.keys(categoryViewsMap) as CategoryType[]).forEach(category => {
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

const scrollToTop = () => {
  window.scrollTo({top: 0, behavior: 'smooth'})
}

// 标签图标映射
const categoryIcons: Record<CategoryType, string> = {
  电影: 'mdi-movie',
  电视剧: 'mdi-television-classic',
  动漫: 'mdi-animation',
  榜单: 'mdi-trophy'
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
          v-for="(category, idx) in ['电影', '电视剧', '动漫', '榜单']" 
          :key="idx"
          class="header-tab"
          :class="{ 'active': currentCategory === category }"
          @click="currentCategory = category"
        >
          <VIcon
            :icon="categoryIcons[category as CategoryType]"
            size="small"
            class="header-tab-icon"
          />
          <span>{{ category }}</span>
        </div>
      </div>
      
      <button
        class="tune-button"
        @click="dialog = true"
      >
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
        <MediaCardSlideView 
          v-for="item in filteredViews" 
          :key="item.title" 
          v-bind="item"
          class="content-group"
        />
      </TransitionGroup>
      
      <div v-if="filteredViews.length === 0" class="empty-category">
        <VIcon icon="mdi-alert-circle-outline" size="large" class="empty-icon" />
        <p class="empty-text">当前分类下没有可显示的内容</p>
        <VBtn
          color="primary"
          variant="tonal"
          size="small"
          @click="dialog = true"
        >
          设置显示内容
        </VBtn>
      </div>
    </div>
    
    <!-- 设置面板 -->
    <VDialog v-model="dialog" width="500" class="settings-dialog" scrollable>
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
                [getCategoryForView(item.title)]: true
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
        
        <VCardActions>
          <VBtn 
            variant="text" 
            @click="Object.keys(enableConfig).forEach(key => enableConfig[key] = true)"
          >
            全选
          </VBtn>
          <VBtn 
            variant="text"
            @click="Object.keys(enableConfig).forEach(key => enableConfig[key] = false)"
          >
            全不选
          </VBtn>
          <VSpacer />
          <VBtn variant="text" @click="dialog = false">取消</VBtn>
          <VBtn 
            color="primary" 
            variant="tonal"
            @click="saveConfig"
          >
            保存设置
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    
    <!-- 快速滚动到顶部按钮 -->
    <div class="global-action-buttons">
      <button 
        class="global-action-button"
        @click="scrollToTop"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 14L12 9L17 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mp-recommend {
  position: relative;
  padding: 0;
  max-width: 100%;
}

.recommend-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 16px;
  background-color: rgba(var(--v-theme-primary), 0.02);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.header-tabs {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 4px;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.header-tab {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  background-color: transparent;
  position: relative;
  color: rgba(var(--v-theme-on-background), 0.7);
  
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 70%;
    height: 3px;
    background-color: rgb(var(--v-theme-primary));
    border-radius: 3px;
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
    color: rgba(var(--v-theme-on-background), 1);
    background-color: rgba(var(--v-theme-primary), 0.05);
  }
}

.header-tab-icon {
  margin-right: 6px;
  transition: color 0.2s ease;
  color: rgba(var(--v-theme-on-background), 0.6);
}

.settings-btn {
  min-width: auto;
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.recommend-content {
  padding: 0 8px;
  min-height: 300px;
}

.empty-category {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  background-color: rgba(var(--v-theme-surface), 0.5);
  border-radius: 12px;
  margin: 20px 0;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.1);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 12px;
}

.empty-text {
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 16px;
}

.content-group {
  margin-bottom: 24px;
}

.settings-card {
  border-radius: 12px;
  overflow: hidden;
}

.settings-card-header {
  background-color: rgba(var(--v-theme-primary), 0.03);
}

.settings-hint {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.setting-item {
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.enabled {
    .setting-item-inner {
      background-color: rgba(var(--v-theme-primary), 0.08);
      border-color: rgba(var(--v-theme-primary), 0.2);
    }
  }
  
  &.电影 .setting-item-inner {
    border-left: 3px solid #3b82f6;
  }
  
  &.电视剧 .setting-item-inner {
    border-left: 3px solid #6366f1;
  }
  
  &.动漫 .setting-item-inner {
    border-left: 3px solid #a855f7;
  }
  
  &.榜单 .setting-item-inner {
    border-left: 3px solid #f59e0b;
  }
}

.setting-item-inner {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface), 1);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(var(--v-theme-on-surface), 0.08);
  }
}

.setting-check {
  margin-right: 8px;
}

.setting-label {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.global-action-buttons {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.global-action-button {
  width: 44px;
  height: 44px;
  background-color: rgba(var(--v-theme-surface), 0.8);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 50%;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.12);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  
  &:hover {
    background-color: rgba(var(--v-theme-surface), 0.95);
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
    opacity: 1;
    color: rgb(var(--v-theme-primary));
  }
  
  svg {
    transition: all 0.3s ease;
    width: 20px;
    height: 20px;
  }
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

@keyframes fadeInOut {
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
  background: rgba(var(--v-theme-primary), 0.1);
  border: none;
  border-radius: 30px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgb(var(--v-theme-primary));
  
  &:hover {
    background: rgba(var(--v-theme-primary), 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(var(--v-theme-primary), 0.2);
  }
  
  .tune-icon {
    display: flex;
    flex-direction: column;
    width: 16px;
    height: 16px;
    justify-content: space-between;
    margin-right: 8px;
    
    span {
      display: block;
      height: 2px;
      background-color: rgb(var(--v-theme-primary));
      border-radius: 2px;
      transition: all 0.3s ease;
      
      &:nth-child(1) {
        width: 60%;
      }
      
      &:nth-child(2) {
        width: 80%;
      }
      
      &:nth-child(3) {
        width: 40%;
      }
    }
  }
  
  .tune-text {
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  &:hover .tune-icon span {
    &:nth-child(1) {
      width: 100%;
    }
    
    &:nth-child(2) {
      width: 60%;
    }
    
    &:nth-child(3) {
      width: 80%;
    }
  }
}
</style>

