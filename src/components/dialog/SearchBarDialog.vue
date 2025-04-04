<script setup lang="ts">
import api from '@/api'
import type { Site, Plugin, Subscribe } from '@/api/types'
import { SystemNavMenus, SettingTabs } from '@/router/menu'
import { NavMenu } from '@/@layouts/types'
import { useUserStore } from '@/stores'
import SearchSiteDialog from '@/components/dialog/SearchSiteDialog.vue'

// 定义props，接收modelValue
const props = defineProps<{
  modelValue: boolean
}>()

// 路由
const router = useRouter()

// 用户 Store
const userStore = useUserStore()

// 超级用户
const superUser = userStore.superUser

// 当前用户名
const userName = userStore.userName

// 所有订阅数据
const SubscribeItems = ref<Subscribe[]>([])

// 站点选择对话框
const chooseSiteDialog = ref(false)
const selectedSites = ref<number[]>([])
const allSites = ref<Site[]>([])

// 定义事件
const emit = defineEmits(['close', 'update:modelValue'])

// 对话框状态的本地计算属性
const dialog = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

// 搜索词
const searchWord = ref<string | null>(null)

// ref
const searchWordInput = ref<HTMLElement | null>(null)

// 近期搜索词条
const recentSearches = ref<string[]>([])

// 保存近期搜索到本地
function saveRecentSearches(keyword: string) {
  if (!keyword) return
  if (recentSearches.value.includes(keyword)) return
  recentSearches.value.unshift(keyword)
  localStorage.setItem('MP_RecentSearches', JSON.stringify(recentSearches.value))
}

// 从本地加载近期搜索
function loadRecentSearches() {
  const recentSearchesStr = localStorage.getItem('MP_RecentSearches')
  if (recentSearchesStr) {
    recentSearches.value = JSON.parse(recentSearchesStr)
    // 只保留最近的 5 条
    if (recentSearches.value.length > 5) {
      recentSearches.value = recentSearches.value.slice(0, 5)
    }
  }
}

// 所有菜单功能
function getMenus(): NavMenu[] {
  let menus: NavMenu[] = []
  // 导航菜单
  SystemNavMenus.forEach(
    item =>
      item &&
      menus.push({
        title: item.full_title ?? item.title,
        icon: item.icon,
        to: item.to,
        header: item.header,
        admin: item.admin,
      }),
  )
  // 设置标签页
  SettingTabs.forEach(
    item =>
      item &&
      menus.push({
        title: '设定 -> ' + item.title,
        icon: item.icon,
        to: `/setting?tab=${item.tab}`,
        header: '',
        admin: true,
        description: item.description,
      }),
  )

  return menus
}

// 匹配的菜单列表
const matchedMenuItems = computed(() => {
  if (!searchWord.value) return []
  if (!superUser) return []
  const lowerWord = (searchWord.value as string).toLowerCase()
  const menuItems = getMenus()
  if (menuItems)
    return menuItems.filter(
      item =>
        item.title.toLowerCase().includes(lowerWord) ||
        (item.description && item.description.toLowerCase().includes(lowerWord)),
    )
  return []
})

// 所有插件（已安装）
const pluginItems = ref<Plugin[]>([])

// 获取插件列表数据
async function fetchInstalledPlugins() {
  try {
    pluginItems.value = await api.get('plugin/', {
      params: {
        state: 'installed',
      },
    })
  } catch (error) {
    console.error(error)
  }
}

// 区配的插件列表
const matchedPluginItems = computed(() => {
  if (!searchWord.value) return []
  if (!superUser) return []
  const lowerWord = (searchWord.value as string).toLowerCase()
  return pluginItems.value.filter((item: Plugin) => {
    if (!item.plugin_name && !item.plugin_desc) return false
    return item.plugin_name?.toLowerCase().includes(lowerWord) || item.plugin_desc?.toLowerCase().includes(lowerWord)
  })
})

// 获取订阅列表数据
async function fetchSubscribes() {
  try {
    SubscribeItems.value = await api.get('subscribe/')
  } catch (error) {
    console.error(error)
  }
}

// 保存用户站点选择到本地
const saveUserSitePreferences = () => {
  try {
    localStorage.setItem('MP_SelectedSites', JSON.stringify(selectedSites.value))
  } catch (err) {
    console.error('保存站点选择失败:', err)
  }
}

