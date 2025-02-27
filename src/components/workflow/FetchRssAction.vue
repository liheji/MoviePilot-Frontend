<script setup lang="ts">
const props = defineProps({
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
    <VCardItem prepend-icon="mdi-rss-box">
      <VCardTitle>获取RSS资源</VCardTitle>
      <VCardSubtitle>请求RSS地址获取数据，并解析为资源列表</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText></VCardText>
  </VCard>
</template>
