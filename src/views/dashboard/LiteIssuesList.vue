<script setup lang="ts">
const props = defineProps<{ issues: string[] }>()
const visibleIssues = computed(() => props.issues.slice(0, 10))
</script>

<template>
  <VCard variant="outlined">
    <VCardItem title="当前问题" />
    <VList v-if="visibleIssues.length" density="compact">
      <VListItem v-for="issue in visibleIssues" :key="issue" :title="issue" prepend-icon="mdi-alert-circle-outline" />
    </VList>
    <VCardText v-else class="text-medium-emphasis">当前没有需要处理的问题</VCardText>
  </VCard>
</template>
