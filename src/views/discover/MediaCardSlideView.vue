<script lang="ts" setup>
import api from '@/api'
import type { MediaInfo } from '@/api/types'
import MediaCard from '@/components/cards/MediaCard.vue'
import SlideView from '@/components/slide/SlideView.vue'
import { registerAbortController } from "@/router";

// 输入参数
const props = defineProps({
  apipath: String,
  linkurl: String,
  title: String,
})
let abortController: AbortController | null = null;

provide('rankingPropsKey', reactive({ ...props }))

// 组件加载完成
const componentLoaded = ref(false)

// 数据列表
const dataList = ref<MediaInfo[]>([])

// 获取订阅列表数据
async function fetchData() {
  try {
    if (!props.apipath)
      return
    abortController = new AbortController();
    registerAbortController(abortController);
    const { signal } = abortController;
    dataList.value = await api.get(props.apipath, { signal })
    if (dataList.value.length > 0)
      componentLoaded.value = true
  }
  catch (error) {
    console.error(error)
  }
}

// 加载时获取数据
onMounted(() => {
  fetchData();
});
onActivated(() => {
  if (dataList.value.length == 0) {
    fetchData();

  }
});
</script>

<template>
  <SlideView v-if="componentLoaded">
    <template #content>
      <template v-for="data in dataList" :key="data.tmdb_id || data.douban_id || data.bangumi_id">
        <MediaCard :media="data" height="15rem" width="10rem" />
      </template>
    </template>
  </SlideView>
</template>
