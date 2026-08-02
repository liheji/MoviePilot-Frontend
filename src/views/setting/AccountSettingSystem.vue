<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import api from '@/api'
import { useGlobalSettingsStore } from '@/stores'
import { copyToClipboard } from '@/@core/utils/navigator'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useSilentSettingRefresh } from '@/composables/useSilentSettingRefresh'
import AccountSettingDownloader from '@/views/setting/AccountSettingDownloader.vue'

const globalSettingsStore = useGlobalSettingsStore()
const { t } = useI18n()
const $toast = useToast()
const display = useDisplay()

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
  AUTO_UPDATE_RESOURCE: true,
  MOVIEPILOT_AUTO_UPDATE: 'false',
  LOG_LEVEL: 'INFO',
  LOG_MAX_FILE_SIZE: '5',
  LOG_BACKUP_COUNT: '3',
  LOG_FILE_FORMAT: '【%(levelname)s】%(asctime)s - %(message)s',
  PLUGIN_AUTO_RELOAD: false,
  PLUGIN_LOCAL_REPO_PATHS: '',
})

const savingBasic = ref(false)
const savingAdvanced = ref(false)
const advancedDialog = ref(false)
const activeTab = ref('system')

const pipMirrorsItems = [
  'https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple',
  'https://pypi.mirrors.ustc.edu.cn/simple',
  'https://mirrors.pku.edu.cn/pypi/web/simple',
  'https://mirrors.aliyun.com/pypi/simple',
  'https://mirrors.cloud.tencent.com/pypi/simple',
  'https://mirrors.163.com/pypi/simple',
  'https://pypi.doubanio.com/simple',
  'https://mirrors.hust.edu.cn/pypi/web/simple',
  'https://mirrors.bfsu.edu.cn/pypi/web/simple',
]

const pipProxyDisplay = computed({
  get: () => SystemSettings.value.PIP_PROXY || null,
  set: (value: string | null) => {
    SystemSettings.value.PIP_PROXY = value || ''
  },
})

const moviePilotAutoUpdate = computed({
  get: () => ['release', 'dev'].includes(SystemSettings.value.MOVIEPILOT_AUTO_UPDATE),
  set: (value: boolean) => {
    SystemSettings.value.MOVIEPILOT_AUTO_UPDATE = value ? 'release' : 'false'
  },
})

