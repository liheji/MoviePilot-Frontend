<template>
  <div>
    <!-- 缓存类型选择 -->
    <VRow class="mb-4">
      <VCol cols="12">
        <VCard>
          <VCardText>
            <VTabs v-model="activeTab" class="mb-4">
              <VTab value="torrents">{{ $t('cache.torrentCache') }}</VTab>
              <VTab value="images">{{ $t('cache.imageCache') }}</VTab>
            </VTabs>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- 种子缓存管理 -->
    <VTabsWindow v-model="activeTab">
      <VTabsWindowItem value="torrents">
        <!-- 种子缓存统计卡片 -->
        <VRow class="mb-4">
          <VCol cols="12" md="4">
            <VCard>
              <VCardText>
                <div class="d-flex align-center">
                  <VIcon icon="mdi-spider" size="40" color="primary" class="me-3" />
                  <div>
                    <div class="text-h6">{{ $t('cache.spiderCache') }}</div>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ cacheStats?.spider?.total_count || 0 }}{{ $t('cache.torrents') }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ cacheStats?.spider?.sites_count || 0 }}{{ $t('cache.sites') }}
                    </div>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>
          
          <VCol cols="12" md="4">
            <VCard>
              <VCardText>
                <div class="d-flex align-center">
                  <VIcon icon="mdi-rss" size="40" color="success" class="me-3" />
                  <div>
                    <div class="text-h6">{{ $t('cache.rssCache') }}</div>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ cacheStats?.rss?.total_count || 0 }}{{ $t('cache.torrents') }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ cacheStats?.rss?.sites_count || 0 }}{{ $t('cache.sites') }}
                    </div>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>
          
          <VCol cols="12" md="4">
            <VCard>
              <VCardText>
                <div class="d-flex align-center">
                  <VIcon icon="mdi-cog" size="40" color="info" class="me-3" />
                  <div>
                    <div class="text-h6">{{ $t('cache.cacheConfig') }}</div>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ $t('cache.limit') }}: {{ cacheStats?.config?.cache_limit || 0 }}{{ $t('cache.perSite') }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ $t('cache.mode') }}: {{ getModeText(cacheStats?.config?.current_mode) }}
                    </div>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <!-- 种子缓存操作按钮 -->
        <VRow class="mb-4">
          <VCol cols="12">
            <VCard>
              <VCardText>
                <div class="d-flex flex-wrap gap-3 align-center">
                  <VBtn
                    color="primary"
                    prepend-icon="mdi-refresh"
                    :loading="refreshing"
                    @click="refreshCache"
                  >
                    {{ $t('cache.refreshCache') }}
                  </VBtn>
                  
                  <VBtn
                    color="warning"
                    prepend-icon="mdi-delete-sweep"
                    :loading="clearing"
                    @click="clearCache"
                  >
                    {{ $t('cache.clearCache') }}
                  </VBtn>
                  
                  <VBtn
                    color="info"
                    prepend-icon="mdi-eye"
                    @click="showCacheData = !showCacheData"
                  >
                    {{ showCacheData ? $t('cache.hideCacheData') : $t('cache.viewCacheData') }}
                  </VBtn>
                  
                  <VSpacer />
                  
                  <!-- 站点选择 -->
                  <VSelect
                    v-if="showCacheData"
                    v-model="selectedSites"
                    :items="siteOptions"
                    :label="$t('cache.selectSites')"
                    multiple
                    chips
                    closable-chips
                    clearable
                    style="min-width: 300px;"
                    :hint="$t('cache.siteSelectHint')"
                    persistent-hint
                  >
                    <template #selection="{ item, index }">
                      <VChip v-if="index < 3" size="small" closable @click:close="removeSite(item.value)">
                        {{ item.title }}
                      </VChip>
                      <span v-if="index === 3" class="text-grey text-caption align-self-center">
                        (+{{ selectedSites.length - 3 }} {{ $t('cache.others') }})
                      </span>
                    </template>
                  </VSelect>
                </div>
                
                <div v-if="showCacheData && selectedItems.length > 0" class="d-flex flex-wrap gap-3 mt-3">
                  <VBtn
                    color="error"
                    prepend-icon="mdi-delete"
                    @click="deleteSelectedTorrents"
                  >
                    {{ $t('cache.deleteSelected', { count: selectedItems.length }) }}
                  </VBtn>
                  
                  <VBtn
                    color="warning"
                    prepend-icon="mdi-refresh"
                    @click="reidentifySelectedTorrents"
                  >
                    {{ $t('cache.reidentifySelected', { count: selectedItems.length }) }}
                  </VBtn>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <!-- 站点缓存统计表格 -->
        <VRow v-if="!showCacheData" class="mb-4">
          <VCol cols="12" md="6">
            <VCard>
              <VCardTitle>{{ $t('cache.spiderCacheStats') }}</VCardTitle>
              <VDataTable
                :headers="siteStatsHeaders"
                :items="cacheStats?.spider?.sites || []"
                :items-per-page="10"
                class="elevation-1"
              >
                <template #item.latest_date="{ item }">
                  <span v-if="item.latest_date">
                    {{ formatDate(item.latest_date) }}
                  </span>
                  <span v-else class="text-medium-emphasis">{{ $t('cache.noData') }}</span>
                </template>
                <template #item.domain="{ item }">
                  <VChip size="small" color="primary" variant="tonal">
                    {{ getSiteName(item.domain) }}
                  </VChip>
                </template>
              </VDataTable>
            </VCard>
          </VCol>
          
          <VCol cols="12" md="6">
            <VCard>
              <VCardTitle>{{ $t('cache.rssCacheStats') }}</VCardTitle>
              <VDataTable
                :headers="siteStatsHeaders"
                :items="cacheStats?.rss?.sites || []"
                :items-per-page="10"
                class="elevation-1"
              >
                <template #item.latest_date="{ item }">
                  <span v-if="item.latest_date">
                    {{ formatDate(item.latest_date) }}
                  </span>
                  <span v-else class="text-medium-emphasis">{{ $t('cache.noData') }}</span>
                </template>
                <template #item.domain="{ item }">
                  <VChip size="small" color="primary" variant="tonal">
                    {{ getSiteName(item.domain) }}
                  </VChip>
                </template>
              </VDataTable>
            </VCard>
          </VCol>
        </VRow>

        <!-- 缓存数据详情 -->
        <VExpandTransition>
          <VRow v-if="showCacheData">
            <VCol cols="12">
              <VCard>
                <VCardTitle>
                  <div class="d-flex align-center justify-space-between">
                    <span>{{ $t('cache.cacheDataDetails') }}</span>
                    <VTabs v-if="showTabs" v-model="cacheDetailTab" color="primary">
                      <VTab v-if="hasSpiderData" value="spider">{{ $t('cache.spiderCache') }}</VTab>
                      <VTab v-if="hasRssData" value="rss">{{ $t('cache.rssCache') }}</VTab>
                    </VTabs>
                    <span v-else class="text-h6">
                      {{ hasSpiderData ? $t('cache.spiderCache') : $t('cache.rssCache') }}
                    </span>
                  </div>
                </VCardTitle>
                
                <VTabsWindow v-if="showTabs" v-model="cacheDetailTab">
                  <VTabsWindowItem v-if="hasSpiderData" value="spider">
                    <VDataTable
                      :headers="cacheDataHeaders"
                      :items="filteredSpiderData"
                      :items-per-page="20"
                      :search="search"
                      v-model="selectedItems"
                      show-select
                      return-object
                      class="elevation-1"
                    >
                      <template #top>
                        <VToolbar flat>
                          <VTextField
                            v-model="search"
                            prepend-inner-icon="mdi-magnify"
                            :label="$t('cache.searchTorrents')"
                            single-line
                            hide-details
                            clearable
                            class="ma-2"
                          />
                        </VToolbar>
                      </template>
                      
                      <template #item.title="{ item }">
                        <div class="text-truncate" style="max-width: 300px;" :title="item.title">
                          {{ item.title }}
                        </div>
                      </template>
                      
                      <template #item.poster="{ item }">
                        <div class="d-flex align-center">
                          <VImg
                            v-if="item.poster_path"
                            :src="item.poster_path"
                            width="50"
                            height="75"
                            cover
                            class="rounded cursor-pointer"
                            @click="showImageDialog(item.poster_path)"
                          >
                            <template #placeholder>
                              <VSkeletonLoader type="image" width="50" height="75" />
                            </template>
                          </VImg>
                          <VIcon v-else icon="mdi-image-off" size="50" color="grey" />
                        </div>
                      </template>
                      
                      <template #item.size="{ item }">
                        {{ formatFileSize(item.size) }}
                      </template>
                      
                      <template #item.pubdate="{ item }">
                        <span v-if="item.pubdate">
                          {{ formatDate(item.pubdate) }}
                        </span>
                        <span v-else class="text-medium-emphasis">{{ $t('cache.unknown') }}</span>
                      </template>
                      
                      <template #item.media_info="{ item }">
                        <div v-if="item.media_name">
                          <div class="text-body-2">{{ item.media_name }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ item.media_year }} · {{ item.media_type }}
                            <span v-if="item.season_episode"> · {{ item.season_episode }}</span>
                          </div>
                        </div>
                        <span v-else class="text-medium-emphasis">{{ $t('cache.unrecognized') }}</span>
                      </template>
                      
                      <template #item.actions="{ item }">
                        <div class="d-flex gap-1">
                          <VBtn
                            v-if="item.page_url"
                            icon="mdi-open-in-new"
                            size="small"
                            variant="text"
                            :href="item.page_url"
                            target="_blank"
                          />
                          <VBtn
                            icon="mdi-refresh"
                            size="small"
                            variant="text"
                            color="warning"
                            :loading="operatingItems.has(item.hash)"
                            @click="reidentifySingleTorrent(item)"
                            :title="$t('cache.reidentify')"
                          />
                          <VBtn
                            icon="mdi-delete"
                            size="small"
                            variant="text"
                            color="error"
                            :loading="operatingItems.has(item.hash)"
                            @click="deleteSingleTorrent(item)"
                            :title="$t('cache.delete')"
                          />
                        </div>
                      </template>
                    </VDataTable>
                  </VTabsWindowItem>
                  
                  <VTabsWindowItem v-if="hasRssData" value="rss">
                    <VDataTable
                      :headers="cacheDataHeaders"
                      :items="filteredRssData"
                      :items-per-page="20"
                      :search="search"
                      v-model="selectedItems"
                      show-select
                      return-object
                      class="elevation-1"
                    >
                      <template #top>
                        <VToolbar flat>
                          <VTextField
                            v-model="search"
                            prepend-inner-icon="mdi-magnify"
                            :label="$t('cache.searchTorrents')"
                            single-line
                            hide-details
                            clearable
                            class="ma-2"
                          />
                        </VToolbar>
                      </template>
                      
                      <template #item.title="{ item }">
                        <div class="text-truncate" style="max-width: 300px;" :title="item.title">
                          {{ item.title }}
                        </div>
                      </template>
                      
                      <template #item.poster="{ item }">
                        <div class="d-flex align-center">
                          <VImg
                            v-if="item.poster_path"
                            :src="item.poster_path"
                            width="50"
                            height="75"
                            cover
                            class="rounded cursor-pointer"
                            @click="showImageDialog(item.poster_path)"
                          >
                            <template #placeholder>
                              <VSkeletonLoader type="image" width="50" height="75" />
                            </template>
                          </VImg>
                          <VIcon v-else icon="mdi-image-off" size="50" color="grey" />
                        </div>
                      </template>
                      
                      <template #item.size="{ item }">
                        {{ formatFileSize(item.size) }}
                      </template>
                      
                      <template #item.pubdate="{ item }">
                        <span v-if="item.pubdate">
                          {{ formatDate(item.pubdate) }}
                        </span>
                        <span v-else class="text-medium-emphasis">{{ $t('cache.unknown') }}</span>
                      </template>
                      
                      <template #item.media_info="{ item }">
                        <div v-if="item.media_name">
                          <div class="text-body-2">{{ item.media_name }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ item.media_year }} · {{ item.media_type }}
                            <span v-if="item.season_episode"> · {{ item.season_episode }}</span>
                          </div>
                        </div>
                        <span v-else class="text-medium-emphasis">{{ $t('cache.unrecognized') }}</span>
                      </template>
                      
                      <template #item.actions="{ item }">
                        <div class="d-flex gap-1">
                          <VBtn
                            v-if="item.page_url"
                            icon="mdi-open-in-new"
                            size="small"
                            variant="text"
                            :href="item.page_url"
                            target="_blank"
                          />
                          <VBtn
                            icon="mdi-refresh"
                            size="small"
                            variant="text"
                            color="warning"
                            :loading="operatingItems.has(item.hash)"
                            @click="reidentifySingleTorrent(item)"
                            :title="$t('cache.reidentify')"
                          />
                          <VBtn
                            icon="mdi-delete"
                            size="small"
                            variant="text"
                            color="error"
                            :loading="operatingItems.has(item.hash)"
                            @click="deleteSingleTorrent(item)"
                            :title="$t('cache.delete')"
                          />
                        </div>
                      </template>
                    </VDataTable>
                  </VTabsWindowItem>
                </VTabsWindow>
                
                <!-- 当只有一种缓存类型时，直接显示表格 -->
                <VDataTable
                  v-else
                  :headers="cacheDataHeaders"
                  :items="filteredCurrentData"
                  :items-per-page="20"
                  :search="search"
                  v-model="selectedItems"
                  show-select
                  return-object
                  class="elevation-1"
                >
                  <template #top>
                    <VToolbar flat>
                      <VTextField
                        v-model="search"
                        prepend-inner-icon="mdi-magnify"
                        :label="$t('cache.searchTorrents')"
                        single-line
                        hide-details
                        clearable
                        class="ma-2"
                      />
                    </VToolbar>
                  </template>
                  
                  <template #item.title="{ item }">
                    <div class="text-truncate" style="max-width: 300px;" :title="item.title">
                      {{ item.title }}
                    </div>
                  </template>
                  
                  <template #item.poster="{ item }">
                    <div class="d-flex align-center">
                      <VImg
                        v-if="item.poster_path"
                        :src="item.poster_path"
                        width="50"
                        height="75"
                        cover
                        class="rounded cursor-pointer"
                        @click="showImageDialog(item.poster_path)"
                      >
                        <template #placeholder>
                          <VSkeletonLoader type="image" width="50" height="75" />
                        </template>
                      </VImg>
                      <VIcon v-else icon="mdi-image-off" size="50" color="grey" />
                    </div>
                  </template>
                  
                  <template #item.size="{ item }">
                    {{ formatFileSize(item.size) }}
                  </template>
                  
                  <template #item.pubdate="{ item }">
                    <span v-if="item.pubdate">
                      {{ formatDate(item.pubdate) }}
                    </span>
                    <span v-else class="text-medium-emphasis">{{ $t('cache.unknown') }}</span>
                  </template>
                  
                  <template #item.media_info="{ item }">
                    <div v-if="item.media_name">
                      <div class="text-body-2">{{ item.media_name }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ item.media_year }} · {{ item.media_type }}
                        <span v-if="item.season_episode"> · {{ item.season_episode }}</span>
                      </div>
                    </div>
                    <span v-else class="text-medium-emphasis">{{ $t('cache.unrecognized') }}</span>
                  </template>
                  
                  <template #item.actions="{ item }">
                    <div class="d-flex gap-1">
                      <VBtn
                        v-if="item.page_url"
                        icon="mdi-open-in-new"
                        size="small"
                        variant="text"
                        :href="item.page_url"
                        target="_blank"
                      />
                      <VBtn
                        icon="mdi-refresh"
                        size="small"
                        variant="text"
                        color="warning"
                        :loading="operatingItems.has(item.hash)"
                        @click="reidentifySingleTorrent(item)"
                        :title="$t('cache.reidentify')"
                      />
                      <VBtn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="error"
                        :loading="operatingItems.has(item.hash)"
                        @click="deleteSingleTorrent(item)"
                        :title="$t('cache.delete')"
                      />
                    </div>
                  </template>
                </VDataTable>
              </VCard>
            </VCol>
          </VRow>
        </VExpandTransition>
      </VTabsWindowItem>

      <!-- 图片缓存管理 -->
      <VTabsWindowItem value="images">
        <!-- 图片缓存统计卡片 -->
        <VRow class="mb-4">
          <VCol cols="12" md="4">
            <VCard>
              <VCardText>
                <div class="d-flex align-center">
                  <VIcon icon="mdi-image-multiple" size="40" color="purple" class="me-3" />
                  <div>
                    <div class="text-h6">{{ $t('cache.imageFiles') }}</div>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ imageCacheStats?.total_files || 0 }}{{ $t('cache.files') }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatFileSize(imageCacheStats?.total_size || 0) }}
                    </div>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>
          
          <VCol cols="12" md="4">
            <VCard>
              <VCardText>
                <div class="d-flex align-center">
                  <VIcon icon="mdi-cog" size="40" color="info" class="me-3" />
                  <div>
                    <div class="text-h6">{{ $t('cache.cacheStatus') }}</div>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ imageCacheStats?.cache_enabled ? $t('cache.enabled') : $t('cache.disabled') }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ $t('cache.globalImageCache') }}
                    </div>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>
          
          <VCol cols="12" md="4">
            <VCard>
              <VCardText>
                <div class="d-flex align-center">
                  <VIcon icon="mdi-folder" size="40" color="orange" class="me-3" />
                  <div class="flex-grow-1">
                    <div class="text-h6">{{ $t('cache.cachePath') }}</div>
                    <div class="text-body-2 text-medium-emphasis" :title="imageCacheStats?.cache_path">
                      {{ imageCacheStats?.cache_path || $t('cache.notSet') }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ $t('cache.globalImageCache') }}
                    </div>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <!-- 图片缓存操作按钮 -->
        <VRow class="mb-4">
          <VCol cols="12">
            <VCard>
              <VCardText>
                <div class="d-flex flex-wrap gap-3 align-center">
                  <VBtn
                    color="warning"
                    prepend-icon="mdi-delete-clock"
                    :loading="cleaningExpired"
                    @click="cleanExpiredImages"
                  >
                    {{ $t('cache.cleanExpiredImages') }}
                  </VBtn>
                  
                  <VBtn
                    color="error"
                    prepend-icon="mdi-delete-sweep"
                    :loading="clearingImages"
                    @click="clearImageCache"
                  >
                    {{ $t('cache.clearAllImages') }}
                  </VBtn>
                  
                  <VSpacer />
                  
                  <!-- 过期天数设置 -->
                  <div class="d-flex align-center gap-2">
                    <VBtn
                      icon="mdi-minus"
                      size="small"
                      variant="outlined"
                      @click="decreaseExpiredDays"
                      :disabled="expiredDays <= 1"
                    />
                    <VTextField
                      v-model="expiredDays"
                      type="number"
                      :label="$t('cache.expiredDays')"
                      :hint="$t('cache.expiredDaysHint')"
                      persistent-hint
                      style="width: 120px;"
                      min="1"
                      max="365"
                      hide-details="auto"
                      density="compact"
                    />
                    <VBtn
                      icon="mdi-plus"
                      size="small"
                      variant="outlined"
                      @click="increaseExpiredDays"
                      :disabled="expiredDays >= 365"
                    />
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VTabsWindowItem>
    </VTabsWindow>
    
    <!-- 重新识别对话框 -->
    <VDialog v-model="showReidentifyDialog" max-width="500px">
      <VCard>
        <VCardTitle>{{ $t('cache.reidentifyTorrents') }}</VCardTitle>
        <VCardText>
          <VForm>
            <VTextField
              v-model="reidentifyTmdbid"
              :label="$t('cache.tmdbId')"
              type="number"
              :hint="$t('cache.tmdbIdHint')"
              persistent-hint
              class="mb-4"
            />
            <VTextField
              v-model="reidentifyDoubanid"
              :label="$t('cache.doubanId')"
              :hint="$t('cache.doubanIdHint')"
              persistent-hint
              class="mb-4"
            />
            <VAlert type="info" class="mb-4">
              {{ $t('cache.reidentifyHint') }}
            </VAlert>
          </VForm>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="showReidentifyDialog = false">{{ $t('common.cancel') }}</VBtn>
          <VBtn color="primary" @click="executeReidentify">{{ $t('cache.executeReidentify') }}</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    
    <!-- 图片预览对话框 -->
    <VDialog v-model="showImagePreview" max-width="90vw" max-height="90vh" class="image-preview-dialog">
      <VImg
        :src="previewImageUrl"
        max-height="90vh"
        max-width="90vw"
        contain
        class="rounded"
        @click="showImagePreview = false"
      >
        <template #placeholder>
          <div class="d-flex align-center justify-center fill-height">
            <VProgressCircular indeterminate color="white" />
          </div>
        </template>
        <VBtn
          icon="mdi-close"
          size="large"
          color="white"
          variant="elevated"
          class="close-btn"
          @click="showImagePreview = false"
        />
      </VImg>
    </VDialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import type { 
  TorrentCacheResponse, 
  TorrentCacheStatsResponse, 
  TorrentCacheItem,
  ImageCacheDataResponse,
  ImageCacheItem
} from '@/api/types'

