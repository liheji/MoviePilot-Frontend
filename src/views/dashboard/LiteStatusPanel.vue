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
    <VCardItem class="py-3">
      <template #prepend>
        <VIcon :icon="icon" />
      </template>
      <VCardTitle class="lite-status-panel__title">{{ title }}</VCardTitle>
    </VCardItem>
    <VCardText class="pt-0 pb-3">
      <VProgressLinear v-if="status === 'loading'" indeterminate color="primary" class="mb-3" />
      <div class="lite-status-panel__summary text-body-2">{{ summary }}</div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.lite-status-panel { min-block-size: 96px; }
.lite-status-panel__title,
.lite-status-panel__summary { color: rgb(var(--v-theme-on-surface)); }
.lite-status-panel__summary { opacity: .78; }
</style>