// 从本地或接口加载用户站点偏好设置
const loadUserSitePreferences = async () => {
  try {
    // 先尝试从本地存储获取
    const storedSites = localStorage.getItem('MP_SelectedSites')
    if (storedSites) {
      selectedSites.value = JSON.parse(storedSites)
      console.log('从本地加载站点选择:', selectedSites.value)
      return
    }

    // 如果本地没有，尝试从接口获取系统预设
    const result = await api.get('system/setting/IndexerSites')
    if (result && result.data && result.data.value) {
      selectedSites.value = result.data.value
      console.log('从系统预设加载站点选择:', selectedSites.value)
      return
    }
  } catch (err) {
    console.error('加载站点选择失败:', err)
  }
}

// 获取站点分类信息
const getSiteCategories = () => {
  api
    .get('site/')
    .then(async (res: any) => {
      if (res && Array.isArray(res)) {
        allSites.value = res.filter((site: any) => site.is_active) || []
        // 加载用户站点选择
        await loadUserSitePreferences()
        // 如果没有选择任何站点并且有可用站点，才默认选择全部
        if (selectedSites.value.length === 0 && allSites.value.length > 0) {
          selectedSites.value = allSites.value.map((site: Site) => site.id)
        }
      } else if (res.data && Array.isArray(res.data)) {
        allSites.value = res.data.filter((site: any) => site.is_active) || []
        // 加载用户站点选择
        await loadUserSitePreferences()
        // 如果没有选择任何站点并且有可用站点，才默认选择全部
        if (selectedSites.value.length === 0 && allSites.value.length > 0) {
          selectedSites.value = allSites.value.map((site: Site) => site.id)
        }
      }
      console.log('站点数据:', allSites.value)
      console.log('已选站点:', selectedSites.value)
    })
    .catch(err => {
      console.error('获取站点数据失败:', err)
    })
}

// 打开站点选择对话框
const openSiteDialog = () => {
  chooseSiteDialog.value = true
}

// 匹配的订阅列表
const matchedSubscribeItems = computed(() => {
  if (!searchWord.value) return []
  const lowerWord = (searchWord.value as string).toLowerCase()
  return SubscribeItems.value.filter((item: Subscribe) => {
    return (item.name.toLowerCase().includes(lowerWord) && (superUser || userName === item.username)) || false
  })
})

// 搜索多站点
function searchSites(sites: number[]) {
  chooseSiteDialog.value = false
  selectedSites.value = sites
  searchTorrent()
}

// 选择站点
function chooseSitesDone(sites: number[]) {
  chooseSiteDialog.value = false
  selectedSites.value = sites
}

// 搜索资源
function searchTorrent() {
  if (!searchWord.value) return
  // 记录搜索词
  saveRecentSearches(searchWord.value)
  // 保存用户站点选择
  saveUserSitePreferences()
  // 跳转到搜索页面
  router.push({
    path: '/resource',
    query: {
      keyword: searchWord.value,
      area: 'title',
      sites: selectedSites.value.join(','),
    },
  })
  // 关闭搜索对话框
  dialog.value = false
  emit('close')
}

// 跳转媒体搜索页面
function searchMedia(searchType: string) {
  // 搜索类型 media/person
  if (!searchWord.value) return
  saveRecentSearches(searchWord.value)
  router.push({
    path: '/browse/media/search',
    query: {
      title: searchWord.value,
      type: searchType,
    },
  })
  emit('close')
}

// 跳转到历史记录页面
function searchHistory() {
  if (!searchWord.value) return
  saveRecentSearches(searchWord.value)
  router.push({
    path: '/history',
    query: {
      search: searchWord.value,
    },
  })
  emit('close')
}

// 跳转插件页面
function showPlugin(pluginId: string) {
  router.push({
    path: `/plugins/`,
    query: {
      tab: 'installed',
      id: pluginId,
    },
  })
  emit('close')
}

// 跳转菜单页面
function goPage(to: string) {
  router.push(to)
  emit('close')
}

// 跳转订阅页面
function goSubscribe(subscribe: Subscribe) {
  if (subscribe.type === '电影') {
    router.push({
      path: '/subscribe/movie',
      query: {
        id: subscribe.id,
      },
    })
  } else {
    router.push({
      path: '/subscribe/tv',
      query: {
        id: subscribe.id,
      },
    })
  }
  emit('close')
}

