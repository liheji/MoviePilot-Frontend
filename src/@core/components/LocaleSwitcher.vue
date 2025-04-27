<script setup lang="ts">
import { SUPPORTED_LOCALES, SupportedLocale } from '@/types/i18n'
import { setI18nLanguage, getCurrentLocale } from '@/plugins/i18n'

// 当前语言
const currentLocale = ref<SupportedLocale>(getCurrentLocale())

// 支持的语言列表
const locales = computed(() => {
  return Object.entries(SUPPORTED_LOCALES).map(([key, locale]) => ({
    value: key as SupportedLocale,
    title: locale.title,
    flag: locale.flag,
    icon: `flag-${key.split('-')[0]}`,
  }))
})

// 切换语言
async function changeLocale(locale: SupportedLocale) {
  try {
    await setI18nLanguage(locale)
    currentLocale.value = locale
    // 刷新页面
    window.location.reload()
  } catch (error) {
    console.error(error)
  }
}

// 获取当前语言图标
const getCurrentIcon = computed(() => {
  const locale = locales.value.find(l => l.value === currentLocale.value)
  return locale?.flag || '🌐'
})
</script>

<template>
  <VMenu class="locale-menu" scrim>
    <template v-slot:activator="{ props }">
      <IconBtn v-bind="props">
        <span class="text-xl">{{ getCurrentIcon }}</span>
      </IconBtn>
    </template>
    <VList>
      <div class="px-2">
        <VListItem
          v-for="locale in locales"
          :key="locale.value"
          @click="changeLocale(locale.value)"
          :active="currentLocale === locale.value"
          class="mb-1"
        >
          <template #prepend>
            <span class="text-xl me-2">{{ locale.flag }}</span>
          </template>
          <VListItemTitle>{{ locale.title }}</VListItemTitle>
          <template #append v-if="currentLocale === locale.value">
            <VIcon icon="mdi-check" color="primary" size="small" />
          </template>
        </VListItem>
      </div>
    </VList>
  </VMenu>
</template>
