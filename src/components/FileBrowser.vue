<script lang="ts" setup>
import type { Axios } from 'axios'
import FileList from './filebrowser/FileList.vue'
import FileToolbar from './filebrowser/FileToolbar.vue'
import FileNavigator from './filebrowser/FileNavigator.vue'
import type { EndPoints, FileItem, StorageConf } from '@/api/types'
import { storageOptions } from '@/api/constants'

// 输入参数
const props = defineProps({
  storages: Array as PropType<StorageConf[]>,
  tree: Boolean,
  endpoints: Object as PropType<EndPoints>,
  axios: {
    type: Object as PropType<Axios>,
    required: true,
  },
  axiosconfig: Object,
  item: {
    type: Object as PropType<FileItem>,
    required: true,
  },
  itemstack: {
    type: Array as PropType<FileItem[]>,
    default: () => [],
  },
})

// 对外事件
const emit = defineEmits(['pathchanged'])

const fileIcons = {
  // 压缩包
  zip: 'mdi-folder-zip-outline',
  rar: 'mdi-folder-zip-outline',
  bak: 'mdi-folder-zip-outline',
  tar: 'mdi-folder-zip-outline',
  gz: 'mdi-folder-zip-outline',
  bz2: 'mdi-folder-zip-outline',
  // 开发
  htm: 'mdi-language-html5',
  html: 'mdi-language-html5',
  vue: 'mdi-vuejs',
  js: 'mdi-nodejs',
  ts: 'mdi-language-typescript',
  json: 'mdi-file-document-outline',
  css: 'mdi-language-css3',
  scss: 'mdi-language-css3',
  less: 'mdi-language-css3',
  php: 'mdi-language-php',
  py: 'mdi-language-python',
  java: 'mdi-language-java',
  go: 'mdi-language-go',
  c: 'mdi-language-c',
  cpp: 'mdi-language-cpp',
  h: 'mdi-language-c',
  cs: 'mdi-language-csharp',
  sql: 'mdi-database',
  sh: 'mdi-language-bash',
  bat: 'mdi-language-bash',
  ps1: 'mdi-language-powershell',
  // markdown
  md: 'mdi-language-markdown-outline',
  markdown: 'mdi-language-markdown-outline',
  // 图片
  png: 'mdi-file-png-box',
  jpg: 'mdi-file-jpg-box',
  jpeg: 'mdi-file-jpg-box',
  gif: 'mdi-file-gif-box',
  bmp: 'mdi-file-image-box',
  webp: 'mdi-file-image-box',
  ico: 'mdi-file-image-box',
  svg: 'mdi-file-image-box',
  // 视频
  mp4: 'mdi-filmstrip',
  mkv: 'mdi-filmstrip',
  avi: 'mdi-filmstrip',
  wmv: 'mdi-filmstrip',
  mov: 'mdi-filmstrip',
  flv: 'mdi-filmstrip',
  rmvb: 'mdi-filmstrip',
  // 文档
  txt: 'mdi-file-document-outline',
  env: 'mdi-file-cog-outline',
  yml: 'mdi-file-cog-outline',
  yaml: 'mdi-file-cog-outline',
  conf: 'mdi-file-cog-outline',
  log: 'mdi-file-document-outline',
  csv: 'mdi-file-delimited',
  // office
  xls: 'mdi-file-excel',
  xlsx: 'mdi-file-excel',
  doc: 'mdi-file-word',
  docx: 'mdi-file-word',
  ppt: 'mdi-file-powerpoint',
  pptx: 'mdi-file-powerpoint',
  pdf: 'mdi-file-pdf',
  // 音频
  mp2: 'mdi-music',
  mp3: 'mdi-music',
  m4a: 'mdi-music',
  wma: 'mdi-music',
  aac: 'mdi-music',
  ogg: 'mdi-music',
  flac: 'mdi-music',
  wav: 'mdi-music',
  // 字体
  ttf: 'mdi-format-font',
  otf: 'mdi-format-font',
  woff: 'mdi-format-font',
  woff2: 'mdi-format-font',
  eot: 'mdi-format-font',
  // 字幕
  srt: 'mdi-subtitles-outline',
  ass: 'mdi-subtitles-outline',
  sub: 'mdi-subtitles-outline',
  // 其他
  other: 'mdi-file-outline',
}

// 加载次数
const loading = ref(0)
// 当前存储
const activeStorage = ref('local')
// 刷新
const refreshPending = ref(false)
// 排序
const sort = ref('name')

// 计算属性
const storagesArray = computed(() => {
  const storageCodes = props.storages?.map(item => item.type)
  return storageOptions.filter(item => storageCodes?.includes(item.value))
})

