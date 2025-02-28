<script setup lang="ts">
import api from '@/api'
import { Site } from '@/api/types'
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
})

// 电影/电视剧下拉框
const typeOptions = ref([
  {
    title: '电影',
    value: '电影',
  },
  {
    title: '电视剧',
    value: '电视剧',
  },
])

// 搜索方式下拉框
const searchOptions = ref([
  {
    title: '名称',
    value: 'keyword',
  },
  {
    title: '媒体列表',
    value: 'media',
  },
])

// 站点数据列表
const siteList = ref<Site[]>([])

// 获取站点列表数据
async function loadSites() {
  try {
    const data: Site[] = await api.get('site/rss')

    // 过滤站点，只有启用的站点才显示
    siteList.value = data.filter(item => item.is_active)
  } catch (error) {
    console.error(error)
  }
}

// 站点选项
const siteOptions = computed(() => {
  return siteList.value.map(item => {
    return {
      title: item.name,
      value: item.id,
    }
  })
})

onMounted(() => {
  loadSites()
})
</script>
<template>
  <VCard max-width="20rem">
    <Handle id="edge_in" type="target" :position="Position.Left" />
    <VCardItem>
      <template v-slot:prepend>
        <VAvatar>
          <VIcon icon="mdi-search-web" size="x-large"></VIcon>
        </VAvatar>
      </template>
      <VCardTitle>搜索站点资源</VCardTitle>
      <VCardSubtitle>根据关键字搜索站点种子资源</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText>
      <VRow>
        <VCol cols="12">
          <VSelect v-model="data.search_type" label="搜索方式" :items="searchOptions" outlined dense />
        </VCol>
      </VRow>
      <VRow v-if="data.search_type === 'keyword'">
        <VCol cols="6">
          <VTextField v-model="data.name" label="名称" outlined dense />
        </VCol>
        <VCol cols="6">
          <VTextField v-model="data.year" label="年份" outlined dense />
        </VCol>
        <VCol cols="6">
          <VSelect v-model="data.type" label="类型" :items="typeOptions" outlined dense />
        </VCol>
        <VCol cols="6">
          <VTextField v-model="data.season" type="number" label="季" outlined dense />
        </VCol>
      </VRow>
      <VRow>
        <VCol cols="12">
          <VSelect v-model="data.sites" label="站点" :items="siteOptions" chips multiple outlined dense />
        </VCol>
      </VRow>
    </VCardText>
    <Handle id="edge_out" type="source" :position="Position.Right" />
  </VCard>
</template>
