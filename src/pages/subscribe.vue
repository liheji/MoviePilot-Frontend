<script setup lang="ts">
import SubscribeListView from '@/views/subscribe/SubscribeListView.vue'
import SubscribePopularView from '@/views/subscribe/SubscribePopularView.vue'
import SubscribeShareView from '@/views/subscribe/SubscribeShareView.vue'
import { SubscribeMovieTabs, SubscribeTvTabs } from '@/router/menu'
import router from '@/router'

const route = useRoute()

const subType = route.meta.subType?.toString()
const subId = ref(route.query.id as string)
const activeTab = ref(route.query.tab)

function jumpTab(tab: string) {
  router.push('/subscribe/movie?tab=' + tab)
}
</script>

<template>
  <div>
    <VTabs v-model="activeTab" show-arrows stacked>
      <VTab
        v-if="subType == '电影'"
        v-for="item in SubscribeMovieTabs"
        :value="item.tab"
        @to="jumpTab(item.tab)"
        class="px-10 rounded-t-lg"
      >
        <VIcon size="x-large" start :icon="item.icon" />
        {{ item.title }}
      </VTab>
      <VTab
        v-if="subType == '电视剧'"
        v-for="item in SubscribeTvTabs"
        :value="item.tab"
        @to="jumpTab(item.tab)"
        class="px-10 rounded-t-lg"
      >
        <VIcon size="x-large" start :icon="item.icon" />
        {{ item.title }}
      </VTab>
    </VTabs>

    <VWindow v-model="activeTab" class="disable-tab-transition" :touch="false">
      <VWindowItem value="mysub">
        <transition name="fade-slide" appear>
          <div class="mt-4">
            <SubscribeListView :type="subType" :subid="subId" />
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
            <SubscribeShareView />
          </div>
        </transition>
      </VWindowItem>
    </VWindow>
  </div>
</template>
