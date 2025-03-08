<script setup lang="ts">
import { DiscoverTabs } from '@/router/menu'
import draggable from 'vuedraggable'
import router from '@/router'
import TheMovieDbView from '@/views/discover/TheMovieDbView.vue'
import DoubanView from '@/views/discover/DoubanView.vue'
import BangumiView from '@/views/discover/BangumiView.vue'
import ExtraSourceView from '@/views/discover/ExtraSourceView.vue'
import { DiscoverSource } from '@/api/types'
import api from '@/api'

const route = useRoute()
const activeTab = ref(route.query.tab)

function jumpTab(tab: string) {
  router.push('/subscribe/discover?tab=' + tab)
}

// 本地存储键值
const localOrderKey = 'MP_DISCOVER_TAB_ORDER'

// 顺序配置
const orderConfig = ref<{ name: string }[]>([])

// 标签页
const discoverTabs = ref<DiscoverSource[]>([])

// 额外的数据源
const extraDiscoverSources = ref<DiscoverSource[]>([])

// 初始化发现标签
function initDiscoverTabs() {
  for (const tab of DiscoverTabs) {
    discoverTabs.value.push({
      name: tab.name,
      mediaid_prefix: tab.tab,
      api_path: '',
      filter_params: {},
      filter_ui: [],
    })
  }
}

// 加载额外的发现数据源
async function loadExtraDiscoverSources() {
  try {
    extraDiscoverSources.value = await api.get('discover/source')
    if (extraDiscoverSources.value.length === 0) {
      return
    }
    for (const source of extraDiscoverSources.value) {
      if (discoverTabs.value.find(tab => tab.mediaid_prefix === source.mediaid_prefix)) {
        continue
      }
      discoverTabs.value.push(source)
    }
  } catch (error) {
    console.log(error)
  }
}

// 按order的顺序排序
function sortSubscribeOrder() {
  if (!orderConfig.value) {
    return
  }
  if (discoverTabs.value.length === 0) {
    return
  }
  discoverTabs.value.sort((a, b) => {
    const aIndex = orderConfig.value.findIndex((item: { name: string }) => item.name === a.name)
    const bIndex = orderConfig.value.findIndex((item: { name: string }) => item.name === b.name)
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
}

// 加载顺序
async function loadOrderConfig() {
  // 顺序配置
  const local_order = localStorage.getItem(localOrderKey)
  if (local_order) {
    orderConfig.value = JSON.parse(local_order)
  } else {
    const response = await api.get(`/user/config/${localOrderKey}`)
    if (response && response.data && response.data.value) {
      orderConfig.value = response.data.value
      localStorage.setItem(localOrderKey, JSON.stringify(orderConfig.value))
    }
  }
}

// 保存顺序设置
async function saveTabOrder() {
  // 顺序配置
  const orderObj = discoverTabs.value.map(item => ({ name: item.name }))
  orderConfig.value = orderObj
  const orderString = JSON.stringify(orderObj)
  localStorage.setItem(localOrderKey, orderString)

  // 保存到服务端
  try {
    await api.post(`/user/config/${localOrderKey}`, orderObj)
  } catch (error) {
    console.error(error)
  }
}

onBeforeMount(async () => {
  await loadOrderConfig()
  initDiscoverTabs()
  await loadExtraDiscoverSources()
  sortSubscribeOrder()
})

onActivated(async () => {
  loadExtraDiscoverSources()
})
</script>

<template>
  <div>
    <VTabs v-model="activeTab" show-arrows>
      <draggable v-model="discoverTabs" handle=".cursor-move" item-key="tab" tag="div" @end="saveTabOrder">
        <template #item="{ element }">
          <VTab
            v-if="element.api_path"
            :key="element.mediaid_prefix"
            :value="element.name"
            @to="jumpTab(element.mediaid_prefix)"
          >
            <div><VIcon class="cursor-move" size="20" start icon="mdi-drag" /></div>
            <div class="min-w-24">
              <div>{{ element.name }}</div>
            </div>
          </VTab>
          <VTab v-else :value="element.mediaid_prefix" @to="jumpTab(element.mediaid_prefix)">
            <div><VIcon class="cursor-move" size="20" start icon="mdi-drag" /></div>
            <div class="min-w-24">
              <div>{{ element.name }}</div>
            </div>
          </VTab>
        </template>
      </draggable>
    </VTabs>

    <VWindow v-model="activeTab" class="mt-5 disable-tab-transition" :touch="false">
      <VWindowItem value="themoviedb">
        <transition name="fade-slide" appear>
          <div>
            <TheMovieDbView />
          </div>
        </transition>
      </VWindowItem>
      <VWindowItem value="douban">
        <transition name="fade-slide" appear>
          <div>
            <DoubanView />
          </div>
        </transition>
      </VWindowItem>
      <VWindowItem value="bangumi">
        <transition name="fade-slide" appear>
          <div>
            <BangumiView />
          </div>
        </transition>
      </VWindowItem>
      <VWindowItem v-for="item in extraDiscoverSources" :key="item.mediaid_prefix" :value="item.mediaid_prefix">
        <transition name="fade-slide" appear>
          <div>
            <ExtraSourceView :source="item" />
          </div>
        </transition>
      </VWindowItem>
    </VWindow>
  </div>
</template>
