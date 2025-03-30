<script lang="ts" setup>
import type { Axios, AxiosRequestConfig } from 'axios'
import type { PropType } from 'vue'
import { useConfirm } from 'vuetify-use-dialog'
import { useToast } from 'vue-toast-notification'
import ReorganizeDialog from '../dialog/ReorganizeDialog.vue'
import { formatBytes } from '@core/utils/formatters'
import type { Context, EndPoints, FileItem } from '@/api/types'
import api from '@/api'
import ProgressDialog from '../dialog/ProgressDialog.vue'
import { useDisplay } from 'vuetify'
import MediaInfoDialog from '../dialog/MediaInfoDialog.vue'

// 显示器宽度
const display = useDisplay()

// APP
const appMode = inject('pwaMode') && display.mdAndDown.value

// 输入参数
const inProps = defineProps({
  icons: Object,
  storage: String,
  endpoints: Object as PropType<EndPoints>,
  axios: {
    type: Object as PropType<Axios>,
    required: true,
  },
  refreshpending: Boolean,
  item: {
    type: Object as PropType<FileItem>,
    required: true,
  },
  sort: String,
})

// 对外事件
const emit = defineEmits(['loading', 'pathchanged', 'refreshed', 'filedeleted', 'renamed', 'items-updated'])

// 确认框
const createConfirm = useConfirm()

// 提示框
const $toast = useToast()

// 是否选择模式
const selectMode = ref(false)

// 是否正在加载
const loading = ref(true)

// 重命名loading
const renameLoading = ref(false)

// 识别进度条
const progressDialog = ref(false)

// 识别进度文本
const progressText = ref('请稍候 ...')

// 识别进度
const progressValue = ref(0)

// 内容列表
const items = ref<FileItem[]>([])

// 过滤条件
const filter = ref('')

// 重命名弹窗
const renamePopper = ref(false)

// 整理弹窗
const transferPopper = ref(false)

// 新名称
const newName = ref('')

// 处理目录内所有文件
const renameAll = ref(false)

// 当前操作项
const currentItem = ref<FileItem>()

// 选中的项目
const selected = ref<FileItem[]>([])

// 识别结果
const nameTestResult = ref<Context>()

// 识别结果对话框
const nameTestDialog = ref(false)

// 弹出菜单
const dropdownItems = ref<{ [key: string]: any }[]>([])

// 加载进度SSE
const progressEventSource = ref<EventSource>()

// 目录过滤
const dirs = computed(() => items.value.filter(item => item.type === 'dir' && item.name.includes(filter.value)))

// 文件过滤
const files = computed(() => items.value.filter(item => item.type === 'file' && item.name.includes(filter.value)))

// 是否文件
const isFile = computed(() => inProps.item.type == 'file')

// 需要整理的文件项
const transferItems = ref<FileItem[]>([])

// 当前图片地址
const currentImgLink = ref('')

// 大小控制
const scrollStyle = computed(() => {
  return appMode
    ? 'height: calc(100vh - 15.5rem - env(safe-area-inset-bottom) - 3.5rem)'
    : 'height: calc(100vh - 14.5rem - env(safe-area-inset-bottom)'
})

// 是否为图片文件
const isImage = computed(() => {
  const ext = inProps.item.path?.split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext ?? '')
})

// 创建一个计算属性用于设置虚拟滚动的高度
const fileListStyle = computed(() => {
  return 'height: 100%';
})

// 调整选择模式
function changeSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) selected.value = []
}

// 调API加载文件夹内的内容
async function list_files() {
  loading.value = true
  emit('loading', true)

  // 参数
  const url = inProps.endpoints?.list.url.replace(/{sort}/g, inProps.sort || 'name')

  const config: AxiosRequestConfig<FileItem> = {
    url,
    method: inProps.endpoints?.list.method || 'get',
    data: inProps.item,
  }

  // 加载数据
  items.value = (await inProps.axios.request(config)) ?? []
  emit('loading', false)
  loading.value = false
  
  // 通知父组件文件列表更新
  emit('items-updated', items.value)
}