onMounted(() => {
  setTimeout(() => {
    searchWordInput.value?.focus()
  }, 500)
  fetchInstalledPlugins()
  fetchSubscribes()
  loadRecentSearches()
  getSiteCategories()
})
</script>
<template>
  <VDialog v-model="dialog" max-width="42rem" scrollable>
    <VCard class="search-dialog">
      <!-- 搜索输入框 -->
      <VCardItem class="pa-4 pa-sm-5 search-box-container">
        <VCombobox
          ref="searchWordInput"
          v-model="searchWord"
          density="comfortable"
          variant="outlined"
          class="search-input"
          placeholder="输入关键词搜索..."
          @keydown.enter="searchMedia('media')"
          hide-details
          clearable
        >
          <template #prepend>
            <VIcon icon="mdi-magnify" color="primary" class="search-icon" />
          </template>
        </VCombobox>
        <DialogCloseBtn inner-class="close-btn" @click="emit('close')">
          <template #default>
            <VIcon icon="mdi-close-circle" color="error" />
          </template>
        </DialogCloseBtn>
      </VCardItem>

      <VDivider class="search-divider" />

      <!-- 主搜索结果区域 -->
      <VCardText class="search-results-container pa-0">
        <!-- 有搜索词时显示结果 -->
        <VList lines="two" v-if="searchWord" class="search-list py-2">
          <!-- 搜索结果分组标题 -->
          <VListSubheader class="primary-text font-weight-medium text-uppercase py-2 px-4 px-sm-6">
            <span class="category-title">媒体搜索</span>
          </VListSubheader>

          <!-- 媒体搜索选项 -->
          <VHover>
            <template #default="hover">
              <VListItem
                density="comfortable"
                link
                rounded="xl"
                v-bind="hover.props"
                @click="searchMedia('media')"
                class="search-option mx-2 mx-sm-4 my-1"
              >
                <template #prepend>
                  <div class="option-icon-wrapper d-flex align-center justify-center">
                    <VIcon
                      icon="mdi-movie-search"
                      :color="hover.isHovering ? 'primary' : 'medium-emphasis'"
                      size="small"
                    />
                  </div>
                </template>
                <VListItemTitle class="text-subtitle-1 font-weight-medium"> 电影、电视剧 </VListItemTitle>
                <VListItemSubtitle class="text-body-2 text-medium-emphasis mt-1">
                  搜索 <span class="primary-text font-weight-medium">{{ searchWord }}</span> 相关的影视作品
                </VListItemSubtitle>
                <template #append>
                  <VIcon v-if="hover.isHovering" icon="mdi-chevron-right" color="primary" />
                </template>
              </VListItem>
            </template>
          </VHover>

          <VHover>
            <template #default="hover">
              <VListItem
                density="comfortable"
                link
                rounded="xl"
                v-bind="hover.props"
                @click="searchMedia('collection')"
                class="search-option mx-2 mx-sm-4 my-1"
              >
                <template #prepend>
                  <div class="option-icon-wrapper d-flex align-center justify-center">
                    <VIcon
                      icon="mdi-movie-filter"
                      :color="hover.isHovering ? 'primary' : 'medium-emphasis'"
                      size="small"
                    />
                  </div>
                </template>
                <VListItemTitle class="text-subtitle-1 font-weight-medium"> 系列合集 </VListItemTitle>
                <VListItemSubtitle class="text-body-2 text-medium-emphasis mt-1">
                  搜索 <span class="primary-text font-weight-medium">{{ searchWord }}</span> 相关的系列作品
                </VListItemSubtitle>
                <template #append>
                  <VIcon v-if="hover.isHovering" icon="mdi-chevron-right" color="primary" />
                </template>
              </VListItem>
            </template>
          </VHover>

          <VHover>
            <template #default="hover">
              <VListItem
                density="comfortable"
                link
                rounded="xl"
                v-bind="hover.props"
                @click="searchMedia('person')"
                class="search-option mx-2 mx-sm-4 my-1"
              >
                <template #prepend>
                  <div class="option-icon-wrapper d-flex align-center justify-center">
                    <VIcon
                      icon="mdi-account-search"
                      :color="hover.isHovering ? 'primary' : 'medium-emphasis'"
                      size="small"
                    />
                  </div>
                </template>
                <VListItemTitle class="text-subtitle-1 font-weight-medium"> 演职人员 </VListItemTitle>
                <VListItemSubtitle class="text-body-2 text-medium-emphasis mt-1">
                  搜索 <span class="primary-text font-weight-medium">{{ searchWord }}</span> 相关的演员、导演等
                </VListItemSubtitle>
                <template #append>
                  <VIcon v-if="hover.isHovering" icon="mdi-chevron-right" color="primary" />
                </template>
              </VListItem>
            </template>
          </VHover>

          <VHover v-if="superUser">
            <template #default="hover">
              <VListItem
                density="comfortable"
                link
                rounded="xl"
                v-bind="hover.props"
                @click="searchHistory"
                class="search-option mx-2 mx-sm-4 my-1"
              >
                <template #prepend>
                  <div class="option-icon-wrapper d-flex align-center justify-center">
                    <VIcon icon="mdi-history" :color="hover.isHovering ? 'primary' : 'medium-emphasis'" size="small" />
                  </div>
                </template>
                <VListItemTitle class="text-subtitle-1 font-weight-medium"> 整理记录 </VListItemTitle>
                <VListItemSubtitle class="text-body-2 text-medium-emphasis mt-1">
                  搜索 <span class="primary-text font-weight-medium">{{ searchWord }}</span> 相关的历史记录
                </VListItemSubtitle>
                <template #append>
                  <VIcon v-if="hover.isHovering" icon="mdi-chevron-right" color="primary" />
                </template>
              </VListItem>
            </template>
          </VHover>

          <!-- 其他搜索结果 -->
          <template v-if="matchedSubscribeItems.length > 0">
            <VDivider class="mx-4 mx-sm-6 my-2 search-divider" />
            <VListSubheader class="primary-text font-weight-medium text-uppercase py-2 px-4 px-sm-6">
              <span class="category-title">订阅内容</span>
            </VListSubheader>

            <VHover v-for="subscribe in matchedSubscribeItems" :key="subscribe.id">
              <template #default="hover">
                <VListItem
                  density="comfortable"
                  link
                  rounded="xl"
                  v-bind="hover.props"
                  @click="goSubscribe(subscribe)"
                  class="search-option mx-2 mx-sm-4 my-1"
                >
                  <template #prepend>
                    <div class="option-icon-wrapper d-flex align-center justify-center">
                      <VIcon
                        :icon="subscribe.type === '电影' ? 'mdi-movie-roll' : 'mdi-television-classic'"
                        :color="hover.isHovering ? 'primary' : 'medium-emphasis'"
                        size="small"
                      />
                    </div>
                  </template>
                  <VListItemTitle class="text-subtitle-1 font-weight-medium">
                    {{ subscribe.name
                    }}<span v-if="subscribe.season" class="text-body-2"> 第 {{ subscribe.season }} 季</span>
                  </VListItemTitle>
                  <VListItemSubtitle class="text-body-2 text-medium-emphasis mt-1">
                    {{ subscribe.type }}
                  </VListItemSubtitle>
                  <template #append>
                    <VIcon v-if="hover.isHovering" icon="mdi-chevron-right" color="primary" />
                  </template>
                </VListItem>
              </template>
            </VHover>
          </template>

          <template v-if="matchedMenuItems.length > 0">
            <VDivider class="mx-4 mx-sm-6 my-2 search-divider" />
            <VListSubheader class="primary-text font-weight-medium text-uppercase py-2 px-4 px-sm-6">
              <span class="category-title">功能菜单</span>
            </VListSubheader>

            <VHover v-for="menu in matchedMenuItems" :key="menu.title">
              <template #default="hover">
                <VListItem
                  density="comfortable"
                  link
                  rounded="xl"
                  v-bind="hover.props"
                  @click="goPage(menu.to as string)"
                  class="search-option mx-2 mx-sm-4 my-1"
                >
                  <template #prepend>
                    <div class="option-icon-wrapper d-flex align-center justify-center">
                      <VIcon
                        :icon="menu.icon as string"
                        :color="hover.isHovering ? 'primary' : 'medium-emphasis'"
                        size="small"
                      />
                    </div>
                  </template>
                  <VListItemTitle class="text-subtitle-1 font-weight-medium">
                    {{ menu.title }}
                  </VListItemTitle>
                  <VListItemSubtitle v-if="menu.description" class="text-body-2 text-medium-emphasis mt-1">
                    {{ menu.description }}
                  </VListItemSubtitle>
                  <template #append>
                    <VIcon v-if="hover.isHovering" icon="mdi-chevron-right" color="primary" />
                  </template>
                </VListItem>
              </template>
            </VHover>
          </template>

          <template v-if="matchedPluginItems.length > 0">
            <VDivider class="mx-4 mx-sm-6 my-2 search-divider" />
            <VListSubheader class="primary-text font-weight-medium text-uppercase py-2 px-4 px-sm-6">
              <span class="category-title">插件</span>
            </VListSubheader>

            <VHover v-for="plugin in matchedPluginItems" :key="plugin.id">
              <template #default="hover">
                <VListItem
                  density="comfortable"
                  link
                  rounded="xl"
                  v-bind="hover.props"
                  @click="showPlugin(plugin.id ?? '')"
                  class="search-option mx-2 mx-sm-4 my-1"
                >
                  <template #prepend>
                    <div class="option-icon-wrapper d-flex align-center justify-center">
                      <VIcon icon="mdi-puzzle" :color="hover.isHovering ? 'primary' : 'medium-emphasis'" size="small" />
                    </div>
                  </template>
                  <VListItemTitle class="text-subtitle-1 font-weight-medium">
                    {{ plugin.plugin_name }}
                  </VListItemTitle>
                  <VListItemSubtitle class="text-body-2 text-medium-emphasis mt-1">
                    {{ plugin.plugin_desc }}
                  </VListItemSubtitle>
                  <template #append>
                    <VIcon v-if="hover.isHovering" icon="mdi-chevron-right" color="primary" />
                  </template>
                </VListItem>
              </template>
            </VHover>
          </template>

          <!-- 将站点资源搜索移到最底部 -->
          <template v-if="searchWord">
            <VDivider class="mx-4 mx-sm-6 my-2 search-divider" />
            <VListSubheader class="primary-text font-weight-medium text-uppercase py-2 px-4 px-sm-6">
              <span class="category-title">站点资源搜索</span>
            </VListSubheader>

            <VCard class="mx-3 mx-sm-6 mb-4 mt-2 site-search-card">
              <VCardText class="pa-3 pa-sm-4">
                <div class="d-flex flex-column">
                  <div class="d-flex align-center mb-3">
                    <div class="search-icon-wrapper mr-3">
                      <VIcon icon="mdi-file-search" color="primary" size="small" />
                    </div>
                    <div class="flex-grow-1">
                      <div class="font-weight-medium text-body-1">在站点中搜索种子资源</div>
                      <div class="text-caption text-medium-emphasis mt-1">
                        搜索 <span class="primary-text font-weight-medium">{{ searchWord }}</span> 相关资源
                      </div>
                    </div>
                    <VBtn
                      color="primary"
                      @click="searchTorrent"
                      prepend-icon="mdi-magnify"
                      size="small"
                      variant="flat"
                      rounded="pill"
                      class="search-btn"
                    >
                      搜索
                    </VBtn>
                  </div>

                  <div class="d-flex align-center flex-wrap site-chips-container mt-1 py-2 px-2 px-sm-3">
                    <div class="d-flex align-center flex-wrap flex-grow-1">
                      <VChip
                        v-if="selectedSites.length > 0"
                        color="primary"
                        size="small"
                        variant="flat"
                        class="mr-2 mb-1 font-weight-medium"
                      >
                        {{ selectedSites.length }}/{{ allSites.length }}
                      </VChip>
                      <VChip
                        v-for="(site, index) in allSites.filter(s => selectedSites.includes(s.id)).slice(0, 5)"
                        :key="site.id"
                        size="x-small"
                        variant="outlined"
                        class="mr-1 mb-1 site-chip"
                      >
                        {{ site.name }}
                      </VChip>
                      <VChip
                        v-if="selectedSites.length > 5"
                        size="x-small"
                        variant="outlined"
                        class="mr-1 mb-1 site-chip text-medium-emphasis"
                      >
                        +{{ selectedSites.length - 5 }}
                      </VChip>
                    </div>
                    <VBtn
                      size="small"
                      variant="tonal"
                      color="primary"
                      @click="openSiteDialog"
                      class="ml-auto site-select-btn"
                    >
                      选择站点
                      <VIcon size="small" class="ml-1">mdi-cog-outline</VIcon>
                    </VBtn>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </template>
        </VList>

        <!-- 无搜索词时显示最近搜索和提示 -->
        <div v-else class="recent-searches py-6 px-4 px-sm-6">
          <div v-if="recentSearches.length > 0" class="mb-6">
            <div class="text-h6 font-weight-medium mb-3">最近搜索</div>
            <div class="d-flex flex-wrap">
              <VChip
                v-for="(word, index) in recentSearches"
                :key="index"
                class="me-2 mb-2"
                variant="flat"
                color="primary"
                size="small"
                @click="searchWord = word"
              >
                <VIcon start size="x-small">mdi-history</VIcon>
                {{ word }}
              </VChip>
            </div>
          </div>

          <div class="text-center mt-6 py-6 empty-search-state">
            <div class="search-icon-wrapper mx-auto mb-4">
              <VIcon icon="mdi-magnify" size="large" color="primary" />
            </div>
            <div class="text-h6 font-weight-medium mb-2">输入关键词开始搜索</div>
            <div class="text-body-2 text-medium-emphasis">可搜索电影、电视剧、演员、资源等</div>
          </div>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 站点选择对话框 -->
  <SearchSiteDialog
    v-if="chooseSiteDialog"
    v-model="chooseSiteDialog"
    :sites="allSites"
    :selected="selectedSites"
    :savebtn="true"
    @search="searchSites"
    @close="chooseSiteDialog = false"
    @reload="getSiteCategories"
    @save="chooseSitesDone"
  />
