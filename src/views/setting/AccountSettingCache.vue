<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import api from '@/api'
import type { TorrentCacheData, TorrentCacheItem } from '@/api/types'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

// 国际化
const { t } = useI18n()

const display = useDisplay()

// 提示框
const $toast = useToast()

// 缓存数据
const cacheData = ref<TorrentCacheData>({
  count: 0,
  sites: 0,
  data: [],
})

// 选中的缓存项
const selectedItems = ref<string[]>([])

// 加载状态
const loading = ref(false)

// 重新识别对话框
const reidentifyDialog = ref(false)
const currentReidentifyItem = ref<TorrentCacheItem | null>(null)
const tmdbId = ref<number | undefined>()
const doubanId = ref<string | undefined>()

// 调用API加载缓存数据
async function loadCacheData() {
  try {
    loading.value = true
    const res: any = await api.get('torrent/cache')
    cacheData.value = res.data
  } catch (e) {
    console.log(e)
    $toast.error(t('setting.cache.loadFailed'))
  } finally {
    loading.value = false
  }
}

// 清空所有缓存
async function clearAllCache() {
  try {
    loading.value = true
    await api.delete('torrent/cache')
    $toast.success(t('setting.cache.clearSuccess'))
    await loadCacheData()
    selectedItems.value = []
  } catch (e) {
    console.log(e)
    $toast.error(t('setting.cache.clearFailed'))
  } finally {
    loading.value = false
  }
}

// 刷新缓存
async function refreshCache() {
  try {
    loading.value = true
    const res: any = await api.post('torrent/cache/refresh')
    $toast.success(res.message || t('setting.cache.refreshSuccess'))
    await loadCacheData()
  } catch (e) {
    console.log(e)
    $toast.error(t('setting.cache.refreshFailed'))
  } finally {
    loading.value = false
  }
}

// 删除选中的缓存项
async function deleteSelectedItems() {
  if (selectedItems.value.length === 0) {
    $toast.warning(t('setting.cache.selectDeleteWarning'))
    return
  }

  try {
    loading.value = true
    const deletePromises = selectedItems.value.map(hash => {
      const item = cacheData.value.data.find(d => d.hash === hash)
      if (item) {
        return api.delete(`torrent/cache/${item.domain}/${hash}`)
      }
      return Promise.resolve()
    })

    await Promise.all(deletePromises)
    $toast.success(t('setting.cache.deleteSelectedSuccess', { count: selectedItems.value.length }))
    await loadCacheData()
    selectedItems.value = []
  } catch (e) {
    console.log(e)
    $toast.error(t('setting.cache.deleteSelectedFailed'))
  } finally {
    loading.value = false
  }
}

// 删除单个缓存项
async function deleteSingleItem(item: TorrentCacheItem) {
  try {
    loading.value = true
    await api.delete(`torrent/cache/${item.domain}/${item.hash}`)
    $toast.success(t('setting.cache.deleteSuccess'))
    await loadCacheData()
    // 从选中列表中移除
    const index = selectedItems.value.indexOf(item.hash)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    }
  } catch (e) {
    console.log(e)
    $toast.error(t('setting.cache.deleteFailed'))
  } finally {
    loading.value = false
  }
}

// 打开重新识别对话框
function openReidentifyDialog(item: TorrentCacheItem) {
  currentReidentifyItem.value = item
  tmdbId.value = undefined
  doubanId.value = undefined
  reidentifyDialog.value = true
}

