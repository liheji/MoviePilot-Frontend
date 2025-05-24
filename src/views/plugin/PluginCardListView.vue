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
import PluginFolderCard from '@/components/cards/PluginFolderCard.vue'

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
const pluginActions: Ref<{ [key: string]: boolean }> = ref({})

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

// 默认背景
const defaultGradient =
  'linear-gradient(rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.4) 100%), linear-gradient(135deg, rgba(33, 150, 243, 0.7) 0%, rgba(33, 150, 243, 0.8) 100%)'
// 默认文件夹图标
const defaultIcon = 'mdi-folder'
// 默认文件夹颜色
const defaultColor = '#2196F3'

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

// 插件文件夹配置
const pluginFolders: Ref<{ [key: string]: any }> = ref({})

// 文件夹排序
const folderOrder = ref<string[]>([])

// 当前查看的文件夹
const currentFolder = ref('')

// 新建文件夹对话框
const newFolderDialog = ref(false)

// 新文件夹名称
const newFolderName = ref('')

// 显示的插件列表（考虑文件夹筛选）
const displayedPlugins = computed(() => {
  if (!currentFolder.value) {
    // 主列表：显示未归类的插件
    const folderedPluginIds = new Set()
    Object.values(pluginFolders.value).forEach(folderData => {
      const plugins = Array.isArray(folderData) ? folderData : folderData.plugins || []
      plugins.forEach((pid: string) => folderedPluginIds.add(pid))
    })
    return filteredDataList.value.filter(plugin => !folderedPluginIds.has(plugin.id))
  } else {
    // 文件夹内：只显示文件夹中的插件
    const folderData = pluginFolders.value[currentFolder.value]
    const folderPluginIds = Array.isArray(folderData) ? folderData : folderData?.plugins || []
    return filteredDataList.value.filter(plugin => folderPluginIds.includes(plugin.id))
  }
})

// 可拖拽的插件列表（主列表用）
const draggableMainPlugins = ref<Plugin[]>([])

// 可拖拽的插件列表（文件夹内用）
const draggableFolderPlugins = ref<Plugin[]>([])

// 是否正在拖拽排序中
const isDraggingSortMode = ref(false)

// 监听displayedPlugins变化，更新可拖拽列表（避免拖拽时的循环更新）
watch(
  displayedPlugins,
  newPlugins => {
    if (isDraggingSortMode.value) return // 拖拽排序时跳过更新

    if (!currentFolder.value) {
      draggableMainPlugins.value = [...newPlugins]
    } else {
      draggableFolderPlugins.value = [...newPlugins]
    }
  },
  { immediate: true },
)

// 监听文件夹切换，更新可拖拽列表
watch(currentFolder, () => {
  if (!currentFolder.value) {
    draggableMainPlugins.value = [...displayedPlugins.value]
  } else {
    draggableFolderPlugins.value = [...displayedPlugins.value]
  }
})

// 显示的文件夹列表（按排序显示）
const displayedFolders = computed(() => {
  if (currentFolder.value) return [] // 在文件夹内不显示其他文件夹

  const folderNames = Object.keys(pluginFolders.value)

  // 按排序显示文件夹
  const sortedFolderNames = [...folderOrder.value].filter(name => folderNames.includes(name))
  // 添加不在排序中的新文件夹
  const unsortedFolders = folderNames.filter(name => !folderOrder.value.includes(name))
  sortedFolderNames.push(...unsortedFolders)

  return sortedFolderNames.map(folderName => {
    const folderData = pluginFolders.value[folderName]
    const plugins = Array.isArray(folderData) ? folderData : folderData?.plugins || []
    const config = Array.isArray(folderData) ? {} : folderData

    return {
      name: folderName,
      pluginCount: plugins.length,
      config: config,
    }
  })
})

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
  // 只在主列表中保存顺序，文件夹内不保存全局顺序
  if (currentFolder.value) return

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