// 方法
function loadingChanged(loading: number) {
  if (loading) loading++
  else if (loading > 0) loading--
}

// 存储切换
async function storageChanged(storage: string) {
  activeStorage.value = storage
  emit('pathchanged', { storage: storage, path: '/', fileid: 'root' })
}

// 文件列表
const fileListItems = ref<FileItem[]>([])

// 路径变化
function pathChanged(item: FileItem) {
  emit('pathchanged', item)
}

// 文件列表数据更新
function fileListUpdated(items: FileItem[]) {
  fileListItems.value = items
}

// 排序变化
function sortChanged(s: string) {
  sort.value = s
  refreshPending.value = true
}

// 刷新浏览器
function refreshBrowser() {
  refreshPending.value = true
}
</script>

<template>
  <VCard class="file-browser" :loading="loading > 0" flat>
    <VCardTitle class="px-4 py-3 d-flex align-center file-browser-header">
      <VIcon icon="mdi-folder-open" color="primary" class="me-2" />
      <span>文件管理</span>

      <VSpacer />

      <!-- 存储选择菜单 -->
      <VMenu v-if="props.storages && props.storages.length > 1" offset-y class="storage-menu me-3">
        <template #activator="{ props: menuProps }">
          <VBtn
            v-bind="menuProps"
            class="storage-selector-btn"
            variant="tonal"
            color="primary"
            density="default"
            size="default"
          >
            <VIcon
              :icon="storagesArray.find(item => item.value === activeStorage)?.icon || 'mdi-database'"
              class="me-2"
            />
            <span class="text-truncate">{{
              storagesArray.find(item => item.value === activeStorage)?.title || '本地'
            }}</span>
            <VIcon end icon="mdi-chevron-down" />
          </VBtn>
        </template>
        <VList density="compact" class="pa-1 storage-list">
          <VListItem
            v-for="(item, index) in storagesArray"
            :key="index"
            :disabled="item.value === activeStorage"
            @click="storageChanged(item.value)"
            class="storage-item"
            rounded="sm"
          >
            <template #prepend>
              <VIcon :icon="item.icon" size="small" />
            </template>
            <VListItemTitle class="text-truncate">{{ item.title }}</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
    </VCardTitle>
    <VDivider />
    <div v-if="activeStorage && item" class="file-browser-container">
      <FileToolbar
        :item="item"
        :itemstack="itemstack"
        :storages="storagesArray"
        :storage="activeStorage"
        :endpoints="endpoints"
        :axios="axios"
        @storagechanged="storageChanged"
        @pathchanged="pathChanged"
        @foldercreated="refreshPending = true"
        @sortchanged="sortChanged"
      />
      <div class="file-content-wrapper">
        <FileNavigator
          :storage="activeStorage"
          :currentPath="item.path"
          :items="fileListItems"
          :endpoints="endpoints"
          :axios="axios"
          @navigate="pathChanged"
        />
        <FileList
          :item="item"
          :storage="activeStorage"
          :icons="fileIcons"
          :endpoints="endpoints"
          :axios="axios"
          :refreshpending="refreshPending"
          :sort="sort"
          @pathchanged="pathChanged"
          @loading="loadingChanged"
          @refreshed="refreshPending = false"
          @filedeleted="refreshPending = true"
          @renamed="refreshPending = true"
          @items-updated="fileListUpdated"
        />
      </div>
    </div>
    <VCardText v-else class="d-flex flex-column justify-center align-center text-center no-storage py-16">
      <VIcon icon="mdi-database-off" size="64" color="grey-lighten-2" class="mb-4" />
      <h3 class="text-h5 text-grey-darken-1">未配置存储</h3>
      <p class="text-body-1 text-grey-darken-1">请先配置文件存储后再使用文件管理功能</p>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
.file-browser {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-browser-header {
  background-color: var(--v-theme-surface);
  border-radius: 12px 12px 0 0;
}

.storage-selector-btn {
  max-width: 180px;
  font-size: 1rem;
  padding: 0 16px;
  height: 40px;
  box-shadow: 0 2px 6px rgba(var(--v-theme-primary), 0.1);

  :deep(.v-btn__content) {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
  }

  .text-truncate {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.storage-list {
  border-radius: 4px;
  overflow: hidden;
}

.storage-item {
  min-height: 36px;
}

.file-browser-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px); /* 减去标题栏高度 */
  overflow: hidden;
}

.file-content-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
  border-radius: 0 0 12px 12px;
}

.no-storage {
  flex: 1;
}
</style>
