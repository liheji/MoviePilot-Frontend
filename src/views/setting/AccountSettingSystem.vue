<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import { VRow } from 'vuetify/lib/components/index.mjs'
import draggable from 'vuedraggable'
import api from '@/api'
import { DownloaderConf, MediaServerConf } from '@/api/types'
import DownloaderCard from '@/components/cards/DownloaderCard.vue'
import MediaServerCard from '@/components/cards/MediaServerCard.vue'
import { copyToClipboard } from '@/@core/utils/navigator'
import ProgressDialog from '@/components/dialog/ProgressDialog.vue'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 系统设置项
const SystemSettings = ref<any>({
  // 基础设置
  Basic: {
    APP_DOMAIN: null,
    API_TOKEN: null,
    WALLPAPER: 'tmdb',
    MEDIASERVER_SYNC_INTERVAL: null,
    RECOGNIZE_SOURCE: 'themoviedb',
    GITHUB_TOKEN: null,
    OCR_HOST: null,
  },
  // 高级系统设置
  Advanced: {
    // 全局
    AUXILIARY_AUTH_ENABLE: false,
    GLOBAL_IMAGE_CACHE: false,
    SUBSCRIBE_STATISTIC_SHARE: true,
    PLUGIN_STATISTIC_SHARE: true,
    BIG_MEMORY_MODE: false,
    DB_WAL_ENABLE: false,
    // 媒体
    TMDB_API_DOMAIN: null,
    TMDB_IMAGE_DOMAIN: null,
    META_CACHE_EXPIRE: 0,
    SCRAP_FOLLOW_TMDB: true,
    FANART_ENABLE: false,
    // 网络
    PROXY_HOST: null,
    GITHUB_PROXY: null,
    PIP_PROXY: null,
    DOH_ENABLE: false,
    DOH_RESOLVERS: null,
    DOH_DOMAINS: null,
    // 日志
    DEBUG: false,
    LOG_LEVEL: 'INFO',
    LOG_MAX_FILE_SIZE: '5',
    LOG_BACKUP_COUNT: '3',
    LOG_FILE_FORMAT: '【%(levelname)s】%(asctime)s - %(message)s',
    // 实验室
    PLUGIN_AUTO_RELOAD: false,
    ENCODING_DETECTION_PERFORMANCE_MODE: true,
    TOKENIZED_SEARCH: false,
  },
})

// 是否发送请求的总开关
const isRequest = ref(true)

// 选中的媒体服务器
const mediaServers = ref<MediaServerConf[]>([])

// 下载器
const downloaders = ref<DownloaderConf[]>([])

// 提示框
const $toast = useToast()

// 进度框
const progressDialog = ref(false)

// 高级设置对话框
const advancedDialog = ref(false)

const activeTab = ref('system')

// 调用API查询下载器设置
async function loadDownloaderSetting() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/Downloaders')
    downloaders.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 重载系统生效配置
async function reloadSystem() {
  progressDialog.value = true
  try {
    const result: { [key: string]: any } = await api.get('system/reload')
    if (result.success) $toast.success(t('setting.system.reloadSuccess'))
    else $toast.error(t('setting.system.reloadFailed'))
  } catch (error) {
    console.log(error)
  }
  progressDialog.value = false
}

// 调用API保存下载器设置
async function saveDownloaderSetting() {
  try {
    // 提取启用的下载器
    const enabledDownloaders = downloaders.value.filter(item => item.enabled)
    // 有启动的下载器时
    if (enabledDownloaders.length > 0) {
      downloaders.value = handleDefaultDownloaders(enabledDownloaders, downloaders.value)
    }
    const result: { [key: string]: any } = await api.post('system/setting/Downloaders', downloaders.value)
    if (result.success) $toast.success(t('setting.system.downloaderSaveSuccess'))
    else $toast.error(t('setting.system.downloaderSaveFailed'))

    await loadDownloaderSetting()
    await reloadSystem()
  } catch (error) {
    console.log(error)
  }
}

