<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useI18n } from 'vue-i18n'
import { copyToClipboard } from '@/@core/utils/navigator'

const { t } = useI18n()
const router = useRouter()
const $toast = useToast()

// 当前步骤
const currentStep = ref(1)
const totalSteps = 6

// 选中的预设规则
const selectedPreset = ref('')

// 向导数据
const wizardData = ref({
  // 步骤1：基础参数
  basic: {
    appDomain: '',
    apiToken: '',
    username: '',
    password: '',
    confirmPassword: '',
    proxyHost: '',
    githubToken: '',
  },
  // 步骤2：存储目录
  storage: {
    downloadPath: '',
    libraryPath: '',
    transferType: 'link',
    overwriteMode: 'never',
  },
  // 步骤3：下载器
  downloader: {
    type: '',
    name: '',
    config: {} as any,
  },
  // 步骤4：媒体服务器
  mediaServer: {
    type: '',
    name: '',
    config: {} as any,
    sync_libraries: [] as any,
  },
  // 步骤5：通知
  notification: {
    type: '',
    name: '',
    enabled: false,
    config: {} as any,
    switchs: [] as any,
  },
  // 步骤6：资源偏好
  preferences: {
    quality: '4K',
    subtitle: 'chinese',
    resolution: '2160p',
  },
})

// 步骤标题
const stepTitles = [
  t('setupWizard.step1.title'),
  t('setupWizard.step2.title'),
  t('setupWizard.step3.title'),
  t('setupWizard.step4.title'),
  t('setupWizard.step5.title'),
  t('setupWizard.step6.title'),
]

// 步骤描述
const stepDescriptions = [
  t('setupWizard.step1.description'),
  t('setupWizard.step2.description'),
  t('setupWizard.step3.description'),
  t('setupWizard.step4.description'),
  t('setupWizard.step5.description'),
  t('setupWizard.step6.description'),
]

// 密码可见性控制
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)

// 整理方式选项
const transferTypeItems = [
  { title: '硬链接', value: 'link' },
  { title: '软链接', value: 'softlink' },
  { title: '复制', value: 'copy' },
  { title: '移动', value: 'move' },
]

// 覆盖模式选项
const overwriteModeItems = [
  { title: '从不覆盖', value: 'never' },
  { title: '总是覆盖', value: 'always' },
  { title: '按文件大小', value: 'size' },
  { title: '仅保留最新', value: 'latest' },
]

// 质量偏好选项
const qualityItems = [
  { title: '4K 优先', value: '4K' },
  { title: '1080P 优先', value: '1080P' },
  { title: '720P 优先', value: '720P' },
]

// 字幕偏好选项
const subtitleItems = [
  { title: '中文字幕优先', value: 'chinese' },
  { title: '英文字幕优先', value: 'english' },
  { title: '双语字幕优先', value: 'bilingual' },
]

// 分辨率选项
const resolutionItems = [
  { title: '2160P (4K)', value: '2160p' },
  { title: '1080P', value: '1080p' },
  { title: '720P', value: '720p' },
]

// 创建随机API Token
function createRandomString() {
  const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  wizardData.value.basic.apiToken = Array.from(array, byte => charset[byte % charset.length]).join('')
}

// 复制到剪贴板
async function copyValue(value: string) {
  try {
    const success = copyToClipboard(value)
    if (await success) {
      $toast.success(t('setting.system.copySuccess'))
    } else {
      $toast.error(t('setting.system.copyFailed'))
    }
  } catch (error) {
    $toast.error(t('setting.system.copyError'))
    console.error(error)
  }
}

// 选择下载器
function selectDownloader(type: string) {
  wizardData.value.downloader.type = type
  wizardData.value.downloader.name = `${type} 下载器`
  wizardData.value.downloader.config = {}
}

// 选择媒体服务器
function selectMediaServer(type: string) {
  wizardData.value.mediaServer.type = type
  wizardData.value.mediaServer.name = `${type} 服务器`
  wizardData.value.mediaServer.config = {}
}

// 选择通知
function selectNotification(type: string) {
  wizardData.value.notification.type = type
  wizardData.value.notification.name = `${type} 通知`
  wizardData.value.notification.config = {}
}

// 选择预设规则
function selectPreset(preset: string) {
  selectedPreset.value = preset

  switch (preset) {
    case '4k':
      wizardData.value.preferences.quality = '4K'
      wizardData.value.preferences.subtitle = 'bilingual'
      wizardData.value.preferences.resolution = '2160p'
      break
    case 'balanced':
      wizardData.value.preferences.quality = '1080P'
      wizardData.value.preferences.subtitle = 'chinese'
      wizardData.value.preferences.resolution = '1080p'
      break
    case 'chinese':
      wizardData.value.preferences.quality = '1080P'
      wizardData.value.preferences.subtitle = 'chinese'
      wizardData.value.preferences.resolution = '1080p'
      break
  }
}

// 下一步
async function nextStep() {
  if (currentStep.value < totalSteps) {
    // 保存当前步骤的设置
    await saveCurrentStepSettings()

    currentStep.value++
  }
}

// 上一步
function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 保存当前步骤的设置
async function saveCurrentStepSettings() {
  try {
    switch (currentStep.value) {
      case 1:
        await saveBasicSettings()
        break
      case 2:
        await saveStorageSettings()
        break
      case 3:
        await saveDownloaderSettings()
        break
      case 4:
        await saveMediaServerSettings()
        break
      case 5:
        await saveNotificationSettings()
        break
      case 6:
        await savePreferenceSettings()
        break
    }
  } catch (error) {
    console.error('Save current step settings failed:', error)
    $toast.error(t('setupWizard.saveStepFailed'))
  }
}

// 完成向导
async function completeWizard() {
  try {
    // 验证密码一致性
    if (wizardData.value.basic.password !== wizardData.value.basic.confirmPassword) {
      $toast.error(t('user.passwordMismatch'))
      return
    }

    // 创建用户（如果还没有创建）
    await createUser()

    // 保存最后一步的设置（资源偏好）
    await savePreferenceSettings()

    $toast.success(t('setupWizard.completed'))
    router.push('/setting')
  } catch (error) {
    console.error('Setup wizard failed:', error)
    $toast.error(t('setupWizard.failed'))
  }
}

