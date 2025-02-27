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
  <VCard max-width="20rem">
    <Handle id="edge_in" type="target" :position="Position.Left" />
    <VCardItem>
      <template v-slot:prepend>
        <VAvatar>
          <VIcon icon="mdi-file-move" size="x-large"></VIcon>
        </VAvatar>
      </template>
      <VCardTitle>整理文件</VCardTitle>
      <VCardSubtitle>转移和重命名文件</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText></VCardText>
    <Handle id="edge_out" type="source" :position="Position.Right" />
  </VCard>
</template>