// 处理默认下载器状态
function handleDefaultDownloaders(enabledDownloaders: any[], downloaders: any[]) {
  const enabledDefaultDownloader = enabledDownloaders.find(item => item.default)
  if (enabledDownloaders.length > 0 && !enabledDefaultDownloader) {
    downloaders = downloaders.map(item => {
      if (item === enabledDownloaders[0]) {
        $toast.info(t('setting.system.defaultDownloaderNotice', { name: item.name }))
        return { ...item, default: true }
      }
      // 清除其他下载器的默认下载器状态
      return { ...item, default: false }
    })
  }
  return downloaders
}

// 调用API查询媒体服务器设置
async function loadMediaServerSetting() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/MediaServers')
    mediaServers.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存媒体服务器设置
async function saveMediaServerSetting() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/MediaServers', mediaServers.value)
    if (result.success) $toast.success(t('setting.system.mediaServerSaveSuccess'))
    else $toast.error(t('setting.system.mediaServerSaveFailed'))

    await loadMediaServerSetting()
    await reloadSystem()
  } catch (error) {
    console.log(error)
  }
}

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      // 将API返回的值赋值给SystemSettings
      for (const sectionKey of Object.keys(SystemSettings.value) as Array<keyof typeof SystemSettings.value>) {
        Object.keys(SystemSettings.value[sectionKey]).forEach((key: string) => {
          if (result.data.hasOwnProperty(key)) (SystemSettings.value[sectionKey] as any)[key] = result.data[key]
        })
      }
    }
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存设置
async function saveSystemSetting(value: { [key: string]: any }) {
  try {
    const result: { [key: string]: any } = await api.post('system/env', value)
    if (result.success) {
      return true
    } else {
      $toast.error(t('setting.system.saveFailed', { message: result?.message }))
      return false
    }
  } catch (error) {
    console.log(error)
  }
  return false
}

// 保存基础设置
async function saveBasicSettings() {
  if (await saveSystemSetting(SystemSettings.value.Basic)) {
    $toast.success(t('setting.system.basicSaveSuccess'))
    await reloadSystem()
  }
}

// 保存高级设置
async function saveAdvancedSettings() {
  cleanEmptyFields(SystemSettings.value.Advanced, ['LOG_FILE_FORMAT'])

  if (await saveSystemSetting(SystemSettings.value.Advanced)) {
    advancedDialog.value = false
    $toast.success(t('setting.system.advancedSaveSuccess'))
    await reloadSystem()
  }
}

// 当字段为空时，将其设置为 null 提交，以便后端恢复为默认值
function cleanEmptyFields(settings: any, fields: string[]) {
  fields.forEach(field => {
    if (settings[field]?.trim?.() === '') {
      settings[field] = null
    }
  })
}

// 快捷复制到剪贴板
async function copyValue(value: string) {
  try {
    let success
    success = copyToClipboard(value)
    if (await success) $toast.success(t('setting.system.copySuccess'))
    else $toast.error(t('setting.system.copyFailed'))
  } catch (error) {
    $toast.error(t('setting.system.copyError'))
    console.log(error)
  }
}

// 登录首页壁纸来源
const wallpaperItems = [
  { title: 'TheMovieDB电影海报', value: 'tmdb' },
  { title: 'Bing每日壁纸', value: 'bing' },
  { title: '媒体库海报', value: 'mediaserver' },
]

// 预设部分Github加速站
const githubMirrorsItems: string[] = [
  // str: 'https://mirror.ghproxy.com/', // GitHub Proxy
  // str: 'https://ghp.ci/', // GitHub Proxy 子站
]

// 预设部分PIP镜像站
const pipMirrorsItems = [
  'https://pypi.tuna.tsinghua.edu.cn/simple', // 清华大学
  'https://pypi.mirrors.ustc.edu.cn/simple', // 中国科技大学
  'https://mirrors.pku.edu.cn/pypi/web/simple', // 北京大学
  'https://mirrors.aliyun.com/pypi/simple', // 阿里云
  'https://mirrors.cloud.tencent.com/pypi/simple', // 腾讯云
  'https://mirrors.163.com/pypi/simple', // 网易云
  'https://pypi.doubanio.com/simple', // 豆瓣
  'https://mirrors.hust.edu.cn/pypi/web/simple', // 华中理工大学
  'https://mirrors.bfsu.edu.cn/pypi/web/simple', // 北京外国语大学
]

