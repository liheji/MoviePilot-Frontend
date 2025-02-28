<script setup lang="ts">
import api from '@/api'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
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

// 二级分类策略
const mediaCategories = ref<{ [key: string]: any }>({})

// 调用API查询自动分类配置
async function loadMediaCategories() {
  try {
    mediaCategories.value = await api.get('media/category')
  } catch (error) {
    console.log(error)
  }
}

// 根据选中的媒体类型，获取对应的媒体类别
const getCategories = computed(() => {
  const default_value = [{ title: '全部', value: '' }]
  if (!mediaCategories.value || !mediaCategories.value[props.data.type ?? '']) return default_value
  return default_value.concat(mediaCategories.value[props.data.type ?? ''])
})

onMounted(() => {
  loadMediaCategories()
})
</script>
<template>
  <div>
    <VCard max-width="20rem">
      <Handle id="edge_in" type="target" :position="Position.Left" />
      <VCardItem>
        <template v-slot:prepend>
          <VAvatar>
            <VIcon icon="mdi-filter-check" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>过滤媒体数据</VCardTitle>
        <VCardSubtitle>对媒体数据列表进行过滤</VCardSubtitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VSelect v-model="data.type" label="类型" :items="typeOptions" outlined dense />
          </VCol>
          <VCol cols="12">
            <VSelect v-model="data.category" label="类别" :items="getCategories" outlined dense />
          </VCol>
          <VCol cols="6">
            <VTextField v-model="data.year" label="年份" outlined dense />
          </VCol>
          <VCol cols="6">
            <VTextField v-model="data.vote" type="number" label="评分" outlined dense />
          </VCol>
        </VRow>
      </VCardText>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
