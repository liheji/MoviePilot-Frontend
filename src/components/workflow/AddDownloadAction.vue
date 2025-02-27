<script setup lang="ts">
import api from '@/api'
import { DownloaderConf } from '@/api/types'
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
})

// 下载器选项
const downloaderOptions = ref<{ title: string; value: string }[]>([])

// 加载所有下载器
async function loadDownloaderSetting() {
  try {
    const downloaders: DownloaderConf[] = await api.get('download/clients')
    downloaderOptions.value = [
      { title: '默认', value: '' },
      ...downloaders.map((item: { name: any }) => ({
        title: item.name,
        value: item.name,
      })),
    ]
  } catch (error) {
    console.error('加载下载器设置失败:', error)
  }
}

onMounted(() => {
  loadDownloaderSetting()
})
</script>
<template>
  <VCard max-width="20rem">
    <Handle id="edge_in" type="target" :position="Position.Left" />
    <VCardItem>
      <template v-slot:prepend>
        <VAvatar>
          <VIcon icon="mdi-download-box-outline" size="x-large"></VIcon>
        </VAvatar>
      </template>
      <VCardTitle>添加下载</VCardTitle>
      <VCardSubtitle>根据资源列表添加下载任务</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText>
      <VRow>
        <VCol cols="12">
          <VSelect v-model="data.downloader" :items="downloaderOptions" label="下载器" outlined dense />
        </VCol>
        <VCol cols="12">
          <VTextField v-model="data.save_path" label="保存路径" outlined dense clearable placeholder="留空自动" />
        </VCol>
      </VRow>
    </VCardText>
    <Handle id="edge_out" type="source" :position="Position.Right" />
  </VCard>
</template>
