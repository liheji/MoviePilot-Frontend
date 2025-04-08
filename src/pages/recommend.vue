<script setup lang="ts">
import api from '@/api'
import { RecommendSource } from '@/api/types'
import MediaCardSlideView from '@/views/discover/MediaCardSlideView.vue'
import { ref, onMounted, onUnmounted, computed, reactive, watch, nextTick } from 'vue';

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

// 控制回到顶部按钮的可见性
const showScrollToTop = ref(false);
const scrollThreshold = 200; // 滚动多少像素后显示按钮

// 滚动事件处理函数
const handleScroll = () => {
  showScrollToTop.value = window.scrollY > scrollThreshold;
};

// 回到顶部函数 (如果需要，可以从VScrollToTopBtn或其他地方引入)
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Ref for the tabs container
const tabsContainerRef = ref<HTMLElement | null>(null);
// State for showing the scroll indicator
const showTabsScrollIndicator = ref(false);

// Function to check and update the indicator state
const updateTabsIndicator = () => {
  const el = tabsContainerRef.value;
  if (!el) return;
  
  const tolerance = 1; // Allow 1px tolerance
  const hasOverflow = el.scrollWidth > el.clientWidth + tolerance;
  const isScrolledToEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - tolerance;
  
  showTabsScrollIndicator.value = hasOverflow && !isScrolledToEnd;
};

// Debounce resize handler
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
const handleResize = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    updateTabsIndicator();
  }, 150);
};

onBeforeMount(async () => {
  await loadConfig()
})

onMounted(async () => {
  await loadExtraRecommendSources()
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll);
  // Initial check for scroll-to-top
  handleScroll(); 
  
  // Add resize listener for tabs indicator
  window.addEventListener('resize', handleResize);
  // Initial check for tabs indicator after DOM update
  await nextTick(); // Ensure element is rendered
  updateTabsIndicator();
  
  // Listen for scroll events specifically on the tabs container
  tabsContainerRef.value?.addEventListener('scroll', updateTabsIndicator, { passive: true });
})

onUnmounted(() => {
  // Remove scroll event listener
  window.removeEventListener('scroll', handleScroll);
  // Remove resize listener
  window.removeEventListener('resize', handleResize);
  // Remove tabs scroll listener
  tabsContainerRef.value?.removeEventListener('scroll', updateTabsIndicator);
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
      <div 
        ref="tabsContainerRef" 
        class="header-tabs" 
        :class="{ 'show-indicator': showTabsScrollIndicator }"
      >
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

      <VBtn
        icon="mdi-tune"
        variant="text"
        color="primary"
        size="default"
        class="settings-icon-button"
        @click="dialog = true"
      />
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
    <div class="global-action-buttons">
      <Transition name="scroll-fade">
        <button 
          v-show="showScrollToTop" 
          class="global-action-button"
          @click="scrollToTop"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 14L12 9L17 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </Transition>
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
  padding: 8px 16px;
  margin-bottom: 16px;
  background-color: rgba(var(--v-theme-background), 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  gap: 16px; // 为按钮留出空间
}

.header-tabs {
  position: relative; // Needed for pseudo-element positioning
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 4px 0;
  flex-grow: 1;
  min-width: 0;
  // Add padding-right to make space for the indicator visually
  padding-right: 20px; 
  // Clip content that overflows, useful with padding
  -webkit-mask-image: linear-gradient(to right, black 95%, transparent 100%);
  mask-image: linear-gradient(to right, black 95%, transparent 100%);

  &::-webkit-scrollbar {
    display: none;
  }
  
  // Gradient indicator pseudo-element
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 40px; // Width of the fade effect
    background: linear-gradient(to left, rgba(var(--v-theme-background), 1) 30%, transparent);
    pointer-events: none; // Allow interaction with content behind it
    opacity: 0; // Hidden by default
    transition: opacity 0.2s ease-in-out;
    z-index: 1; // Ensure it's above the tabs but below other header elements if needed
  }
  
  // Show the indicator when the class is present
  &.show-indicator::after {
    opacity: 1;
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

.settings-icon-button {
  min-width: auto;
  flex-shrink: 0;
}

.recommend-content {
  padding: 0 16px;
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
  margin-bottom: 24px;
  transition: opacity 0.3s ease;
}

.empty-category {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  margin-bottom: 16px;
  font-size: 1rem;
}

/* Settings Dialog Styles */
.settings-dialog .v-card {
  border-radius: 12px;
}

.settings-card-header {
  padding: 16px 20px;
}

.settings-hint {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-bottom: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.setting-item {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background-color: transparent;
    transition: background-color 0.3s ease;
  }

  &.电影::before { background-color: #4CAF50; } // Green
  &.电视剧::before { background-color: #2196F3; } // Blue
  &.动漫::before { background-color: #FF9800; } // Orange
  &.榜单::before { background-color: #9C27B0; } // Purple
  
  &:hover {
    background-color: rgba(var(--v-theme-surface-variant), 0.6);
    border-color: rgba(var(--v-theme-on-surface), 0.15);
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
  margin-right: 8px;
}

.setting-label {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
  transition: color 0.2s ease;
}

/* Global Action Button Styles (FAB) */
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
  background-color: rgba(var(--v-theme-background), 0.8);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 50%;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.12);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface));
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  
  &:hover {
    background-color: rgba(var(--v-theme-background), 0.95);
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
    color: rgb(var(--v-theme-primary));
  }
  
  svg {
    transition: all 0.3s ease;
    width: 20px;
    height: 20px;
  }
}

/* Remove old tune button styles if they exist */
.tune-button {
  display: none; // Hide the old button definitively
}

</style>


