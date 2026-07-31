<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import api from '@/api'
import { useGlobalSettingsStore } from '@/stores'
import type { DownloaderConf } from '@/api/types'
import DownloaderCard from '@/components/cards/DownloaderCard.vue'
import { copyToClipboard } from '@/@core/utils/navigator'
import { useI18n } from 'vue-i18n'
import { downloaderOptions } from '@/api/constants'
import { useSilentSettingRefresh } from '@/composables/useSilentSettingRefresh'

const globalSettingsStore = useGlobalSettingsStore()
const { t } = useI18n()
const $toast = useToast()

const props = defineProps({
  active: {
    type: Boolean,
    default: true,
  },
})

const SystemSettings = ref({
  APP_DOMAIN: null as string | null,
  API_TOKEN: null as string | null,
  WALLPAPER: '' as string,
  GITHUB_TOKEN: null as string | null,
  PROXY_HOST: null as string | null,
  GITHUB_PROXY: null as string | null,
  PIP_PROXY: null as string | null,
  DEBUG: false,
  LOG_LEVEL: 'INFO',
  LOG_MAX_FILE_SIZE: '5',
  LOG_BACKUP_COUNT: '3',
  LOG_FILE_FORMAT: '【%(levelname)s】%(asctime)s - %(message)s',
  PLUGIN_AUTO_RELOAD: false,
  PLUGIN_LOCAL_REPO_PATHS: '',
})

const downloaders = ref<DownloaderConf[]>([])
const savingBasic = ref(false)
const savingAdvanced = ref(false)

async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (!result.success) return

    const systemSettings = SystemSettings.value as Record<string, unknown>
    for (const key of Object.keys(systemSettings)) {
      if (Object.hasOwn(result.data, key)) systemSettings[key] = result.data[key]
    }
  } catch (error) {
    console.log(error)
  }
}

async function loadDownloaders() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/Downloaders')
    downloaders.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

async function saveSystemSettings(keys: Array<keyof typeof SystemSettings.value>) {
  const payload = Object.fromEntries(keys.map(key => [key, SystemSettings.value[key]]))
  const result: { [key: string]: any } = await api.post('system/env', payload)
  return Boolean(result.success)
}

async function saveBasicSettings() {
  savingBasic.value = true
  try {
    const saved = await saveSystemSettings(['APP_DOMAIN', 'API_TOKEN', 'WALLPAPER', 'GITHUB_TOKEN'])
    if (!saved) {
      $toast.error(t('setting.system.saveFailed'))
      return
    }
    globalSettingsStore.setData({ ...globalSettingsStore.getData, ...SystemSettings.value })
    $toast.success(t('setting.system.basicSaveSuccess'))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.system.saveFailed'))
  } finally {
    savingBasic.value = false
  }
}

async function saveAdvancedSettings() {
  savingAdvanced.value = true
  try {
    const saved = await saveSystemSettings([
      'PROXY_HOST',
      'GITHUB_PROXY',
      'PIP_PROXY',
      'DEBUG',
      'LOG_LEVEL',
      'LOG_MAX_FILE_SIZE',
      'LOG_BACKUP_COUNT',
      'LOG_FILE_FORMAT',
      'PLUGIN_AUTO_RELOAD',
      'PLUGIN_LOCAL_REPO_PATHS',
    ])
    if (saved) $toast.success(t('setting.system.advancedSaveSuccess'))
    else $toast.error(t('setting.system.saveFailed'))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.system.saveFailed'))
  } finally {
    savingAdvanced.value = false
  }
}

async function saveDownloaders() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/Downloaders', downloaders.value)
    if (result.success) $toast.success(t('setting.system.downloaderSaveSuccess'))
    else $toast.error(t('setting.system.downloaderSaveFailed'))
    await loadDownloaders()
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.system.downloaderSaveFailed'))
  }
}

function addDownloader(type: string) {
  downloaders.value.push({
    name: `${type} 下载器`,
    type,
    default: false,
    enabled: false,
    config: {},
  })
}

function removeDownloader(downloader: DownloaderConf) {
  downloaders.value = downloaders.value.filter(item => item !== downloader)
}

