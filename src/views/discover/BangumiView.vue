<script setup lang="ts">
import MediaCardListView from '@/views/discover/MediaCardListView.vue'

// 电影或者电视剧 movies/tvs
const type = ref('movies')

// 过滤参数
const filterParams = ref({
  'type': 2,
  'cat': null,
  'sort': 'rank', // date/rank
  'year': null,
})
</script>

<template>
  <div>
    <MediaCardListView apipath="bangumi/subjects" :params="filterParams" />
  </div>
</template>
