<script setup lang="ts">
import MediaCardListView from '@/views/discover/MediaCardListView.vue'

// 电影或者电视剧 movies/tvs
const type = ref('movies')

// 过滤参数
const filterParams = ref({
  'sort': 'R',
  'tags': '',
})
</script>

<template>
  <div>
    <MediaCardListView :apipath="`douban/${type}`" :params="filterParams" />
  </div>
</template>
