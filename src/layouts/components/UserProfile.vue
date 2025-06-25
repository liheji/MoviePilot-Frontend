<script setup lang="ts">
import { useToast } from 'vue-toastification'
import router from '@/router'
import avatar1 from '@images/avatars/avatar-1.png'
import api from '@/api'
import ProgressDialog from '@/components/dialog/ProgressDialog.vue'
import UserAuthDialog from '@/components/dialog/UserAuthDialog.vue'
import { useAuthStore, useUserStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { useDisplay, useTheme } from 'vuetify'
import { SUPPORTED_LOCALES, SupportedLocale } from '@/types/i18n'
import { checkPrefersColorSchemeIsDark } from '@/@core/utils'
import { getCurrentLocale, setI18nLanguage } from '@/plugins/i18n'
import { saveLocalTheme } from '@/@core/utils/theme'
import type { ThemeSwitcherTheme } from '@layouts/types'
import { useConfirm } from '@/composables/useConfirm'

// 认证 Store
const authStore = useAuthStore()
// 用户 Store
const userStore = useUserStore()
// 国际化
const { t } = useI18n()
// 显示器
const display = useDisplay()

// 提示框
const $toast = useToast()

// 进度框
const progressDialog = ref(false)

// 站点认证对话框
const siteAuthDialog = ref(false)

// 自定义CSS弹窗
const cssDialog = ref(false)

// 主题菜单是否显示
const showThemeMenu = ref(false)

// 语言菜单是否显示
const showLanguageMenu = ref(false)

// 自定义CSS
const customCSS = ref('')

// 重启轮询控制标识
const restartPollingId = ref<number | null>(null)
const isRestarting = ref(false)

// 确认框
const { createConfirm } = useConfirm()

// 执行注销操作
function logout() {
  // 清理重启相关状态
  isRestarting.value = false
  if (restartPollingId.value) {
    clearTimeout(restartPollingId.value)
    restartPollingId.value = null
  }

  // 清除登录状态信息
  authStore.logout()
  userStore.reset()
  // 重定向到登录页面或其他适当的页面
  router.push('/login')
}

// 检测服务状态
async function checkServiceStatus(): Promise<boolean> {
  try {
    const result: { [key: string]: any } = await api.get('system/env', { timeout: 3000 })
    return result?.success === true
  } catch (error) {
    return false
  }
}

// 轮询检测服务恢复状态
async function pollServiceStatus() {
  // 如果已经有轮询在运行，先清除
  if (restartPollingId.value) {
    clearTimeout(restartPollingId.value)
    restartPollingId.value = null
  }

  // 最大重试次数（约3分钟）
  const maxRetries = 60
  let retryCount = 0

  const poll = async () => {
    // 如果不在重启状态，停止轮询
    if (!isRestarting.value) {
      return
    }

    retryCount++
    const isServiceUp = await checkServiceStatus()

    if (isServiceUp) {
      // 服务已恢复，清理状态并执行注销
      isRestarting.value = false
      progressDialog.value = false
      restartPollingId.value = null

      setTimeout(() => {
        logout()
      }, 1000)
      return
    }

    if (retryCount >= maxRetries) {
      // 超时未恢复，清理状态并提示用户
      isRestarting.value = false
      progressDialog.value = false
      restartPollingId.value = null
      $toast.error(t('app.restartTimeout'))
      return
    }

    // 继续轮询，每3秒检测一次
    restartPollingId.value = setTimeout(poll, 3000) as unknown as number
  }

  // 开始轮询
  poll()
}

// 执行重启操作
async function restart() {
  // 设置重启状态
  isRestarting.value = true

  // 调用API重启
  try {
    // 显示等待框
    progressDialog.value = true
    const result: { [key: string]: any } = await api.get('system/restart')
    if (!result?.success) {
      // 重启失败，清理状态
      isRestarting.value = false
      progressDialog.value = false
      $toast.error(result.message)
      return
    }
  } catch (error) {
    // 重启失败，清理状态
    isRestarting.value = false
    progressDialog.value = false
    console.error(error)
    return
  }

  // 重启请求成功，开始轮询检测服务状态
  setTimeout(() => {
    pollServiceStatus()
  }, 5000)
}

// 显示重启确认对话框
async function showRestartDialog() {
  const isConfirmed = await createConfirm({
    type: 'warn',
    title: t('app.confirmRestart'),
    content: t('app.restartTip'),
  })

  if (!isConfirmed) return

  await restart()
}

// 显示站点认证对话框
function showSiteAuthDialog() {
  siteAuthDialog.value = true
}

// 用户站点认证成功
function siteAuthDone() {
  siteAuthDialog.value = false
  logout()
}

// 从用户 Store中获取信息
const superUser = computed(() => userStore.superUser)
const userName = computed(() => userStore.userName)
const avatar = computed(() => userStore.avatar || avatar1)
const userLevel = computed(() => userStore.level)

// 主题相关功能
const { name: themeName, global: globalTheme } = useTheme()
const savedTheme = ref(localStorage.getItem('theme') ?? themeName)
const currentThemeName = ref(savedTheme.value)

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
  currentThemeName.value = theme
  showThemeMenu.value = false
  // 保存主题到服务端
  try {
    api.post('/user/config/Layout', {
      theme,
    })
  } catch (e) {
    console.error(e)
  }
}

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

    if (result.success) $toast.success(t('theme.customCssSaveSuccess'))
  } catch (e) {
    console.error(t('theme.customCssSaveFailed'))
  }
}

