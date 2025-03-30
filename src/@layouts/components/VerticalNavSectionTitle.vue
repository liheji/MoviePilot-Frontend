<script lang="ts" setup>
import type { NavSectionTitle } from '@layouts/types'

defineProps<{
  item: NavSectionTitle
}>()
</script>

<template>
  <li class="nav-section-title">
    <div class="title-text">{{ item.heading }}</div>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-section-title {
    margin: 16px 16px 6px 16px;
    position: relative;
    
    .title-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: rgb(var(--v-theme-primary));
      padding-left: 0;
    }
  }
}
</style>
