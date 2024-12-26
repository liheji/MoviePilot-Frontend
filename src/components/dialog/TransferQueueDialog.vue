<script lang="ts" setup>
import { formatFileSize } from '@/@core/utils/formatters'
import api from '@/api'
import { FileItem, TransferQueue } from '@/api/types'
import { useDisplay } from 'vuetify'
import { VAvatar, VListItemAction, VProgressLinear } from 'vuetify/lib/components/index.mjs'
import PosterCard from '../cards/PosterCard.vue'

// 显示器宽度
const display = useDisplay()
// 定义触发的自定义事件
const emit = defineEmits(['close'])

// 数据列表
const dataList = ref<TransferQueue[]>([])

// 加载进度SSE
const progressEventSource = ref<EventSource>()

// 整理进度文本
const progressText = ref('请稍候 ...')

// 整理进度
const progressValue = ref(0)

// 数据可刷新标志
const refreshFlag = ref(false)

// 活动标签
const activeTab = ref('')

// 状态标签
const stateDict: { [key: string]: string } = {
  'waiting': '等待中',
  'running': '正在整理',
  'completed': '完成',
  'failed': '失败',
}

// 从dataList中提取所有的媒体信息
const mediaList = computed(() => {
  return dataList.value.map(item => item.media)
})

// 根据媒体信息获取对应的整理任务
const activeTasks = computed(() => {
  return dataList.value.find(item => item.media.title_year === activeTab.value)?.tasks
})

// 调用API获取队列信息
async function get_transfer_queue() {
  try {
    dataList.value = await api.get('transfer/queue')
    if (dataList.value.length > 0) {
      activeTab.value = dataList.value[0].media.title_year || ''
    }
  } catch (error) {
    console.error(error)
  }
}

// 移除队列任务
async function remove_queue_task(fileitem: FileItem) {
  try {
    await api.delete(`transfer/queue`, { data: { fileitem } })
    get_transfer_queue()
  } catch (error) {
    console.error(error)
  }
}

// 使用SSE监听加载进度
function startLoadingProgress() {
  progressText.value = '请稍候 ...'
  progressEventSource.value = new EventSource(`${import.meta.env.VITE_API_BASE_URL}system/progress/filetransfer`)
  progressEventSource.value.onmessage = event => {
    const progress = JSON.parse(event.data)
    if (progress) {
      if (!progress.enable) return
      progressText.value = progress.text
      progressValue.value = progress.value
      if (progress.value === 100 && refreshFlag.value) {
        refreshFlag.value = false
        get_transfer_queue()
      } else {
        refreshFlag.value = true
      }
    }
  }
}

// 停止监听加载进度
function stopLoadingProgress() {
  progressEventSource.value?.close()
}

onMounted(() => {
  get_transfer_queue()
  startLoadingProgress()
})

onUnmounted(() => {
  stopLoadingProgress()
})
</script>

<template>
  <VDialog scrollable max-width="50rem" :fullscreen="!display.mdAndUp.value">
    <VCard class="mx-auto" width="100%">
      <VCardItem>
        <VCardTitle>整理队列</VCardTitle>
      </VCardItem>
      <DialogCloseBtn @click="emit('close')" />
      <VCardText v-if="dataList.length > 0 && progressValue > 0" class="text-center">
        <VProgressLinear :value="progressValue" color="primary" rounded indeterminate />
        <span class="mt-2">{{ progressText }}</span>
      </VCardText>
      <VCardText v-if="dataList.length === 0" class="text-center"> 没有正在整理的任务 </VCardText>
      <VCardText>
        <VTabs v-model="activeTab" show-arrows class="v-tabs-pill">
          <VTab
            v-for="media in mediaList"
            :value="media.title_year"
            selected-class="v-slide-group-item--active v-tab--selected"
          >
            {{ media.title_year }}
          </VTab>
        </VTabs>
        <VWindow v-model="activeTab" class="mt-5 disable-tab-transition" :touch="false">
          <VWindowItem v-for="media in mediaList" :value="media.title_year">
            <VList>
              <VListItem v-for="task in activeTasks">
                <VListItemTitle>{{ task.fileitem.name }}</VListItemTitle>
                <VListItemSubtitle>
                  {{ formatFileSize(task.fileitem.size || 0) }} {{ stateDict[task.state] }}
                </VListItemSubtitle>
                <template #append>
                  <IconBtn color="error" size="small" icon="mdi-close" @click="remove_queue_task(task.fileitem)" />
                </template>
              </VListItem>
            </VList>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </VDialog>
</template>