// 删除项目
async function deleteItem(item: FileItem, confirm: boolean = true) {
  if (confirm) {
    const confirmed = await createConfirm({
      title: '确认',
      content: `是否确认删除${item.type === 'dir' ? '目录' : '文件'} ${item.name}？`,
    })
    if (!confirmed) return
  }

  // 加载中
  emit('loading', true)

  // 请求API
  const url = inProps.endpoints?.delete.url
  const config: AxiosRequestConfig<FileItem> = {
    url,
    method: inProps.endpoints?.delete.method || 'post',
    data: item,
  }
  await inProps.axios.request(config)

  // 删除完成
  emit('loading', false)
  emit('filedeleted')

  // 重新加载
  list_files()
}

// 批量删除
async function batchDelete() {
  const confirmed = await createConfirm({
    title: '确认',
    content: `是否确认删除选中的 ${selected.value.length} 个项目？`,
  })

  if (!confirmed) return

  // 显示进度条
  progressDialog.value = true
  progressValue.value = 0

  // 删除选中的项目
  selected.value.every(async item => {
    progressText.value = `正在删除 ${item.name} ...`
    await deleteItem(item, false)
  })

  // 关闭进度条
  progressDialog.value = false

  // 重新加载
  list_files()
}

// 切换路径
function changePath(item: FileItem) {
  item.path = inProps.item.path + item.name + (item.type === 'dir' ? '/' : '')
  emit('pathchanged', item)
}

// 点击列表项
function listItemClick(item: FileItem) {
  if (selectMode.value) {
    if (selected.value.includes(item)) {
      selected.value = selected.value.filter(i => i !== item)
    } else {
      selected.value.push(item)
    }
    // 去重
    selected.value = Array.from(new Set(selected.value))
    return false
  }
  changePath(item)
}

// 新窗口中下载文件
async function download(item: FileItem) {
  const url = inProps.endpoints?.download.url
  // 下载文件
  const config: AxiosRequestConfig<FileItem> = {
    url,
    method: inProps.endpoints?.download.method || 'post',
    data: item,
    responseType: 'blob',
  }
  // 加载数据
  const result: Blob = await inProps.axios.request(config)
  if (result) {
    const downloadUrl = URL.createObjectURL(result)
    window.open(downloadUrl, '_blank')
  }
}

// 获取图片地址
async function getImgLink(item: FileItem) {
  let url = inProps.endpoints?.image.url
  // 下载文件
  const config: AxiosRequestConfig<FileItem> = {
    url,
    method: inProps.endpoints?.image.method || 'post',
    data: item,
    responseType: 'blob',
  }
  // 加载二进制数据
  const result: Blob = await inProps.axios.request(config)
  if (result) {
    // 创建图片地址
    currentImgLink.value = URL.createObjectURL(result)
  }
}

// 如果当前是图片且是文件，则获取图片地址
watch(
  () => inProps.item,
  async () => {
    if (isImage.value && isFile.value) {
      await getImgLink(inProps.item)
    }
  },
  { immediate: true },
)

// 显示重命名弹窗
function showRenmae(item: FileItem) {
  currentItem.value = item
  newName.value = item.name
  renameAll.value = false
  renamePopper.value = true
}

// 调用API获取新名称
async function get_recommend_name() {
  renameLoading.value = true
  try {
    const result: { [key: string]: any } = await api.get('transfer/name', {
      params: {
        path: `${inProps.item.path}${currentItem.value?.name}`,
        filetype: currentItem.value?.type ?? 'file',
      },
    })
    if (result.success && result.data) {
      newName.value = result.data.name
    } else {
      $toast.error(result.message)
    }
  } catch (error) {
    console.error(error)
  }
  renameLoading.value = false
}

// 重命名
async function rename() {
  emit('loading', true)

  // 关闭弹窗
  renamePopper.value = false

  // 显示进度条
  progressDialog.value = true
  progressValue.value = 0
  if (renameAll.value) {
    progressText.value = `正在重命名 ${currentItem.value?.path} 及目录内所有文件 ...`
  } else {
    progressText.value = `正在重命名 ${currentItem.value?.name} ...`
  }
  if (renameAll.value) {
    startLoadingProgress()
  }

  // 调API
  let url = inProps.endpoints?.rename.url.replace(/{newname}/g, encodeURIComponent(newName.value))
  if (renameAll.value) {
    url += '&recursive=true'
  }

  const config: AxiosRequestConfig<FileItem> = {
    url,
    method: inProps.endpoints?.rename.method || 'post',
    data: currentItem.value,
  }
  const result: { [key: string]: any } = await inProps.axios?.request(config)
  if (!result.success) {
    $toast.error(result.message)
  }

  // 关闭进度条
  if (renameAll.value) {
    stopLoadingProgress()
  }
  progressDialog.value = false

  // 通知重新加载
  newName.value = ''
  renameAll.value = false
  emit('loading', false)
  emit('renamed')
}

