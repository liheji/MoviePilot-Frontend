<script lang="ts" setup>
import type { PropType } from 'vue'
import { formatFileSize } from '@/@core/utils/formatters'
import api from '@/api'
import type { Context } from '@/api/types'
import AddDownloadDialog from '../dialog/AddDownloadDialog.vue'
import { isNullOrEmptyObject } from '@/@core/utils'

// 输入参数
const props = defineProps({
  torrent: Object as PropType<Context>,
  more: Array as PropType<Context[]>,
  width: String,
  height: String,
})

// 更多来源界面
const showMoreTorrents = ref(false)

// 种子信息
const torrent = ref(props.torrent?.torrent_info)

// 媒体信息
const media = ref(props.torrent?.media_info)

// 识别元数据
const meta = ref(props.torrent?.meta_info)

// 当前下载项
const downloadItem = ref(props.torrent)

// 站点图标
const siteIcons = ref<Record<number, string>>({})

// 存储是否已经下载过的记录
const downloaded = ref<string[]>([])

// 添加下载对话框
const addDownloadDialog = ref(false)

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

// 查询站点图标
async function getSiteIcon(site: number | undefined) {
  if (!site) return
  try {
    siteIcons.value[site] = (await api.get(`site/icon/${site}`)).data.icon
  } catch (error) {
    console.error(error)
  }
}

// 询问并添加下载
async function handleAddDownload(item: Context | null = null) {
  if (item && !isNullOrEmptyObject(item)) {
    downloadItem.value = item
  }
  // 打开下载对话框
  addDownloadDialog.value = true
}

// 打开种子详情页面
function openTorrentDetail() {
  window.open(torrent.value?.page_url, '_blank')
}

// 下载种子文件
async function downloadTorrentFile() {
  window.open(torrent.value?.enclosure, '_blank')
}

// 获取优惠类型样式
function getPromotionClass(downloadVolumeFactor: number | undefined, uploadVolumeFactor: number | undefined) {
  if (!downloadVolumeFactor) return 'free-discount'
  if (downloadVolumeFactor === 0) return 'free-discount'
  else if (downloadVolumeFactor < 1) return 'percent-discount'
  else if (uploadVolumeFactor !== undefined && uploadVolumeFactor > 1) return 'upload-bonus'
  else return ''
}

// 打开更多来源对话框
async function openMoreTorrentsDialog() {
  props.more?.forEach(t => {
    return getSiteIcon(t.torrent_info?.site)
  })
  showMoreTorrents.value = true
}

// 装载时查询站点图标
onMounted(() => {
  getSiteIcon(props.torrent?.torrent_info?.site)
})
</script>

