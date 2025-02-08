<script setup lang="ts">
import { DiscoverSource } from '@/api/types'
import MediaCardListView from '@/views/discover/MediaCardListView.vue'
import FormRender from '@/components/render/FormRender.vue'
import { cloneDeep } from 'lodash'

// 输入参数
const props = defineProps<{
  source: DiscoverSource
}>()

// 默认输入参数
const default_params = cloneDeep(props.source.filter_params)

// 过滤参数
const filterParams = reactive(props.source.filter_params)

// 当前Key
const currentKey = ref(0)

// 类型和过滤参数变化后重新刷新列表
watch([filterParams], () => {
  // 检查每个值，如果没有值但有默认值时，设置为默认值
  for (const key in filterParams) {
    if (!filterParams[key] && default_params[key]) {
      filterParams[key] = default_params[key]
    }
  }
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

<style>
.v-chip--selected {
  color: rgb(var(--v-theme-primary)) !important;
}
</style>