// 显示整理对话框
function showTransfer(item: FileItem) {
  transferItems.value = [item]
  transferPopper.value = true
}

// 显示批量整理对话框
function showBatchTransfer() {
  transferItems.value = selected.value
  transferPopper.value = true
}

// 整理完成
function transferDone() {
  transferPopper.value = false
  list_files()
}

// 将文件修改时间（timestape）转换为本地时间
function formatTime(timestape: number) {
  return new Date(timestape * 1000).toLocaleString()
}

// 监听refreshPending变化
watch(
  () => inProps.refreshpending,
  async () => {
    if (inProps.refreshpending) {
      await list_files()
      emit('refreshed')
    }
  },
)

// 监听item变化或者storage变化
watch(
  [() => inProps.item, () => inProps.storage],
  async () => {
    // 清空列表
    items.value = []
    // 关闭弹窗
    nameTestResult.value = undefined
    nameTestDialog.value = false
    // 重置菜单
    dropdownItems.value = [
      {
        title: '识别',
        value: 1,
        show: true,
        props: {
          prependIcon: 'mdi-text-recognition',
          click: (_item: FileItem) => {
            recognize(_item.path || '')
          },
        },
      },
      {
        title: '刮削',
        value: 2,
        show: true,
        props: {
          prependIcon: 'mdi-auto-fix',
          click: (_item: FileItem) => {
            scrape(_item)
          },
        },
      },
      {
        title: '重命名',
        value: 3,
        show: true,
        props: {
          prependIcon: 'mdi-rename',
          click: showRenmae,
        },
      },
      {
        title: '整理',
        value: 4,
        show: true,
        props: {
          prependIcon: 'mdi-folder-arrow-right',
          click: showTransfer,
        },
      },
      {
        title: '删除',
        value: 5,
        show: true,
        props: {
          prependIcon: 'mdi-delete-outline',
          color: 'error',
          click: deleteItem,
        },
      },
    ]
    await list_files()
  },
  { immediate: true },
)

// 调用API识别
async function recognize(path: string) {
  try {
    // 显示进度条
    progressDialog.value = true
    progressText.value = `正在识别 ${path} ...`
    progressValue.value = 0
    nameTestResult.value = await api.get('media/recognize_file', {
      params: {
        path,
      },
    })
    // 关闭进度条
    progressDialog.value = false
    if (!nameTestResult.value) $toast.error(`${path} 识别失败！`)
    nameTestDialog.value = !!nameTestResult.value?.meta_info?.name
  } catch (error) {
    console.error(error)
  }
}

// 调用API刮削
async function scrape(item: FileItem, confirm: boolean = true) {
  try {
    if (confirm) {
      // 确认
      const confirmed = await createConfirm({
        title: '确认',
        content: `是否确认刮削 ${item.path}？`,
      })
      if (!confirmed) return
    }

    // 显示进度条
    progressDialog.value = true
    progressText.value = `正在刮削 ${item.path} ...`

    const result: { [key: string]: any } = await api.post(`media/scrape/${inProps.storage}`, item)

    // 关闭进度条
    progressDialog.value = false
    if (!result.success) $toast.error(result.message)
    else $toast.success(`${item.path} 削刮完成！`)
  } catch (error) {
    console.error(error)
  }
}

// 批量刮削
async function batchScrape() {
  // 确认
  const confirmed = await createConfirm({
    title: '确认',
    content: `是否确认刮削选中的 ${selected.value.length} 项？`,
  })
  if (!confirmed) return

  selected.value.map(item => {
    scrape(item, false)
  })
}

// 使用SSE监听加载进度
function startLoadingProgress() {
  progressText.value = '请稍候 ...'
  progressEventSource.value = new EventSource(`${import.meta.env.VITE_API_BASE_URL}system/progress/batchrename`)
  progressEventSource.value.onmessage = event => {
    const progress = JSON.parse(event.data)
    if (progress) {
      progressText.value = progress.text
      progressValue.value = progress.value
    }
  }
}

