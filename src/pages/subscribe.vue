<script setup lang="ts">
import SubscribeListView from '@/views/subscribe/SubscribeListView.vue'
import SubscribePopularView from '@/views/subscribe/SubscribePopularView.vue'
import SubscribeShareView from '@/views/subscribe/SubscribeShareView.vue'
import SubscribeEditDialog from '@/components/dialog/SubscribeEditDialog.vue'
import SubscribeShareStatisticsDialog from '@/components/dialog/SubscribeShareStatisticsDialog.vue'
import { useI18n } from 'vue-i18n'
import { useDynamicHeaderTab } from '@/composables/useDynamicHeaderTab'

import { getSubscribeMovieTabs, getSubscribeTvTabs } from '@/router/i18n-menu'

// 国际化
const { t } = useI18n()

const route = useRoute()

const subType = route.meta.subType?.toString()
const subId = ref(route.query.id as string)
const activeTab = ref((route.query.tab as string) || '')
const shareViewKey = ref(0)

// 获取标签页
const subscribeTabs = computed(() => {
  if (subType === '电影') {
    return getSubscribeMovieTabs()
  } else {
    return getSubscribeTvTabs()
  }
})

// 默认订阅设置弹窗
const subscribeEditDialog = ref(false)

// 订阅过滤弹窗
const filterSubscribeDialog = ref(false)

// 搜索订阅分享弹窗
const searchShareDialog = ref(false)

// 订阅分享统计弹窗
const shareStatisticsDialog = ref(false)

// 订阅过滤词
const subscribeFilter = ref('')

// 分享搜索词
const shareKeyword = ref('')

// 搜索分享
const searchShares = () => {
  searchShareDialog.value = false
  shareViewKey.value++
}

// VMenu activator选择器
const filterActivator = computed(() => '[data-menu-activator="filter-btn"]')
const searchActivator = computed(() => '[data-menu-activator="search-btn"]')
const statisticsActivator = computed(() => '[data-menu-activator="statistics-btn"]')

// 使用动态标签页
const { registerHeaderTab } = useDynamicHeaderTab()

// 注册动态标签页
registerHeaderTab({
  items: subscribeTabs.value,
  modelValue: activeTab,
  appendButtons: [
    {
      icon: 'mdi-filter-multiple-outline',
      variant: 'text',
      color: computed(() => (subscribeFilter.value ? 'primary' : 'gray')),
      class: 'settings-icon-button',
      dataAttr: 'filter-btn',
      action: () => {
        filterSubscribeDialog.value = true
      },
      show: computed(() => activeTab.value === 'mysub'),
    },
    {
      icon: 'mdi-chart-line',
      variant: 'text',
      color: 'gray',
      class: 'settings-icon-button',
      dataAttr: 'statistics-btn',
      action: () => {
        shareStatisticsDialog.value = true
      },
      show: computed(() => activeTab.value === 'share'),
    },
    {
      icon: 'mdi-movie-search-outline',
      variant: 'text',
      color: computed(() => (shareKeyword.value ? 'primary' : 'gray')),
      class: 'settings-icon-button',
      dataAttr: 'search-btn',
      action: () => {
        searchShareDialog.value = true
      },
      show: computed(() => activeTab.value === 'share'),
    },
    {
      icon: 'mdi-clipboard-edit-outline',
      variant: 'text',
      color: 'gray',
      class: 'settings-icon-button',
      action: () => {
        subscribeEditDialog.value = true
      },
      show: computed(() => activeTab.value === 'mysub'),
    },
  ],
})

// 注册动态标签页
onMounted(() => {
  // 设置初始activeTab值
  if (!activeTab.value && subscribeTabs.value.length > 0) {
    activeTab.value = subscribeTabs.value[0].tab
  }
})
</script>

<template>
  <div>
    <VWindow v-model="activeTab" class="disable-tab-transition content-window" :touch="false">
      <VWindowItem value="mysub">
        <transition name="fade-slide" appear>
          <div>
            <SubscribeListView :type="subType" :subid="subId" :keyword="subscribeFilter" />
          </div>
        </transition>
      </VWindowItem>
      <VWindowItem value="popular">
        <transition name="fade-slide" appear>
          <div>
            <SubscribePopularView :type="subType" />
          </div>
        </transition>
      </VWindowItem>
      <VWindowItem value="share">
        <transition name="fade-slide" appear>
          <div>
            <SubscribeShareView :keyword="shareKeyword" :key="shareViewKey" />
          </div>
        </transition>
      </VWindowItem>
    </VWindow>

    <!-- 订阅过滤弹窗 -->
    <Teleport to="body" v-if="filterSubscribeDialog">
      <VMenu
        v-model="filterSubscribeDialog"
        width="20rem"
        :close-on-content-click="false"
        :activator="filterActivator"
        location="bottom end"
      >
        <VCard>
          <VCardItem>
            <VCardTitle>
              <VIcon icon="mdi-filter-multiple-outline" class="mr-2" />
              {{ t('subscribe.filterSubscriptions') }}
            </VCardTitle>
            <VDialogCloseBtn @click="filterSubscribeDialog = false" />
          </VCardItem>
          <VCardText>
            <VTextField v-model="subscribeFilter" :label="t('subscribe.name')" clearable density="comfortable" />
          </VCardText>
        </VCard>
      </VMenu>
    </Teleport>

    <!-- 搜索订阅分享弹窗 -->
    <Teleport to="body" v-if="searchShareDialog">
      <VMenu
        v-model="searchShareDialog"
        width="25rem"
        :close-on-content-click="false"
        :activator="searchActivator"
        location="bottom end"
      >
        <VCard>
          <VCardItem>
            <VCardTitle>
              <VIcon icon="mdi-movie-search-outline" class="mr-2" />
              {{ t('subscribe.searchShares') }}
            </VCardTitle>
            <VDialogCloseBtn @click="searchShareDialog = false" />
          </VCardItem>
          <VCardText>
            <VTextField v-model="shareKeyword" :label="t('subscribe.keyword')" clearable density="comfortable">
              <template #append>
                <VBtn prepend-icon="mdi-magnify" color="primary" @click="searchShares">{{ t('common.search') }}</VBtn>
              </template>
            </VTextField>
          </VCardText>
        </VCard>
      </VMenu>
    </Teleport>

    <!-- 订阅编辑弹窗 -->
    <SubscribeEditDialog
      v-if="subscribeEditDialog"
      v-model="subscribeEditDialog"
      :default="true"
      :type="subType"
      @save="subscribeEditDialog = false"
      @close="subscribeEditDialog = false"
    />

    <!-- 订阅分享统计弹窗 -->
    <SubscribeShareStatisticsDialog
      v-if="shareStatisticsDialog"
      v-model="shareStatisticsDialog"
      @close="shareStatisticsDialog = false"
    />
  </div>
</template>

<style scoped>
.content-window {
  margin-block-start: 0;
}
</style>
