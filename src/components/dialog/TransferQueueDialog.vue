<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { formatFileSize } from '@/@core/utils/formatters'
import api from '@/api'
import { FileItem, TransferQueue } from '@/api/types'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useBackgroundOptimization } from '@/composables/useBackgroundOptimization'

// 多语言支持
const { t } = useI18n()
const { useProgressSSE } = useBackgroundOptimization()

// 显示器宽度
const display = useDisplay()
// 定义触发的自定义事件
const emit = defineEmits(['close'])

// 数据列表
const dataList = ref<TransferQueue[]>([])

// 整体进度相关
const overallProgress = ref({
  enable: false,
  value: 0,
  text: t('dialog.transferQueue.processing'),
  data: {
    current: '',
    finished: [] as string[],
  },
})

// 当前文件进度相关
const currentFileProgress = ref({
  enable: false,
  value: 0,
})

// 数据可刷新标志
const refreshFlag = ref(false)

// 进度是否激活
const progressActive = ref(false)

// 活动标签
const activeTab = ref('')

// 定时器引用
const queueTimer = ref<NodeJS.Timeout | null>(null)

// 状态标签
const stateDict: { [key: string]: string } = {
  'waiting': t('dialog.transferQueue.waitingState'),
  'running': t('dialog.transferQueue.runningState'),
  'completed': t('dialog.transferQueue.finishedState'),
  'failed': t('dialog.transferQueue.failedState'),
  'cancelled': t('dialog.transferQueue.cancelledState'),
}

// 获取状态颜色
function getStateColor(state: string) {
  if (state === 'waiting') return 'gray'
  else if (state === 'running') return 'primary'
  else if (state === 'completed') return 'success'
  else return 'error'
}

// 从dataList中提取所有的媒体信息
const mediaList = computed(() => {
  return dataList.value.map(item => item.media)
})

// 按media计算总数和完成数，返回 x/x
function getMediaCount(title_year: string) {
  // 按title_year查询出所有media列表
  const medias = dataList.value.filter(item => item.media.title_year === title_year)
  // 计算media下任务的总数
  const total = medias.reduce((acc, cur) => acc + cur.tasks.length, 0)
  // 计算media下任务的完成数
  const completed = medias.reduce((acc, cur) => acc + cur.tasks.filter(task => task.state === 'completed').length, 0)
  return `${completed} / ${total}`
}

// 根据媒体信息获取对应的整理任务
const activeTasks = computed(() => {
  return dataList.value.find(item => item.media.title_year === activeTab.value)?.tasks
})

// 调用API获取队列信息
async function get_transfer_queue() {
  try {
    dataList.value = await api.get('transfer/queue')
    if (dataList.value.length > 0) {
      if (!activeTab.value || activeTasks.value?.length == 0) activeTab.value = dataList.value[0].media.title_year || ''

      // 如果有数据且SSE未启动，则启动SSE监听
      if (!progressActive.value) {
        startLoadingProgress()
      }
    } else {
      // 如果没有数据，停止SSE监听
      if (progressActive.value) {
        stopLoadingProgress()
      }
    }
  } catch (error) {
    console.error(error)
  }
}

// 移除队列任务
async function remove_queue_task(fileitem: FileItem) {
  try {
    await api.delete(`transfer/queue`, { data: fileitem })
    get_transfer_queue()
  } catch (error) {
    console.error(error)
  }
}

// 整体进度SSE消息处理函数
function handleOverallProgressMessage(event: MessageEvent) {
  try {
    const progress = JSON.parse(event.data)
    if (progress) {
      overallProgress.value = {
        enable: progress.enable || false,
        value: progress.value || 0,
        text: progress.text || t('dialog.transferQueue.processing'),
        data: {
          current: progress.data?.current || '',
          finished: progress.data?.finished || [],
        },
      }

      // 如果进度完成或禁用，刷新队列数据
      if (!progress.enable || progress.value >= 100) {
        if (refreshFlag.value) {
          refreshFlag.value = false
          get_transfer_queue()
        }
      } else {
        refreshFlag.value = true
      }
    }
  } catch (error) {
    console.error('解析整体进度消息失败:', error)
  }
}

// 当前文件进度SSE消息处理函数
function handleCurrentFileProgressMessage(event: MessageEvent) {
  try {
    const progress = JSON.parse(event.data)
    if (progress) {
      currentFileProgress.value = {
        enable: progress.enable || false,
        value: progress.value || 0,
      }
    }
  } catch (error) {
    console.error('解析当前文件进度消息失败:', error)
  }
}

// 使用优化的进度SSE连接 - 整体进度
const overallProgressSSE = useProgressSSE(
  `${import.meta.env.VITE_API_BASE_URL}system/progress/filetransfer`,
  handleOverallProgressMessage,
  'transfer-queue-overall-progress',
  progressActive,
)

// 当前文件进度SSE连接
let currentFileProgressSSE: any = null

