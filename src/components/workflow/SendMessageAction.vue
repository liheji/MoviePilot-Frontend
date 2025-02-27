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
          <VIcon icon="mdi-message-arrow-right" size="x-large"></VIcon>
        </VAvatar>
      </template>
      <VCardTitle>发送消息</VCardTitle>
      <VCardSubtitle>发送特定消息</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText></VCardText>
    <Handle id="edge_out" type="source" :position="Position.Right" />
  </VCard>
</template>