// Github加速代理显示处理
const githubProxyDisplay = computed({
  get: () => {
    return SystemSettings.value.Advanced.GITHUB_PROXY || null
  },
  set: val => {
    SystemSettings.value.Advanced.GITHUB_PROXY = val === null ? '' : val
  },
})

// PIP加速代理显示处理
const pipProxyDisplay = computed({
  get: () => {
    return SystemSettings.value.Advanced.PIP_PROXY || null
  },
  set: val => {
    SystemSettings.value.Advanced.PIP_PROXY = val === null ? '' : val
  },
})

// 日志等级
const logLevelItems = [
  { title: 'DEBUG - 调试 ', value: 'DEBUG' },
  { title: 'INFO - 信息 ', value: 'INFO' },
  { title: 'WARNING - 警告 ', value: 'WARNING' },
  { title: 'ERROR - 错误 ', value: 'ERROR' },
  { title: 'CRITICAL - 严重 ', value: 'CRITICAL' },
]

// 创建随机字符串
function createRandomString() {
  const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  SystemSettings.value.Basic.API_TOKEN = Array.from(array, byte => charset[byte % charset.length]).join('')
}

// 添加下载器
function addDownloader(downloader: string) {
  let name = `下载器${downloaders.value.length + 1}`
  while (downloaders.value.some(item => item.name === name)) {
    name = `下载器${parseInt(name.split('下载器')[1]) + 1}`
  }
  downloaders.value.push({
    name: name,
    type: downloader,
    default: false,
    enabled: false,
    config: {},
  })
}

// 删除下载器
function removeDownloader(ele: DownloaderConf) {
  const index = downloaders.value.indexOf(ele)
  downloaders.value.splice(index, 1)
}

// 下载器变化
function onDownloaderChange(downloader: DownloaderConf, name: string) {
  const index = downloaders.value.findIndex(item => item.name === name)
  if (index !== -1) downloaders.value[index] = downloader
}

// 添加媒体服务器
function addMediaServer(mediaserver: string) {
  let name = `服务器${mediaServers.value.length + 1}`
  while (mediaServers.value.some(item => item.name === name)) {
    name = `服务器${parseInt(name.split('服务器')[1]) + 1}`
  }
  mediaServers.value.push({
    name: name,
    type: mediaserver,
    enabled: false,
    config: {},
  })
}

// 删除媒体服务器
function removeMediaServer(ele: MediaServerConf) {
  const index = mediaServers.value.indexOf(ele)
  if (index !== -1) mediaServers.value.splice(index, 1)
}

// 变更媒体服务器
function onMediaServerChange(mediaserver: MediaServerConf, name: string) {
  const index = mediaServers.value.findIndex(item => item.name === name)
  if (index !== -1) mediaServers.value[index] = mediaserver
}

// 加载数据
onMounted(() => {
  loadDownloaderSetting()
  loadMediaServerSetting()
  loadSystemSettings()
})

onActivated(async () => {
  isRequest.value = true
})

onDeactivated(() => {
  isRequest.value = false
})
</script>

