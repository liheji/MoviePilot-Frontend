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

// 弹窗
const subscribeEditDialog = ref(false)
</script>

<template>
  <div>
    <VHeaderTab :items="subType == '电影' ? SubscribeMovieTabs : SubscribeTvTabs" v-model="activeTab">
      <template #append>
        <VBtn
          icon="mdi-clipboard-edit-outline"
          variant="text"
          color="primary"
          size="default"
          class="settings-icon-button"
          @click="subscribeEditDialog = true"
        />
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
            <SubscribeShareView />
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
