<script setup lang="ts">
import MediaCardListView from '@/views/discover/MediaCardListView.vue'

// 过滤参数
const filterParams = reactive({
  'type': 2,
  'cat': null,
  'sort': 'rank', // date/rank
  'year': null,
})

// Bangumi cat字典
/**
 * 0 为 其他
1 为 TV
2 为 OVA
3 为 Movie
5 为 WEB
 */
const bangumiCatDict = {
  '0': '其他',
  '1': 'TV',
  '2': 'OVA',
  '3': 'Movie',
  '5': 'WEB',
}

// Bangumi排序字典
const bangumiSortDict = {
  'rank': '排名',
  'date': '日期',
}

// 当前Key
const currentKey = ref(0)

// 类型和过滤参数变化后重新刷新列表
watch([filterParams], () => {
  currentKey.value++
})
</script>

<template>
  <div class="px-3">
    <div class="flex justify-start align-center">
      <div class="mr-5">
        <VLabel>类别</VLabel>
      </div>
      <VChipGroup column v-model="filterParams.cat">
        <VChip
          :color="filterParams.cat == key ? 'primary' : ''"
          filter
          tile
          :value="key"
          v-for="(value, key) in bangumiCatDict"
          :key="key"
        >
          {{ value }}
        </VChip>
      </VChipGroup>
    </div>
    <div class="flex justify-start align-center">
      <div class="mr-5">
        <VLabel>排序</VLabel>
      </div>
      <VChipGroup column v-model="filterParams.sort">
        <VChip
          :color="filterParams.sort == key ? 'primary' : ''"
          filter
          tile
          :value="key"
          v-for="(value, key) in bangumiSortDict"
          :key="key"
        >
          {{ value }}
        </VChip>
      </VChipGroup>
    </div>
  </div>
  <div>
    <MediaCardListView :key="currentKey" apipath="bangumi/subjects" :params="filterParams" />
  </div>
</template>