// 停止监听加载进度
function stopLoadingProgress() {
  progressEventSource.value?.close()
}

onMounted(() => {
  list_files()
})
</script>

<template>
  <div class="file-list-component">
    <VToolbar v-if="!loading" density="compact" flat color="grey-lighten-4" class="file-actions-toolbar">
      <VTextField
        v-if="!isFile"
        v-model="filter"
        hide-details
        flat
        density="compact"
        variant="solo-filled"
        placeholder="搜索文件和文件夹..."
        prepend-inner-icon="mdi-magnify"
        class="me-2 search-field"
        rounded
        bg-color="grey-lighten-5"
      />
      <VSpacer v-if="isFile" />
      <IconBtn v-if="!isFile" @click="changeSelectMode" tooltip="切换选择模式" class="action-btn">
        <VIcon :color="selectMode ? 'primary' : 'grey-darken-1'" v-if="selectMode"> mdi-selection-remove </VIcon>
        <VIcon :color="selectMode ? 'grey-darken-1' : 'primary'" v-else>mdi-select</VIcon>
      </IconBtn>
      <IconBtn v-if="isFile" @click="recognize(inProps.item.path || '')" tooltip="识别" class="action-btn">
        <VIcon color="primary"> mdi-text-recognition </VIcon>
      </IconBtn>
      <IconBtn v-if="isFile && items.length > 0" @click="download(items[0])" tooltip="下载" class="action-btn">
        <VIcon color="primary"> mdi-download </VIcon>
      </IconBtn>
      <IconBtn v-if="!isFile" @click="list_files" tooltip="刷新" class="action-btn">
        <VIcon color="primary"> mdi-refresh </VIcon>
      </IconBtn>
      <!-- 批量操作按钮 -->
      <span v-if="selected.length > 0" class="batch-actions">
        <VChip color="primary" size="small" class="me-2">已选择 {{ selected.length }} 项</VChip>
        <IconBtn @click.stop="batchScrape" tooltip="批量刮削" class="action-btn">
          <VIcon color="primary" icon="mdi-auto-fix" />
        </IconBtn>
        <IconBtn @click.stop="showBatchTransfer" tooltip="批量整理" class="action-btn">
          <VIcon color="primary" icon="mdi-folder-arrow-right" />
        </IconBtn>
        <IconBtn @click.stop="batchDelete" tooltip="批量删除" class="action-btn">
          <VIcon icon="mdi-delete-outline" color="error" />
        </IconBtn>
      </span>
    </VToolbar>
    
    <div class="file-content-container">
      <div v-if="loading" class="text-center flex flex-col items-center loading-container">
        <VProgressCircular size="48" indeterminate color="primary" />
        <span class="mt-2 text-medium-emphasis">加载中...</span>
      </div>
      
      <!-- 文件详情 -->
      <div v-else-if="isFile && !isImage && items.length > 0" class="text-center break-all file-details">
        <div v-if="items[0]?.thumbnail" class="flex justify-center">
          <VImg max-width="15rem" cover :src="items[0]?.thumbnail" class="rounded-lg border shadow-lg file-thumbnail" height="auto">
            <template #placeholder>
              <VSkeletonLoader class="object-cover w-full h-full" type="image" />
            </template>
          </VImg>
        </div>
        <div class="text-xl font-weight-medium text-high-emphasis mt-4">{{ items[0]?.name }}</div>
        <VCard v-if="items[0]?.size && items[0].modify_time" class="mt-4 pa-3 file-info-card bg-grey-lighten-5" flat>
          <div class="d-flex align-center mb-2">
            <VIcon size="small" class="me-2" icon="mdi-file-outline" />
            <span>大小：{{ formatBytes(items[0]?.size || 0) }}</span>
          </div>
          <div class="d-flex align-center">
            <VIcon size="small" class="me-2" icon="mdi-calendar-clock" />
            <span>修改时间：{{ formatTime(items[0]?.modify_time || 0) }}</span>
          </div>
        </VCard>
      </div>
      
      <!-- 图片 -->
      <div v-else-if="isFile && isImage && items.length > 0" class="d-flex justify-center align-center image-container">
        <VImg :src="currentImgLink" max-width="100%" max-height="100%" class="rounded-lg shadow" />
      </div>
      
      <!-- 目录和文件列表 -->
      <div v-else-if="dirs.length || files.length" class="file-list-container">
        <VList subheader class="file-list">
          <VVirtualScroll :items="[...dirs, ...files]" :style="fileListStyle">
            <template #default="{ item }">
              <VHover>
                <template #default="hover">
                  <VListItem 
                    v-bind="hover.props" 
                    class="px-3 pe-1 file-list-item" 
                    @click="listItemClick(item)"
                    :class="{'file-list-item-hover': hover.isHovering}"
                    rounded="sm"
                    :active="false"
                  >
                    <template #prepend>
                      <VListItemAction v-if="selectMode">
                        <VCheckbox v-model="selected" :value="item" color="primary" />
                      </VListItemAction>
                      <template v-else>
                        <VIcon
                          v-if="inProps.icons && item.extension"
                          :icon="inProps.icons[item.extension.toLowerCase()] || inProps.icons?.other"
                          :color="item.type === 'dir' ? 'amber-darken-2' : 'grey-darken-1'"
                          class="file-icon"
                        />
                        <VIcon 
                          v-else-if="item.type == 'dir'" 
                          icon="mdi-folder" 
                          color="amber-darken-2"
                          class="file-icon"
                        />
                        <VIcon v-else icon="mdi-file-outline" color="grey-darken-1" class="file-icon" />
                      </template>
                    </template>
                    <VListItemTitle v-text="item.name" class="text-truncate" />
                    <VListItemSubtitle v-if="item.size && item.modify_time" class="d-flex text-caption text-grey">
                      <span>{{ formatBytes(item.size) }}</span>
                      <span class="mx-1">•</span>
                      <span>{{ new Date(item.modify_time * 1000).toLocaleDateString() }}</span>
                    </VListItemSubtitle>
                    <template #append>
                      <IconBtn v-if="display.smAndDown.value && !selectMode" class="mobile-menu-btn">
                        <VIcon icon="mdi-dots-vertical" />
                        <VMenu activator="parent" close-on-content-click>
                          <VList density="compact" class="pa-1">
                            <template v-for="(menu, i) in dropdownItems" :key="i">
                              <VListItem
                                v-if="menu.show"
                                variant="text"
                                :base-color="menu.props.color"
                                @click="menu.props.click(item)"
                                rounded="sm"
                                density="compact"
                                class="menu-item"
                              >
                                <template #prepend>
                                  <VIcon :icon="menu.props.prependIcon" size="small" />
                                </template>
                                <VListItemTitle v-text="menu.title" class="text-body-2" />
                              </VListItem>
                            </template>
                          </VList>
                        </VMenu>
                      </IconBtn>
                      <span v-if="hover.isHovering && display.mdAndUp.value && !selectMode" class="flex action-buttons">
                        <VTooltip text="识别">
                          <template #activator="{ props }">
                            <IconBtn v-bind="props" @click.stop="recognize(item.path)" class="action-icon">
                              <VIcon icon="mdi-text-recognition" size="small" />
                            </IconBtn>
                          </template>
                        </VTooltip>
                        <VTooltip text="刮削">
                          <template #activator="{ props }">
                            <IconBtn v-bind="props" @click.stop="scrape(item)" class="action-icon">
                              <VIcon icon="mdi-auto-fix" size="small" />
                            </IconBtn>
                          </template>
                        </VTooltip>
                        <VTooltip text="重命名">
                          <template #activator="{ props }">
                            <IconBtn v-bind="props" @click.stop="showRenmae(item)" class="action-icon">
                              <VIcon icon="mdi-rename" size="small" />
                            </IconBtn>
                          </template>
                        </VTooltip>
                        <VTooltip text="整理">
                          <template #activator="{ props }">
                            <IconBtn v-bind="props" @click.stop="showTransfer(item)" class="action-icon">
                              <VIcon icon="mdi-folder-arrow-right" size="small" />
                            </IconBtn>
                          </template>
                        </VTooltip>
                        <VTooltip text="删除">
                          <template #activator="{ props }">
                            <IconBtn v-bind="props" @click.stop="deleteItem(item)" class="action-icon">
                              <VIcon icon="mdi-delete-outline" size="small" color="error" />
                            </IconBtn>
                          </template>
                        </VTooltip>
                      </span>
                    </template>
                  </VListItem>
                </template>
              </VHover>
            </template>
          </VVirtualScroll>
        </VList>
      </div>
      
      <div v-else-if="filter" class="d-flex justify-center align-center text-grey empty-state">
        <VIcon icon="mdi-file-search-outline" size="large" class="mb-2" />
        <div class="text-subtitle-1 mt-2">没有匹配的文件或文件夹</div>
      </div>
      
      <div v-else-if="!loading" class="d-flex flex-column justify-center align-center empty-state">
        <VIcon icon="mdi-folder-outline" size="large" class="mb-2" color="grey-lighten-1" />
        <div class="text-subtitle-1 text-grey">空目录</div>
        <div class="text-caption text-grey-lighten-1 mt-1">此文件夹没有内容</div>
      </div>
    </div>
  </div>
  
  <!-- 重命名弹窗 -->
  <VDialog v-if="renamePopper" v-model="renamePopper" max-width="40rem" class="rename-dialog">
    <VCard title="重命名" class="pa-2">
      <template #title>
        <div class="d-flex align-center px-4 pt-4">
          <VIcon icon="mdi-rename" color="primary" class="me-2" />
          <span class="text-h6">重命名</span>
        </div>
      </template>
      <DialogCloseBtn @click="renamePopper = false" />
      <VDivider class="mt-3" />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VTextField 
              v-model="newName" 
              label="新名称" 
              :loading="renameLoading" 
              variant="outlined"
              placeholder="输入新的文件名称"
              hide-details="auto"
            />
          </VCol>
          <VCol cols="12" md="6" v-if="currentItem && currentItem.type == 'dir'">
            <VSwitch v-model="renameAll" label="自动重命名目录内所有媒体文件" color="primary" />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="pa-4 pt-0">
        <VBtn color="primary" variant="text" @click="get_recommend_name" prepend-icon="mdi-magic-staff" class="me-2">
          自动识别名称
        </VBtn>
        <VSpacer />
        <VBtn color="grey" variant="text" @click="renamePopper = false">
          取消
        </VBtn>
        <VBtn color="primary" :disabled="!newName" variant="elevated" @click="rename" class="ms-2">
          确定
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
  <!-- 文件整理弹窗 -->
  <ReorganizeDialog
    v-if="transferPopper"
    v-model="transferPopper"
    :items="transferItems"
    :target_storage="inProps.storage"
    @done="transferDone"
    @close="transferPopper = false"
  />
  <!-- 进度框 -->
  <ProgressDialog v-if="progressDialog" v-model="progressDialog" :text="progressText" :value="progressValue" />
  <!-- 识别结果对话框 -->
  <MediaInfoDialog
    v-if="nameTestDialog"
    v-model="nameTestDialog"
    :context="nameTestResult"
    @close="nameTestDialog = false"
  />
