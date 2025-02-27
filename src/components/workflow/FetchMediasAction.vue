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
    <VCardItem prepend-icon="mdi-multimedia">
      <VCardTitle>获取媒体数据</VCardTitle>
      <VCardSubtitle>获取榜单等媒体数据列表</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText></VCardText>
  </VCard>
</template>
