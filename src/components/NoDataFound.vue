<script setup lang="ts">
import image from '@images/no-data.svg'

const props = defineProps<Props>()

interface Props {
  errorCode?: string
  errorTitle?: string
  errorDescription?: string
  size?: number
}
</script>

<template>
  <div class="no-data-container">
    <VEmptyState :image="image" :size="props.size || 'auto'">
      <template #title>
        <div class="mt-8 text-2xl">
          {{ props.errorTitle }}
        </div>
      </template>

      <template #text>
        <div class="text-subtitle mt-3">
          {{ props.errorDescription }}
        </div>
      </template>

      <template #actions>
        <slot name="button" />
      </template>
    </VEmptyState>
  </div>
</template>

<style scoped>
.no-data-container {
  width: 100%;
}
.no-data-container :deep(.v-empty-state) {
  width: 100%;
  max-width: 100%;
}
.no-data-container :deep(.v-empty-state__media) {
  width: 100%;
  max-width: 100%;
}
.no-data-container :deep(.v-responsive) {
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
  height: auto !important;
}

/* 移动响应式设计 */
@media (max-width: 768px) {
  .no-data-container :deep(.v-responsive) {
    max-width: 350px;
  }
}

@media (max-width: 480px) {
  .no-data-container :deep(.v-responsive) {
    max-width: 250px;
  }
}
</style>

