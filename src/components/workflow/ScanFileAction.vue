<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { storageOptions } from '@/api/constants'

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
</script>
<template>
  <div>
    <VCard max-width="20rem">
      <Handle id="edge_in" type="target" :position="Position.Left" />
      <VCardItem>
        <template v-slot:prepend>
          <VAvatar>
            <VIcon icon="mdi-folder-search" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>扫描目录</VCardTitle>
        <VCardSubtitle>扫描目录文件到队列</VCardSubtitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VSelect v-model="data.storage" label="存储" :items="storageOptions" outlined dense />
          </VCol>
          <VCol cols="12">
            <VPathField v-model="data.directory" :storage="data.storage" label="目录" clearable />
          </VCol>
        </VRow>
      </VCardText>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