</template>

<style lang="scss" scoped>
.file-list-component {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 104px); /* 减去标题栏和工具栏的高度 */
  overflow: hidden;
  flex: 1;
}

.file-actions-toolbar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.file-content-container {
  flex: 1;
  overflow: auto;
  position: relative;
}

.search-field {
  max-width: 300px;
}

.file-list-container {
  flex: 1;
  overflow: hidden;
  border-radius: 0 0 12px 0;
}

.file-list {
  height: 100%;
  overflow-y: auto;
  border-radius: inherit;
}

.file-list-item {
  transition: background-color 0.2s;
}

.file-list-item-hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.file-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.toolbar {
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 16px;
}

.file-icon {
  font-size: 1.5rem;
}

.menu-item {
  min-height: 36px;
}

.action-buttons {
  opacity: 0;
  transition: opacity 0.2s;
}

.file-list-item-hover .action-buttons {
  opacity: 1;
}

.action-icon {
  margin: 0 2px;
}

.empty-state {
  height: 100%;
  flex-direction: column;
}

.file-details {
  max-width: 80%;
  margin: 0 auto;
  padding: 24px;
}

.file-info-card {
  max-width: 20rem;
  margin: 0 auto;
}

.file-thumbnail {
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.image-container {
  height: 100%;
  width: 100%;
  padding: 16px;
}

.mobile-menu-btn {
  margin-right: -8px;
}

.loading-container {
  min-height: 200px;
  height: 100%;
}

.rename-dialog {
  .v-card {
    border-radius: 8px;
  }
}
</style>