<template>
  <ProgressDialog
    v-if="progressDialog"
    v-model="progressDialog"
    :text="t('setting.system.reloading')"
    :indeterminate="true"
  />

  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.system.basicSettings') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.system.basicSettingsDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.Basic.APP_DOMAIN"
                  :label="t('setting.system.appDomain')"
                  :hint="t('setting.system.appDomainHint')"
                  placeholder="http://localhost:3000"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="SystemSettings.Basic.WALLPAPER"
                  :label="t('setting.system.wallpaper')"
                  :hint="t('setting.system.wallpaperHint')"
                  persistent-hint
                  :items="[
                    { title: 'TMDB', value: 'tmdb' },
                    { title: 'Bing', value: 'bing' },
                    { title: 'Bing每日图片', value: 'bing-daily' },
                    { title: '无壁纸', value: 'none' },
                  ]"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="SystemSettings.Basic.RECOGNIZE_SOURCE"
                  :label="t('setting.system.recognizeSource')"
                  :hint="t('setting.system.recognizeSourceHint')"
                  persistent-hint
                  :items="[
                    { title: 'TheMovieDb', value: 'themoviedb' },
                    { title: '豆瓣', value: 'douban' },
                  ]"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.Basic.MEDIASERVER_SYNC_INTERVAL"
                  :label="t('setting.system.mediaServerSyncInterval')"
                  :hint="t('setting.system.mediaServerSyncIntervalHint')"
                  persistent-hint
                  :suffix="t('setting.system.hours')"
                  type="number"
                  min="1"
                  :rules="[
                    (v: any) => !!v || t('setting.system.required'),
                    (v: any) => !isNaN(v) || t('setting.system.numbersOnly'),
                    (v: any) => v >= 1 || t('setting.system.minInterval'),
                  ]"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.Basic.API_TOKEN"
                  :label="t('setting.system.apiToken')"
                  :hint="t('setting.system.apiTokenHint')"
                  :placeholder="t('setting.system.apiTokenMinChars')"
                  persistent-hint
                  prependInnerIcon="mdi-reload"
                  :appendInnerIcon="SystemSettings.Basic.API_TOKEN ? 'mdi-content-copy' : ''"
                  @click:prependInner="createRandomString"
                  @click:appendInner="copyValue(SystemSettings.Basic.API_TOKEN)"
                  :rules="[
                    (v: string) => !!v || t('setting.system.apiTokenRequired'),
                    (v: string) => v.length >= 16 || t('setting.system.apiTokenLength'),
                  ]"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.Basic.GITHUB_TOKEN"
                  :label="t('setting.system.githubToken')"
                  :placeholder="t('setting.system.githubTokenFormat')"
                  :hint="t('setting.system.githubTokenHint')"
                  persistent-hint
                >
                </VTextField>
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.Basic.OCR_HOST"
                  :label="t('setting.system.ocrHost')"
                  placeholder="https://movie-pilot.org"
                  :hint="t('setting.system.ocrHostHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveBasicSettings"> {{ t('common.save') }} </VBtn>
              <VSpacer />
              <VBtn
                color="error"
                @click="advancedDialog = true"
                prepend-icon="mdi-cog"
                append-icon="mdi-dots-horizontal"
              >
                {{ t('setting.system.advancedSettings') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.system.downloaders') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.system.downloadersDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <draggable
            v-model="downloaders"
            handle=".cursor-move"
            item-key="name"
            tag="div"
            :component-data="{ 'class': 'grid gap-3 grid-app-card' }"
          >
            <template #item="{ element }">
              <DownloaderCard
                :downloader="element"
                :downloaders="downloaders"
                @close="removeDownloader(element)"
                @change="onDownloaderChange"
                :allow-refresh="isRequest"
              />
            </template>
          </draggable>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveDownloaderSetting"> {{ t('common.save') }} </VBtn>
              <VBtn color="success" variant="tonal">
                <VIcon icon="mdi-plus" />
                <VMenu activator="parent" close-on-content-click>
                  <VList>
                    <VListItem @click="addDownloader('qbittorrent')">
                      <VListItemTitle>Qbittorrent</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addDownloader('transmission')">
                      <VListItemTitle>Transmission</VListItemTitle>
                    </VListItem>
                  </VList>
                </VMenu>
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.system.mediaServers') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.system.mediaServersDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <draggable
            v-model="mediaServers"
            handle=".cursor-move"
            item-key="name"
            tag="div"
            :component-data="{ 'class': 'grid gap-3 grid-app-card' }"
          >
            <template #item="{ element }">
              <MediaServerCard
                :mediaserver="element"
                :mediaservers="mediaServers"
                @close="removeMediaServer(element)"
                @change="onMediaServerChange"
              />
            </template>
          </draggable>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveMediaServerSetting"> {{ t('common.save') }} </VBtn>
              <VBtn color="success" variant="tonal">
                <VIcon icon="mdi-plus" />
                <VMenu activator="parent" close-on-content-click>
                  <VList>
                    <VListItem @click="addMediaServer('emby')">
                      <VListItemTitle>Emby</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addMediaServer('jellyfin')">
                      <VListItemTitle>Jellyfin</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addMediaServer('plex')">
                      <VListItemTitle>Plex</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addMediaServer('trimemedia')">
                      <VListItemTitle>{{ t('setting.system.trimeMedia') }}</VListItemTitle>
                    </VListItem>
                  </VList>
                </VMenu>
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <!-- 高级系统设置 -->
  <VDialog v-if="advancedDialog" v-model="advancedDialog" scrollable max-width="60rem" persistent>
    <VCard>
      <VCardItem>
        <VDialogCloseBtn @click="advancedDialog = false" />
        <VCardTitle>{{ t('setting.system.advancedSettings') }}</VCardTitle>
        <VCardSubtitle>{{ t('setting.system.advancedSettingsDesc') }}</VCardSubtitle>
      </VCardItem>
      <VCardText>
        <VTabs v-model="activeTab" show-arrows>
          <VTab value="system">
            <div>{{ t('setting.system.system') }}</div>
          </VTab>
          <VTab value="media">
            <div>{{ t('setting.system.media') }}</div>
          </VTab>
          <VTab value="network">
            <div>{{ t('setting.system.network') }}</div>
          </VTab>
          <VTab value="log">
            <div>{{ t('setting.system.log') }}</div>
          </VTab>
          <VTab value="dev">
            <div>{{ t('setting.system.lab') }}</div>
          </VTab>
        </VTabs>
        <VWindow v-model="activeTab" class="mt-5 disable-tab-transition" :touch="false">
          <VWindowItem value="system">
            <div>
              <VRow>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.AUXILIARY_AUTH_ENABLE"
                    label="用户辅助认证"
                    hint="允许外部服务进行登录认证以及自动创建用户"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.GLOBAL_IMAGE_CACHE"
                    label="全局图片缓存"
                    hint="将媒体图片缓存到本地，提升图片加载速度"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.SUBSCRIBE_STATISTIC_SHARE"
                    label="分享订阅数据"
                    hint="分享订阅统计数据到热门订阅，供其他MPer参考"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.PLUGIN_STATISTIC_SHARE"
                    label="上报插件安装数据"
                    hint="上报插件安装数据给服务器，用于统计展示插件安装情况"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.BIG_MEMORY_MODE"
                    label="大内存模式"
                    hint="使用更大的内存缓存数据，提升系统性能"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.DB_WAL_ENABLE"
                    label="WAL模式"
                    hint="可提升读写并发性能，但可能在异常情况下增加数据丢失风险，更改后需重启生效"
                    persistent-hint
                  />
                </VCol>
              </VRow>
            </div>
          </VWindowItem>
          <VWindowItem value="media">
            <div>
              <VRow>
                <VCol cols="12" md="6">
                  <VCombobox
                    v-model="SystemSettings.Advanced.TMDB_API_DOMAIN"
                    label="TMDB API服务地址"
                    placeholder="api.themoviedb.org"
                    hint="自定义themoviedb API域名或代理地址"
                    persistent-hint
                    :items="['api.themoviedb.org', 'api.tmdb.org']"
                    :rules="[(v: string) => !!v || '请输入TMDB API域名']"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VCombobox
                    v-model="SystemSettings.Advanced.TMDB_IMAGE_DOMAIN"
                    label="TMDB 图片服务地址"
                    placeholder="image.tmdb.org"
                    hint="自定义themoviedb图片服务域名或代理地址"
                    persistent-hint
                    :items="['image.tmdb.org', 'static-mdb.v.geilijiasu.com']"
                    :rules="[(v: string) => !!v || '请输入图片服务域名']"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="SystemSettings.Advanced.META_CACHE_EXPIRE"
                    label="媒体元数据缓存过期时间"
                    hint="识别元数据本地缓存时间，为 0 时使用内置默认值"
                    persistent-hint
                    min="0"
                    type="number"
                    suffix="小时"
                    :rules="[(v: any) => v === 0 || !!v || '请输入元数据缓存时间', (v: any) => v >= 0 || '元数据缓存时间必须大于等于0']"
                  />
                </VCol>
              </VRow>
              <VRow>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.SCRAP_FOLLOW_TMDB"
                    label="跟随TMDB识别整理"
                    hint="关闭时以整理历史记录为准（如有），避免TMDB数据在订阅中途修改"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.FANART_ENABLE"
                    label="Fanart图片数据源"
                    hint="使用 fanart.tv 的图片数据"
                    persistent-hint
                  />
                </VCol>
              </VRow>
            </div>
          </VWindowItem>
          <VWindowItem value="network">
            <div>
              <VRow>
                <VCol cols="12" md="6">
                  <VCombobox
                    v-model="githubProxyDisplay"
                    label="Github加速代理"
                    placeholder="留空表示不使用代理"
                    hint="使用代理加速Github访问速度"
                    persistent-hint
                    :items="githubMirrorsItems"
                    clearable
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VCombobox
                    v-model="pipProxyDisplay"
                    label="PIP加速代理"
                    placeholder="留空表示不使用代理"
                    hint="使用代理加速插件等pip库安装速度"
                    persistent-hint
                    :items="pipMirrorsItems"
                    clearable
                  />
                </VCol>
              </VRow>
              <VRow>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.DOH_ENABLE"
                    label="DNS Over HTTPS"
                    hint="使用DOH对特定域名进行解析，以防止DNS污染"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" v-show="SystemSettings.Advanced.DOH_ENABLE">
                  <VTextarea
                    v-model="SystemSettings.Advanced.DOH_RESOLVERS"
                    label="DOH 服务器"
                    placeholder="https://dns.google/dns-query,1.1.1.1"
                    hint="DNS解析服务器地址，多个地址使用逗号分隔"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" v-show="SystemSettings.Advanced.DOH_ENABLE">
                  <VTextarea
                    v-model="SystemSettings.Advanced.DOH_DOMAINS"
                    label="DOH 域名"
                    placeholder="example.com,example2.com"
                    hint="使用DOH解析的域名，多个域名使用逗号分隔"
                    persistent-hint
                  />
                </VCol>
              </VRow>
            </div>
          </VWindowItem>
          <VWindowItem value="log">
            <div>
              <VRow>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.DEBUG"
                    label="调试模式"
                    hint="启用调试模式后，日志将以DEBUG级别记录，以便排查问题"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSelect
                    v-if="!SystemSettings.Advanced.DEBUG"
                    v-model="SystemSettings.Advanced.LOG_LEVEL"
                    label="日志等级"
                    hint="设置日志记录的级别，用于控制日志输出量"
                    persistent-hint
                    :items="logLevelItems"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="SystemSettings.Advanced.LOG_MAX_FILE_SIZE"
                    label="日志文件最大容量(MB)"
                    hint="限制单个日志文件的最大容量，超出后将自动分割日志"
                    persistent-hint
                    min="1"
                    type="number"
                    suffix="MB"
                    :rules="[(v: any) => v === 0 || !!v || '日志文件最大大小', (v: any) => v >= 1 || '日志文件最大容量必须大于等于1']"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="SystemSettings.Advanced.LOG_BACKUP_COUNT"
                    label="日志文件最大备份数量"
                    hint="设置每个模块日志文件的最大备份数量，超过后将覆盖旧日志"
                    persistent-hint
                    min="1"
                    type="number"
                    :rules="[(v: any) => v === 0 || !!v || '请输入日志文件最大备份数量', (v: any) => v >= 1 || '日志文件最大备份数量必须大于等于1']"
                  />
                </VCol>
                <VCol cols="12">
                  <VTextField
                    v-model="SystemSettings.Advanced.LOG_FILE_FORMAT"
                    label="日志文件格式"
                    hint="设置日志文件的输出格式，用于自定义日志的显示内容"
                    persistent-hint
                  />
                </VCol>
              </VRow>
            </div>
          </VWindowItem>
          <VWindowItem value="dev">
            <div>
              <VRow>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.PLUGIN_AUTO_RELOAD"
                    label="插件热加载"
                    hint="修改插件文件后自动重新加载，开发插件时使用"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.ENCODING_DETECTION_PERFORMANCE_MODE"
                    label="编码探测性能模式"
                    hint="优先提升探测效率，但可能降低编码探测的准确性"
                    persistent-hint
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.Advanced.TOKENIZED_SEARCH"
                    label="分词搜索"
                    hint="提升整理历史记录搜索精度，但可能增加性能开销和意外结果"
                    persistent-hint
                  />
                </VCol>
              </VRow>
            </div>
          </VWindowItem>
        </VWindow>
      </VCardText>
      <VCardActions class="pt-3">
        <VForm @submit.prevent="() => {}">
          <div class="d-flex flex-wrap gap-4 mt-4">
            <VBtn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-content-save"
              @click="saveAdvancedSettings"
              class="px-5"
            >
              {{ t('common.save') }}
            </VBtn>
          </div>
        </VForm>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