const { t } = useI18n()

// 响应式数据
const cacheStats = ref<TorrentCacheStatsResponse>()
const cacheData = ref<TorrentCacheResponse>()
const showCacheData = ref(false)
const activeTab = ref('torrents')
const cacheDetailTab = ref('spider')
const search = ref('')
const refreshing = ref(false)
const clearing = ref(false)
const selectedItems = ref<TorrentCacheItem[]>([])
const showReidentifyDialog = ref(false)
const reidentifyTmdbid = ref<number>()
const reidentifyDoubanid = ref<string>()
const operatingItems = ref<Set<string>>(new Set())
const selectedSites = ref<string[]>([])
const imageCacheStats = ref<any>()
const imageCacheData = ref<any>()
const showImageData = ref(false)
const cleaningExpired = ref(false)
const clearingImages = ref(false)
const expiredDays = ref<number>(7)
const imagePage = ref(1)
const selectedCategory = ref<string | null>(null)
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const sitesMapping = ref<Record<string, string>>({})
const selectedImageCategory = ref<string | null>(null)
const currentImagePage = ref(1)

// 计算属性
const hasSpiderData = computed(() => (cacheData.value?.spider?.count || 0) > 0)
const hasRssData = computed(() => (cacheData.value?.rss?.count || 0) > 0)
const showTabs = computed(() => hasSpiderData.value && hasRssData.value)
const currentCacheType = computed(() => {
  if (showTabs.value) {
    return cacheDetailTab.value
  }
  return hasSpiderData.value ? 'spider' : 'rss'
})

