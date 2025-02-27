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
    <VCardItem prepend-icon="mdi-star-check">
      <VCardTitle>添加订阅</VCardTitle>
      <VCardSubtitle>根据媒体列表添加订阅</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText></VCardText>
  </VCard>
</template>
