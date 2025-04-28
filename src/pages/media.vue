<script setup lang="ts">
import MediaDetailView from '@/views/discover/MediaDetailView.vue'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 路由参数
const route = useRoute()

// TMDB ID
const mediaid = route.query?.mediaid?.toString()

// 类型：电影、电视剧
const type = route.query?.type?.toString()

// 媒体信息来源：TMDB、豆瓣
const source = route.query?.source?.toString() || 'themoviedb'

// TMDB ID
const page = route.query?.page?.toString() || '1'

// 标题
const title = route.query?.title?.toString()

// 年份
const year = route.query?.year?.toString()
</script>

<template>
  <div>
    <MediaDetailView :mediaid="mediaid" :type="type" :source="source" :page="page" :title="title" :year="year" />
  </div>
</template>
