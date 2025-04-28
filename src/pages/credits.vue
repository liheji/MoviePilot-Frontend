<script setup lang="ts">
import PersonCardListView from '@/views/discover/PersonCardListView.vue'

// 路由参数
const route = useRoute()
const id = route.query?.id?.toString()
const title = route.query?.title?.toString()
const source = route.query?.source?.toString()
const type = route.query?.type?.toString()
const apipath = route.query?.apipath?.toString()
</script>

<template>
  <div>
    <VPageContentTitle :title="title" />
    <PersonCardListView
      :credits-id="id"
      :credits-name="title"
      :credits-source="source"
      :credits-type="type"
      :credits-apipath="apipath"
    />
  </div>
</template>
