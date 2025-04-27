<script setup lang="ts">
import { ref } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import type { ThemeSwitcherTheme } from '@layouts/types'
import api from '@/api'
import { checkPrefersColorSchemeIsDark } from '@/@core/utils'
import { useToast } from 'vue-toast-notification'
import { saveLocalTheme } from '../utils/theme'
import { useI18n } from 'vue-i18n'

// 显示器宽度
const display = useDisplay()

const props = defineProps<{
  themes: ThemeSwitcherTheme[]
}>()

const { name: themeName, global: globalTheme } = useTheme()

const savedTheme = ref(localStorage.getItem('theme') ?? themeName)

const currentThemeName = ref(savedTheme.value)
const getNextThemeName = () => {
  const currentIndex = props.themes.findIndex(t => t.name === currentThemeName.value)
  const nextIndex = (currentIndex + 1) % props.themes.length
  return props.themes[nextIndex].name
}

const $toast = useToast()

const { t } = useI18n()

// 自定义CSS弹窗
const cssDialog = ref(false)

// 自定义 CSS
const customCSS = ref('')

// 编辑器主题
const editorTheme = computed(() => (currentThemeName.value === 'light' ? 'github' : 'monokai'))

// 更新主题
function updateTheme() {
  const autoTheme = checkPrefersColorSchemeIsDark() ? 'dark' : 'light'
  const theme = currentThemeName.value === 'auto' ? autoTheme : currentThemeName.value
  globalTheme.name.value = theme
  // 保存原始主题设置，而不是计算后的值
  savedTheme.value = currentThemeName.value
  // 保存主题到本地
  saveLocalTheme(currentThemeName.value, globalTheme)
  // 刷新页面
  location.reload()
}

// 切换主题
function changeTheme(theme: string) {
  let nextTheme = theme
  if (!theme) nextTheme = getNextThemeName()
  currentThemeName.value = nextTheme
  // 保存主题到服务端
  try {
    api.post('/user/config/Layout', {
      theme: nextTheme,
    })
  } catch (e) {
    console.error(e)
  }
}

// 监听系统主题变化
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme)
} catch (e) {
  console.error('当前设备不支持监听系统主题变化')
}

// 查询当前主题的图标
const getThemeIcon = computed(() => {
  const theme = props.themes.find(t => t.name === currentThemeName.value)
  return theme?.icon ?? 'mdi-circle'
})

// 监听设置主题变化
watch(
  () => currentThemeName.value,
  () => updateTheme(),
)

// 获取自定义 CSS
async function getCustomCSS() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/UserCustomCSS')
    if (result && result.success && result.data?.value) {
      customCSS.value = result.data?.value ?? ''
      if (customCSS.value) {
        const style = document.createElement('style')
        style.innerHTML = result.data?.value ?? ''
        document.head.appendChild(style)
      }
    }
  } catch (error) {
    console.error(error)
  }
}

// 保存自定义 CSS
async function saveCustomCSS() {
  cssDialog.value = false
  try {
    const result: { [key: string]: any } = await api.post('system/setting/UserCustomCSS', customCSS.value, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })

    if (result.success) $toast.success('自定义CSS保存成功，请刷新页面生效！')
  } catch (e) {
    console.error('保存自定义 CSS 到服务端失败')
  }
}

onMounted(() => {
  getCustomCSS()
})
</script>

<template>
  <VMenu v-if="props.themes" class="theme-menu" scrim>
    <template v-slot:activator="{ props }">
      <IconBtn v-bind="props">
        <VIcon :icon="getThemeIcon" />
      </IconBtn>
    </template>
    <VList>
      <div class="px-2">
        <VListItem
          v-for="theme in props.themes"
          :key="theme.name"
          @click="changeTheme(theme.name)"
          :active="currentThemeName === theme.name"
          class="mb-1"
        >
          <template #prepend>
            <VIcon :icon="theme.icon" />
          </template>
          <VListItemTitle>{{ theme.title }}</VListItemTitle>
          <template #append v-if="currentThemeName === theme.name">
            <VIcon icon="mdi-check" color="primary" size="small" />
          </template>
        </VListItem>
        <VDivider class="my-2" />
        <VListItem @click="cssDialog = true">
          <template #prepend>
            <VIcon icon="mdi-palette" />
          </template>
          <VListItemTitle>{{ t('theme.custom') }}</VListItemTitle>
        </VListItem>
      </div>
    </VList>
  </VMenu>
  <!-- 自定义 CSS -- -->
  <VDialog v-if="cssDialog" v-model="cssDialog" max-width="50rem" scrollable :fullscreen="!display.mdAndUp.value">
    <VCard>
      <VCardItem>
        <VCardTitle>
          <VIcon icon="mdi-palette" class="me-2" />
          自定义主题风格
        </VCardTitle>
        <VDialogCloseBtn @click="cssDialog = false" />
      </VCardItem>
      <VDivider />
      <VAceEditor v-model:value="customCSS" lang="css" :theme="editorTheme" class="w-full min-h-[30rem]" />
      <VDivider />
      <VCardText class="text-center">
        <VBtn @click="saveCustomCSS" class="w-1/2">
          <template #prepend>
            <VIcon icon="mdi-content-save" />
          </template>
          保存
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>
