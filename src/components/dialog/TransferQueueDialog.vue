<script lang="ts" setup>
import api from '@/api'
import { TransferQueue } from '@/api/types'
import { useDisplay } from 'vuetify'
import { VProgressLinear } from 'vuetify/lib/components/index.mjs'

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

// 调用API获取队列信息
async function get_transfer_queue() {
  try {
    dataList.value = await api.get('transfer/queue')
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
        <VCardTitle>整理任务队列</VCardTitle>
      </VCardItem>
      <VDivider />
      <DialogCloseBtn @click="emit('close')" />

      <VCardText v-if="dataList.length === 0" class="text-center"> 没有正在整理的任务 </VCardText>
      <VCardText v-else>
        <VProgressLinear v-if="progressValue > 0" :value="progressValue" color="primary" rounded indeterminate>
          {{ progressText }}
        </VProgressLinear>
      </VCardText>
    </VCard>
  </VDialog>
</template>