<template>
  <div>
    <VCard
      :width="props.width || '100%'"
      height="300px"
      :variant="downloaded.includes(torrent?.enclosure || '') ? 'outlined' : 'flat'"
      @click="handleAddDownload(props.torrent)"
      class="torrent-card"
      :class="{ 'downloaded-card': downloaded.includes(torrent?.enclosure || '') }"
    >
      <!-- 优惠标签 -->
      <div
        v-if="torrent?.downloadvolumefactor !== 1 || torrent?.uploadvolumefactor !== 1"
        class="discount-banner"
        :class="getPromotionClass(torrent?.downloadvolumefactor, torrent?.uploadvolumefactor)"
      >
        {{ torrent?.volume_factor }}
      </div>

      <!-- 媒体标题 -->
      <div class="card-header">
        <div class="media-title-wrapper">
          <h3 class="media-title">
            {{ media?.title ?? meta?.name }}
            <span v-if="meta?.season_episode" class="season-tag">{{ meta?.season_episode }}</span>
          </h3>
        </div>

        <!-- 站点信息条 -->
        <div class="site-info">
          <div class="d-flex align-center">
            <img v-if="siteIcons[torrent?.site || 0]" :src="siteIcons[torrent?.site || 0]" class="site-icon" />
            <span v-else class="site-fallback">{{ torrent?.site_name?.substring(0, 1) }}</span>
            <span class="site-name">{{ torrent?.site_name }}</span>
          </div>

          <div class="seeder-peers">
            <span v-if="torrent?.seeders" class="seed-info">
              <VIcon size="small" color="success" icon="mdi-arrow-up"></VIcon>{{ torrent?.seeders }}
            </span>
            <span v-if="torrent?.peers" class="peer-info">
              <VIcon size="small" color="warning" icon="mdi-arrow-down"></VIcon>{{ torrent?.peers }}
            </span>
          </div>
        </div>
      </div>

      <!-- 种子内容 -->
      <div class="card-content">
        <!-- 种子标题 -->
        <div class="torrent-title" :title="torrent?.title">
          {{ torrent?.title }}
        </div>

        <!-- 种子描述 -->
        <div
          v-if="meta?.subtitle || torrent?.description"
          class="torrent-desc"
          :title="meta?.subtitle || torrent?.description"
        >
          {{ meta?.subtitle || torrent?.description }}
        </div>

        <!-- 资源标签区 -->
        <div class="tags-container">
          <div v-if="meta?.edition" class="resource-tag edition">{{ meta?.edition }}</div>
          <div v-if="meta?.resource_pix" class="resource-tag resolution">{{ meta?.resource_pix }}</div>
          <div v-if="meta?.video_encode" class="resource-tag codec">{{ meta?.video_encode }}</div>
          <div v-if="meta?.resource_team" class="resource-tag team">{{ meta?.resource_team }}</div>
          <div v-for="(label, index) in torrent?.labels" :key="index" class="resource-tag label">{{ label }}</div>
          <div v-if="torrent?.hit_and_run" class="resource-tag hr">H&R</div>
          <div v-if="torrent?.freedate_diff" class="resource-tag expire">{{ torrent?.freedate_diff }}</div>
        </div>
      </div>

      <!-- 卡片底部信息 -->
      <div class="card-footer">
        <div class="more-sources-wrapper" v-if="props.more && props.more.length > 0">
          <div class="more-sources-toggle" @click.stop="openMoreTorrentsDialog">
            <VIcon :icon="showMoreTorrents ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="small" class="me-1"></VIcon>
            <span>更多来源 ({{ props.more.length }})</span>
          </div>
        </div>

        <VSpacer />

        <!-- 体积和详情按钮并排 -->
        <div class="card-actions">
          <div v-if="torrent?.size" class="size-badge">
            {{ formatFileSize(torrent.size) }}
          </div>

          <VBtn
            size="small"
            icon="mdi-information-outline"
            variant="text"
            color="primary"
            class="detail-btn"
            @click.stop="openTorrentDetail"
          ></VBtn>
        </div>
      </div>
    </VCard>

    <!-- 更多来源对话框 - 改为独立对话框 -->
    <VDialog v-model="showMoreTorrents" max-width="380px" location="center">
      <VCard>
        <VCardTitle class="py-2 d-flex align-center">
          <span>其他来源</span>
          <VSpacer />
          <VBtn variant="text" size="small" icon="mdi-close" @click.stop="showMoreTorrents = false"></VBtn>
        </VCardTitle>

        <VDivider />

        <VCardText class="more-sources-content">
          <div
            v-for="(item, index) in props.more"
            :key="index"
            @click.stop="handleAddDownload(item)"
            class="more-source-item cursor-pointer"
          >
            <div class="source-site-info">
              <img
                v-if="siteIcons[item.torrent_info?.site || 0]"
                :src="siteIcons[item.torrent_info?.site || 0]"
                class="source-site-icon"
              />
              <span v-else class="source-site-fallback">{{ item.torrent_info?.site_name?.substring(0, 1) }}</span>
              <span class="source-site-name">{{ item.torrent_info.site_name }}</span>

              <span
                v-if="item.torrent_info?.downloadvolumefactor !== 1 || item.torrent_info?.uploadvolumefactor !== 1"
                class="source-discount"
                :class="
                  getPromotionClass(item.torrent_info?.downloadvolumefactor, item.torrent_info?.uploadvolumefactor)
                "
              >
                {{ item.torrent_info?.volume_factor }}
              </span>
            </div>

            <div class="source-stats">
              <span class="source-size">{{ formatFileSize(item.torrent_info?.size) }}</span>
              <span class="source-seeders">
                <VIcon size="x-small" color="success" icon="mdi-arrow-up"></VIcon>
                {{ item.torrent_info?.seeders }}
              </span>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <AddDownloadDialog
      v-if="addDownloadDialog"
      v-model="addDownloadDialog"
      :title="`${downloadItem?.media_info?.title_year || downloadItem?.meta_info?.name} ${
        downloadItem?.meta_info?.season_episode
      }`"
      :media="downloadItem?.media_info"
      :torrent="downloadItem?.torrent_info"
      @done="addDownloadSuccess"
      @error="addDownloadError"
      @close="addDownloadDialog = false"
    />
  </div>
</template>

<style scoped>
.torrent-card {
  overflow: hidden;
  border-radius: 12px;
  box-shadow: none;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  position: relative;
}

.torrent-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.discount-banner {
  position: absolute;
  top: 0;
  right: 0;
  color: white;
  padding: 4px 10px;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 0 0 0 12px;
  z-index: 2;
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

.size-badge {
  background-color: rgba(var(--v-theme-primary), 0.9);
  color: white;
  padding: 2px 8px;
  font-weight: 600;
  font-size: 0.8rem;
  border-radius: 4px;
  margin-right: 6px;
  display: flex;
  align-items: center;
}

.card-header {
  padding: 12px 16px 0;
}

.media-title-wrapper {
  margin-bottom: 8px;
}

.media-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.season-tag {
  font-size: 0.875rem;
  background-color: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: 600;
}

.site-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.site-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 2px;
}

.site-fallback {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.8);
  background-color: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 2px;
}

.site-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.seeder-peers {
  display: flex;
  align-items: center;
  gap: 12px;
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

.card-content {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}

.torrent-title {
  font-size: 0.9rem;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(var(--v-theme-on-surface), 0.87);
  margin-bottom: 8px;
}

.torrent-desc {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 4em;
  margin-bottom: 8px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
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

.card-footer {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  margin-top: auto;
}

.more-sources-wrapper {
  position: relative;
}

.more-sources-toggle {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-primary));
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.more-sources-toggle:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.more-sources-content {
  max-height: 60vh;
  overflow-y: auto;
}

.more-source-item {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.more-source-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.source-site-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.source-site-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.source-site-fallback {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
  background-color: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 2px;
}

.source-site-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.source-discount {
  font-weight: 700;
  font-size: 0.8rem;
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: 3px;
  color: white;
}

.source-stats {
  display: flex;
  align-items: center;
  gap: 10px;
}

.source-size {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.source-seeders {
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 600;
  font-size: 0.8rem;
}

.card-actions {
  display: flex;
  align-items: center;
}

.detail-btn {
  border-radius: 50%;
  min-width: 36px;
  height: 36px;
}

.downloaded-card {
  border: 2px solid #4caf50 !important;
  opacity: 0.85;
}

@media (max-width: 600px) {
  .media-title {
    font-size: 1rem;
  }

  .torrent-card {
    height: 260px;
  }

  .resource-tag {
    font-size: 0.75rem;
    padding: 2px 6px;
  }
}

.full-text {
  white-space: normal;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.5;
}

.menu-activator {
  width: 100%;
  cursor: pointer;
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
</style>