// 创建用户
async function createUser() {
  if (wizardData.value.basic.username && wizardData.value.basic.password) {
    try {
      // 检查用户是否已存在
      const response = await api.get('user/')
      const existingUsers = response.data || []
      const userExists = existingUsers.some((user: any) => user.name === wizardData.value.basic.username)

      if (!userExists) {
        const userData = {
          name: wizardData.value.basic.username,
          password: wizardData.value.basic.password,
          is_active: true,
          is_superuser: true,
        }

        await api.post('user/', userData)
      }
    } catch (error) {
      console.log('Create user failed or user already exists:', error)
    }
  }
}

// 保存基础设置
async function saveBasicSettings() {
  try {
    const basicSettings = {
      APP_DOMAIN: wizardData.value.basic.appDomain,
      API_TOKEN: wizardData.value.basic.apiToken,
      PROXY_HOST: wizardData.value.basic.proxyHost,
      GITHUB_TOKEN: wizardData.value.basic.githubToken,
    }

    const response = await api.post('system/env', basicSettings)
    if (response.data?.success) {
      $toast.success(t('setupWizard.basicSettingsSaved'))
    }
  } catch (error) {
    console.error('Save basic settings failed:', error)
    $toast.error(t('setupWizard.saveBasicSettingsFailed'))
  }
}

// 保存存储配置
async function saveStorageSettings() {
  try {
    // 创建本地存储
    const storage = {
      name: '本地存储',
      type: 'local',
      config: {},
    }

    await api.post('system/setting/Storages', [storage])

    // 创建目录配置
    const directory = {
      name: '默认目录',
      storage: 'local',
      download_path: wizardData.value.storage.downloadPath,
      library_path: wizardData.value.storage.libraryPath,
      priority: 0,
      monitor_type: 'compatibility',
      media_type: 'movie,tv',
      media_category: 'default',
      transfer_type: wizardData.value.storage.transferType,
      overwrite_mode: wizardData.value.storage.overwriteMode,
    }

    const response = await api.post('system/setting/Directories', [directory])
    if (response.data?.success) {
      $toast.success(t('setupWizard.storageSettingsSaved'))
    }
  } catch (error) {
    console.error('Save storage settings failed:', error)
    $toast.error(t('setupWizard.saveStorageSettingsFailed'))
  }
}

// 保存下载器配置
async function saveDownloaderSettings() {
  if (wizardData.value.downloader.type) {
    try {
      const downloader = {
        name: wizardData.value.downloader.name,
        type: wizardData.value.downloader.type,
        default: true,
        enabled: true,
        config: wizardData.value.downloader.config,
      }

      const response = await api.post('system/setting/Downloaders', [downloader])
      if (response.data?.success) {
        $toast.success(t('setupWizard.downloaderSettingsSaved'))
      }
    } catch (error) {
      console.error('Save downloader settings failed:', error)
      $toast.error(t('setupWizard.saveDownloaderSettingsFailed'))
    }
  }
}

// 保存媒体服务器配置
async function saveMediaServerSettings() {
  if (wizardData.value.mediaServer.type) {
    try {
      const mediaServer = {
        name: wizardData.value.mediaServer.name,
        type: wizardData.value.mediaServer.type,
        enabled: true,
        config: wizardData.value.mediaServer.config,
      }

      const response = await api.post('system/setting/MediaServers', [mediaServer])
      if (response.data?.success) {
        $toast.success(t('setupWizard.mediaServerSettingsSaved'))
      }
    } catch (error) {
      console.error('Save media server settings failed:', error)
      $toast.error(t('setupWizard.saveMediaServerSettingsFailed'))
    }
  }
}

// 保存通知配置
async function saveNotificationSettings() {
  if (wizardData.value.notification.type) {
    try {
      const notification = {
        name: wizardData.value.notification.name,
        type: wizardData.value.notification.type,
        enabled: true,
        config: wizardData.value.notification.config,
      }

      const response = await api.post('system/setting/Notifications', [notification])
      if (response.data?.success) {
        $toast.success(t('setupWizard.notificationSettingsSaved'))
      }
    } catch (error) {
      console.error('Save notification settings failed:', error)
      $toast.error(t('setupWizard.saveNotificationSettingsFailed'))
    }
  }
}

// 保存资源偏好设置
async function savePreferenceSettings() {
  try {
    // 这里可以根据偏好设置创建相应的过滤规则
    // 暂时保存到系统设置中
    const preferenceSettings = {
      QUALITY_PREFERENCE: wizardData.value.preferences.quality,
      SUBTITLE_PREFERENCE: wizardData.value.preferences.subtitle,
      RESOLUTION_PREFERENCE: wizardData.value.preferences.resolution,
    }

    const response = await api.post('system/env', preferenceSettings)
    if (response.data?.success) {
      $toast.success(t('setupWizard.preferenceSettingsSaved'))
    }
  } catch (error) {
    console.error('Save preference settings failed:', error)
    $toast.error(t('setupWizard.savePreferenceSettingsFailed'))
  }
}

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      // 加载基础设置
      if (result.data.APP_DOMAIN) {
        wizardData.value.basic.appDomain = result.data.APP_DOMAIN
      }
      if (result.data.API_TOKEN) {
        wizardData.value.basic.apiToken = result.data.API_TOKEN
      }
      if (result.data.PROXY_HOST) {
        wizardData.value.basic.proxyHost = result.data.PROXY_HOST
      }
      if (result.data.GITHUB_TOKEN) {
        wizardData.value.basic.githubToken = result.data.GITHUB_TOKEN
      }
    }
  } catch (error) {
    console.log('Load system settings failed:', error)
  }
}