// 启动当前文件进度监听
function startCurrentFileProgress(filePath: string) {
  if (currentFileProgressSSE) {
    currentFileProgressSSE.stop()
  }

  if (filePath) {
    const encodedPath = encodeURIComponent(filePath)
    currentFileProgressSSE = useProgressSSE(
      `${import.meta.env.VITE_API_BASE_URL}system/progress/${encodedPath}`,
      handleCurrentFileProgressMessage,
      'transfer-queue-current-file-progress',
      progressActive,
    )
    currentFileProgressSSE.start()
  }
}

// 停止当前文件进度监听
function stopCurrentFileProgress() {
  if (currentFileProgressSSE) {
    currentFileProgressSSE.stop()
    currentFileProgressSSE = null
  }
}

// 监听当前文件变化，自动切换进度监听
watch(
  () => overallProgress.value.data.current,
  newCurrentFile => {
    if (newCurrentFile) {
      startCurrentFileProgress(newCurrentFile)
    } else {
      stopCurrentFileProgress()
      currentFileProgress.value = { enable: false, value: 0 }
    }
  },
)

// 使用SSE监听加载进度
function startLoadingProgress() {
  overallProgress.value.text = t('dialog.transferQueue.processing')
  progressActive.value = true
  overallProgressSSE.start()
}

// 停止监听加载进度
function stopLoadingProgress() {
  progressActive.value = false
  overallProgressSSE.stop()
  stopCurrentFileProgress()
}

// 启动定时获取队列
function startQueueTimer() {
  // 清除可能存在的定时器
  if (queueTimer.value) {
    clearInterval(queueTimer.value)
  }

  // 立即执行一次
  get_transfer_queue()

  // 设置3秒定时器
  queueTimer.value = setInterval(() => {
    get_transfer_queue()
  }, 3000)
}

// 停止定时获取队列
function stopQueueTimer() {
  if (queueTimer.value) {
    clearInterval(queueTimer.value)
    queueTimer.value = null
  }
}

onMounted(() => {
  startQueueTimer()
})

onUnmounted(() => {
  stopQueueTimer()
  stopLoadingProgress()
})
</script>

<template>
  <VDialog scrollable max-width="60rem" :fullscreen="!display.mdAndUp.value">
    <VCard class="mx-auto" width="100%">
      <VCardItem>
        <VCardTitle>{{ t('dialog.transferQueue.title') }}</VCardTitle>
      </VCardItem>
      <VDialogCloseBtn @click="emit('close')" />

      <!-- 整体进度显示 -->
      <VProgressLinear v-if="dataList.length > 0" :value="overallProgress.value" color="primary" :height="2" />
      <VDivider v-else />
      <div v-if="overallProgress.enable && overallProgress.value > 0" class="pt-2 text-center">
        <div class="text-sm font-medium">（{{ overallProgress.value.toFixed(1) }}%）{{ overallProgress.text }}</div>
      </div>

      <VCardText v-if="dataList.length === 0" class="text-center">
        {{ t('dialog.transferQueue.noTasks') }}
      </VCardText>

      <VCardText v-if="dataList.length > 0">
        <VTabs v-model="activeTab" show-arrows class="v-tabs-pill" stacked>
          <VTab
            v-for="media in mediaList"
            :value="media.title_year"
            selected-class="v-slide-group-item--active v-tab--selected"
          >
            <div class="font-bold text-lg">{{ media.title }}</div>
            <div>({{ getMediaCount(media.title_year || '') }})</div>
          </VTab>
        </VTabs>
        <VWindow v-model="activeTab" class="mt-5 disable-tab-transition" :touch="false">
          <VWindowItem v-for="media in mediaList" :value="media.title_year">
            <VList>
              <VListItem v-for="task in activeTasks" :key="task.fileitem.path">
                <VListItemTitle>{{ task.fileitem.name }}</VListItemTitle>
                <VListItemSubtitle class="py-1">
                  {{ t('dialog.transferQueue.sizeTitle') }}：{{ formatFileSize(task.fileitem.size || 0) }}
                  <VChip size="small" :color="getStateColor(task.state)" class="mx-2">
                    {{ stateDict[task.state] }}
                  </VChip>
                </VListItemSubtitle>

                <!-- 当前文件进度显示 -->
                <div
                  v-if="overallProgress.data.current === task.fileitem.path && currentFileProgress.enable"
                  class="mt-2"
                >
                  <VProgressLinear :value="currentFileProgress.value" color="success" :height="1" class="mb-1" />
                  <div class="text-xs text-medium-emphasis text-center">
                    {{ currentFileProgress.value.toFixed(1) }}%
                  </div>
                </div>
                <template #append>
                  <IconBtn
                    size="small"
                    icon="mdi-cancel"
                    @click="remove_queue_task(task.fileitem)"
                    :disabled="overallProgress.data.current === task.fileitem.path"
                  />
                </template>
              </VListItem>
            </VList>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </VDialog>
</template>
