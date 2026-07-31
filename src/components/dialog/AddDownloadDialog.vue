<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import api from '@/api'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import type { DownloaderConf, TorrentInfo } from '@/api/types'
import { formatFileSize } from '@/@core/utils/formatters'
import { useI18n } from 'vue-i18n'
import { buildLiteDownloadPayload } from '@/utils/liteDownload'

const { t } = useI18n()
const props = defineProps({
  resultHandle: String,
  title: String,
  torrent: Object as PropType<TorrentInfo>,
})
const emit = defineEmits(['done', 'error', 'close'])
const $toast = useToast()
const selectedDownloader = ref<string | null>(null)
const selectedDirectory = ref<string | null>(null)
const downloaders = ref<DownloaderConf[]>([])
const directories = ref<{ name?: string; save_path?: string }[]>([])
const loading = ref(false)

const dialogSubtitle = computed(() => [props.torrent?.site_name, props.title || props.torrent?.title].filter(Boolean).join(' - '))
const downloaderOptions = computed(() => downloaders.value.map(item => ({ title: item.name, value: item.name })))
const directoryOptions = computed(() => directories.value
  .filter(item => item.save_path)
  .map(item => ({ title: item.name || item.save_path, value: item.save_path })))

/** 加载可用下载器和后端允许的保存目录。 */
async function loadChoices() {
  try {
    const [downloadersResult, directoriesResult] = await Promise.all([
      api.get('download/clients'),
      api.get('download/paths'),
    ])
    downloaders.value = downloadersResult as unknown as DownloaderConf[]
    directories.value = directoriesResult as unknown as { name?: string; save_path?: string }[]
  } catch (error) {
    console.error(error)
  }
}

/** 提交不透明句柄，禁止浏览器直接打开或传递种子认证字段。 */
async function addDownload() {
  const resultHandle = props.resultHandle || props.torrent?.enclosure
  if (!resultHandle) {
    emit('error', '缺少种子结果句柄')
    return
  }
  startNProgress()
  loading.value = true
  try {
    const result: { success?: boolean; message?: string } = await api.post(
      'download/add',
      buildLiteDownloadPayload({
        resultHandle,
        downloader: selectedDownloader.value,
        savePath: selectedDirectory.value,
      }),
    )
    if (result?.success) {
      $toast.success(t('dialog.addDownload.downloadSuccess', { site: props.torrent?.site_name, title: props.torrent?.title }))
      emit('done', resultHandle)
      return
    }
    $toast.error(result?.message || t('dialog.addDownload.downloadFailed', { site: props.torrent?.site_name, title: props.torrent?.title }))
    emit('error', result?.message)
  } catch (error) {
    console.error(error)
    emit('error', error instanceof Error ? error.message : String(error))
  } finally {
    loading.value = false
    doneNProgress()
  }
}

onMounted(loadChoices)
</script>

<template>
  <VDialog max-width="35rem" scrollable>
    <VCard>
      <VCardItem class="py-2">
        <template #prepend><VIcon icon="mdi-download" class="me-2" /></template>
        <VCardTitle>{{ t('dialog.addDownload.confirmDownload') }}</VCardTitle>
        <VCardSubtitle>{{ dialogSubtitle }}</VCardSubtitle>
      </VCardItem>
      <VDialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardText>
        <VList lines="one">
          <VListItem :title="torrent?.title || title" />
          <VListItem v-if="torrent?.description" :title="torrent.description" />
          <VListItem v-if="torrent?.size" :title="formatFileSize(torrent.size)" />
        </VList>
        <VSelect v-model="selectedDownloader" :items="downloaderOptions" :label="t('dialog.addDownload.downloader')" prepend-inner-icon="mdi-download" />
        <VSelect v-model="selectedDirectory" :items="directoryOptions" :label="t('dialog.addDownload.savePath')" clearable prepend-inner-icon="mdi-folder" />
      </VCardText>
      <VDivider />
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="emit('close')">{{ t('common.cancel') }}</VBtn>
        <VBtn color="primary" :loading="loading" prepend-icon="mdi-download" @click="addDownload">
          {{ t('dialog.addDownload.startDownload') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
