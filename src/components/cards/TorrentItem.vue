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

// 更多来源界面
const showMoreTorrents = ref(false)

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

// 获取站点颜色
function getSiteColor(siteId: string | number | undefined) {
  if (!siteId) return '#3F51B5'

  // 根据站点ID生成不同颜色
  const colors = [
    '#3F51B5',
    '#673AB7',
    '#9C27B0',
    '#E91E63',
    '#F44336',
    '#FF5722',
    '#FF9800',
    '#FFC107',
    '#4CAF50',
    '#009688',
    '#00BCD4',
    '#03A9F4',
  ]

  // 简单哈希函数
  let hash = 0
  const idStr = String(siteId)
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
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

// 下载种子文件
async function downloadTorrentFile() {
  window.open(torrent.value?.enclosure, '_blank')
}

// 促销Chip类
function getVolumeFactorClass(downloadVolume: number | undefined, uploadVolume: number | undefined) {
  if (!downloadVolume) return 'text-white bg-gray-500'
  if (downloadVolume === 0) return 'text-white bg-lime-500'
  else if (downloadVolume < 1) return 'text-white bg-green-500'
  else if (uploadVolume !== undefined && uploadVolume !== 1) return 'text-white bg-sky-500'
  else return 'text-white bg-gray-500'
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
      class="torrent-item"
      :class="{ 'downloaded-item': downloaded.includes(torrent?.enclosure || '') }"
      @click="handleAddDownload"
    >
      <template v-slot:prepend>
        <div class="site-wrapper">
          <img :alt="torrent?.site_name" v-if="siteIcon" :src="siteIcon" class="site-icon" />
          <span v-else class="site-fallback">{{ torrent?.site_name?.substring(0, 1) }}</span>
          <div class="site-name">{{ torrent?.site_name }}</div>
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
          <div class="media-info">
            <span class="media-title">{{ media?.title ?? meta?.name }}</span>
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
  width: 100%;
}

.torrent-item {
  transition: background-color 0.2s ease, transform 0.2s ease;
  margin-bottom: 8px;
  padding: 12px;
  background-color: rgb(var(--v-theme-surface));
  box-shadow: none;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.torrent-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.site-wrapper {
  display: flex;
  align-items: center;
  min-width: 100px;
  flex-wrap: wrap;
}

.site-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  margin-right: 8px;
}

.site-fallback {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  margin-right: 8px;
  font-size: 0.8rem;
}

.site-name {
  margin-right: 8px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 0.9rem;
}

.season-tag {
  font-size: 0.875rem;
  background-color: #5c6bc0;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 8px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.free-tag {
  position: absolute;
  top: -6px;
  right: -6px;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  z-index: 1;
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
  width: 100%;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.media-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.media-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.87);
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
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.peer-info {
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.size-badge {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin-right: 6px;
}

.torrent-title {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.87);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.torrent-description {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.resource-tag {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 4px;
  color: white;
  font-weight: 700;
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
  background-color: #000000;
}

.detail-btn {
  border-radius: 50%;
}

.downloaded-item {
  border-left: 4px solid #4caf50;
  opacity: 0.85;
}

.break-words {
  word-wrap: break-word;
  word-break: break-word;
}

.overflow-visible {
  overflow: visible !important;
}

.whitespace-break-spaces {
  white-space: normal !important;
}

@media (max-width: 600px) {
  .torrent-item {
    padding: 8px;
  }

  .media-title {
    font-size: 0.95rem;
  }

  .site-icon,
  .site-fallback {
    width: 24px;
    height: 24px;
  }

  .site-wrapper {
    min-width: 100px;
    flex-wrap: wrap;
    margin-right: 10px;
  }

  .site-name {
    font-size: 0.8rem;
    margin-right: 4px;
  }

  .season-tag {
    font-size: 0.75rem;
    padding: 1px 4px;
    margin-right: 4px;
  }

  .resource-tag {
    font-size: 0.75rem;
    padding: 2px 6px;
  }

  .action-buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .torrent-description {
    max-width: calc(100vw - 150px);
  }
}
</style>
