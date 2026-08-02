<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import api from '@/api'
import type { DownloaderConf } from '@/api/types'
import DownloaderCard from '@/components/cards/DownloaderCard.vue'
import { downloaderOptions } from '@/api/constants'
import { useI18n } from 'vue-i18n'
import { useSilentSettingRefresh } from '@/composables/useSilentSettingRefresh'

const { t } = useI18n()
const $toast = useToast()

const props = defineProps({
  active: {
    type: Boolean,
    default: true,
  },
})

const downloaders = ref<DownloaderConf[]>([])
interface LiteDownloadDirectory {
  name: string
  priority: number
  storage: 'local'
  download_path: string
}

const directories = ref<LiteDownloadDirectory[]>([])

interface DownloadersResponse {
  data?: {
    value?: DownloaderConf[]
  }
  success: boolean
}

interface DirectoryResponse {
  data?: {
    value?: LiteDownloadDirectory[]
  }
  success: boolean
}

async function loadDownloaders() {
  try {
    const result = await api.get('system/setting/Downloaders') as DownloadersResponse
    downloaders.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

/** 加载 Lite 本地下载目录。 */
async function loadDirectories() {
  try {
    const result = await api.get('system/setting/DownloadDirectories') as DirectoryResponse
    directories.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

async function saveDownloaders() {
  try {
    const result = await api.post('system/setting/Downloaders', downloaders.value) as DownloadersResponse
    if (result.success) $toast.success(t('setting.system.downloaderSaveSuccess'))
    else $toast.error(t('setting.system.downloaderSaveFailed'))
    await loadDownloaders()
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.system.downloaderSaveFailed'))
  }
}

/** 保存 Lite 本地下载目录。 */
async function saveDirectories() {
  directories.value.forEach((directory, index) => { directory.priority = index })
  try {
    const result = await api.post('system/setting/DownloadDirectories', directories.value) as DirectoryResponse
    if (result.success) $toast.success(t('setting.system.directorySaveSuccess'))
    else $toast.error(t('setting.system.directorySaveFailed'))
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.system.directorySaveFailed'))
  }
}

/** 新增一个空的本地下载目录配置。 */
function addDirectory() {
  directories.value.push({
    name: `${t('setting.system.defaultDownloadDirectory')} ${directories.value.length + 1}`,
    priority: directories.value.length,
    storage: 'local',
    download_path: '',
  })
}

/** 删除指定的本地下载目录配置。 */
function removeDirectory(directory: LiteDownloadDirectory) {
  directories.value = directories.value.filter(item => item !== directory)
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

onMounted(() => {
  void loadDownloaders()
  void loadDirectories()
})

useSilentSettingRefresh(() => {
  void loadDownloaders()
  void loadDirectories()
}, {
  active: computed(() => props.active),
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.system.downloaderSettings') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.system.downloaderSettingsDesc') }}</VCardSubtitle>
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
            <VBtn color="success" variant="tonal" prepend-icon="mdi-plus">
              {{ t('setting.system.addDownloader') }}
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
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.system.downloadDirectorySettings') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.system.downloadDirectorySettingsDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <div v-if="directories.length" class="grid gap-3">
            <VCard v-for="directory in directories" :key="directory.priority" variant="outlined">
              <VCardText class="d-flex flex-wrap align-center gap-3">
                <VTextField
                  v-model="directory.name"
                  class="directory-name-field"
                  density="compact"
                  :label="t('setting.system.directoryName')"
                  prepend-inner-icon="mdi-folder-outline"
                  hide-details
                />
                <VTextField
                  v-model="directory.download_path"
                  class="directory-path-field"
                  density="compact"
                  :label="t('setting.system.downloadPath')"
                  prepend-inner-icon="mdi-folder-download-outline"
                  hide-details
                />
                <VBtn icon="mdi-delete-outline" variant="text" color="error" :aria-label="t('setting.system.removeDownloadDirectory')" @click="removeDirectory(directory)" />
              </VCardText>
            </VCard>
          </div>
          <VAlert v-else type="info" variant="tonal">{{ t('setting.system.noDownloadDirectories') }}</VAlert>
          <div class="d-flex flex-wrap gap-4 mt-4">
            <VBtn color="primary" prepend-icon="mdi-content-save" @click="saveDirectories">{{ t('common.save') }}</VBtn>
            <VBtn color="success" variant="tonal" prepend-icon="mdi-plus" @click="addDirectory">{{ t('setting.system.addDownloadDirectory') }}</VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.directory-name-field { flex: 1 1 14rem; min-width: min(100%, 14rem); }
.directory-path-field { flex: 2 1 24rem; min-width: min(100%, 20rem); }
</style>