// 加载存储设置
async function loadStorageSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/Directories')
    if (result.success && result.data?.value && result.data.value.length > 0) {
      const directory = result.data.value[0]
      wizardData.value.storage.downloadPath = directory.download_path || ''
      wizardData.value.storage.libraryPath = directory.library_path || ''
      wizardData.value.storage.transferType = directory.transfer_type || 'link'
      wizardData.value.storage.overwriteMode = directory.overwrite_mode || 'never'
    }
  } catch (error) {
    console.log('Load storage settings failed:', error)
  }
}

// 加载下载器设置
async function loadDownloaderSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/Downloaders')
    if (result.success && result.data?.value && result.data.value.length > 0) {
      const downloader = result.data.value[0]
      wizardData.value.downloader.type = downloader.type
      wizardData.value.downloader.name = downloader.name
      wizardData.value.downloader.config = downloader.config || {}
    }
  } catch (error) {
    console.log('Load downloader settings failed:', error)
  }
}

// 加载媒体服务器设置
async function loadMediaServerSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/MediaServers')
    if (result.success && result.data?.value && result.data.value.length > 0) {
      const mediaServer = result.data.value[0]
      wizardData.value.mediaServer.type = mediaServer.type
      wizardData.value.mediaServer.name = mediaServer.name
      wizardData.value.mediaServer.config = mediaServer.config || {}
      wizardData.value.mediaServer.sync_libraries = mediaServer.sync_libraries || []
    }
  } catch (error) {
    console.log('Load media server settings failed:', error)
  }
}

// 加载通知设置
async function loadNotificationSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/Notifications')
    if (result.success && result.data?.value && result.data.value.length > 0) {
      const notification = result.data.value[0]
      wizardData.value.notification.type = notification.type
      wizardData.value.notification.name = notification.name
      wizardData.value.notification.enabled = notification.enabled
      wizardData.value.notification.config = notification.config || {}
      wizardData.value.notification.switchs = notification.switchs || []
    }
  } catch (error) {
    console.log('Load notification settings failed:', error)
  }
}

// 加载资源偏好设置
async function loadPreferenceSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      if (result.data.QUALITY_PREFERENCE) {
        wizardData.value.preferences.quality = result.data.QUALITY_PREFERENCE
      }
      if (result.data.SUBTITLE_PREFERENCE) {
        wizardData.value.preferences.subtitle = result.data.SUBTITLE_PREFERENCE
      }
      if (result.data.RESOLUTION_PREFERENCE) {
        wizardData.value.preferences.resolution = result.data.RESOLUTION_PREFERENCE
      }
    }
  } catch (error) {
    console.log('Load preference settings failed:', error)
  }
}

// 初始化
onMounted(async () => {
  createRandomString()
  await loadSystemSettings()
  await loadStorageSettings()
  await loadDownloaderSettings()
  await loadMediaServerSettings()
  await loadNotificationSettings()
  await loadPreferenceSettings()
})
</script>

