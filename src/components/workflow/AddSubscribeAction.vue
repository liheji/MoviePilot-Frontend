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
  <VCard>
    <Handle id="edge_in" type="target" :position="Position.Left" />
    <VCardItem>
      <template v-slot:prepend>
        <VAvatar>
          <VIcon icon="mdi-star-check" size="x-large"></VIcon>
        </VAvatar>
      </template>
      <VCardTitle>添加订阅</VCardTitle>
      <VCardSubtitle>根据媒体列表添加订阅</VCardSubtitle>
    </VCardItem>
    <Handle id="edge_out" type="source" :position="Position.Right" />
  </VCard>
</template>
