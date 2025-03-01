<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import api from '@/api'
import { RecommendSource } from '@/api/types'

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

// 内置榜单
const innerList = [
  {
    'api_path': 'recommend/tmdb_trending',
    'name': '流行趋势',
  },
  {
    'api_path': 'recommend/douban_showing',
    'name': '正在热映',
  },
  {
    'api_path': 'bangumi/calendar',
    'name': 'Bangumi每日放送',
  },
  {
    'api_path': 'recommend/tmdb_movies',
    'name': 'TMDB热门电影',
  },
  {
    'api_path': 'recommend/tmdb_tvs?with_original_language=zh|en|ja|ko',
    'name': 'TMDB热门电视剧',
  },
  {
    'api_path': 'recommend/douban_movie_hot',
    'name': '豆瓣热门电影',
  },
  {
    'api_path': 'recommend/douban_tv_hot',
    'name': '豆瓣热门电视剧',
  },
  {
    'api_path': 'recommend/douban_tv_animation',
    'name': '豆瓣热门动漫',
  },
  {
    'api_path': 'recommend/douban_movies',
    'name': '豆瓣最新电影',
  },
  {
    'api_path': 'recommend/douban_tvs',
    'name': '豆瓣最新电视剧',
  },
  {
    'api_path': 'recommend/douban_movie_top250',
    'name': '豆瓣电影TOP250',
  },
  {
    'api_path': 'recommend/douban_tv_weekly_chinese',
    'name': '豆瓣国产剧集榜',
  },
  {
    'api_path': 'recommend/douban_tv_weekly_global',
    'name': '豆瓣全球剧集榜',
  },
]

// 额外的数据源
const extraRecommendSources = ref<RecommendSource[]>([])

// 加载额外的发现数据源
async function loadExtraRecommendSources() {
  try {
    extraRecommendSources.value = await api.get('recommend/source')
    if (extraRecommendSources.value.length > 0) {
      innerList.push(
        ...extraRecommendSources.value.map(source => ({
          api_path: source.api_path,
          name: source.name,
        })),
      )
    }
  } catch (error) {
    console.log(error)
  }
}

// 来源类型下拉框
const sourceTypeOptions = [
  { value: 'ranking', title: '推荐榜单' },
  { value: 'api', title: 'API' },
]

// 计算下拉框
const sourceOptions = computed(() => innerList.map(item => item.name))

onMounted(() => {
  loadExtraRecommendSources()
})
</script>
<template>
  <div>
    <VCard max-width="20rem">
      <Handle id="edge_in" type="target" :position="Position.Left" />
      <VCardItem>
        <template v-slot:prepend>
          <VAvatar>
            <VIcon icon="mdi-multimedia" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>获取媒体数据</VCardTitle>
        <VCardSubtitle>获取榜单等媒体数据列表</VCardSubtitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VSelect v-model="data.source_type" :items="sourceTypeOptions" label="来源" outlined dense />
          </VCol>
        </VRow>
        <VRow v-if="data.source_type === 'ranking'">
          <VCol cols="12">
            <VSelect
              v-model="data.sources"
              :items="sourceOptions"
              label="选择榜单"
              chips
              multiple
              outlined
              dense
              clearable
            />
          </VCol>
        </VRow>
        <VRow v-else>
          <VCol cols="12">
            <VTextField
              v-model="data.api_path"
              label="API地址"
              placeholder="/api/v1/plugin/xxx/xxxx"
              outlined
              dense
              clearable
            />
          </VCol>
        </VRow>
      </VCardText>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