async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (!result.success) return

    const systemSettings = SystemSettings.value as Record<string, unknown>
    for (const key of Object.keys(systemSettings)) {
      if (Object.hasOwn(result.data, key)) systemSettings[key] = result.data[key]
    }
    if (!['', 'bing'].includes(SystemSettings.value.WALLPAPER)) SystemSettings.value.WALLPAPER = ''
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
      'AUTO_UPDATE_RESOURCE',
      'MOVIEPILOT_AUTO_UPDATE',
      'LOG_LEVEL',
      'LOG_MAX_FILE_SIZE',
      'LOG_BACKUP_COUNT',
      'LOG_FILE_FORMAT',
      'PLUGIN_AUTO_RELOAD',
      'PLUGIN_LOCAL_REPO_PATHS',
    ])
    if (saved) {
      advancedDialog.value = false
      $toast.success(t('setting.system.advancedSaveSuccess'))
    } else {
      $toast.error(t('setting.system.saveFailed'))
    }
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.system.saveFailed'))
  } finally {
    savingAdvanced.value = false
  }
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
  await loadSystemSettings()
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
              <VTextField
                v-model="SystemSettings.APP_DOMAIN"
                :label="t('setting.system.appDomain')"
                :hint="t('setting.system.appDomainHint')"
                placeholder="http://localhost:3000"
                persistent-hint
                prepend-inner-icon="mdi-domain"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="SystemSettings.API_TOKEN"
                :label="t('setting.system.apiToken')"
                :hint="t('setting.system.apiTokenHint')"
                :placeholder="t('setting.system.apiTokenMinChars')"
                persistent-hint
                prepend-inner-icon="mdi-key"
                :append-inner-icon="SystemSettings.API_TOKEN ? 'mdi-content-copy' : 'mdi-reload'"
                @click:append-inner="SystemSettings.API_TOKEN ? copyValue(SystemSettings.API_TOKEN) : createRandomString()"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="SystemSettings.GITHUB_TOKEN"
                :label="t('setting.system.githubToken')"
                :hint="t('setting.system.githubTokenHint')"
                :placeholder="t('setting.system.githubTokenFormat')"
                persistent-hint
                prepend-inner-icon="mdi-github"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="SystemSettings.WALLPAPER"
                :label="t('setting.system.wallpaper')"
                :hint="t('setting.system.wallpaperHint')"
                persistent-hint
                prepend-inner-icon="mdi-image"
                :items="[
                  { title: t('setting.system.wallpaperItems.none'), value: '' },
                  { title: t('setting.system.wallpaperItems.bing'), value: 'bing' },
                ]"
              />
            </VCol>
          </VRow>
          <div class="setting-actions mt-4">
            <VBtn color="primary" prepend-icon="mdi-content-save" :loading="savingBasic" @click="saveBasicSettings">
              {{ t('common.save') }}
            </VBtn>
            <VSpacer />
            <VBtn
              color="error"
              variant="tonal"
              prepend-icon="mdi-cog"
              append-icon="mdi-dots-horizontal"
              class="text-no-wrap setting-actions__secondary"
              @click="advancedDialog = true"
            >
              {{ t('setting.system.advancedSettings') }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <AccountSettingDownloader :active="props.active" />

  <VDialog
    v-if="advancedDialog"
    v-model="advancedDialog"
    scrollable
    max-width="60rem"
    :fullscreen="!display.mdAndUp.value"
  >
    <VCard>
      <VCardItem class="py-2">
        <template #prepend>
          <VIcon icon="mdi-cog" class="me-2" />
        </template>
        <VCardTitle>{{ t('setting.system.advancedSettings') }}</VCardTitle>
        <VCardSubtitle>{{ t('setting.system.advancedSettingsDesc') }}</VCardSubtitle>
      </VCardItem>
      <VDialogCloseBtn v-model="advancedDialog" />
      <VDivider />
      <VCardText>
        <VTabs v-model="activeTab" show-arrows class="v-tabs-pill">
          <VTab value="system">{{ t('setting.system.system') }}</VTab>
          <VTab value="network">{{ t('setting.system.network') }}</VTab>
          <VTab value="log">{{ t('setting.system.log') }}</VTab>
          <VTab value="dev">{{ t('setting.system.lab') }}</VTab>
        </VTabs>

        <VWindow v-model="activeTab" class="mt-4 disable-tab-transition" :touch="false">
          <VWindowItem value="system">
            <VRow>
              <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.DEBUG"
                    :label="t('setting.system.debug')"
                    :hint="t('setting.system.debugHint')"
                    persistent-hint
                  />
              </VCol>
              <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.PLUGIN_AUTO_RELOAD"
                    :label="t('setting.system.pluginAutoReload')"
                    :hint="t('setting.system.pluginAutoReloadHint')"
                    persistent-hint
                  />
              </VCol>
              <VCol cols="12" md="6">
                  <VSwitch
                    v-model="moviePilotAutoUpdate"
                    :label="t('setting.system.moviePilotAutoUpdate')"
                    :hint="t('setting.system.moviePilotAutoUpdateHint')"
                    persistent-hint
                  />
              </VCol>
              <VCol cols="12" md="6">
                  <VSwitch
                    v-model="SystemSettings.AUTO_UPDATE_RESOURCE"
                    :label="t('setting.system.autoUpdateResource')"
                    :hint="t('setting.system.autoUpdateResourceHint')"
                    persistent-hint
                  />
              </VCol>
            </VRow>
          </VWindowItem>

            <VWindowItem value="network">
              <VRow>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="SystemSettings.PROXY_HOST"
                    :label="t('setting.system.proxyHost')"
                    placeholder="http://127.0.0.1:7890"
                    :hint="t('setting.system.proxyHostHint')"
                    persistent-hint
                    prepend-inner-icon="mdi-server-network"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="SystemSettings.GITHUB_PROXY"
                    :label="t('setting.system.githubProxy')"
                    :placeholder="t('setting.system.githubProxyPlaceholder')"
                    :hint="t('setting.system.githubProxyHint')"
                    persistent-hint
                    prepend-inner-icon="mdi-github"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VCombobox
                    v-model="pipProxyDisplay"
                    :label="t('setting.system.pipProxy')"
                    :placeholder="t('setting.system.pipProxyPlaceholder')"
                    :hint="t('setting.system.pipProxyHint')"
                    :items="pipMirrorsItems"
                    clearable
                    persistent-hint
                    prepend-inner-icon="mdi-package"
                  />
                </VCol>
              </VRow>
            </VWindowItem>

            <VWindowItem value="log">
              <VRow>
                <VCol cols="12" md="6">
                  <VSelect
                    v-model="SystemSettings.LOG_LEVEL"
                    :label="t('setting.system.logLevel')"
                    :hint="t('setting.system.logLevelHint')"
                    persistent-hint
                    :items="['INFO', 'WARNING', 'ERROR']"
                    prepend-inner-icon="mdi-format-list-bulleted"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="SystemSettings.LOG_MAX_FILE_SIZE"
                    :label="t('setting.system.logMaxFileSize')"
                    :hint="t('setting.system.logMaxFileSizeHint')"
                    type="number"
                    persistent-hint
                    prepend-inner-icon="mdi-file-document-outline"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="SystemSettings.LOG_BACKUP_COUNT"
                    :label="t('setting.system.logBackupCount')"
                    :hint="t('setting.system.logBackupCountHint')"
                    type="number"
                    persistent-hint
                    prepend-inner-icon="mdi-file-restore-outline"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model="SystemSettings.LOG_FILE_FORMAT"
                    :label="t('setting.system.logFileFormat')"
                    :hint="t('setting.system.logFileFormatHint')"
                    persistent-hint
                    prepend-inner-icon="mdi-text-box-outline"
                  />
                </VCol>
              </VRow>
            </VWindowItem>

            <VWindowItem value="dev">
              <VRow>
                <VCol cols="12">
                  <VTextField
                    v-model="SystemSettings.PLUGIN_LOCAL_REPO_PATHS"
                    :label="t('setting.system.pluginLocalRepoPaths')"
                    :hint="t('setting.system.pluginLocalRepoPathsHint')"
                    persistent-hint
                    prepend-inner-icon="mdi-folder"
                  />
                </VCol>
              </VRow>
            </VWindowItem>
        </VWindow>
      </VCardText>
      <VCardActions class="app-dialog-actions">
        <VSpacer />
        <VBtn
          color="primary"
          variant="flat"
          prepend-icon="mdi-content-save"
          class="px-5"
          :loading="savingAdvanced"
          @click="saveAdvancedSettings"
        >
          {{ t('common.save') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.setting-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.setting-actions__secondary {
  flex-shrink: 0;
}
</style>
