<script setup lang="ts">
import SubscribeListView from '@/views/subscribe/SubscribeListView.vue'
import SubscribePopularView from '@/views/subscribe/SubscribePopularView.vue'
import SubscribeShareView from '@/views/subscribe/SubscribeShareView.vue'
import SubscribeEditDialog from '@/components/dialog/SubscribeEditDialog.vue'

import { SubscribeMovieTabs, SubscribeTvTabs } from '@/router/menu'

const route = useRoute()

const subType = route.meta.subType?.toString()
const subId = ref(route.query.id as string)
const activeTab = ref(route.query.tab)
const shareViewKey = ref(0)

// 默认订阅设置弹窗
const subscribeEditDialog = ref(false)

// 订阅过滤弹窗
const filterSubscribeDialog = ref(false)

// 搜索订阅分享弹窗
const searchShareDialog = ref(false)

// 订阅过滤词
const subscribeFilter = ref('')

// 分享搜索词
const shareKeyword = ref('')

// 搜索分享
const searchShares = () => {
  searchShareDialog.value = false
  shareViewKey.value++
}
</script>

<template>
  <div>
    <VHeaderTab :items="subType == '电影' ? SubscribeMovieTabs : SubscribeTvTabs" v-model="activeTab">
      <template #append>
        <VMenu
          v-if="activeTab === '我的订阅'"
          v-model="filterSubscribeDialog"
          width="20rem"
          :close-on-content-click="false"
        >
          <template #activator="{ props }">
            <VBtn
              icon="mdi-filter-multiple-outline"
              variant="text"
              :color="subscribeFilter ? 'primary' : 'gray'"
              size="default"
              class="settings-icon-button"
              v-bind="props"
            />
          </template>
          <VCard>
            <VCardItem>
              <VCardTitle>
                <VIcon icon="mdi-filter-multiple-outline" class="mr-2" />
                筛选订阅
              </VCardTitle>
              <VDialogCloseBtn @click="filterSubscribeDialog = false" />
            </VCardItem>
            <VCardText>
              <VTextField v-model="subscribeFilter" label="名称" clearable density="comfortable" />
            </VCardText>
          </VCard>
        </VMenu>
        <VMenu
          v-if="activeTab === '订阅分享'"
          v-model="searchShareDialog"
          width="25rem"
          :close-on-content-click="false"
        >
          <template #activator="{ props }">
            <VBtn
              icon="mdi-movie-search-outline"
              variant="text"
              :color="shareKeyword ? 'primary' : 'gray'"
              size="default"
              class="settings-icon-button"
              v-bind="props"
            />
          </template>
          <VCard>
            <VCardItem>
              <VCardTitle>
                <VIcon icon="mdi-movie-search-outline" class="mr-2" />
                搜索订阅分享
              </VCardTitle>
              <VDialogCloseBtn @click="searchShareDialog = false" />
            </VCardItem>
            <VCardText>
              <VTextField v-model="shareKeyword" label="关键词" clearable density="comfortable">
                <template #append>
                  <VBtn prepend-icon="mdi-magnify" color="primary" @click="searchShares">搜索</VBtn>
                </template>
              </VTextField>
            </VCardText>
          </VCard>
        </VMenu>
        <VBtn
          v-if="activeTab === '我的订阅'"
          icon="mdi-clipboard-edit-outline"
          variant="text"
          color="gray"
          size="default"
          class="settings-icon-button"
          @click="subscribeEditDialog = true"
        />
      </template>
    </VHeaderTab>

    <VWindow v-model="activeTab" class="disable-tab-transition" :touch="false">
      <VWindowItem value="我的订阅">
        <transition name="fade-slide" appear>
          <div>
            <SubscribeListView :type="subType" :subid="subId" :keyword="subscribeFilter" />
          </div>
        </transition>
      </VWindowItem>
      <VWindowItem value="热门订阅">
        <transition name="fade-slide" appear>
          <div>
            <SubscribePopularView :type="subType" />
          </div>
        </transition>
      </VWindowItem>
      <VWindowItem value="订阅分享">
        <transition name="fade-slide" appear>
          <div>
            <SubscribeShareView :keyword="shareKeyword" :key="shareViewKey" />
          </div>
        </transition>
      </VWindowItem>
    </VWindow>

    <!-- 订阅编辑弹窗 -->
    <SubscribeEditDialog
      v-if="subscribeEditDialog"
      v-model="subscribeEditDialog"
      :default="true"
      :type="subType"
      @save="subscribeEditDialog = false"
      @close="subscribeEditDialog = false"
    />
  </div>
</template>