// 站点选项
const siteOptions = computed(() => {
  const sites = new Set<string>()
  
  // 收集所有站点
  if (cacheData.value?.spider?.data) {
    cacheData.value.spider.data.forEach((item: any) => {
      sites.add(item.domain)
    })
  }
  if (cacheData.value?.rss?.data) {
    cacheData.value.rss.data.forEach((item: any) => {
      sites.add(item.domain)
    })
  }
  
  return Array.from(sites).map(domain => ({
    title: getSiteName(domain),
    value: domain
  }))
})

// 表格头部定义
const siteStatsHeaders = computed(() => [
  { title: t('cache.siteDomain'), key: 'domain', sortable: true },
  { title: t('cache.cacheCount'), key: 'count', sortable: true },
  { title: t('cache.latestRelease'), key: 'latest_date', sortable: true }
])

const cacheDataHeaders = computed(() => [
  { title: '', key: 'data-table-select', sortable: false },
  { title: t('cache.poster'), key: 'poster', sortable: false, width: '80px' },
  { title: t('cache.torrentTitle'), key: 'title', sortable: true },
  { title: t('cache.site'), key: 'site_name', sortable: true },
  { title: t('cache.size'), key: 'size', sortable: true },
  { title: t('cache.releaseTime'), key: 'pubdate', sortable: true },
  { title: t('cache.recognitionInfo'), key: 'media_info', sortable: false },
  { title: t('cache.resourceInfo'), key: 'resource_term', sortable: true },
  { title: t('cache.actions'), key: 'actions', sortable: false, width: '120px' }
])