function updateDownloader(downloader: DownloaderConf, name: string) {
  const index = downloaders.value.findIndex(item => item.name === name)
  if (index !== -1) downloaders.value[index] = downloader
}

function createRandomString() {
  const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
  const values = new Uint8Array(32)
  window.crypto.getRandomValues(values)
  SystemSettings.value.API_TOKEN = Array.from(values, value => charset[value % charset.length]).join('')
}

async function copyValue(value: string | null) {
  if (!value) return
  if (await copyToClipboard(value)) $toast.success(t('setting.system.copySuccess'))
  else $toast.error(t('setting.system.copyFailed'))
}

async function loadPageData() {
  await Promise.all([loadSystemSettings(), loadDownloaders()])
}

onMounted(loadPageData)

useSilentSettingRefresh(loadPageData, {
  active: computed(() => props.active),
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.system.basicSettings') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.system.basicSettingsDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField v-model="SystemSettings.APP_DOMAIN" :label="t('setting.system.appDomain')" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="SystemSettings.API_TOKEN"
                :label="t('setting.system.apiToken')"
                :append-inner-icon="SystemSettings.API_TOKEN ? 'mdi-content-copy' : 'mdi-reload'"
                @click:append-inner="SystemSettings.API_TOKEN ? copyValue(SystemSettings.API_TOKEN) : createRandomString()"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="SystemSettings.GITHUB_TOKEN" :label="t('setting.system.githubToken')" />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="SystemSettings.WALLPAPER"
                :label="t('setting.system.wallpaper')"
                :items="[
                  { title: t('setting.system.wallpaperItems.none'), value: '' },
                  { title: t('setting.system.wallpaperItems.bing'), value: 'bing' },
                ]"
              />
            </VCol>
          </VRow>
          <VBtn color="primary" prepend-icon="mdi-content-save" :loading="savingBasic" @click="saveBasicSettings">
            {{ t('common.save') }}
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.system.downloaderSettings') }}</VCardTitle>
        </VCardItem>
        <VCardText>
          <div class="grid gap-3 grid-app-card">
            <DownloaderCard
              v-for="downloader in downloaders"
              :key="downloader.name"
              :downloader="downloader"
              :downloaders="downloaders"
              @close="removeDownloader(downloader)"
              @change="updateDownloader"
            />
          </div>
          <div class="d-flex flex-wrap gap-2 mt-4">
            <VBtn color="primary" prepend-icon="mdi-content-save" @click="saveDownloaders">{{ t('common.save') }}</VBtn>
            <VBtn color="success" variant="tonal" icon="mdi-plus">
              <VMenu activator="parent" close-on-content-click>
                <VList>
                  <VListItem v-for="item in downloaderOptions" :key="item.value" @click="addDownloader(item.value)">
                    <VListItemTitle>{{ item.title }}</VListItemTitle>
                  </VListItem>
                </VList>
              </VMenu>
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VCard>
        <VCardItem><VCardTitle>{{ t('setting.system.advancedSettings') }}</VCardTitle></VCardItem>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6"><VTextField v-model="SystemSettings.PROXY_HOST" :label="t('setting.system.proxyHost')" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="SystemSettings.GITHUB_PROXY" :label="t('setting.system.githubProxy')" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="SystemSettings.PIP_PROXY" :label="t('setting.system.pipProxy')" /></VCol>
            <VCol cols="12" md="6"><VSwitch v-model="SystemSettings.DEBUG" :label="t('setting.system.debug')" /></VCol>
            <VCol cols="12" md="6"><VSelect v-model="SystemSettings.LOG_LEVEL" :label="t('setting.system.logLevel')" :items="['INFO', 'WARNING', 'ERROR']" /></VCol>
            <VCol cols="12" md="6"><VSwitch v-model="SystemSettings.PLUGIN_AUTO_RELOAD" :label="t('setting.system.pluginAutoReload')" /></VCol>
            <VCol cols="12"><VTextField v-model="SystemSettings.PLUGIN_LOCAL_REPO_PATHS" :label="t('setting.system.pluginLocalRepoPaths')" /></VCol>
          </VRow>
          <VBtn color="primary" prepend-icon="mdi-content-save" :loading="savingAdvanced" @click="saveAdvancedSettings">
            {{ t('common.save') }}
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
