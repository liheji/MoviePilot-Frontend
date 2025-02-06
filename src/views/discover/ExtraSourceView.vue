<script setup lang="ts">
import { DiscoverSource } from '@/api/types'
import MediaCardListView from '@/views/discover/MediaCardListView.vue'
import FormRender from '@/components/render/FormRender.vue'

// 输入参数
const props = defineProps<{
  source: DiscoverSource
}>()

// 过滤参数
const filterParams = reactive(props.source.filter_params)

// 当前Key
const currentKey = ref(0)

// 类型和过滤参数变化后重新刷新列表
watch([filterParams], () => {
  currentKey.value++
})
</script>

<template>
  <div class="px-3">
    <FormRender v-for="(element, index) in source.filter_ui" :key="index" :config="element" :model="filterParams" />
  </div>
  <div>
    <MediaCardListView :key="currentKey" :apipath="source.api_path" :params="filterParams" />
  </div>
</template>
