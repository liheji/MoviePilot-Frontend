<script setup lang="ts">
import api from '@/api'
import { DownloaderConf } from '@/api/types'
import DownloadingListView from '@/views/reorganize/DownloadingListView.vue'
import NoDataFound from '@/components/NoDataFound.vue'

const route = useRoute()
const activeTab = ref(route.query.tab)

// 下载器
const downloaders = ref<DownloaderConf[]>([])

// 下载器字典
const downloaderItems = computed(() => {
  return downloaders.value.map(item => ({
    title: item.name,
  }))
})

// 调用API查询下载器设置
async function loadDownloaderSetting() {
  try {
    downloaders.value = await api.get('download/clients')
    if (downloaders.value && downloaders.value.length > 0 && !activeTab.value)
      activeTab.value = downloaders.value[0].name
  } catch (error) {
    console.log(error)
  }
}

onMounted(async () => {
  await loadDownloaderSetting()
})

onActivated(async () => {
  loadDownloaderSetting()
})
</script>

<template>
  <div v-if="downloaders.length > 0">
    <VHeaderTab :items="downloaderItems" v-model="activeTab" />
    <VWindow v-model="activeTab" class="mt-5 disable-tab-transition" :touch="false">
      <VWindowItem v-for="item in downloaders" :value="item.name">
        <transition name="fade-slide" appear>
          <div>
            <DownloadingListView :name="item.name" />
          </div>
        </transition>
      </VWindowItem>
    </VWindow>
  </div>
  <NoDataFound
    v-else
    error-code="404"
    error-title="没有下载器"
    error-description="请先在设置中正确配置并启用下载器。"
  />
</template>
