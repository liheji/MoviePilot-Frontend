<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  status: 'loading' | 'ready' | 'empty' | 'error'
  summary: string
}>()
</script>

<template>
  <VCard class="lite-status-panel" variant="outlined">
    <VCardItem>
      <template #prepend>
        <VIcon :icon="icon" />
      </template>
      <VCardTitle>{{ title }}</VCardTitle>
    </VCardItem>
    <VCardText>
      <VProgressLinear v-if="status === 'loading'" indeterminate color="primary" class="mb-3" />
      <div class="text-body-2">{{ summary }}</div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.lite-status-panel { min-block-size: 132px; }
</style>