</template>

<style scoped>
.search-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.site-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.search-divider {
  opacity: 0.08;
}

.search-box-container {
  position: relative;
  background-color: rgb(var(--v-theme-background));
}

.close-btn {
  position: absolute;
  right: 1.2rem;
  top: 1.4rem;
  background-color: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background-color: rgba(var(--v-theme-error), 0.1);
}

.search-input {
  border-radius: 12px;
  font-size: 16px;
  padding-right: 40px;
}

.search-input :deep(.v-field__input) {
  padding-top: 6px;
  padding-bottom: 6px;
  min-height: 40px;
}

.search-icon {
  color: rgb(var(--v-theme-primary));
}

.search-list {
  background-color: rgb(var(--v-theme-background));
}

.category-title {
  font-size: 12px;
  letter-spacing: 1px;
}

.option-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.12);
  margin-right: 12px;
}

.search-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.search-icon-wrapper.warning {
  background-color: rgba(var(--v-theme-warning), 0.08);
}

.primary-text {
  color: rgb(var(--v-theme-primary));
}

.search-option {
  transition: transform 0.2s ease, background-color 0.2s ease;
  margin-bottom: 2px;
  border: 1px solid transparent;
}

.search-option:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
  transform: translateX(4px);
}

.recent-searches {
  min-height: 200px;
  background-color: rgb(var(--v-theme-background));
}

.site-search-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 14px;
  background-color: rgb(var(--v-theme-surface));
}

.site-chip {
  transition: all 0.2s ease;
  font-weight: normal;
}

.site-chip:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}

.search-btn {
  min-width: 70px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.empty-search-state,
.empty-site-state {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.clear-icon {
  opacity: 0.7;
}

.clear-icon:hover {
  opacity: 1;
}

.site-select-btn {
  min-height: 32px;
  font-size: 12px;
  letter-spacing: 0.5px;
  padding: 0 12px;
}

.site-chips-container {
  border-radius: 10px;
  background-color: rgba(var(--v-theme-surface-variant), 0.06);
}

@media (max-width: 600px) {
  .search-box-container {
    padding: 16px;
  }

  .search-input {
    font-size: 14px;
  }

  .close-btn {
    right: 0.8rem;
    top: 1rem;
    width: 32px;
    height: 32px;
  }

  .site-chips-container {
    padding: 6px 8px;
  }

  .site-select-btn {
    min-height: 28px;
    font-size: 11px;
  }
}
</style>
