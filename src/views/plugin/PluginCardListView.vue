<script lang="ts" setup>
import draggable from 'vuedraggable'
import { useToast } from 'vue-toast-notification'
import api from '@/api'
import type { Plugin } from '@/api/types'
import NoDataFound from '@/components/NoDataFound.vue'
import PluginAppCard from '@/components/cards/PluginAppCard.vue'
import PluginCard from '@/components/cards/PluginCard.vue'
import noImage from '@images/logos/plugin.png'
import { useDisplay } from 'vuetify'
import { isNullOrEmptyObject } from '@/@core/utils'
import { getPluginTabs } from '@/router/i18n-menu'
import PluginMarketSettingDialog from '@/components/dialog/PluginMarketSettingDialog.vue'
import { useDynamicButton } from '@/composables/useDynamicButton'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

const route = useRoute()

// 显示器宽度
const display = useDisplay()

// APP
const appMode = inject('pwaMode') && display.mdAndDown.value

// 当前标签
const activeTab = ref('installed')

// 获取插件标签页
const pluginTabs = computed(() => getPluginTabs())

// 插件ID参数
const pluginId = ref(route.query.id)

// 当前排序字段
const activeSort = ref(null)

// 插件顺序配置
const orderConfig = ref<{ id: string }[]>([])

// 排序选项
const sortOptions = computed(() => [
  { title: t('plugin.sort.popular'), value: 'count' },
  { title: t('plugin.sort.name'), value: 'plugin_name' },
  { title: t('plugin.sort.author'), value: 'plugin_author' },
  { title: t('plugin.sort.repository'), value: 'repo_url' },
  { title: t('plugin.sort.latest'), value: 'add_time' },
])

// 加载中
const loading = ref(false)

// 已安装插件列表
const dataList = ref<Plugin[]>([])

// 计算已安装插件的名称列表
const installedPluginNames = computed(() => {
  return dataList.value.map(item => item.plugin_name)
})

// 过滤后的已安装插件列表
const filteredDataList = ref<Plugin[]>([])

// 未安装插件列表
const uninstalledList = ref<Plugin[]>([])

// 插件市场插件列表
const marketList = ref<Plugin[]>([])

// 排序后的未安装插件列表
const sortedUninstalledList = ref<Plugin[]>([])

// 显示的未安装插件列表
const displayUninstalledList = ref<Plugin[]>([])

// 是否刷新过
const isRefreshed = ref(false)

// APP市场是否加载完成
const isAppMarketLoaded = ref(false)

// APP市场窗口
const PluginAppDialog = ref(false)

// 插件安装统计
const PluginStatistics = ref<{ [key: string]: number }>({})

// 搜索窗口
const SearchDialog = ref(false)

// 插件市场设置窗口
const MarketSettingDialog = ref(false)

// 搜索关键字
const keyword = ref('')

// 每一个插件的图标加载状态
const pluginIconLoaded = ref<{ [key: string]: boolean }>({})

// 每一个插件的动作标识
const pluginActions = ref<{ [key: string]: boolean }>({})

// 提示框
const $toast = useToast()

// 进度框
const progressDialog = ref(false)

// 进度框文本
const progressText = ref(t('plugin.installingPlugin'))

// 过滤表单
const filterForm = reactive({
  // 名称
  name: '' as string,
  // 作者
  author: [] as string[],
  // 标签
  label: [] as string[],
  // 插件库
  repo: [] as string[],
})

// 计算过滤表单是否全部为空
const isFilterFormEmpty = computed(() => {
  return (
    filterForm.name === '' &&
    filterForm.author.length === 0 &&
    filterForm.label.length === 0 &&
    filterForm.repo.length === 0
  )
})

// 插件过滤条件
const installedFilter = ref(null)

// 有新版本过滤条件
const hasUpdateFilter = ref(false)

// 已安装插件过滤窗口
const filterInstalledPluginDialog = ref(false)

