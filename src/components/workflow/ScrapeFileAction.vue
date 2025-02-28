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
</script>
<template>
  <div>
    <VCard max-width="20rem">
      <Handle id="edge_in" type="target" :position="Position.Left" />
      <VCardItem>
        <template v-slot:prepend>
          <VAvatar>
            <VIcon icon="mdi-file-find" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>刮削文件</VCardTitle>
        <VCardSubtitle>刮削媒体信息和图片</VCardSubtitle>
      </VCardItem>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