// 获取站点名称
const getSiteName = (domain: string): string => {
  return sitesMapping.value[domain] || domain
}

// 获取模式文本
const getModeText = (mode: string | undefined): string => {
  switch (mode) {
    case 'spider':
      return t('cache.spiderMode')
    case 'rss':
      return t('cache.rssMode')
    case 'auto':
    default:
      return t('cache.autoMode')
  }
}

// 获取缓存统计
const fetchCacheStats = async () => {
  try {
    const response: any = await api.get('/system/cache/torrents/stats')
    if (response.success) {
      cacheStats.value = response.data
    }
  } catch (error) {
    console.error(t('cache.fetchStatsError'), error)
  }
}

// 获取缓存数据
const fetchCacheData = async () => {
  try {
    const response: any = await api.get('/system/cache/torrents')
    if (response.success) {
      cacheData.value = response.data
      
      // 根据实际数据自动设置活动标签页
      const hasSpiderData = (response.data.spider?.count || 0) > 0
      const hasRssData = (response.data.rss?.count || 0) > 0
      
      if (hasSpiderData && !hasRssData) {
        cacheDetailTab.value = 'spider'
      } else if (hasRssData && !hasSpiderData) {
        cacheDetailTab.value = 'rss'
      }
    }
  } catch (error) {
    console.error(t('cache.fetchDataError'), error)
  }
}

