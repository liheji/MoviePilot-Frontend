<script setup lang="ts">
import type { ThemeSwitcherTheme } from '@layouts/types'

const themes: ThemeSwitcherTheme[] = [
  {
    name: 'auto',
    title: '跟随系统',
    icon: 'mdi-laptop',
  },
  {
    name: 'light',
    title: '明亮',
    icon: 'mdi-weather-sunny',
  },
  {
    name: 'dark',
    title: '暗黑',
    icon: 'mdi-weather-night',
  },
  {
    name: 'purple',
    title: '幻紫',
    icon: 'mdi-brightness-4',
  },
  {
    name: 'transparent',
    title: '透明',
    icon: 'mdi-gradient-horizontal',
  },
]
</script>

<template>
  <ThemeSwitcher :themes="themes" />
</template>