// 监听主题变化
watch(
  () => currentThemeName.value,
  () => updateTheme(),
)

// 监听系统主题变化
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme)
} catch (e) {
  console.error(t('theme.deviceNotSupport'))
}

// 语言相关功能
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
  showLanguageMenu.value = false
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

// 获取当前主题图标
const getThemeIcon = computed(() => {
  const theme = themes.find(t => t.name === currentThemeName.value)
  return theme?.icon || 'mdi-laptop'
})

onMounted(() => {
  getCustomCSS()
})

// 组件卸载时清理轮询
onUnmounted(() => {
  // 清理重启轮询
  if (restartPollingId.value) {
    clearTimeout(restartPollingId.value)
    restartPollingId.value = null
  }
  isRestarting.value = false
})
</script>

<template>
  <VAvatar class="cursor-pointer ms-3 border" color="primary" variant="tonal">
    <VImg :src="avatar" />

    <VMenu
      activator="parent"
      width="15rem"
      location="bottom end"
      offset="14px"
      class="user-menu"
      :close-on-content-click="true"
      scrim
    >
      <VList class="pt-0">
        <!-- 👉 User Avatar & Name -->
        <VListItem class="py-4" bg-color="primary" bg-opacity="0.05">
          <template #prepend>
            <VAvatar size="60" color="primary" rounded="sm" class="border-2 border-opacity-10">
              <VImg :src="avatar" />
            </VAvatar>
          </template>
          <div>
            <span class="text-primary text-sm font-medium d-block">
              {{ superUser ? t('user.admin') : t('user.normal') }}
            </span>
            <span class="text-high-emphasis text-lg font-weight-bold">
              {{ userName }}
            </span>
          </div>
        </VListItem>
        <VDivider class="mb-2" />
        <div class="px-2">
          <!-- 👉 Profile -->
          <VListItem link @click="router.push('/profile')" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-account-outline" />
            </template>
            <VListItemTitle>{{ t('user.profile') }}</VListItemTitle>
          </VListItem>

          <VListItem v-if="superUser" link @click="router.push('/setting')" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-cog-outline" />
            </template>
            <VListItemTitle>{{ t('user.systemSettings') }}</VListItemTitle>
          </VListItem>

          <!-- 👉 Site Auth -->
          <VListItem v-if="userLevel < 2 && superUser" link @click="showSiteAuthDialog" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-lock-check-outline" />
            </template>
            <VListItemTitle>{{ t('user.siteAuth') }}</VListItemTitle>
          </VListItem>

          <!-- 👉 主题设置 - 使用嵌套菜单 -->
          <VMenu location="end" offset-x min-width="200" v-model="showThemeMenu" :close-on-content-click="true">
            <template v-slot:activator="{ props: menuProps }">
              <VListItem v-bind="menuProps" class="mb-1 rounded-lg" hover>
                <template #prepend>
                  <VIcon :icon="getThemeIcon" />
                </template>
                <VListItemTitle>
                  {{ themes.find(t => t.name === currentThemeName)?.title || t('common.theme') }}
                </VListItemTitle>
                <template #append>
                  <VIcon icon="mdi-chevron-right" size="small" />
                </template>
              </VListItem>
            </template>
            <VList>
              <VListItem
                v-for="theme in themes"
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
              <VListItem @click="cssDialog = true">
                <template #prepend>
                  <VIcon icon="mdi-palette" />
                </template>
                <VListItemTitle>{{ t('theme.custom') }}</VListItemTitle>
              </VListItem>
            </VList>
          </VMenu>

          <!-- 👉 语言设置 - 使用嵌套菜单 -->
          <VMenu location="end" offset-x min-width="200" v-model="showLanguageMenu" :close-on-content-click="true">
            <template v-slot:activator="{ props: menuProps }">
              <VListItem v-bind="menuProps" class="mb-1 rounded-lg" hover>
                <template #prepend>
                  <span class="me-4">{{ getCurrentIcon }}</span>
                </template>
                <VListItemTitle>
                  {{ locales.find(l => l.value === currentLocale)?.title || t('common.language') }}
                </VListItemTitle>
                <template #append>
                  <VIcon icon="mdi-chevron-right" size="small" />
                </template>
              </VListItem>
            </template>
            <VList>
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
            </VList>
          </VMenu>

          <!-- 👉 FAQ -->
          <VListItem href="https://wiki.movie-pilot.org" target="_blank" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-help-circle-outline" />
            </template>
            <VListItemTitle>{{ t('user.helpDocs') }}</VListItemTitle>
          </VListItem>

          <!-- Divider -->
          <VDivider v-if="superUser" class="my-3" />

          <!-- 👉 restart -->
          <VListItem v-if="superUser" @click="showRestartDialog" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-restart" />
            </template>
            <VListItemTitle>{{ t('user.restart') }}</VListItemTitle>
          </VListItem>
        </div>
        <!-- 👉 Logout -->
        <div class="px-2 mt-3 mb-2">
          <VBtn color="error" block class="py-3" elevation="2" @click="logout">
            <template #prepend>
              <VIcon icon="mdi-logout" />
            </template>
            {{ t('app.logout') }}
          </VBtn>
        </div>
      </VList>
    </VMenu>
    <!-- !SECTION -->
  </VAvatar>

  <!-- 重启进度框 -->
  <ProgressDialog v-if="progressDialog" v-model="progressDialog" :text="t('app.restarting')" />
  <!-- 用户认证对话框 -->
  <UserAuthDialog v-if="siteAuthDialog" v-model="siteAuthDialog" @done="siteAuthDone" @close="siteAuthDialog = false" />
  <!-- 自定义 CSS -->
  <VDialog v-if="cssDialog" v-model="cssDialog" max-width="50rem" scrollable :fullscreen="!display.mdAndUp.value">
    <VCard>
      <VCardItem>
        <VCardTitle>
          <VIcon icon="mdi-palette" class="me-2" />
          {{ t('theme.custom') }}
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
          {{ t('common.save') }}
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-list-item__prepend {
  min-inline-size: 24px !important;
}
</style>
