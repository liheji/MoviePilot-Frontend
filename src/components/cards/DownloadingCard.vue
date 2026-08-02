<script lang="ts" setup>
import api from '@/api'
import type { DownloadingInfo } from '@/api/types'
import { formatFileSize } from '@/@core/utils/formatters'

const { t } = useI18n()
const props = defineProps({
  info: Object as PropType<DownloadingInfo>,
  downloaderName: String,
})
const cardState = ref(true)
const isDownloading = ref(props.info?.state === 'downloading')
const edit = reactive({
  category: props.info?.category || '',
  download_limit: props.info?.download_limit ?? 0,
  save_path: props.info?.save_path || '',
  upload_limit: props.info?.upload_limit ?? 0,
})

watch(() => props.info?.state, state => { isDownloading.value = state === 'downloading' })

/** 暂停或恢复当前任务。 */
async function toggleDownload() {
  const operation = isDownloading.value ? 'stop' : 'start'
  const result = await api.get(`download/${operation}/${props.info?.hash}`, { params: { name: props.downloaderName } }) as unknown as { success?: boolean }
  if (result.success) isDownloading.value = !isDownloading.value
}

/** 删除当前下载任务。 */
async function deleteDownload() {
  const result = await api.delete(`download/${props.info?.hash}`, { params: { name: props.downloaderName } }) as unknown as { success?: boolean }
  if (result.success) cardState.value = false
}

/** 更新下载器支持的最小任务属性。 */
async function saveTask() {
  await api.put(`download/${props.info?.hash}`, {
    downloader: props.downloaderName,
    category: edit.category || undefined,
    download_limit: edit.download_limit,
    upload_limit: edit.upload_limit,
    save_path: edit.save_path || undefined,
  })
}
</script>

<template>
  <VCard v-if="cardState" flat border class="downloading-card">
    <VCardText>
      <div class="d-flex align-start gap-3">
        <div class="flex-grow-1 min-w-0">
          <div class="font-weight-medium break-all">{{ props.info?.title }}</div>
        </div>
        <VMenu location="bottom end">
          <template #activator="{ props: menuProps }"><VBtn v-bind="menuProps" icon="mdi-pencil" variant="text" /></template>
          <VCard width="320"><VCardText>
            <VTextField v-model="edit.category" :label="t('liteDownloadTask.category')" density="compact" />
            <VTextField v-model.number="edit.download_limit" :label="t('liteDownloadTask.downloadLimit')" type="number" density="compact" />
            <VTextField v-model.number="edit.upload_limit" :label="t('liteDownloadTask.uploadLimit')" type="number" density="compact" />
            <VTextField v-model="edit.save_path" :label="t('liteDownloadTask.savePath')" density="compact" />
            <VBtn color="primary" prepend-icon="mdi-content-save" @click="saveTask">{{ t('common.save') }}</VBtn>
          </VCardText></VCard>
        </VMenu>
      </div>
      <div class="text-body-2 text-medium-emphasis mt-3">{{ formatFileSize(props.info?.size || 0) }} · ↑ {{ props.info?.upspeed || 0 }}/s · ↓ {{ props.info?.dlspeed || 0 }}/s</div>
      <VProgressLinear class="mt-3" :model-value="props.info?.progress || 0" color="primary" />
    </VCardText>
    <VCardActions>
      <VBtn :icon="isDownloading ? 'mdi-pause' : 'mdi-play'" :title="isDownloading ? t('common.pause') : t('liteDownloadTask.resume')" @click="toggleDownload" />
      <VSpacer />
      <VBtn color="error" icon="mdi-trash-can-outline" :title="t('common.delete')" @click="deleteDownload" />
    </VCardActions>
  </VCard>
</template>

<style scoped>
.downloading-card { border-radius: 6px; min-height: 12rem; }
</style>