// 重新识别
async function performReidentify() {
  if (!currentReidentifyItem.value) return

  try {
    loading.value = true
    const params: any = {}
    if (tmdbId.value) params.tmdbid = tmdbId.value
    if (doubanId.value) params.doubanid = doubanId.value

    const res: any = await api.post(
      `torrent/cache/reidentify/${currentReidentifyItem.value.domain}/${currentReidentifyItem.value.hash}`,
      null,
      {
        params,
      },
    )

    $toast.success(res.message || t('setting.cache.reidentifySuccess'))
    await loadCacheData()
    reidentifyDialog.value = false
  } catch (e) {
    console.log(e)
    $toast.error(t('setting.cache.reidentifyFailed'))
  } finally {
    loading.value = false
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

// 获取媒体类型颜色
function getMediaTypeColor(type: string): string {
  switch (type) {
    case t('setting.cache.mediaType.movie'):
      return 'primary'
    case t('setting.cache.mediaType.tv'):
      return 'success'
    default:
      return 'default'
  }
}

onMounted(() => {
  loadCacheData()
})
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>{{ t('setting.cache.title') }}</VCardTitle>
      <VCardSubtitle>{{ t('setting.cache.subtitle') }}</VCardSubtitle>

      <template #append>
        <div class="d-flex gap-2">
          <VBtn icon color="primary" :loading="loading" @click="refreshCache">
            <VIcon>mdi-refresh</VIcon>
            <VTooltip activator="parent" location="bottom">{{ t('setting.cache.refresh') }}</VTooltip>
          </VBtn>

          <VBtn
            icon
            color="warning"
            :loading="loading"
            :disabled="selectedItems.length === 0"
            @click="deleteSelectedItems"
          >
            <VIcon>mdi-delete</VIcon>
            <VTooltip activator="parent" location="bottom"
              >{{ t('setting.cache.deleteSelected') }} ({{ selectedItems.length }})</VTooltip
            >
          </VBtn>

          <VBtn icon color="error" :loading="loading" @click="clearAllCache">
            <VIcon>mdi-delete-sweep</VIcon>
            <VTooltip activator="parent" location="bottom">{{ t('setting.cache.clearAll') }}</VTooltip>
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <!-- 缓存列表 -->
    <VDataTable
      v-model="selectedItems"
      :headers="[
        { title: '', key: 'data-table-select', sortable: false, width: '48px' },
        { title: t('setting.cache.poster'), key: 'poster', sortable: false, width: '80px' },
        { title: t('setting.cache.torrentTitle'), key: 'title', sortable: true },
        { title: t('setting.cache.site'), key: 'site_name', sortable: true, width: '120px' },
        { title: t('setting.cache.size'), key: 'size', sortable: true, width: '100px' },
        { title: t('setting.cache.publishTime'), key: 'pubdate', sortable: true, width: '150px' },
        { title: t('setting.cache.recognitionResult'), key: 'media_info', sortable: false, width: '200px' },
        { title: t('setting.cache.actions'), key: 'actions', sortable: false, width: '150px' },
      ]"
      :items="cacheData.data"
      :loading="loading"
      item-value="hash"
      show-select
      class="text-no-wrap"
      :items-per-page-text="t('common.itemsPerPage')"
      :no-data-text="t('common.noDataText')"
      :loading-text="t('common.loadingText')"
    >
      <!-- 全选复选框 -->
      <template #header.data-table-select="{ allSelected, selectAll, someSelected }">
        <VCheckbox
          :indeterminate="someSelected && !allSelected"
          :model-value="allSelected"
          @update:model-value="(value: boolean | null) => selectAll(value as boolean)"
        />
      </template>

      <!-- 海报列 -->
      <template #item.poster="{ item }">
        <VAvatar size="60" rounded="lg" class="ma-1">
          <VImg v-if="item.poster_path" :src="item.poster_path" :alt="item.media_name || item.title" cover />
          <VIcon v-else size="30" color="grey-lighten-1"> mdi-movie-open </VIcon>
        </VAvatar>
      </template>

      <!-- 标题列 -->
      <template #item.title="{ item }">
        <div class="d-flex flex-column">
          <div class="text-subtitle-2 font-weight-bold">
            {{ item.title }}
          </div>
          <div v-if="item.description" class="text-caption text-grey">
            {{ item.description }}
          </div>
          <div v-if="item.season_episode || item.resource_term" class="text-caption text-primary mt-1">
            {{ item.season_episode }} {{ item.resource_term }}
          </div>
        </div>
      </template>

      <!-- 大小列 -->
      <template #item.size="{ item }">
        {{ formatFileSize(item.size) }}
      </template>

      <!-- 发布时间列 -->
      <template #item.pubdate="{ item }">
        {{ formatDate(item.pubdate || '') }}
      </template>

      <!-- 识别结果列 -->
      <template #item.media_info="{ item }">
        <div v-if="item.media_name" class="d-flex flex-column">
          <div class="text-subtitle-2">
            {{ item.media_name }}
            <VChip v-if="item.media_type" :color="getMediaTypeColor(item.media_type)" size="x-small" class="ml-1">
              {{ item.media_type }}
            </VChip>
          </div>
          <div v-if="item.media_year" class="text-caption text-grey">
            {{ item.media_year }}
          </div>
        </div>
        <div v-else class="text-caption text-grey">
          {{ t('setting.cache.unrecognized') }}
        </div>
      </template>

      <!-- 操作列 -->
      <template #item.actions="{ item }">
        <div class="d-flex gap-1">
          <VBtn size="small" color="primary" variant="text" @click="openReidentifyDialog(item)">
            <VIcon size="16">mdi-refresh</VIcon>
          </VBtn>

          <VBtn size="small" color="error" variant="text" @click="deleteSingleItem(item)">
            <VIcon size="16">mdi-delete</VIcon>
          </VBtn>

          <VBtn v-if="item.page_url" size="small" color="info" variant="text" :href="item.page_url" target="_blank">
            <VIcon size="16">mdi-open-in-new</VIcon>
          </VBtn>
        </div>
      </template>

      <!-- 空状态 -->
      <template #no-data>
        <div class="text-center pa-4">
          <VIcon size="64" color="grey-lighten-2" class="mb-4"> mdi-database-off </VIcon>
          <div class="text-h6 text-grey">{{ t('setting.cache.noData') }}</div>
          <div class="text-body-2 text-grey">
            {{ t('setting.cache.noDataHint') }}
          </div>
        </div>
      </template>
    </VDataTable>
  </VCard>

  <!-- 重新识别对话框 -->
  <VDialog v-model="reidentifyDialog" scrollable max-width="40rem" :fullscreen="!display.mdAndUp.value">
    <VCard>
      <VCardTitle>{{ t('setting.cache.reidentifyDialog.title') }}</VCardTitle>

      <VCardText>
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">{{ t('setting.cache.reidentifyDialog.torrentInfo') }}</div>
          <div class="text-body-2">{{ currentReidentifyItem?.title }}</div>
          <div class="text-caption text-grey">{{ currentReidentifyItem?.site_name }}</div>
        </div>

        <VTextField
          v-model="tmdbId"
          :label="t('setting.cache.reidentifyDialog.tmdbId')"
          :hint="t('setting.cache.reidentifyDialog.tmdbIdHint')"
          type="number"
          clearable
        />

        <VTextField
          v-model="doubanId"
          :label="t('setting.cache.reidentifyDialog.doubanId')"
          :hint="t('setting.cache.reidentifyDialog.doubanIdHint')"
          clearable
          class="mt-4"
        />

        <VAlert type="info" variant="tonal" class="mt-4">
          {{ t('setting.cache.reidentifyDialog.autoHint') }}
        </VAlert>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn color="grey" variant="text" @click="reidentifyDialog = false">
          {{ t('setting.cache.reidentifyDialog.cancel') }}
        </VBtn>
        <VBtn color="primary" :loading="loading" @click="performReidentify">
          {{ t('setting.cache.reidentifyDialog.confirm') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
