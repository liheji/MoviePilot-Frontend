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
    <VCardItem prepend-icon="mdi-message-arrow-right">
      <VCardTitle>发送消息</VCardTitle>
      <VCardSubtitle>发送特定消息</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText></VCardText>
  </VCard>
</template>
