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
            <VIcon icon="mdi-rss" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>获取RSS资源</VCardTitle>
        <VCardSubtitle>订阅RSS地址获取资源</VCardSubtitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VTextField v-model="data.url" label="RSS地址" outlined dense clearable />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="data.ua" label="User-Agent" outlined dense clearable />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="data.timeout" type="number" label="超时时间" outlined dense clearable />
          </VCol>
          <VCol cols="12">
            <VSwitch v-model="data.proxy" label="使用代理" />
          </VCol>
        </VRow>
      </VCardText>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