// 保存主列表插件顺序
async function saveMainPluginOrder() {
  try {
    // 更新主列表数据
    const newOrderedList = [...draggableMainPlugins.value]

    // 添加文件夹中的插件到末尾
    Object.values(pluginFolders.value).forEach(folderData => {
      const plugins = Array.isArray(folderData) ? folderData : folderData.plugins || []
      plugins.forEach((id: string) => {
        const folderPlugin = dataList.value.find(p => p.id === id)
        if (folderPlugin && !newOrderedList.find(p => p.id === id)) {
          newOrderedList.push(folderPlugin)
        }
      })
    })

    filteredDataList.value = newOrderedList

    // 保存排序配置
    const orderObj = newOrderedList.map(item => ({ id: item.id || '' }))
    orderConfig.value = orderObj
    const orderString = JSON.stringify(orderObj)
    localStorage.setItem('MP_PLUGIN_ORDER', orderString)

    // 保存到服务端
    await api.post('/user/config/PluginOrder', orderObj)
  } catch (error) {
  } finally {
    // 清除拖拽标志
    isDraggingSortMode.value = false
  }
}

// 保存文件夹内插件顺序
async function saveFolderPluginOrder() {
  if (!currentFolder.value) return

  try {
    // 更新文件夹内插件顺序
    const folderData = pluginFolders.value[currentFolder.value]
    if (folderData) {
      const newPluginIds = draggableFolderPlugins.value.map(plugin => plugin.id)

      if (Array.isArray(folderData)) {
        // 旧格式，直接替换数组
        pluginFolders.value[currentFolder.value] = newPluginIds
      } else {
        // 新格式，更新plugins字段
        folderData.plugins = newPluginIds
      }

      // 保存到后端
      await savePluginFolders()
    }
  } catch (error) {
    console.error('保存文件夹内排序失败:', error)
  } finally {
    // 清除拖拽标志
    isDraggingSortMode.value = false
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

// 组件挂载后
onMounted(async () => {
  await loadPluginOrderConfig()
  await loadPluginFolders() // 加载文件夹配置
  await refreshData()
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

// 获取插件文件夹配置
async function loadPluginFolders() {
  try {
    const response = await api.get('plugin/folders')
    const foldersData: any = response && typeof response === 'object' ? response : {}

    // 处理旧格式兼容性（array）和新格式（object with config）
    const processedFolders: any = {}
    const order = []

    Object.keys(foldersData).forEach(folderName => {
      const folderData = foldersData[folderName]

      if (Array.isArray(folderData)) {
        // 旧格式：直接是插件数组
        processedFolders[folderName] = {
          plugins: folderData,
          order: order.length,
          icon: defaultIcon,
          color: defaultColor,
          gradient: defaultGradient,
          background: '',
          showIcon: true,
        }
      } else if (folderData && typeof folderData === 'object') {
        // 新格式：包含配置的对象
        processedFolders[folderName] = {
          plugins: folderData.plugins || [],
          order: folderData.order ?? order.length,
          icon: folderData.icon || defaultIcon,
          color: folderData.color || defaultColor,
          gradient: folderData.gradient || defaultGradient,
          background: folderData.background || '',
          showIcon: folderData.showIcon !== undefined ? folderData.showIcon : true,
        }
      }

      order.push(folderName)
    })

    pluginFolders.value = processedFolders

    // 设置文件夹排序
    folderOrder.value = Object.keys(processedFolders).sort(
      (a, b) => (processedFolders[a].order || 0) - (processedFolders[b].order || 0),
    )
  } catch (error) {
    pluginFolders.value = {}
    folderOrder.value = []
  }
}

// 保存插件文件夹配置
async function savePluginFolders() {
  try {
    // 更新排序信息
    const foldersToSave: any = {}
    Object.keys(pluginFolders.value).forEach(folderName => {
      const folderData = pluginFolders.value[folderName]
      const orderIndex = folderOrder.value.indexOf(folderName)

      foldersToSave[folderName] = {
        ...folderData,
        order: orderIndex >= 0 ? orderIndex : 999,
      }
    })

    await api.post('plugin/folders', foldersToSave)
  } catch (error) {
    throw error
  }
}

// 创建新文件夹
async function createNewFolder() {
  if (!newFolderName.value.trim()) {
    $toast.error(t('plugin.folderNameEmpty'))
    return
  }

  if (pluginFolders.value[newFolderName.value]) {
    $toast.error(t('plugin.folderExists'))
    return
  }

  try {
    // 直接在本地添加文件夹
    pluginFolders.value[newFolderName.value] = {
      plugins: [],
      order: folderOrder.value.length,
      icon: defaultIcon,
      color: defaultColor,
      gradient: defaultGradient,
      background: '',
      showIcon: true,
    }

    // 添加到排序列表
    folderOrder.value.push(newFolderName.value)

    // 保存到后端
    await savePluginFolders()

    newFolderDialog.value = false
    newFolderName.value = ''
    $toast.success(t('plugin.folderCreateSuccess'))
  } catch (error) {
    // 回滚本地更改
    delete pluginFolders.value[newFolderName.value]
    folderOrder.value = folderOrder.value.filter(name => name !== newFolderName.value)
    $toast.error(t('plugin.folderCreateFailed'))
  }
}

// 打开文件夹
function openFolder(folderName: string) {
  currentFolder.value = folderName
}

// 返回主列表
function backToMain() {
  currentFolder.value = ''
}

// 重命名文件夹
async function renameFolder(oldName: string, newName: string) {
  if (pluginFolders.value[newName]) {
    $toast.error(t('plugin.folderExists'))
    return
  }

  try {
    // 更新本地状态
    const folderData = pluginFolders.value[oldName] || { plugins: [] }
    pluginFolders.value[newName] = folderData
    delete pluginFolders.value[oldName]

    // 更新排序列表
    const orderIndex = folderOrder.value.indexOf(oldName)
    if (orderIndex >= 0) {
      folderOrder.value[orderIndex] = newName
    }

    // 如果正在查看该文件夹，更新当前文件夹名
    if (currentFolder.value === oldName) {
      currentFolder.value = newName
    }

    // 保存到后端
    await savePluginFolders()

    $toast.success(t('plugin.folderRenameSuccess'))
  } catch (error) {
    console.error('重命名文件夹失败:', error)
    // 回滚本地更改
    pluginFolders.value[oldName] = pluginFolders.value[newName] || { plugins: [] }
    delete pluginFolders.value[newName]
    const orderIndex = folderOrder.value.indexOf(newName)
    if (orderIndex >= 0) {
      folderOrder.value[orderIndex] = oldName
    }
    if (currentFolder.value === newName) {
      currentFolder.value = oldName
    }
    $toast.error(t('plugin.folderRenameFailed'))
  }
}

// 删除文件夹
async function deleteFolder(folderName: string) {
  // 保存被删除的文件夹内容以便回滚
  const deletedFolder = { ...pluginFolders.value[folderName] }
  try {
    delete pluginFolders.value[folderName]

    // 从排序列表中移除
    folderOrder.value = folderOrder.value.filter(name => name !== folderName)

    // 如果正在查看该文件夹，返回主列表
    if (currentFolder.value === folderName) {
      currentFolder.value = ''
    }

    // 保存到后端
    await savePluginFolders()

    $toast.success(t('plugin.folderDeleteSuccess'))
  } catch (error) {
    // 回滚本地更改
    pluginFolders.value[folderName] = deletedFolder
    if (!folderOrder.value.includes(folderName)) {
      folderOrder.value.push(folderName)
    }
    $toast.error(t('plugin.folderDeleteFailed'))
  }
}

// 显示新建文件夹对话框
function showNewFolderDialog() {
  newFolderName.value = ''
  newFolderDialog.value = true
}

// 移出文件夹
async function removeFromFolder(pluginId: string) {
  if (!currentFolder.value) return

  try {
    // 从当前文件夹中移除插件
    const folderData = pluginFolders.value[currentFolder.value]
    const plugins = Array.isArray(folderData) ? folderData : folderData?.plugins || []
    const index = plugins.indexOf(pluginId)
    if (index > -1) {
      plugins.splice(index, 1)
      if (!Array.isArray(folderData)) {
        folderData.plugins = plugins
      }

      // 保存配置
      await savePluginFolders()

      $toast.success(t('plugin.removeFromFolderSuccess'))
    }
  } catch (error) {
    console.error(error)
    $toast.error(t('plugin.operationFailed'))
  }
}

// 更新文件夹配置
async function updateFolderConfig(folderName: string, config: any) {
  try {
    // 更新本地配置
    if (pluginFolders.value[folderName]) {
      pluginFolders.value[folderName] = {
        ...pluginFolders.value[folderName],
        ...config,
      }

      // 保存到后端
      await savePluginFolders()
    }
  } catch (error) {
    $toast.error(t('plugin.saveFolderConfigFailed'))
  }
}

// 文件夹拖拽排序结束事件
function onFolderSortEnd() {
  // 保存新的文件夹顺序
  savePluginFolders()
}

// 当前拖拽的插件ID
const currentDraggedPluginId = ref('')

// 处理拖拽到文件夹的事件
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
  const target = event.currentTarget as HTMLElement
  target.classList.add('drag-over')
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault()
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  const target = event.currentTarget as HTMLElement
  target.classList.remove('drag-over')
}

async function handleDropToFolder(event: DragEvent, folderName: string) {
  event.preventDefault()
  event.stopPropagation()
  const target = event.currentTarget as HTMLElement
  target.classList.remove('drag-over')

  // 使用跟踪的插件ID
  const pluginId = currentDraggedPluginId.value

  if (!pluginId) {
    return
  }

  try {
    // 检查是否是文件夹名（忽略文件夹拖入文件夹的情况）
    if (Object.keys(pluginFolders.value).includes(pluginId)) {
      return
    }

    // 验证插件ID
    const plugin = filteredDataList.value.find(p => p.id === pluginId)

    if (!plugin) {
      return
    }

    // 获取目标文件夹数据
    const targetFolderData = pluginFolders.value[folderName] || { plugins: [] }
    const targetPlugins = Array.isArray(targetFolderData) ? targetFolderData : targetFolderData.plugins || []

    // 检查插件是否已在此文件夹中
    if (targetPlugins.includes(pluginId)) {
      $toast.warning('插件已在此文件夹中')
      return
    }

    // 从其他文件夹中移除该插件
    Object.keys(pluginFolders.value).forEach(fname => {
      if (fname !== folderName) {
        const folderData = pluginFolders.value[fname]
        const plugins = Array.isArray(folderData) ? folderData : folderData.plugins || []
        const index = plugins.indexOf(pluginId)
        if (index > -1) {
          plugins.splice(index, 1)
          if (!Array.isArray(folderData)) {
            folderData.plugins = plugins
          }
        }
      }
    })

    // 从主列表中移除（如果存在）
    const mainIndex = draggableMainPlugins.value.findIndex(p => p.id === pluginId)
    if (mainIndex > -1) {
      draggableMainPlugins.value.splice(mainIndex, 1)
    }

    // 添加到目标文件夹
    if (!pluginFolders.value[folderName]) {
      pluginFolders.value[folderName] = {
        plugins: [],
        order: folderOrder.value.length,
        icon: defaultIcon,
        color: defaultColor,
        gradient: defaultGradient,
        background: '',
        showIcon: true,
      }
    }

    const targetFolder = pluginFolders.value[folderName]
    if (Array.isArray(targetFolder)) {
      targetFolder.push(pluginId)
    } else {
      targetFolder.plugins = targetFolder.plugins || []
      targetFolder.plugins.push(pluginId)
    }

    // 保存配置
    await savePluginFolders()

    $toast.success(`插件已移动到文件夹 "${folderName}"`)
  } catch (error) {
    console.error('拖拽到文件夹失败:', error)
    $toast.error('操作失败')
  }
}

// 拖拽开始事件（修复版本）
function onDragStartPlugin(evt: any) {
  // 设置拖拽模式标志
  isDraggingSortMode.value = true

  // 从oldIndex获取插件ID
  const oldIndex = evt.oldIndex
  if (oldIndex !== undefined) {
    const plugin = currentFolder.value ? draggableFolderPlugins.value[oldIndex] : draggableMainPlugins.value[oldIndex]
    if (plugin && plugin.id) {
      currentDraggedPluginId.value = plugin.id
      return
    }
  }

  // 从拖拽元素获取
  const item = evt.item
  if (item && item.dataset && item.dataset.pluginId) {
    currentDraggedPluginId.value = item.dataset.pluginId
    return
  }

  // 查找data-plugin-id属性
  const pluginCard = item?.querySelector('[data-plugin-id]')
  if (pluginCard) {
    currentDraggedPluginId.value = pluginCard.getAttribute('data-plugin-id') || ''
    return
  }

  // 直接从元素属性获取
  if (item && item.getAttribute && item.getAttribute('data-plugin-id')) {
    currentDraggedPluginId.value = item.getAttribute('data-plugin-id')
  }
}

// 拖拽结束事件
function onDragEndPlugin(evt: any) {
  currentDraggedPluginId.value = ''
  // 清除拖拽标志
  isDraggingSortMode.value = false
}
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
                  <VCol cols="6">
                    <VTextField v-model="filterForm.name" density="comfortable" :label="t('plugin.name')" clearable />
                  </VCol>
                  <VCol v-if="authorFilterOptions.length > 0" cols="6">
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
                  <VCol v-if="labelFilterOptions.length > 0" cols="6">
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
                  <VCol v-if="repoFilterOptions.length > 0" cols="6">
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
                  <VCol v-if="sortOptions.length > 0" cols="6">
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
        <VBtn
          v-if="activeTab === 'installed' && !currentFolder"
          icon="mdi-folder-plus"
          variant="text"
          color="gray"
          size="default"
          class="settings-icon-button"
          @click="showNewFolderDialog"
        />
        <VBtn
          v-if="activeTab === 'installed' && currentFolder"
          icon="mdi-arrow-left"
          variant="text"
          color="gray"
          size="default"
          class="settings-icon-button"
          @click="backToMain"
        />
      </template>
    </VHeaderTab>

    <VWindow v-model="activeTab" class="mt-5 disable-tab-transition px-2" :touch="false">
      <!-- 我的插件 -->
      <VWindowItem value="installed">
        <transition name="fade-slide" appear>
          <div>
            <VPageContentTitle v-if="installedFilter" :title="t('plugin.filter', { name: installedFilter })" />
            <LoadingBanner v-if="!isRefreshed" class="mt-12" />

            <!-- 文件夹和插件网格 -->
            <div v-if="displayedFolders.length > 0 || displayedPlugins.length > 0" class="grid gap-4 grid-plugin-card">
              <!-- 文件夹卡片 - 使用draggable进行排序 -->
              <draggable
                v-if="displayedFolders.length > 0 && isRefreshed"
                v-model="folderOrder"
                @end="onFolderSortEnd"
                handle=".cursor-move"
                item-key="name"
                tag="div"
                :component-data="{ style: 'display: contents;' }"
                :disabled="currentFolder !== ''"
                group="folders"
              >
                <template #item="{ element: folderName }">
                  <div
                    v-if="displayedFolders.find(f => f.name === folderName)"
                    class="drop-zone"
                    @dragover="handleDragOver($event)"
                    @dragenter="handleDragEnter($event)"
                    @dragleave="handleDragLeave($event)"
                    @drop="handleDropToFolder($event, folderName)"
                  >
                    <PluginFolderCard
                      :folder-name="folderName"
                      :plugin-count="displayedFolders.find(f => f.name === folderName)?.pluginCount || 0"
                      :folder-config="displayedFolders.find(f => f.name === folderName)?.config || {}"
                      @open="openFolder"
                      @delete="deleteFolder"
                      @rename="renameFolder"
                      @update-config="updateFolderConfig"
                    />
                  </div>
                </template>
              </draggable>

              <!-- 插件卡片 -->
              <template v-if="!currentFolder">
                <!-- 主列表：使用draggable进行排序 -->
                <draggable
                  v-model="draggableMainPlugins"
                  @end="saveMainPluginOrder"
                  @start="onDragStartPlugin"
                  @sort="onDragEndPlugin"
                  handle=".cursor-move"
                  item-key="id"
                  tag="div"
                  :component-data="{ style: 'display: contents;' }"
                  group="plugins"
                >
                  <template #item="{ element }">
                    <div class="plugin-item-wrapper" :data-plugin-id="element.id">
                      <PluginCard
                        :count="PluginStatistics[element.id || '0']"
                        :plugin="element"
                        :action="pluginActions[element.id || '0']"
                        @remove="refreshData"
                        @save="refreshData"
                        @action-done="pluginActions[element.id || '0'] = false"
                      />
                    </div>
                  </template>
                </draggable>
              </template>

              <template v-else>
                <!-- 文件夹内：使用draggable排序 + 移出按钮 -->
                <draggable
                  v-model="draggableFolderPlugins"
                  @end="saveFolderPluginOrder"
                  @start="onDragStartPlugin"
                  handle=".cursor-move"
                  item-key="id"
                  tag="div"
                  :component-data="{ style: 'display: contents;' }"
                  group="plugins"
                >
                  <template #item="{ element }">
                    <div class="plugin-item-wrapper" :data-plugin-id="element.id">
                      <PluginCard
                        :count="PluginStatistics[element.id || '0']"
                        :plugin="element"
                        :action="pluginActions[element.id || '0']"
                        @remove="refreshData"
                        @save="refreshData"
                        @action-done="pluginActions[element.id || '0'] = false"
                      />
                      <!-- 移出文件夹按钮 -->
                      <VBtn
                        icon="mdi-folder-remove"
                        variant="text"
                        color="warning"
                        size="small"
                        class="remove-from-folder-btn"
                        @click="removeFromFolder(element.id || '')"
                      />
                    </div>
                  </template>
                </draggable>
              </template>
            </div>

            <NoDataFound
              v-if="displayedFolders.length === 0 && displayedPlugins.length === 0 && isRefreshed"
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

  <!-- 新建文件夹对话框 -->
  <VDialog v-if="newFolderDialog" v-model="newFolderDialog" max-width="400">
    <VCard>
      <VDialogCloseBtn @click="newFolderDialog = false" />
      <VCardItem>
        <VCardTitle>{{ t('plugin.newFolder') }}</VCardTitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VTextField
          v-model="newFolderName"
          :label="t('plugin.folderName')"
          variant="outlined"
          @keyup.enter="createNewFolder"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn color="primary" @click="createNewFolder" prepend-icon="mdi-folder-plus" class="px-5">{{
          t('plugin.create')
        }}</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
// 拖拽相关样式
.drop-zone {
  transition: all 0.3s ease;

  &.drag-over {
    transform: scale(1.02);
    box-shadow: 0 0 20px rgba(33, 150, 243, 0.5);
    border: 2px dashed #2196f3;
    border-radius: 16px;
  }
}

.plugin-item-wrapper {
  position: relative;

  .remove-from-folder-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 10;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(4px);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover .remove-from-folder-btn {
    opacity: 1;
  }
}
</style>
