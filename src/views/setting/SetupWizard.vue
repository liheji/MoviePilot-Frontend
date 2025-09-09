<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useI18n } from 'vue-i18n'
import { downloaderOptions, mediaServerOptions } from '@/api/constants'
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
    wallpaper: 'tmdb',
    recognizeSource: 'themoviedb',
    apiToken: '',
  },
  // 步骤2：存储目录
  storage: {
    downloadPath: '',
    libraryPath: '',
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
  },
  // 步骤5：通知
  notification: {
    type: '',
    name: '',
    config: {} as any,
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

// 壁纸选项
const wallpaperItems = [
  { title: t('setting.system.wallpaperItems.tmdb'), value: 'tmdb' },
  { title: t('setting.system.wallpaperItems.bing'), value: 'bing' },
  { title: t('setting.system.wallpaperItems.mediaserver'), value: 'mediaserver' },
  { title: t('setting.system.wallpaperItems.none'), value: '' },
]

// 识别源选项
const recognizeSourceItems = [
  { title: 'TheMovieDb', value: 'themoviedb' },
  { title: '豆瓣', value: 'douban' },
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

// 下载器类型变化处理
function onDownloaderTypeChange(type: string) {
  if (type) {
    wizardData.value.downloader.name = `${type} 下载器`
    wizardData.value.downloader.config = {}
  } else {
    wizardData.value.downloader.name = ''
    wizardData.value.downloader.config = {}
  }
}

// 媒体服务器类型变化处理
function onMediaServerTypeChange(type: string) {
  if (type) {
    wizardData.value.mediaServer.name = `${type} 服务器`
    wizardData.value.mediaServer.config = {}
  } else {
    wizardData.value.mediaServer.name = ''
    wizardData.value.mediaServer.config = {}
  }
}

// 通知类型变化处理
function onNotificationTypeChange(type: string) {
  if (type) {
    wizardData.value.notification.name = `${type} 通知`
    wizardData.value.notification.config = {}
  } else {
    wizardData.value.notification.name = ''
    wizardData.value.notification.config = {}
  }
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
function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

// 上一步
function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 完成向导
async function completeWizard() {
  try {
    // 保存基础设置
    await saveBasicSettings()

    // 保存存储配置
    await saveStorageSettings()

    // 保存下载器配置
    await saveDownloaderSettings()

    // 保存媒体服务器配置
    await saveMediaServerSettings()

    // 保存通知配置
    await saveNotificationSettings()

    // 保存资源偏好
    await savePreferenceSettings()

    $toast.success(t('setupWizard.completed'))
    router.push('/setting')
  } catch (error) {
    console.error('Setup wizard failed:', error)
    $toast.error(t('setupWizard.failed'))
  }
}

// 保存基础设置
async function saveBasicSettings() {
  const basicSettings = {
    APP_DOMAIN: wizardData.value.basic.appDomain,
    WALLPAPER: wizardData.value.basic.wallpaper,
    RECOGNIZE_SOURCE: wizardData.value.basic.recognizeSource,
    API_TOKEN: wizardData.value.basic.apiToken,
  }

  await api.post('system/env', basicSettings)
}

// 保存存储配置
async function saveStorageSettings() {
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
    transfer_type: 'link',
  }

  await api.post('system/setting/Directories', [directory])
}

// 保存下载器配置
async function saveDownloaderSettings() {
  if (wizardData.value.downloader.type) {
    const downloader = {
      name: wizardData.value.downloader.name,
      type: wizardData.value.downloader.type,
      default: true,
      enabled: true,
      config: wizardData.value.downloader.config,
    }

    await api.post('system/setting/Downloaders', [downloader])
  }
}

// 保存媒体服务器配置
async function saveMediaServerSettings() {
  if (wizardData.value.mediaServer.type) {
    const mediaServer = {
      name: wizardData.value.mediaServer.name,
      type: wizardData.value.mediaServer.type,
      enabled: true,
      config: wizardData.value.mediaServer.config,
    }

    await api.post('system/setting/MediaServers', [mediaServer])
  }
}

// 保存通知配置
async function saveNotificationSettings() {
  if (wizardData.value.notification.type) {
    const notification = {
      name: wizardData.value.notification.name,
      type: wizardData.value.notification.type,
      enabled: true,
      config: wizardData.value.notification.config,
    }

    await api.post('system/setting/Notifications', [notification])
  }
}

// 保存资源偏好设置
async function savePreferenceSettings() {
  // 这里可以根据偏好设置创建相应的过滤规则
  // 暂时保存到系统设置中
  const preferenceSettings = {
    QUALITY_PREFERENCE: wizardData.value.preferences.quality,
    SUBTITLE_PREFERENCE: wizardData.value.preferences.subtitle,
    RESOLUTION_PREFERENCE: wizardData.value.preferences.resolution,
  }

  await api.post('system/env', preferenceSettings)
}

// 初始化
onMounted(() => {
  createRandomString()
})
</script>

<template>
  <div class="setup-wizard-fullscreen">
    <!-- 全屏头部 -->
    <div class="setup-wizard-header">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <VBtn icon="mdi-arrow-left" variant="text" @click="router.push('/setting')" class="me-3" />
          <div>
            <h1 class="text-h4 font-weight-bold">{{ t('setupWizard.title') }}</h1>
            <p class="text-body-1 text-medium-emphasis">{{ t('setupWizard.subtitle') }}</p>
          </div>
        </div>
        <VBtn icon="mdi-close" variant="text" @click="router.push('/setting')" />
      </div>
    </div>

    <!-- 向导内容 -->
    <div class="setup-wizard-content">
      <div class="setup-wizard">
        <!-- 进度条 -->
        <VCard class="mb-6">
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-4">
              <div>
                <h2 class="text-h5 mb-2">{{ t('setupWizard.step' + currentStep + '.title') }}</h2>
                <p class="text-body-2 text-medium-emphasis">
                  {{ t('setupWizard.step' + currentStep + '.description') }}
                </p>
              </div>
              <div class="text-right">
                <div class="text-h6">{{ currentStep }} / {{ totalSteps }}</div>
                <div class="text-caption text-medium-emphasis">{{ stepTitles[currentStep - 1] }}</div>
              </div>
            </div>

            <VProgressLinear :model-value="(currentStep / totalSteps) * 100" color="primary" height="8" rounded />
          </VCardText>
        </VCard>

        <!-- 步骤内容 -->
        <VCard>
          <VCardText>
            <div class="text-center mb-6">
              <h3 class="text-h4 mb-2">{{ stepTitles[currentStep - 1] }}</h3>
              <p class="text-body-1 text-medium-emphasis">{{ stepDescriptions[currentStep - 1] }}</p>
            </div>

            <!-- 步骤1：基础参数 -->
            <div v-if="currentStep === 1">
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
                  <VSelect
                    v-model="wizardData.basic.wallpaper"
                    :label="t('setupWizard.basic.wallpaper')"
                    :hint="t('setupWizard.basic.wallpaperHint')"
                    persistent-hint
                    :items="wallpaperItems"
                    prepend-inner-icon="mdi-image"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSelect
                    v-model="wizardData.basic.recognizeSource"
                    :label="t('setupWizard.basic.recognizeSource')"
                    :hint="t('setupWizard.basic.recognizeSourceHint')"
                    persistent-hint
                    :items="recognizeSourceItems"
                    prepend-inner-icon="mdi-database"
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
            </div>

            <!-- 步骤2：存储目录 -->
            <div v-if="currentStep === 2">
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
              </VRow>
            </div>

            <!-- 步骤3：下载器 -->
            <div v-if="currentStep === 3">
              <VRow>
                <VCol cols="12">
                  <VAlert type="info" variant="tonal" class="mb-4">
                    <VAlertTitle>{{ t('setupWizard.downloader.info') }}</VAlertTitle>
                    {{ t('setupWizard.downloader.infoDesc') }}
                  </VAlert>
                </VCol>

                <!-- 下载器选择 -->
                <VCol cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.downloader.type') }}</VCardTitle>
                    <VCardText>
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
                              <div class="text-caption">功能强大的BT下载器</div>
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
                              <div class="text-caption">轻量级BT下载器</div>
                            </VCardText>
                          </VCard>
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="wizardData.downloader.type" cols="12" md="6">
                  <VTextField
                    v-model="wizardData.downloader.name"
                    :label="t('setupWizard.downloader.name')"
                    :hint="t('setupWizard.downloader.nameHint')"
                    persistent-hint
                    prepend-inner-icon="mdi-tag"
                  />
                </VCol>

                <!-- 下载器配置 -->
                <VCol v-if="wizardData.downloader.type === 'qbittorrent'" cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.downloader.qbittorrentConfig') }}</VCardTitle>
                    <VCardText>
                      <VRow>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.downloader.config.host"
                            :label="t('setupWizard.downloader.host')"
                            placeholder="http://localhost:8080"
                            prepend-inner-icon="mdi-server"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.downloader.config.username"
                            :label="t('setupWizard.downloader.username')"
                            placeholder="admin"
                            prepend-inner-icon="mdi-account"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.downloader.config.password"
                            :label="t('setupWizard.downloader.password')"
                            type="password"
                            prepend-inner-icon="mdi-lock"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.downloader.config.download_path"
                            :label="t('setupWizard.downloader.downloadPath')"
                            placeholder="/downloads"
                            prepend-inner-icon="mdi-folder"
                          />
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="wizardData.downloader.type === 'transmission'" cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.downloader.transmissionConfig') }}</VCardTitle>
                    <VCardText>
                      <VRow>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.downloader.config.host"
                            :label="t('setupWizard.downloader.host')"
                            placeholder="http://localhost:9091"
                            prepend-inner-icon="mdi-server"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.downloader.config.username"
                            :label="t('setupWizard.downloader.username')"
                            placeholder="admin"
                            prepend-inner-icon="mdi-account"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.downloader.config.password"
                            :label="t('setupWizard.downloader.password')"
                            type="password"
                            prepend-inner-icon="mdi-lock"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.downloader.config.download_path"
                            :label="t('setupWizard.downloader.downloadPath')"
                            placeholder="/downloads"
                            prepend-inner-icon="mdi-folder"
                          />
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>
            </div>

            <!-- 步骤4：媒体服务器 -->
            <div v-if="currentStep === 4">
              <VRow>
                <VCol cols="12">
                  <VAlert type="info" variant="tonal" class="mb-4">
                    <VAlertTitle>{{ t('setupWizard.mediaServer.info') }}</VAlertTitle>
                    {{ t('setupWizard.mediaServer.infoDesc') }}
                  </VAlert>
                </VCol>

                <!-- 媒体服务器选择 -->
                <VCol cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.mediaServer.type') }}</VCardTitle>
                    <VCardText>
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
                              <div class="text-caption">专业媒体服务器</div>
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
                              <div class="text-caption">开源媒体服务器</div>
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
                              <div class="text-caption">流行媒体服务器</div>
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
                              <div class="text-h6">TrimeMedia</div>
                              <div class="text-caption">轻量级媒体服务器</div>
                            </VCardText>
                          </VCard>
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="wizardData.mediaServer.type" cols="12" md="6">
                  <VTextField
                    v-model="wizardData.mediaServer.name"
                    :label="t('setupWizard.mediaServer.name')"
                    :hint="t('setupWizard.mediaServer.nameHint')"
                    persistent-hint
                    prepend-inner-icon="mdi-tag"
                  />
                </VCol>

                <!-- 媒体服务器配置 -->
                <VCol v-if="wizardData.mediaServer.type === 'emby'" cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.mediaServer.embyConfig') }}</VCardTitle>
                    <VCardText>
                      <VRow>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.mediaServer.config.host"
                            :label="t('setupWizard.mediaServer.host')"
                            placeholder="http://localhost:8096"
                            prepend-inner-icon="mdi-server"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.mediaServer.config.api_key"
                            :label="t('setupWizard.mediaServer.apiKey')"
                            placeholder="API Key"
                            prepend-inner-icon="mdi-key"
                          />
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="wizardData.mediaServer.type === 'jellyfin'" cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.mediaServer.jellyfinConfig') }}</VCardTitle>
                    <VCardText>
                      <VRow>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.mediaServer.config.host"
                            :label="t('setupWizard.mediaServer.host')"
                            placeholder="http://localhost:8096"
                            prepend-inner-icon="mdi-server"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.mediaServer.config.api_key"
                            :label="t('setupWizard.mediaServer.apiKey')"
                            placeholder="API Key"
                            prepend-inner-icon="mdi-key"
                          />
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="wizardData.mediaServer.type === 'plex'" cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.mediaServer.plexConfig') }}</VCardTitle>
                    <VCardText>
                      <VRow>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.mediaServer.config.host"
                            :label="t('setupWizard.mediaServer.host')"
                            placeholder="http://localhost:32400"
                            prepend-inner-icon="mdi-server"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.mediaServer.config.token"
                            :label="t('setupWizard.mediaServer.token')"
                            placeholder="Plex Token"
                            prepend-inner-icon="mdi-key"
                          />
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>
            </div>

            <!-- 步骤5：通知 -->
            <div v-if="currentStep === 5">
              <VRow>
                <VCol cols="12">
                  <VAlert type="info" variant="tonal" class="mb-4">
                    <VAlertTitle>{{ t('setupWizard.notification.info') }}</VAlertTitle>
                    {{ t('setupWizard.notification.infoDesc') }}
                  </VAlert>
                </VCol>

                <!-- 通知选择 -->
                <VCol cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.notification.type') }}</VCardTitle>
                    <VCardText>
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
                              <div class="text-caption">企业微信通知</div>
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
                              <div class="text-caption">Telegram 机器人</div>
                            </VCardText>
                          </VCard>
                        </VCol>
                        <VCol cols="12" md="3">
                          <VCard
                            :color="wizardData.notification.type === 'email' ? 'primary' : 'default'"
                            :variant="wizardData.notification.type === 'email' ? 'tonal' : 'outlined'"
                            class="cursor-pointer"
                            @click="selectNotification('email')"
                          >
                            <VCardText class="text-center">
                              <VIcon icon="mdi-email" size="48" class="mb-2" />
                              <div class="text-h6">邮件</div>
                              <div class="text-caption">SMTP 邮件通知</div>
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
                              <div class="text-caption">Slack 通知</div>
                            </VCardText>
                          </VCard>
                        </VCol>
                      </VRow>
                      <VRow class="mt-2">
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
                              <div class="text-caption">群晖聊天通知</div>
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
                              <div class="text-caption">VoceChat 通知</div>
                            </VCardText>
                          </VCard>
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="wizardData.notification.type" cols="12" md="6">
                  <VTextField
                    v-model="wizardData.notification.name"
                    :label="t('setupWizard.notification.name')"
                    :hint="t('setupWizard.notification.nameHint')"
                    persistent-hint
                    prepend-inner-icon="mdi-tag"
                  />
                </VCol>

                <!-- 通知配置 -->
                <VCol v-if="wizardData.notification.type === 'telegram'" cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.notification.telegramConfig') }}</VCardTitle>
                    <VCardText>
                      <VRow>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.notification.config.token"
                            :label="t('setupWizard.notification.botToken')"
                            placeholder="Bot Token"
                            prepend-inner-icon="mdi-robot"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.notification.config.chat_id"
                            :label="t('setupWizard.notification.chatId')"
                            placeholder="Chat ID"
                            prepend-inner-icon="mdi-chat"
                          />
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>

                <VCol v-if="wizardData.notification.type === 'email'" cols="12">
                  <VCard variant="outlined">
                    <VCardTitle class="text-h6">{{ t('setupWizard.notification.emailConfig') }}</VCardTitle>
                    <VCardText>
                      <VRow>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.notification.config.smtp_server"
                            :label="t('setupWizard.notification.smtpServer')"
                            placeholder="smtp.gmail.com"
                            prepend-inner-icon="mdi-server"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.notification.config.smtp_port"
                            :label="t('setupWizard.notification.smtpPort')"
                            placeholder="587"
                            prepend-inner-icon="mdi-network"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.notification.config.sender_email"
                            :label="t('setupWizard.notification.senderEmail')"
                            placeholder="sender@example.com"
                            prepend-inner-icon="mdi-email"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.notification.config.sender_password"
                            :label="t('setupWizard.notification.senderPassword')"
                            type="password"
                            prepend-inner-icon="mdi-lock"
                          />
                        </VCol>
                        <VCol cols="12" md="6">
                          <VTextField
                            v-model="wizardData.notification.config.receiver_email"
                            :label="t('setupWizard.notification.receiverEmail')"
                            placeholder="receiver@example.com"
                            prepend-inner-icon="mdi-email-outline"
                          />
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>
            </div>

            <!-- 步骤6：资源偏好 -->
            <div v-if="currentStep === 6">
              <VRow>
                <VCol cols="12">
                  <VAlert type="info" variant="tonal" class="mb-4">
                    <VAlertTitle>{{ t('setupWizard.preferences.info') }}</VAlertTitle>
                    {{ t('setupWizard.preferences.infoDesc') }}
                  </VAlert>
                </VCol>

                <!-- 预设规则选择 -->
                <VCol cols="12">
                  <VCard variant="outlined">
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
                              <div class="text-caption">追求最高画质</div>
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
                              <div class="text-caption">画质与速度平衡</div>
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
                              <div class="text-caption">优先中文字幕</div>
                            </VCardText>
                          </VCard>
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </VCol>

                <!-- 详细配置 -->
                <VCol cols="12">
                  <VCard variant="outlined">
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
            </div>
          </VCardText>

          <!-- 操作按钮 -->
          <VCardActions class="justify-space-between">
            <VBtn :disabled="currentStep === 1" prepend-icon="mdi-chevron-left" @click="prevStep">
              {{ t('common.previous') }}
            </VBtn>

            <div class="d-flex gap-2">
              <VBtn v-if="currentStep < totalSteps" color="primary" append-icon="mdi-chevron-right" @click="nextStep">
                {{ t('common.next') }}
              </VBtn>
              <VBtn v-else color="success" prepend-icon="mdi-check" @click="completeWizard">
                {{ t('setupWizard.complete') }}
              </VBtn>
            </div>
          </VCardActions>
        </VCard>
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
