<script lang="ts" setup>
import type { PropType } from 'vue'
import { formatFileSize } from '@/@core/utils/formatters'
import api from '@/api'
import type { Context } from '@/api/types'
import AddDownloadDialog from '../dialog/AddDownloadDialog.vue'

// 输入参数
const props = defineProps({
  torrent: Object as PropType<Context>,
})

// 种子信息
const torrent = ref(props.torrent?.torrent_info)

// 媒体信息
const media = ref(props.torrent?.media_info)

// 识别元数据
const meta = ref(props.torrent?.meta_info)

// 站点图标
const siteIcon = ref('')

// 站点图标加载状态
const iconLoading = ref(false)
const iconError = ref(false)

// 存储是否已经下载过的记录
const downloaded = ref<string[]>([])

// 添加下载对话框
const addDownloadDialog = ref(false)

// 查询站点图标
async function getSiteIcon() {
  if (!torrent?.value?.site || iconLoading.value) {
    return
  }

  iconLoading.value = true
  iconError.value = false

  try {
    const response = await api.get(`site/icon/${torrent.value.site}`)
    if (response && response.data && response.data.icon) {
      siteIcon.value = response.data.icon
    } else {
      iconError.value = true
    }
  } catch (error) {
    console.error('Failed to load site icon:', error)
    iconError.value = true
  } finally {
    iconLoading.value = false
  }
}

// 获取优惠类型样式
function getPromotionClass(downloadVolumeFactor: number | undefined, uploadVolumeFactor: number | undefined) {
  if (!downloadVolumeFactor) return 'free-discount'
  if (downloadVolumeFactor === 0) return 'free-discount'
  else if (downloadVolumeFactor < 1) return 'percent-discount'
  else if (uploadVolumeFactor !== undefined && uploadVolumeFactor > 1) return 'upload-bonus'
  else return ''
}

// 询问并添加下载
async function handleAddDownload() {
  // 打开下载对话框
  addDownloadDialog.value = true
}

// 添加下载成功
function addDownloadSuccess(url: string) {
  addDownloadDialog.value = false
  // 添加下载成功
  downloaded.value.push(url)
}

// 添加下载失败
function addDownloadError(error: string) {
  addDownloadDialog.value = false
}

// 打开种子详情页面
function openTorrentDetail() {
  window.open(torrent.value?.page_url, '_blank')
}

// 装载时查询站点图标
onMounted(() => {
  getSiteIcon()
})
</script>

<template>
  <div class="list-item-wrapper">
    <VListItem
      :value="props.torrent?.torrent_info?.enclosure"
      class="torrent-item rounded"
      :class="{ 'downloaded-item': downloaded.includes(torrent?.enclosure || '') }"
      @click="handleAddDownload"
    >
      <template v-slot:prepend>
        <div class="site-wrapper">
          <img :alt="torrent?.site_name" v-if="siteIcon" :src="siteIcon" class="site-icon" />
          <span v-else class="site-fallback">{{ torrent?.site_name?.substring(0, 1) }}</span>
          <div class="site-name d-none d-sm-block">{{ torrent?.site_name }}</div>
          <span
            v-if="torrent?.downloadvolumefactor !== 1 || torrent?.uploadvolumefactor !== 1"
            class="free-tag"
            :class="getPromotionClass(torrent?.downloadvolumefactor, torrent?.uploadvolumefactor)"
          >
            {{ torrent?.volume_factor }}
          </span>
        </div>
      </template>

      <VListItemTitle class="item-content">
        <div class="item-header">
          <div class="media-info flex flex-row flex-wrap justify-start">
            <span class="media-title me-2">{{ media?.title ?? meta?.name }}</span>
            <span v-if="meta?.season_episode" class="season-tag">{{ meta?.season_episode }}</span>
          </div>
        </div>

        <div class="torrent-title" :title="torrent?.title">
          {{ torrent?.title }}
        </div>

        <div class="torrent-description" :title="meta?.subtitle || torrent?.description || '暂无描述'">
          {{ meta?.subtitle || torrent?.description || '暂无描述' }}
        </div>

        <div class="tags-container">
          <div v-if="meta?.edition" class="resource-tag edition">{{ meta?.edition }}</div>
          <div v-if="meta?.resource_pix" class="resource-tag resolution">{{ meta?.resource_pix }}</div>
          <div v-if="meta?.video_encode" class="resource-tag codec">{{ meta?.video_encode }}</div>
          <div v-if="meta?.resource_team" class="resource-tag team">{{ meta?.resource_team }}</div>
          <div v-for="(label, index) in torrent?.labels" :key="index" class="resource-tag label">{{ label }}</div>
          <div v-if="torrent?.hit_and_run" class="resource-tag hr">H&R</div>
          <div v-if="torrent?.freedate_diff" class="resource-tag expire">{{ torrent?.freedate_diff }}</div>
        </div>
      </VListItemTitle>

      <template v-slot:append>
        <div class="item-actions">
          <div class="torrent-stats">
            <span v-if="torrent?.seeders" class="seed-info">
              <VIcon size="small" color="success" icon="mdi-arrow-up"></VIcon>{{ torrent?.seeders }}
            </span>
            <span v-if="torrent?.peers" class="peer-info">
              <VIcon size="small" color="warning" icon="mdi-arrow-down"></VIcon>{{ torrent?.peers }}
            </span>
          </div>

          <div class="action-buttons">
            <div v-if="torrent?.size" class="size-badge">
              {{ formatFileSize(torrent.size) }}
            </div>

            <VBtn
              density="comfortable"
              variant="text"
              color="primary"
              icon="mdi-information-outline"
              size="small"
              class="detail-btn"
              @click.stop="openTorrentDetail"
            ></VBtn>
          </div>
        </div>
      </template>
    </VListItem>

    <AddDownloadDialog
      v-if="addDownloadDialog"
      v-model="addDownloadDialog"
      :title="`${media?.title_year || meta?.name} ${meta?.season_episode || ''}`"
      :media="media"
      :torrent="torrent"
      @done="addDownloadSuccess"
      @error="addDownloadError"
      @close="addDownloadDialog = false"
    />
  </div>
