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

// 搜索订阅分享弹窗
const searchShareDialog = ref(false)

// 分享订阅过滤词
const shareFilter = ref('')

// 触发搜索订阅
const searchShares = () => {
  searchShareDialog.value = false
  shareViewKey.value++
}
</script>

<template>
  <div>
    <VHeaderTab :items="subType == '电影' ? SubscribeMovieTabs : SubscribeTvTabs" v-model="activeTab">
      <template #append>
        <VBtn
          v-if="activeTab === '我的订阅'"
          icon="mdi-clipboard-edit-outline"
          variant="text"
          color="primary"
          size="default"
          class="settings-icon-button"
          @click="subscribeEditDialog = true"
        />
        <VMenu
          v-if="activeTab === '订阅分享'"
          v-model="searchShareDialog"
          width="35rem"
          :close-on-content-click="false"
        >
          <template #activator="{ props }">
            <VBtn
              icon="mdi-movie-search-outline"
              variant="text"
              color="primary"
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
              <DialogCloseBtn @click="searchShareDialog = false" />
            </VCardItem>
            <VCardText>
              <VTextField v-model="shareFilter" label="搜索关键词" clearable>
                <template #append>
                  <VBtn prepend-icon="mdi-magnify" color="primary" @click="searchShares">搜索</VBtn>
                </template>
              </VTextField>
            </VCardText>
          </VCard>
        </VMenu>
      </template>
    </VHeaderTab>

    <VWindow v-model="activeTab" class="disable-tab-transition" :touch="false">
      <VWindowItem value="我的订阅">
        <transition name="fade-slide" appear>
          <div class="mt-4">
            <SubscribeListView :type="subType" :subid="subId" />
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
            <SubscribeShareView :keyword="shareFilter" :key="shareViewKey" />
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
