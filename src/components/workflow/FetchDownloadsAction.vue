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
            <VIcon icon="mdi-progress-download" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>获取下载任务</VCardTitle>
        <VCardSubtitle>获取下载队列中的任务状态</VCardSubtitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VSwitch v-model="data.loop" label="循环执行" />
          </VCol>
          <VCol cols="12">
            <VTextField
              v-model="data.loop_interval"
              :disabled="!data.loop"
              type="number"
              label="循环间隔 (秒)"
              outlined
              dense
              clearable
            />
          </VCol>
        </VRow>
      </VCardText>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