<template>
  <div class="setup-wizard-fullscreen">
    <!-- 全屏头部 -->
    <div class="setup-wizard-header">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center text-center mx-auto">
          <div>
            <h1 class="text-h3 font-weight-bold text-moviepilot mb-3">{{ t('setupWizard.title') }}</h1>
            <p class="text-body-1 text-medium-emphasis">{{ t('setupWizard.subtitle') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 向导内容 -->
    <div class="setup-wizard-content">
      <div class="setup-wizard">
        <!-- 使用 VStepper 组件 -->
        <VStepper v-model="currentStep" class="elevation-0" flat>
          <!-- 步骤标题 -->
          <VStepperHeader class="elevation-0">
            <template v-for="(step, index) in stepTitles" :key="index">
              <VStepperItem
                :value="index + 1"
                :complete="currentStep > index + 1"
                :color="currentStep >= index + 1 ? 'primary' : 'default'"
              >
                <template #title>
                  <span class="text-caption">{{ step }}</span>
                </template>
              </VStepperItem>
              <VDivider v-if="index < stepTitles.length - 1" />
            </template>
          </VStepperHeader>

          <!-- 步骤内容 -->
          <VStepperWindow>
            <!-- 步骤1：基础参数 -->
            <VStepperWindowItem :value="1">
              <VCard variant="outlined">
                <VCardText>
                  <div class="text-center mb-6">
                    <h3 class="text-h4 mb-2">{{ stepTitles[0] }}</h3>
                    <p class="text-body-1 text-medium-emphasis">{{ stepDescriptions[0] }}</p>
                  </div>
                  <VRow>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.basic.appDomain"
                        :label="t('setupWizard.basic.appDomain')"
                        :hint="t('setupWizard.basic.appDomainHint')"
                        placeholder="http://localhost:3000"
                        persistent-hint
                        prepend-inner-icon="mdi-web"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.basic.username"
                        :label="t('user.username')"
                        :hint="t('user.usernameHint')"
                        persistent-hint
                        prepend-inner-icon="mdi-account"
                        :rules="[(v: string) => !!v || t('user.usernameRequired')]"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.basic.password"
                        :type="isPasswordVisible ? 'text' : 'password'"
                        :label="t('user.password')"
                        :hint="t('user.passwordHint')"
                        persistent-hint
                        prepend-inner-icon="mdi-lock"
                        :append-inner-icon="isPasswordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                        @click:append-inner="isPasswordVisible = !isPasswordVisible"
                        :rules="[(v: string) => !!v || t('user.passwordRequired'), (v: string) => v.length >= 6 || t('user.passwordMinLength')]"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.basic.confirmPassword"
                        :type="isConfirmPasswordVisible ? 'text' : 'password'"
                        :label="t('user.confirmPassword')"
                        :hint="t('user.confirmPasswordHint')"
                        persistent-hint
                        prepend-inner-icon="mdi-lock-check"
                        :append-inner-icon="isConfirmPasswordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                        @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
                        :rules="[
                          (v: string) => !!v || t('user.confirmPasswordRequired'),
                          (v: string) => v === wizardData.basic.password || t('user.passwordMismatch')
                        ]"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.basic.proxyHost"
                        :label="t('setting.system.proxyHost')"
                        :hint="t('setting.system.proxyHostHint')"
                        placeholder="http://127.0.0.1:7890"
                        persistent-hint
                        prepend-inner-icon="mdi-server-network"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.basic.githubToken"
                        :label="t('setting.system.githubToken')"
                        :placeholder="t('setting.system.githubTokenFormat')"
                        :hint="t('setting.system.githubTokenHint')"
                        persistent-hint
                        prepend-inner-icon="mdi-github"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.basic.apiToken"
                        :label="t('setupWizard.basic.apiToken')"
                        :hint="t('setupWizard.basic.apiTokenHint')"
                        persistent-hint
                        prepend-inner-icon="mdi-key"
                        :append-inner-icon="wizardData.basic.apiToken ? 'mdi-content-copy' : 'mdi-reload'"
                        @click:append-inner="
                          wizardData.basic.apiToken ? copyValue(wizardData.basic.apiToken) : createRandomString()
                        "
                        readonly
                      />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VStepperWindowItem>

            <!-- 步骤2：存储目录 -->
            <VStepperWindowItem :value="2">
              <VCard variant="outlined">
                <VCardText>
                  <div class="text-center mb-6">
                    <h3 class="text-h4 mb-2">{{ stepTitles[1] }}</h3>
                    <p class="text-body-1 text-medium-emphasis">{{ stepDescriptions[1] }}</p>
                  </div>
                  <VRow>
                    <VCol cols="12">
                      <VAlert type="info" variant="tonal" class="mb-4">
                        <VAlertTitle>{{ t('setupWizard.storage.info') }}</VAlertTitle>
                        {{ t('setupWizard.storage.infoDesc') }}
                      </VAlert>
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.storage.downloadPath"
                        :label="t('setupWizard.storage.downloadPath')"
                        :hint="t('setupWizard.storage.downloadPathHint')"
                        persistent-hint
                        prepend-inner-icon="mdi-download"
                        placeholder="/downloads"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VTextField
                        v-model="wizardData.storage.libraryPath"
                        :label="t('setupWizard.storage.libraryPath')"
                        :hint="t('setupWizard.storage.libraryPathHint')"
                        persistent-hint
                        prepend-inner-icon="mdi-folder-multiple"
                        placeholder="/media"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VSelect
                        v-model="wizardData.storage.transferType"
                        :label="t('directory.transferType')"
                        :hint="t('directory.transferTypeHint')"
                        persistent-hint
                        :items="transferTypeItems"
                        prepend-inner-icon="mdi-swap-horizontal"
                      />
                    </VCol>
                    <VCol cols="12" md="6">
                      <VSelect
                        v-model="wizardData.storage.overwriteMode"
                        :label="t('directory.overwriteMode')"
                        :hint="t('directory.overwriteModeHint')"
                        persistent-hint
                        :items="overwriteModeItems"
                        prepend-inner-icon="mdi-file-replace"
                      />
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VStepperWindowItem>

            <!-- 步骤3：下载器 -->
            <VStepperWindowItem :value="3">
              <VCard variant="outlined">
                <VCardText>
                  <div class="text-center mb-6">
                    <h3 class="text-h4 mb-2">{{ stepTitles[2] }}</h3>
                    <p class="text-body-1 text-medium-emphasis">{{ stepDescriptions[2] }}</p>
                  </div>
                  <VRow>
                    <VCol cols="12">
                      <VAlert type="info" variant="tonal" class="mb-4">
                        <VAlertTitle>{{ t('setupWizard.downloader.info') }}</VAlertTitle>
                        {{ t('setupWizard.downloader.infoDesc') }}
                      </VAlert>
                    </VCol>

                    <!-- 下载器选择 -->
                    <VCol cols="12">
                      <div class="mb-4">
                        <h4 class="text-h6 mb-4">{{ t('setupWizard.downloader.type') }}</h4>
                        <VRow>
                          <VCol cols="12" md="6">
                            <VCard
                              :color="wizardData.downloader.type === 'qbittorrent' ? 'primary' : 'default'"
                              :variant="wizardData.downloader.type === 'qbittorrent' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectDownloader('qbittorrent')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/qbittorrent.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">qBittorrent</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="6">
                            <VCard
                              :color="wizardData.downloader.type === 'transmission' ? 'primary' : 'default'"
                              :variant="wizardData.downloader.type === 'transmission' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectDownloader('transmission')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/transmission.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">Transmission</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                        </VRow>
                      </div>
                    </VCol>

                    <!-- 下载器配置 -->
                    <VCol v-if="wizardData.downloader.type" cols="12">
                      <VCard>
                        <VCardText>
                          <VForm>
                            <VRow v-if="wizardData.downloader.type === 'qbittorrent'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.name"
                                  :label="t('downloader.name')"
                                  :placeholder="t('downloader.nameRequired')"
                                  :hint="t('downloader.name')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.config.host"
                                  :label="t('downloader.host')"
                                  placeholder="http(s)://ip:port"
                                  :hint="t('downloader.host')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-server"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.config.username"
                                  :label="t('downloader.username')"
                                  :hint="t('downloader.username')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-account"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.config.password"
                                  type="password"
                                  :label="t('downloader.password')"
                                  :hint="t('downloader.password')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-lock"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VSwitch
                                  v-model="wizardData.downloader.config.category"
                                  :label="t('downloader.category')"
                                  :hint="t('downloader.category')"
                                  persistent-hint
                                  active
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VSwitch
                                  v-model="wizardData.downloader.config.sequentail"
                                  :label="t('downloader.sequentail')"
                                  :hint="t('downloader.sequentail')"
                                  persistent-hint
                                  active
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VSwitch
                                  v-model="wizardData.downloader.config.force_resume"
                                  :label="t('downloader.force_resume')"
                                  :hint="t('downloader.force_resume')"
                                  persistent-hint
                                  active
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VSwitch
                                  v-model="wizardData.downloader.config.first_last_piece"
                                  :label="t('downloader.first_last_piece')"
                                  :hint="t('downloader.first_last_piece')"
                                  persistent-hint
                                  active
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.downloader.type === 'transmission'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.name"
                                  :label="t('downloader.name')"
                                  :placeholder="t('downloader.nameRequired')"
                                  :hint="t('downloader.name')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.config.host"
                                  :label="t('downloader.host')"
                                  placeholder="http(s)://ip:port"
                                  :hint="t('downloader.host')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-server"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.config.username"
                                  :label="t('downloader.username')"
                                  :hint="t('downloader.username')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-account"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.config.password"
                                  type="password"
                                  :label="t('downloader.password')"
                                  :hint="t('downloader.password')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-lock"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.type"
                                  :label="t('downloader.type')"
                                  :hint="t('downloader.customTypeHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-cog"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.downloader.name"
                                  :label="t('downloader.name')"
                                  :hint="t('downloader.nameRequired')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                            </VRow>
                          </VForm>
                        </VCardText>
                      </VCard>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VStepperWindowItem>

            <!-- 步骤4：媒体服务器 -->
            <VStepperWindowItem :value="4">
              <VCard variant="outlined">
                <VCardText>
                  <div class="text-center mb-6">
                    <h3 class="text-h4 mb-2">{{ stepTitles[3] }}</h3>
                    <p class="text-body-1 text-medium-emphasis">{{ stepDescriptions[3] }}</p>
                  </div>
                  <VRow>
                    <VCol cols="12">
                      <VAlert type="info" variant="tonal" class="mb-4">
                        <VAlertTitle>{{ t('setupWizard.mediaServer.info') }}</VAlertTitle>
                        {{ t('setupWizard.mediaServer.infoDesc') }}
                      </VAlert>
                    </VCol>

                    <!-- 媒体服务器选择 -->
                    <VCol cols="12">
                      <div class="mb-4">
                        <h4 class="text-h6 mb-4">{{ t('setupWizard.mediaServer.type') }}</h4>
                        <VRow>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.mediaServer.type === 'emby' ? 'primary' : 'default'"
                              :variant="wizardData.mediaServer.type === 'emby' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectMediaServer('emby')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/emby.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">Emby</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.mediaServer.type === 'jellyfin' ? 'primary' : 'default'"
                              :variant="wizardData.mediaServer.type === 'jellyfin' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectMediaServer('jellyfin')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/jellyfin.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">Jellyfin</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.mediaServer.type === 'plex' ? 'primary' : 'default'"
                              :variant="wizardData.mediaServer.type === 'plex' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectMediaServer('plex')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/plex.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">Plex</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.mediaServer.type === 'trimemedia' ? 'primary' : 'default'"
                              :variant="wizardData.mediaServer.type === 'trimemedia' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectMediaServer('trimemedia')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/trimemedia.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">飞牛影视</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                        </VRow>
                      </div>
                    </VCol>

                    <!-- 媒体服务器配置 -->
                    <VCol v-if="wizardData.mediaServer.type" cols="12">
                      <VCard>
                        <VCardText>
                          <VForm>
                            <VRow v-if="wizardData.mediaServer.type === 'emby'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.name"
                                  :label="t('common.name')"
                                  :placeholder="t('mediaserver.nameRequired')"
                                  :hint="t('mediaserver.serverAlias')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.host"
                                  :label="t('mediaserver.host')"
                                  :placeholder="t('mediaserver.hostPlaceholder')"
                                  :hint="t('mediaserver.hostHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-server"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.play_host"
                                  :label="t('mediaserver.playHost')"
                                  :placeholder="t('mediaserver.playHostPlaceholder')"
                                  :hint="t('mediaserver.playHostHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-play-network"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.apikey"
                                  :label="t('mediaserver.apiKey')"
                                  :hint="t('mediaserver.embyApiKeyHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-key"
                                />
                              </VCol>
                              <VCol cols="12">
                                <VAutocomplete
                                  v-model="wizardData.mediaServer.sync_libraries"
                                  :label="t('mediaserver.syncLibraries')"
                                  :items="[]"
                                  chips
                                  multiple
                                  clearable
                                  :hint="t('mediaserver.syncLibrariesHint')"
                                  persistent-hint
                                  active
                                  append-inner-icon="mdi-refresh"
                                  prepend-inner-icon="mdi-library"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.mediaServer.type === 'jellyfin'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.name"
                                  :label="t('common.name')"
                                  :placeholder="t('mediaserver.nameRequired')"
                                  :hint="t('mediaserver.serverAlias')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.host"
                                  :label="t('mediaserver.host')"
                                  :placeholder="t('mediaserver.hostPlaceholder')"
                                  :hint="t('mediaserver.hostHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-server"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.play_host"
                                  :label="t('mediaserver.playHost')"
                                  :placeholder="t('mediaserver.playHostPlaceholder')"
                                  :hint="t('mediaserver.playHostHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-play-network"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.apikey"
                                  :label="t('mediaserver.apiKey')"
                                  :hint="t('mediaserver.jellyfinApiKeyHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-key"
                                />
                              </VCol>
                              <VCol cols="12">
                                <VAutocomplete
                                  v-model="wizardData.mediaServer.sync_libraries"
                                  :label="t('mediaserver.syncLibraries')"
                                  :items="[]"
                                  chips
                                  multiple
                                  clearable
                                  :hint="t('mediaserver.syncLibrariesHint')"
                                  persistent-hint
                                  active
                                  append-inner-icon="mdi-refresh"
                                  prepend-inner-icon="mdi-library"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.mediaServer.type === 'trimemedia'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.name"
                                  :label="t('common.name')"
                                  :placeholder="t('mediaserver.nameRequired')"
                                  :hint="t('mediaserver.serverAlias')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.host"
                                  :label="t('mediaserver.host')"
                                  :placeholder="t('mediaserver.hostPlaceholder')"
                                  :hint="t('mediaserver.hostHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-server"
                                />
                              </VCol>
                              <VCol cols="12">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.play_host"
                                  :label="t('mediaserver.playHost')"
                                  :placeholder="t('mediaserver.playHostPlaceholder')"
                                  :hint="t('mediaserver.playHostHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-play-network"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.username"
                                  :label="t('mediaserver.username')"
                                  active
                                  prepend-inner-icon="mdi-account"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  type="password"
                                  v-model="wizardData.mediaServer.config.password"
                                  :label="t('mediaserver.password')"
                                  active
                                  prepend-inner-icon="mdi-lock"
                                />
                              </VCol>
                              <VCol cols="12">
                                <VAutocomplete
                                  v-model="wizardData.mediaServer.sync_libraries"
                                  :label="t('mediaserver.syncLibraries')"
                                  :items="[]"
                                  chips
                                  multiple
                                  clearable
                                  :hint="t('mediaserver.syncLibrariesHint')"
                                  persistent-hint
                                  active
                                  append-inner-icon="mdi-refresh"
                                  prepend-inner-icon="mdi-library"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.mediaServer.type === 'plex'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.name"
                                  :label="t('common.name')"
                                  :placeholder="t('mediaserver.nameRequired')"
                                  :hint="t('mediaserver.serverAlias')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.host"
                                  :label="t('mediaserver.host')"
                                  :placeholder="t('mediaserver.hostPlaceholder')"
                                  :hint="t('mediaserver.hostHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-server"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.play_host"
                                  :label="t('mediaserver.playHost')"
                                  :placeholder="t('mediaserver.playHostPlaceholder')"
                                  :hint="t('mediaserver.playHostHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-play-network"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.config.token"
                                  :label="t('mediaserver.plexToken')"
                                  :hint="t('mediaserver.plexTokenHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-key"
                                />
                              </VCol>
                              <VCol cols="12">
                                <VAutocomplete
                                  v-model="wizardData.mediaServer.sync_libraries"
                                  :label="t('mediaserver.syncLibraries')"
                                  :items="[]"
                                  chips
                                  multiple
                                  clearable
                                  :hint="t('mediaserver.syncLibrariesHint')"
                                  persistent-hint
                                  active
                                  append-inner-icon="mdi-refresh"
                                  prepend-inner-icon="mdi-library"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.type"
                                  :label="t('mediaserver.type')"
                                  :hint="t('mediaserver.customTypeHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-cog"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.mediaServer.name"
                                  :label="t('common.name')"
                                  :hint="t('mediaserver.nameRequired')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                            </VRow>
                          </VForm>
                        </VCardText>
                      </VCard>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VStepperWindowItem>

            <!-- 步骤5：通知 -->
            <VStepperWindowItem :value="5">
              <VCard variant="outlined">
                <VCardText>
                  <div class="text-center mb-6">
                    <h3 class="text-h4 mb-2">{{ stepTitles[4] }}</h3>
                    <p class="text-body-1 text-medium-emphasis">{{ stepDescriptions[4] }}</p>
                  </div>
                  <VRow>
                    <VCol cols="12">
                      <VAlert type="info" variant="tonal" class="mb-4">
                        <VAlertTitle>{{ t('setupWizard.notification.info') }}</VAlertTitle>
                        {{ t('setupWizard.notification.infoDesc') }}
                      </VAlert>
                    </VCol>

                    <!-- 通知选择 -->
                    <VCol cols="12">
                      <div class="mb-4">
                        <h4 class="text-h6 mb-4">{{ t('setupWizard.notification.type') }}</h4>
                        <VRow>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.notification.type === 'wechat' ? 'primary' : 'default'"
                              :variant="wizardData.notification.type === 'wechat' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectNotification('wechat')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/wechat.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">微信</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.notification.type === 'telegram' ? 'primary' : 'default'"
                              :variant="wizardData.notification.type === 'telegram' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectNotification('telegram')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/telegram.webp"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">Telegram</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.notification.type === 'slack' ? 'primary' : 'default'"
                              :variant="wizardData.notification.type === 'slack' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectNotification('slack')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/slack.webp"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">Slack</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.notification.type === 'synologychat' ? 'primary' : 'default'"
                              :variant="wizardData.notification.type === 'synologychat' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectNotification('synologychat')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/synologychat.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">Synology Chat</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.notification.type === 'vocechat' ? 'primary' : 'default'"
                              :variant="wizardData.notification.type === 'vocechat' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectNotification('vocechat')"
                            >
                              <VCardText class="text-center">
                                <VImg
                                  src="/src/assets/images/logos/vocechat.png"
                                  height="48"
                                  width="48"
                                  class="mx-auto mb-2"
                                />
                                <div class="text-h6">VoceChat</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                          <VCol cols="12" md="3">
                            <VCard
                              :color="wizardData.notification.type === 'webpush' ? 'primary' : 'default'"
                              :variant="wizardData.notification.type === 'webpush' ? 'tonal' : 'outlined'"
                              class="cursor-pointer"
                              @click="selectNotification('webpush')"
                            >
                              <VCardText class="text-center">
                                <VIcon icon="mdi-apple-safari" size="48" class="mb-2" />
                                <div class="text-h6">WebPush</div>
                              </VCardText>
                            </VCard>
                          </VCol>
                        </VRow>
                      </div>
                    </VCol>

                    <!-- 通知配置 -->
                    <VCol v-if="wizardData.notification.type" cols="12">
                      <VCard>
                        <VCardText>
                          <VForm>
                            <VRow>
                              <VCol cols="12" md="6">
                                <VSwitch v-model="wizardData.notification.enabled" :label="t('notification.enabled')" />
                              </VCol>
                              <VCol cols="12">
                                <VAutocomplete
                                  v-model="wizardData.notification.switchs"
                                  :items="[]"
                                  :label="t('notification.type')"
                                  :hint="t('notification.typeHint')"
                                  multiple
                                  clearable
                                  chips
                                  persistent-hint
                                  prepend-inner-icon="mdi-bell-outline"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-if="wizardData.notification.type === 'wechat'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.name"
                                  :label="t('notification.name')"
                                  :placeholder="t('notification.name')"
                                  :hint="t('notification.nameHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.WECHAT_CORPID"
                                  :label="t('notification.wechat.corpId')"
                                  :hint="t('notification.wechat.corpIdHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-domain"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.WECHAT_APP_ID"
                                  :label="t('notification.wechat.appId')"
                                  :hint="t('notification.wechat.appIdHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-application"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.WECHAT_APP_SECRET"
                                  :label="t('notification.wechat.appSecret')"
                                  :hint="t('notification.wechat.appSecretHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-key"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.WECHAT_PROXY"
                                  :label="t('notification.wechat.proxy')"
                                  :hint="t('notification.wechat.proxyHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-server-network"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.WECHAT_TOKEN"
                                  :label="t('notification.wechat.token')"
                                  :hint="t('notification.wechat.tokenHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-key-variant"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.WECHAT_ENCODING_AESKEY"
                                  :label="t('notification.wechat.encodingAesKey')"
                                  :hint="t('notification.wechat.encodingAesKeyHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-lock"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.WECHAT_ADMINS"
                                  :label="t('notification.wechat.admins')"
                                  :placeholder="t('notification.wechat.adminsPlaceholder')"
                                  :hint="t('notification.wechat.adminsHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-account-supervisor"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.notification.type === 'telegram'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.name"
                                  :label="t('notification.name')"
                                  :placeholder="t('notification.name')"
                                  :hint="t('notification.nameHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.TELEGRAM_TOKEN"
                                  :label="t('notification.telegram.token')"
                                  :hint="t('notification.telegram.tokenHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-key"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.TELEGRAM_CHAT_ID"
                                  :label="t('notification.telegram.chatId')"
                                  :hint="t('notification.telegram.chatIdHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-chat"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.TELEGRAM_USERS"
                                  :label="t('notification.telegram.users')"
                                  :placeholder="t('notification.telegram.usersPlaceholder')"
                                  :hint="t('notification.telegram.usersHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-account-group"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.TELEGRAM_ADMINS"
                                  :label="t('notification.telegram.admins')"
                                  :placeholder="t('notification.telegram.adminsPlaceholder')"
                                  :hint="t('notification.telegram.adminsHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-account-supervisor"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.API_URL"
                                  :label="t('notification.telegram.apiUrl')"
                                  :placeholder="t('notification.telegram.apiUrlPlaceholder')"
                                  :hint="t('notification.telegram.apiUrlHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-web"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.notification.type === 'slack'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.name"
                                  :label="t('notification.name')"
                                  :placeholder="t('notification.name')"
                                  :hint="t('notification.nameHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.SLACK_OAUTH_TOKEN"
                                  :label="t('notification.slack.oauthToken')"
                                  :placeholder="t('notification.slack.oauthTokenPlaceholder')"
                                  :hint="t('notification.slack.oauthTokenHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-key"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.SLACK_APP_TOKEN"
                                  :label="t('notification.slack.appToken')"
                                  :placeholder="t('notification.slack.appTokenPlaceholder')"
                                  :hint="t('notification.slack.appTokenHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-application"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.SLACK_CHANNEL"
                                  :label="t('notification.slack.channel')"
                                  :placeholder="t('notification.slack.channelPlaceholder')"
                                  :hint="t('notification.slack.channelHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-pound"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.notification.type === 'synologychat'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.name"
                                  :label="t('notification.name')"
                                  :placeholder="t('notification.name')"
                                  :hint="t('notification.nameHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.SYNOLOGYCHAT_WEBHOOK"
                                  :label="t('notification.synologychat.webhook')"
                                  :hint="t('notification.synologychat.webhookHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-webhook"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.SYNOLOGYCHAT_TOKEN"
                                  :label="t('notification.synologychat.token')"
                                  :hint="t('notification.synologychat.tokenHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-key"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.notification.type === 'vocechat'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.name"
                                  :label="t('notification.name')"
                                  :placeholder="t('notification.name')"
                                  :hint="t('notification.nameHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.VOCECHAT_HOST"
                                  :label="t('notification.vocechat.host')"
                                  :hint="t('notification.vocechat.hostHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-server"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.VOCECHAT_API_KEY"
                                  :label="t('notification.vocechat.apiKey')"
                                  :hint="t('notification.vocechat.apiKeyHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-key"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.VOCECHAT_CHANNEL_ID"
                                  :label="t('notification.vocechat.channelId')"
                                  :placeholder="t('notification.vocechat.channelIdPlaceholder')"
                                  :hint="t('notification.vocechat.channelIdHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-pound"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else-if="wizardData.notification.type === 'webpush'">
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.name"
                                  :label="t('notification.name')"
                                  :placeholder="t('notification.name')"
                                  :hint="t('notification.nameHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.config.WEBPUSH_USERNAME"
                                  :label="t('notification.webpush.username')"
                                  :hint="t('notification.webpush.usernameHint')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-account"
                                />
                              </VCol>
                            </VRow>
                            <VRow v-else>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.type"
                                  :label="t('notification.type')"
                                  :hint="t('notification.customTypeHint')"
                                  persistent-hint
                                  active
                                  prepend-inner-icon="mdi-cog"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="wizardData.notification.name"
                                  :label="t('notification.name')"
                                  :hint="t('notification.nameRequired')"
                                  persistent-hint
                                  prepend-inner-icon="mdi-label"
                                />
                              </VCol>
                            </VRow>
                          </VForm>
                        </VCardText>
                      </VCard>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VStepperWindowItem>

            <!-- 步骤6：资源偏好 -->
            <VStepperWindowItem :value="6">
              <VCard variant="outlined">
                <VCardText>
                  <div class="text-center mb-6">
                    <h3 class="text-h4 mb-2">{{ stepTitles[5] }}</h3>
                    <p class="text-body-1 text-medium-emphasis">{{ stepDescriptions[5] }}</p>
                  </div>
                  <VRow>
                    <VCol cols="12">
                      <VAlert type="info" variant="tonal" class="mb-4">
                        <VAlertTitle>{{ t('setupWizard.preferences.info') }}</VAlertTitle>
                        {{ t('setupWizard.preferences.infoDesc') }}
                      </VAlert>
                    </VCol>

                    <!-- 预设规则选择 -->
                    <VCol cols="12">
                      <VCard>
                        <VCardTitle class="text-h6">{{ t('setupWizard.preferences.presetRules') }}</VCardTitle>
                        <VCardText>
                          <VRow>
                            <VCol cols="12" md="4">
                              <VCard
                                :color="selectedPreset === '4k' ? 'primary' : 'default'"
                                :variant="selectedPreset === '4k' ? 'tonal' : 'outlined'"
                                class="cursor-pointer"
                                @click="selectPreset('4k')"
                              >
                                <VCardText class="text-center">
                                  <VIcon icon="mdi-4k" size="48" class="mb-2" />
                                  <div class="text-h6">4K 优先</div>
                                </VCardText>
                              </VCard>
                            </VCol>
                            <VCol cols="12" md="4">
                              <VCard
                                :color="selectedPreset === 'balanced' ? 'primary' : 'default'"
                                :variant="selectedPreset === 'balanced' ? 'tonal' : 'outlined'"
                                class="cursor-pointer"
                                @click="selectPreset('balanced')"
                              >
                                <VCardText class="text-center">
                                  <VIcon icon="mdi-balance-scale" size="48" class="mb-2" />
                                  <div class="text-h6">平衡模式</div>
                                </VCardText>
                              </VCard>
                            </VCol>
                            <VCol cols="12" md="4">
                              <VCard
                                :color="selectedPreset === 'chinese' ? 'primary' : 'default'"
                                :variant="selectedPreset === 'chinese' ? 'tonal' : 'outlined'"
                                class="cursor-pointer"
                                @click="selectPreset('chinese')"
                              >
                                <VCardText class="text-center">
                                  <VIcon icon="mdi-translate" size="48" class="mb-2" />
                                  <div class="text-h6">中文字幕</div>
                                </VCardText>
                              </VCard>
                            </VCol>
                          </VRow>
                        </VCardText>
                      </VCard>
                    </VCol>

                    <!-- 详细配置 -->
                    <VCol cols="12">
                      <VCard>
                        <VCardTitle class="text-h6">{{ t('setupWizard.preferences.detailedConfig') }}</VCardTitle>
                        <VCardText>
                          <VRow>
                            <VCol cols="12" md="4">
                              <VSelect
                                v-model="wizardData.preferences.quality"
                                :label="t('setupWizard.preferences.quality')"
                                :hint="t('setupWizard.preferences.qualityHint')"
                                persistent-hint
                                :items="qualityItems"
                                prepend-inner-icon="mdi-star"
                              />
                            </VCol>
                            <VCol cols="12" md="4">
                              <VSelect
                                v-model="wizardData.preferences.subtitle"
                                :label="t('setupWizard.preferences.subtitle')"
                                :hint="t('setupWizard.preferences.subtitleHint')"
                                persistent-hint
                                :items="subtitleItems"
                                prepend-inner-icon="mdi-subtitles"
                              />
                            </VCol>
                            <VCol cols="12" md="4">
                              <VSelect
                                v-model="wizardData.preferences.resolution"
                                :label="t('setupWizard.preferences.resolution')"
                                :hint="t('setupWizard.preferences.resolutionHint')"
                                persistent-hint
                                :items="resolutionItems"
                                prepend-inner-icon="mdi-monitor"
                              />
                            </VCol>
                          </VRow>
                        </VCardText>
                      </VCard>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VStepperWindowItem>
          </VStepperWindow>

          <!-- 操作按钮 -->
          <VCardActions class="justify-space-between">
            <div class="d-flex gap-2">
              <VBtn v-if="currentStep !== 1" prepend-icon="mdi-chevron-left" @click="prevStep">
                {{ t('common.previous') }}
              </VBtn>
              <VBtn v-else color="primary" prepend-icon="mdi-keyboard-return" @click="router.push('/')">
                {{ t('common.skip') }}
              </VBtn>
            </div>

            <div class="d-flex gap-2">
              <VBtn v-if="currentStep < totalSteps" color="primary" append-icon="mdi-chevron-right" @click="nextStep">
                {{ t('common.next') }}
              </VBtn>
              <VBtn v-else color="success" prepend-icon="mdi-check" @click="completeWizard">
                {{ t('setupWizard.complete') }}
              </VBtn>
            </div>
          </VCardActions>
        </VStepper>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setup-wizard-fullscreen {
  position: fixed;
  z-index: 9999;
  background-color: rgb(var(--v-theme-surface));
  inset: 0;
  overflow-y: auto;
}

.setup-wizard-header {
  position: sticky;
  z-index: 1000;
  background-color: rgb(var(--v-theme-surface));
  border-block-end: 1px solid rgb(var(--v-theme-outline-variant));
  inset-block-start: 0;
  padding-block: 16px;
  padding-inline: 24px;
}

.setup-wizard-content {
  padding: 24px;
  min-block-size: calc(100vh - 80px);
}

.setup-wizard {
  padding: 20px;
  margin-block: 0;
  margin-inline: auto;
  max-inline-size: 800px;
}

.cursor-pointer {
  cursor: pointer;
  transition: all 0.2s ease;
}

.cursor-pointer:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 15%);
  transform: translateY(-2px);
}

.cursor-pointer:active {
  transform: translateY(0);
}

/* 选中状态的样式 */
.v-card--variant-tonal.v-theme--light {
  background-color: rgb(var(--v-theme-primary), 0.12);
}

.v-card--variant-tonal.v-theme--dark {
  background-color: rgb(var(--v-theme-primary), 0.2);
}
</style>
