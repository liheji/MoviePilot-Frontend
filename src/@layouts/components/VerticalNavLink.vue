<script lang="ts" setup>
import type { NavLink } from '@layouts/types'

// 定义类型必须使用vuetify中正确导出的类型
const props = defineProps<{
  item: NavLink
}>()
</script>

<template>
  <li
    class="nav-link"
    :class="{ disabled: item.disable }"
  >
    <Component
      :is="item.to ? 'RouterLink' : 'a'"
      :to="item.to"
      :href="item.href"
      class="link-wrapper"
    >
      <VIcon
        v-if="item.icon != null"
        :icon="item.icon?.toString()"
        size="20"
        class="nav-item-icon"
      />
      <span class="nav-item-title">
        {{ item.title }}
      </span>
    </Component>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-link {
    margin: 1px 16px;
    position: relative;
    
    &.disabled {
      opacity: 0.6;
      pointer-events: none;
    }
    
    .router-link-active {
      background-color: rgb(var(--v-theme-primary));
      position: relative;
      border-radius: 6px;
      
      .nav-item-icon,
      .nav-item-title {
        color: white;
      }
    }
    
    a, .link-wrapper {
      display: flex;
      align-items: center;
      border-radius: 6px;
      cursor: pointer;
      padding: 8px 10px;
      transition: background-color 0.2s ease;
      position: relative;
      
      &:hover:not(.router-link-active) {
        background-color: rgba(var(--v-theme-on-surface), 0.05);
      }
    }
  }
  
  .nav-item-icon {
    color: rgba(var(--v-theme-on-surface), 0.75);
    margin-right: 8px;
    min-width: 20px;
  }
  
  .nav-item-title {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(var(--v-theme-on-surface), 0.85);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>