</template>

<style scoped>
.list-item-wrapper {
  inline-size: 100%;
}

.torrent-item {
  padding: 12px;
  box-shadow: none;
  margin-block-end: 8px;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.torrent-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background-color: rgba(var(--v-theme-primary), 0.04);
  transform: translateY(-2px);
}

.site-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-inline-size: 100px;
}

.site-icon {
  border-radius: 4px;
  block-size: 32px;
  inline-size: 32px;
  margin-inline-end: 8px;
}

.site-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: rgba(var(--v-theme-primary), 0.1);
  block-size: 24px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.8rem;
  font-weight: 700;
  inline-size: 24px;
  margin-inline-end: 8px;
}

.site-name {
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 0.9rem;
  font-weight: 600;
  margin-inline-end: 8px;
}

.season-tag {
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: #5c6bc0;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  margin-inline-end: 8px;
  padding-block: 2px;
  padding-inline: 6px;
}

.free-tag {
  position: absolute;
  z-index: 1;
  border-radius: 4px;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  inset-block-start: 0;
  inset-inline-end: 0;
  padding-block: 2px;
  padding-inline: 6px;
}

.free-discount {
  background-color: #4caf50;
  font-weight: 700;
}

.percent-discount {
  background-color: #ff5722;
}

.upload-bonus {
  background-color: #9c27b0;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  inline-size: 100%;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  inline-size: 100%;
}

.media-info {
  align-items: center;
}

.media-title {
  color: rgba(var(--v-theme-on-surface), 0.87);
  font-size: 1.125rem;
  font-weight: 600;
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.torrent-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-buttons {
  display: flex;
  align-items: center;
}

.seed-info {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  gap: 4px;
}

.peer-info {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  gap: 4px;
}

.size-badge {
  border-radius: 4px;
  background-color: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-size: 0.9rem;
  font-weight: 600;
  margin-inline-end: 6px;
  padding-block: 2px;
  padding-inline: 8px;
}

.torrent-title {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.87);
  font-size: 0.9rem;
  margin-block-end: 6px;
  max-inline-size: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.torrent-description {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 0.8rem;
  inline-size: 100%;
  margin-block-end: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.resource-tag {
  border-radius: 4px;
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  padding-block: 3px;
  padding-inline: 8px;
}

.edition {
  background-color: #f44336;
}

.resolution {
  background-color: #e91e63;
}

.codec {
  background-color: #ff9800;
}

.team {
  background-color: #03a9f4;
}

.expire {
  background-color: #9c27b0;
}

.label {
  background-color: #3f51b5;
}

.hr {
  background-color: #000;
}

.detail-btn {
  border-radius: 50%;
}

.downloaded-item {
  border-inline-start: 4px solid #4caf50;
  opacity: 0.85;
}

.break-words {
  word-break: break-word;
  word-wrap: break-word;
}

.overflow-visible {
  overflow: visible !important;
}

.whitespace-break-spaces {
  white-space: normal !important;
}

@media (width <= 600px) {
  .torrent-item {
    padding: 8px;
  }

  .site-icon,
  .site-fallback {
    block-size: 24px;
    inline-size: 24px;
  }

  .site-wrapper {
    flex-wrap: wrap;
    margin-inline-end: 10px;
    min-inline-size: 24px;
  }

  .site-name {
    font-size: 0.8rem;
    margin-inline-end: 4px;
  }

  .size-badge {
    font-size: 0.7rem;
  }

  .resource-tag {
    font-size: 0.75rem;
    padding-block: 2px;
    padding-inline: 6px;
  }

  .action-buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .torrent-description {
    max-inline-size: calc(100vw - 150px);
  }
}
</style>
