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
    <VCardItem prepend-icon="mdi-search-web">
      <VCardTitle>搜索站点资源</VCardTitle>
      <VCardSubtitle>根据关键字搜索站点种子资源</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText></VCardText>
  </VCard>
</template>