// 插件市场过滤窗口
const filterMarketPluginDialog = ref(false)

// 作者过滤项
const authorFilterOptions = ref<string[]>([])
// 标签过滤项
const labelFilterOptions = ref<string[]>([])
// 插件库过滤项
const repoFilterOptions = ref<string[]>([])

// 加载插件顺序
async function loadPluginOrderConfig() {
  // 顺序配置
  const local_order = localStorage.getItem('MP_PLUGIN_ORDER')
  if (local_order) {
    orderConfig.value = JSON.parse(local_order)
  } else {
    const response2 = await api.get('/user/config/PluginOrder')
    if (response2 && response2.data && response2.data.value) {
      orderConfig.value = response2.data.value
      localStorage.setItem('MP_PLUGIN_ORDER', JSON.stringify(orderConfig.value))
    }
  }
}

// 按order的顺序对插件进行排序
function sortPluginOrder() {
  if (!orderConfig.value) {
    return
  }
  if (dataList.value.length === 0) {
    return
  }
  dataList.value.sort((a, b) => {
    const aIndex = orderConfig.value.findIndex((item: { id: string }) => item.id === a.id)
    const bIndex = orderConfig.value.findIndex((item: { id: string }) => item.id === b.id)
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
}

// 保存顺序设置
async function savePluginOrder() {
  // 顺序配置
  const orderObj = filteredDataList.value.map(item => ({ id: item.id || '' }))
  orderConfig.value = orderObj
  const orderString = JSON.stringify(orderObj)
  localStorage.setItem('MP_PLUGIN_ORDER', orderString)

  // 保存到服务端
  try {
    await api.post('/user/config/PluginOrder', orderObj)
  } catch (error) {
    console.error(error)
  }
}

// 初始化过滤选项
function initOptions(item: Plugin) {
  const optionValue = (options: Array<string>, value: string | undefined) => {
    value && !options.includes(value) && options.push(value)
  }
  const optionMutipleValue = (options: Array<string>, value: string | undefined) => {
    value && value.split(',').forEach(v => !options.includes(v) && options.push(v))
  }
  optionValue(authorFilterOptions.value, item.plugin_author)
  optionMutipleValue(labelFilterOptions.value, item.plugin_label)
  optionValue(repoFilterOptions.value, handleRepoUrl(item.repo_url))
}

// 关闭插件市场窗口
function pluginDialogClose() {
  PluginAppDialog.value = false
}

// 安装插件
async function installPlugin(item: Plugin) {
  try {
    // 显示等待提示框
    progressDialog.value = true
    progressText.value = t('plugin.installing', { name: item?.plugin_name, version: item?.plugin_version })

    const result: { [key: string]: any } = await api.get(`plugin/install/${item?.id}`, {
      params: {
        repo_url: item?.repo_url,
        force: item?.has_update,
      },
    })

    // 隐藏等待提示框
    progressDialog.value = false

    if (result.success) {
      $toast.success(t('plugin.installSuccess', { name: item?.plugin_name }))

      // 刷新
      refreshData()
    } else {
      $toast.error(t('plugin.installFailed', { name: item?.plugin_name, message: result.message }))
    }
  } catch (error) {
    console.error(error)
  }
}

// 打开插件搜索结果
function openPlugin(item: Plugin) {
  // 如果是已安装插件则打开插件详情
  if (item.installed === true) {
    // 标记插件动作
    pluginActions.value[item.id || '0'] = true
  } else {
    // 如果是未安装插件则安装
    installPlugin(item)
  }
  closeSearchDialog()
}

// 关闭插件搜索窗口
function closeSearchDialog() {
  SearchDialog.value = false
}

// 插件图标加载错误
function pluginIconError(item: Plugin) {
  pluginIconLoaded.value[item.id || '0'] = false
}

// 插件图标地址
function pluginIcon(item: Plugin) {
  // 如果图片加载错误
  if (pluginIconLoaded.value[item.id || '0'] === false) return noImage
  // 如果是网络图片则使用代理后返回
  if (item?.plugin_icon?.startsWith('http'))
    return `${import.meta.env.VITE_API_BASE_URL}system/img/1?imgurl=${encodeURIComponent(item?.plugin_icon)}`

  return `./plugin_icon/${item?.plugin_icon}`
}

// 过滤插件
const filterPlugins = computed(() => {
  const all_list = [...dataList.value, ...uninstalledList.value]
  return all_list.filter((item: Plugin) => {
    // 需要忽略大小写
    return (
      item.plugin_name?.toLowerCase().includes(keyword.value.toLowerCase()) ||
      item.plugin_desc?.toLowerCase().includes(keyword.value.toLowerCase()) ||
      !keyword
    )
  })
})

// 获取插件列表数据
async function fetchInstalledPlugins() {
  try {
    loading.value = true
    dataList.value = await api.get('plugin/', {
      params: {
        state: 'installed',
      },
    })
    // 排序
    sortPluginOrder()
    loading.value = false
    isRefreshed.value = true
  } catch (error) {
    console.error(error)
  }
}

// 获取未安装插件列表数据
async function fetchUninstalledPlugins() {
  try {
    loading.value = true
    uninstalledList.value = await api.get('plugin/', {
      params: {
        state: 'market',
      },
    })
    // 设置更新状态
    for (const uninstalled of uninstalledList.value) {
      for (const data of dataList.value) {
        if (uninstalled.id === data.id) {
          data.has_update = true
          data.repo_url = uninstalled.repo_url
          data.history = uninstalled.history
        }
      }
    }
    loading.value = false
    isRefreshed.value = true
    // 更新插件市场列表
    // 排除已安装且有更新的，上面的问题在于"本地存在未安装的旧版本插件且云端有更新时"不会在插件市场展示
    marketList.value = uninstalledList.value.filter(item => !(item.has_update && item.installed))
    // 初始化过滤选项
    marketList.value.forEach(initOptions)
    // 设置APP市场加载完成
    isAppMarketLoaded.value = true
  } catch (error) {
    console.error(error)
  }
}

// 加载插件统计数据
async function getPluginStatistics() {
  try {
    PluginStatistics.value = await api.get('plugin/statistic')
  } catch (error) {
    console.error(error)
  }
}

// 加载所有数据
async function refreshData() {
  await fetchInstalledPlugins()
  fetchUninstalledPlugins()
}

// 对uninstalledList进行排序到sortedUninstalledList
watch([marketList, filterForm, activeSort], () => {
  // 匹配过滤函数
  const match = (filter: Array<string>, value: string | undefined) =>
    filter.length === 0 || (value && filter.includes(value))
  const matchMultiple = (filter: Array<string>, value: string | undefined) =>
    filter.length === 0 || (value && value.split(',').some(v => filter.includes(v)))
  const filterText = (filter: string, value: string | undefined) =>
    !filter || (value && value.toLowerCase().includes(filter.toLowerCase()))

  sortedUninstalledList.value = []

  // 过滤
  marketList.value.forEach(value => {
    if (value) {
      if (
        filterText(filterForm.name, `${value.plugin_name} ${value.plugin_desc}`) &&
        match(filterForm.author, value.plugin_author) &&
        matchMultiple(filterForm.label, value.plugin_label) &&
        match(filterForm.repo, handleRepoUrl(value.repo_url))
      ) {
        sortedUninstalledList.value.push(value)
      }
    }
  })

  // 排序
  if (!isNullOrEmptyObject(PluginStatistics.value)) {
    if (!activeSort.value || activeSort.value === 'count') {
      sortedUninstalledList.value = sortedUninstalledList.value.sort((a, b) => {
        return PluginStatistics.value[b.id || '0'] - PluginStatistics.value[a.id || '0']
      })
    } else if (activeSort.value) {
      sortedUninstalledList.value = sortedUninstalledList.value.sort((a: any, b: any) => {
        return a[activeSort.value ?? ''] > b[activeSort.value ?? ''] ? 1 : -1
      })
    }
  }

  // 显示前20个
  displayUninstalledList.value = sortedUninstalledList.value.splice(0, 20)
})

// 标签转换
function pluginLabels(label: string | undefined) {
  if (!label) return []
  return label.split(',')
}

// 新安装了插件
function pluginInstalled() {
  pluginDialogClose()
  refreshData()
}

// 插件市场设置完成
function marketSettingDone() {
  MarketSettingDialog.value = false
  // 重新加载数据
  refreshData()
}

// 处理掉github地址的前缀
function handleRepoUrl(url: string | undefined) {
  if (!url) return ''
  return url.replace('https://github.com/', '').replace('https://raw.githubusercontent.com/', '')
}

// 监测dataList变化或installedFilter、hasUpdateFilter变化时更新filteredDataList
watch([dataList, installedFilter, hasUpdateFilter], () => {
  filteredDataList.value = dataList.value.filter(item => {
    if (!installedFilter.value && !hasUpdateFilter.value) return true
    if (hasUpdateFilter.value) {
      return item.has_update
    }
    if (installedFilter.value) {
      return item.plugin_name?.toLowerCase().includes((installedFilter.value as string).toLowerCase())
    }
    return true
  })
})

// 插件市场加载更多数据
function loadMarketMore({ done }: { done: any }) {
  // 从 dataList 中获取最前面的 20 个元素
  const itemsToMove = sortedUninstalledList.value.splice(0, 20)
  displayUninstalledList.value.push(...itemsToMove)
  done('ok')
}

// 加载时获取数据
onMounted(async () => {
  await loadPluginOrderConfig()
  refreshData()
  getPluginStatistics()
  if (activeTab.value != 'market' && pluginId.value) {
    // 找到这个插件
    const plugin = dataList.value.find(item => item.id === pluginId.value)
    if (plugin) {
      plugin.page_open = true
    }
  }
})

// 使用动态按钮钩子
useDynamicButton({
  icon: 'mdi-magnify',
  onClick: () => {
    SearchDialog.value = true
  },
})
</script>

<template>
  <div>
    <VHeaderTab :items="pluginTabs" v-model="activeTab">
      <template #append>
        <VMenu
          v-if="activeTab === 'installed'"
          v-model="filterInstalledPluginDialog"
          width="20rem"
          :close-on-content-click="false"
          scrim
        >
          <template #activator="{ props }">
            <VBtn
              icon="mdi-filter-multiple-outline"
              variant="text"
              :color="installedFilter ? 'primary' : 'gray'"
              size="default"
              class="settings-icon-button"
              v-bind="props"
            />
          </template>
          <VCard>
            <VCardItem>
              <VCardTitle>
                <VIcon icon="mdi-filter-multiple-outline" class="mr-2" />
                {{ t('plugin.filterPlugins') }}
              </VCardTitle>
              <VDialogCloseBtn @click="filterInstalledPluginDialog = false" />
            </VCardItem>
            <VCardText>
              <VRow>
                <VCol cols="12">
                  <VCombobox
                    v-model="installedFilter"
                    :items="installedPluginNames"
                    :label="t('plugin.name')"
                    density="comfortable"
                    clearable
                  />
                </VCol>
                <VCol cols="12">
                  <VSwitch v-model="hasUpdateFilter" :label="t('plugin.hasNewVersion')" />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VMenu>
        <VMenu
          v-if="activeTab === 'market'"
          v-model="filterMarketPluginDialog"
          width="25rem"
          :close-on-content-click="false"
          scrim
        >
          <template #activator="{ props }">
            <VBtn
              icon="mdi-filter-multiple-outline"
              variant="text"
              :color="isFilterFormEmpty ? 'gray' : 'primary'"
              size="default"
              class="settings-icon-button"
              v-bind="props"
            />
          </template>
          <VCard>
            <VCardItem>
              <VCardTitle>
                <VIcon icon="mdi-filter-multiple-outline" class="mr-2" />
                {{ t('plugin.filterPlugins') }}
              </VCardTitle>
              <VDialogCloseBtn @click="filterMarketPluginDialog = false" />
            </VCardItem>
            <VCardText>
              <!-- 过滤表单 -->
              <div v-if="isAppMarketLoaded">
                <VRow>
                  <VCol cols="12" md="6">
                    <VTextField v-model="filterForm.name" density="comfortable" :label="t('plugin.name')" clearable />
                  </VCol>
                  <VCol v-if="authorFilterOptions.length > 0" cols="12" md="6">
                    <VSelect
                      v-model="filterForm.author"
                      :items="authorFilterOptions"
                      density="comfortable"
                      chips
                      :label="t('plugin.author')"
                      multiple
                      clearable
                    />
                  </VCol>
                  <VCol v-if="labelFilterOptions.length > 0" cols="12" md="6">
                    <VSelect
                      v-model="filterForm.label"
                      :items="labelFilterOptions"
                      density="comfortable"
                      chips
                      :label="t('plugin.label')"
                      multiple
                      clearable
                    />
                  </VCol>
                  <VCol v-if="repoFilterOptions.length > 0" cols="12" md="6">
                    <VSelect
                      v-model="filterForm.repo"
                      :items="repoFilterOptions"
                      density="comfortable"
                      chips
                      :label="t('plugin.repository')"
                      multiple
                      clearable
                    />
                  </VCol>
                  <VCol v-if="sortOptions.length > 0" cols="12" md="6">
                    <VSelect
                      v-model="activeSort"
                      :items="sortOptions"
                      density="comfortable"
                      :label="t('plugin.sortTitle')"
                    />
                  </VCol>
                </VRow>
              </div>
            </VCardText>
          </VCard>
        </VMenu>
        <VBtn
          v-if="activeTab === 'market'"
          icon="mdi-store-cog"
          variant="text"
          color="gray"
          size="default"
          class="settings-icon-button"
          @click="MarketSettingDialog = true"
        />
      </template>
    </VHeaderTab>

    <VWindow v-model="activeTab" class="mt-5 disable-tab-transition" :touch="false">
      <!-- 我的插件 -->
      <VWindowItem value="installed">
        <transition name="fade-slide" appear>
          <div>
            <VPageContentTitle v-if="installedFilter" :title="t('plugin.filter', { name: installedFilter })" />
            <LoadingBanner v-if="!isRefreshed" class="mt-12" />
            <draggable
              v-if="filteredDataList.length > 0"
              v-model="filteredDataList"
              @end="savePluginOrder"
              handle=".cursor-move"
              item-key="id"
              tag="div"
              :component-data="{ class: 'grid gap-4 grid-plugin-card' }"
            >
              <template #item="{ element }">
                <PluginCard
                  :count="PluginStatistics[element.id || '0']"
                  :plugin="element"
                  :action="pluginActions[element.id || '0']"
                  @remove="refreshData"
                  @save="refreshData"
                  @action-done="pluginActions[element.id || '0'] = false"
                />
              </template>
            </draggable>
            <NoDataFound
              v-if="filteredDataList.length === 0 && isRefreshed"
              error-code="404"
              :error-title="t('common.noData')"
              :error-description="
                installedFilter || hasUpdateFilter ? t('plugin.noMatchingContent') : t('plugin.pleaseInstallFromMarket')
              "
            />
          </div>
        </transition>
      </VWindowItem>
      <!-- 插件市场 -->
      <VWindowItem value="market">
        <transition name="fade-slide" appear>
          <div>
            <LoadingBanner v-if="!isAppMarketLoaded" class="mt-12" />
            <!-- 资源列表 -->
            <VInfiniteScroll
              v-if="isAppMarketLoaded"
              mode="intersect"
              side="end"
              :items="displayUninstalledList"
              @load="loadMarketMore"
              class="overflow-visible"
            >
              <template #loading />
              <template #empty />
              <div class="grid gap-4 grid-plugin-card">
                <template
                  v-for="(data, index) in displayUninstalledList"
                  :key="`${data.id}_v${data.plugin_version}_${index}`"
                >
                  <PluginAppCard :plugin="data" :count="PluginStatistics[data.id || '0']" @install="pluginInstalled" />
                </template>
              </div>
            </VInfiniteScroll>
            <NoDataFound
              v-if="displayUninstalledList.length === 0 && isAppMarketLoaded"
              error-code="404"
              :error-title="t('common.noData')"
              :error-description="t('plugin.allPluginsInstalled')"
            />
          </div>
        </transition>
      </VWindowItem>
    </VWindow>
  </div>

  <div v-if="isRefreshed">
    <!-- 插件搜索图标 -->
    <VFab
      v-if="!appMode"
      icon="mdi-magnify"
      color="info"
      location="bottom"
      size="x-large"
      fixed
      app
      appear
      @click="SearchDialog = true"
      :class="{ 'mb-12': appMode }"
    />
  </div>
  <!-- 插件市场设置窗口 -->
  <PluginMarketSettingDialog
    v-if="MarketSettingDialog"
    v-model="MarketSettingDialog"
    @close="MarketSettingDialog = false"
    @save="marketSettingDone"
  />

  <!-- 插件搜索窗口 -->
  <VDialog
    v-if="SearchDialog"
    v-model="SearchDialog"
    scrollable
    max-width="40rem"
    :max-height="!display.mdAndUp.value ? '' : '85vh'"
    :fullscreen="!display.mdAndUp.value"
  >
    <VCard class="mx-auto" width="100%">
      <VToolbar flat class="p-0">
        <VTextField
          v-model="keyword"
          :label="t('plugin.searchPlugins')"
          single-line
          :placeholder="t('plugin.searchPlaceholder')"
          variant="solo"
          prepend-inner-icon="mdi-magnify"
          flat
          class="mx-1"
        />
      </VToolbar>
      <VDialogCloseBtn @click="closeSearchDialog" />
      <VList v-if="filterPlugins.length > 0" lines="three">
        <VVirtualScroll :items="filterPlugins">
          <template #default="{ item }">
            <VListItem @click="openPlugin(item)">
              <template #prepend>
                <VAvatar>
                  <VImg :src="pluginIcon(item)" @error="pluginIconError(item)">
                    <template #placeholder>
                      <div class="w-full h-full">
                        <VSkeletonLoader class="object-cover aspect-w-1 aspect-h-1" />
                      </div>
                    </template>
                  </VImg>
                </VAvatar>
              </template>
              <VListItemTitle>
                {{ item.plugin_name }}<span class="text-sm ms-2 mt-1 text-gray-500">v{{ item?.plugin_version }}</span>
                <VIcon v-if="item.installed" color="success" icon="mdi-check-circle" class="ms-2" size="small" />
              </VListItemTitle>
              <VListItemSubtitle>
                <VChip
                  v-for="label in pluginLabels(item.plugin_label)"
                  variant="tonal"
                  size="small"
                  class="me-1 my-1"
                  color="info"
                  label
                >
                  {{ label }}
                </VChip>
                {{ item.plugin_desc }}
              </VListItemSubtitle>
            </VListItem>
          </template>
        </VVirtualScroll>
      </VList>
    </VCard>
  </VDialog>
  <!-- 安装插件进度框 -->
  <VDialog v-if="progressDialog" v-model="progressDialog" :scrim="false" width="25rem">
    <VCard color="primary">
      <VCardText class="text-center">
        {{ progressText }}
        <VProgressLinear indeterminate color="white" class="mb-0 mt-1" />
      </VCardText>
    </VCard>
  </VDialog>
</template>
