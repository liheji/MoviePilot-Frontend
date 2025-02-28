<script setup lang="ts">
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

// 来源下拉框
const sourceOptions = ref([
  {
    title: '文件列表',
    value: 'files',
  },
  {
    title: '下载任务',
    value: 'downloads',
  },
])
</script>
<template>
  <div>
    <VCard max-width="20rem">
      <Handle id="edge_in" type="target" :position="Position.Left" />
      <VCardItem>
        <template v-slot:prepend>
          <VAvatar>
            <VIcon icon="mdi-file-move" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>整理文件</VCardTitle>
        <VCardSubtitle>整理重命名队列中的文件</VCardSubtitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VSelect v-model="data.source" label="来源" :items="sourceOptions" outlined dense />
          </VCol>
        </VRow>
      </VCardText>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