// 刷新缓存
const refreshCache = async () => {
  refreshing.value = true
  try {
    const response: any = await api.post('/system/cache/torrents/refresh?cache_type=auto')
    if (response.success) {
      await fetchCacheStats()
      if (showCacheData.value) {
        await fetchCacheData()
      }
    }
  } catch (error) {
    console.error(t('cache.refreshError'), error)
  } finally {
    refreshing.value = false
  }
}

// 清理缓存
const clearCache = async () => {
  if (!confirm(t('cache.confirmClearCache'))) {
    return
  }
  
  clearing.value = true
  try {
    const response: any = await api.delete('/system/cache/torrents')
    if (response.success) {
      await fetchCacheStats()
      if (showCacheData.value) {
        await fetchCacheData()
      }
    }
  } catch (error) {
    console.error(t('cache.clearError'), error)
  } finally {
    clearing.value = false
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 删除选中的种子
const deleteSelectedTorrents = async () => {
  if (selectedItems.value.length === 0) {
    return
  }
  
  if (!confirm(t('cache.confirmDeleteSelected', { count: selectedItems.value.length }))) {
    return
  }
  
  for (const item of selectedItems.value) {
    operatingItems.value.add(item.hash)
    try {
      const response: any = await api.delete(`/system/cache/torrents/${currentCacheType.value}/${item.domain}/${item.hash}`)
      if (!response.success) {
        console.error(`删除种子失败: ${response.message}`)
      }
    } catch (error) {
      console.error('删除种子失败', error)
    } finally {
      operatingItems.value.delete(item.hash)
    }
  }
  
  selectedItems.value = []
  await fetchCacheData()
  await fetchCacheStats()
}

// 重新识别选中的种子
const reidentifySelectedTorrents = () => {
  if (selectedItems.value.length === 0) {
    return
  }
  showReidentifyDialog.value = true
}

// 执行重新识别
const executeReidentify = async () => {
  for (const item of selectedItems.value) {
    operatingItems.value.add(item.hash)
    try {
      const params = new URLSearchParams()
      if (reidentifyTmdbid.value) {
        params.append('tmdbid', reidentifyTmdbid.value.toString())
      }
      if (reidentifyDoubanid.value) {
        params.append('doubanid', reidentifyDoubanid.value)
      }
      
      const url = `/system/cache/torrents/${currentCacheType.value}/${item.domain}/${item.hash}/reidentify${params.toString() ? '?' + params.toString() : ''}`
      const response: any = await api.post(url)
      if (!response.success) {
        console.error(`重新识别失败: ${response.message}`)
      }
    } catch (error) {
      console.error('重新识别失败', error)
    } finally {
      operatingItems.value.delete(item.hash)
    }
  }
  
  showReidentifyDialog.value = false
  selectedItems.value = []
  reidentifyTmdbid.value = undefined
  reidentifyDoubanid.value = undefined
  await fetchCacheData()
}

// 删除单个种子
const deleteSingleTorrent = async (item: TorrentCacheItem) => {
  if (!confirm(t('cache.confirmDeleteSingle'))) {
    return
  }
  
  operatingItems.value.add(item.hash)
  try {
    const response: any = await api.delete(`/system/cache/torrents/${currentCacheType.value}/${item.domain}/${item.hash}`)
    if (response.success) {
      await fetchCacheData()
      await fetchCacheStats()
    }
  } catch (error) {
    console.error('删除种子失败', error)
  } finally {
    operatingItems.value.delete(item.hash)
  }
}

// 重新识别单个种子
const reidentifySingleTorrent = async (item: TorrentCacheItem) => {
  selectedItems.value = [item]
  showReidentifyDialog.value = true
}

// 清理过期图片
const cleanExpiredImages = async () => {
  if (!confirm(t('cache.confirmCleanExpiredImages'))) {
    return
  }
  
  cleaningExpired.value = true
  try {
    const response: any = await api.post(`/system/cache/images/clean?days=${expiredDays.value}`)
    if (response.success) {
      await fetchImageCacheStats()
    }
  } catch (error) {
    console.error(t('cache.cleanExpiredImagesError'), error)
  } finally {
    cleaningExpired.value = false
  }
}

// 清理所有图片
const clearImageCache = async () => {
  if (!confirm(t('cache.confirmClearAllImages'))) {
    return
  }
  
  clearingImages.value = true
  try {
    const response: any = await api.delete('/system/cache/images')
    if (response.success) {
      await fetchImageCacheStats()
    }
  } catch (error) {
    console.error(t('cache.clearAllImagesError'), error)
  } finally {
    clearingImages.value = false
  }
}

// 获取图片缓存统计
const fetchImageCacheStats = async () => {
  try {
    const response: any = await api.get('/system/cache/images/stats')
    if (response.success) {
      imageCacheStats.value = response.data
    }
  } catch (error) {
    console.error(t('cache.fetchImageCacheStatsError'), error)
  }
}

// 移除站点
const removeSite = (site: string) => {
  selectedSites.value = selectedSites.value.filter((s) => s !== site)
}

// 过滤数据
const filteredSpiderData = computed(() => {
  if (!cacheData.value?.spider?.data) return []
  if (selectedSites.value.length === 0) return cacheData.value.spider.data
  return cacheData.value.spider.data.filter((item: any) => {
    return selectedSites.value.includes(item.domain)
  })
})

const filteredRssData = computed(() => {
  if (!cacheData.value?.rss?.data) return []
  if (selectedSites.value.length === 0) return cacheData.value.rss.data
  return cacheData.value.rss.data.filter((item: any) => {
    return selectedSites.value.includes(item.domain)
  })
})

const filteredCurrentData = computed(() => {
  if (hasSpiderData.value && (!showTabs.value || cacheDetailTab.value === 'spider')) {
    return filteredSpiderData.value
  }
  return filteredRssData.value
})

// 显示图片预览
const showImageDialog = (url: string) => {
  previewImageUrl.value = url
  showImagePreview.value = true
}

// 增加过期天数
const increaseExpiredDays = () => {
  if (expiredDays.value < 365) {
    expiredDays.value++
  }
}

// 减少过期天数
const decreaseExpiredDays = () => {
  if (expiredDays.value > 1) {
    expiredDays.value--
  }
}

// 获取站点映射
const fetchSitesMapping = async () => {
  try {
    const response: any = await api.get('/system/sites/mapping')
    if (response.success) {
      sitesMapping.value = response.data
    }
  } catch (error) {
    console.error('获取站点映射失败', error)
  }
}

// 监听显示缓存数据变化
watch(showCacheData, async (newValue) => {
  if (newValue && !cacheData.value) {
    await fetchCacheData()
  }
})

// 组件挂载时获取数据
onMounted(async () => {
  await fetchSitesMapping()
  await fetchCacheStats()
  await fetchImageCacheStats()
})
</script>

<style scoped>
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.image-item {
  position: relative;
}

.image-info {
  padding: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0 0 4px 4px;
}

.image-hover {
  transition: transform 0.2s ease-in-out;
}

.image-hover:hover {
  transform: scale(1.05);
}

.cursor-pointer {
  cursor: pointer;
}

.image-preview-dialog {
  background-color: rgba(0, 0, 0, 0.9);
}

.image-preview-dialog .v-overlay__content {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.7) !important;
}
</style> 