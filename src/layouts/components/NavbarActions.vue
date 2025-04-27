<script setup lang="ts">
import type { ThemeSwitcherTheme } from '@layouts/types'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '@/@core/components/LocaleSwitcher.vue'

const { t } = useI18n()

const themes: ThemeSwitcherTheme[] = [
  {
    name: 'auto',
    title: t('theme.auto'),
    icon: 'mdi-laptop',
  },
  {
    name: 'light',
    title: t('theme.light'),
    icon: 'mdi-weather-sunny',
  },
  {
    name: 'dark',
    title: t('theme.dark'),
    icon: 'mdi-weather-night',
  },
  {
    name: 'purple',
    title: t('theme.purple'),
    icon: 'mdi-brightness-4',
  },
  {
    name: 'transparent',
    title: t('theme.transparent'),
    icon: 'mdi-gradient-horizontal',
  },
]
</script>

<template>
  <div class="d-flex align-center">
    <!-- 语言切换 -->
    <LocaleSwitcher class="me-2" />

    <!-- 主题切换 -->
    <ThemeSwitcher :themes="themes" />
  </div>
</template>
