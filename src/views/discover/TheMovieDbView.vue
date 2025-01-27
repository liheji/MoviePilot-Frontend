<script setup lang="ts">
import MediaCardListView from '@/views/discover/MediaCardListView.vue'

// 电影或者电视剧 movies/tvs
const type = ref('movies')

// 过滤参数
const filterParams = ref({
  'sort_by': 'popularity.desc',
  'with_genres': '',
  'with_original_language': '',
  'with_keywords': '',
  'with_watch_providers': '',
  'vote_average.gte': 0,
  'vote_count.gte': 0,
  'release_date.gte': '',
  })
</script>

<template>
  <div>
    <MediaCardListView :apipath="`tmdb/${type}`" :params="filterParams" />
  </div>
</template>
