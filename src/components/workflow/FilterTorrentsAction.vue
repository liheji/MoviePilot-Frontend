<script setup lang="ts">
import api from '@/api'
import { FilterRuleGroup } from '@/api/types'
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
})

// 质量选择框数据
const qualityOptions = ref([
  {
    title: '全部',
    value: '',
  },
  {
    title: '蓝光原盘',
    value: 'Blu-?Ray.+VC-?1|Blu-?Ray.+AVC|UHD.+blu-?ray.+HEVC|MiniBD',
  },
  {
    title: 'Remux',
    value: 'Remux',
  },
  {
    title: 'BluRay',
    value: 'Blu-?Ray',
  },
  {
    title: 'UHD',
    value: 'UHD|UltraHD',
  },
  {
    title: 'WEB-DL',
    value: 'WEB-?DL|WEB-?RIP',
  },
  {
    title: 'HDTV',
    value: 'HDTV',
  },
  {
    title: 'H265',
    value: '[Hx].?265|HEVC',
  },
  {
    title: 'H264',
    value: '[Hx].?264|AVC',
  },
])

// 分辨率选择框数据
const resolutionOptions = ref([
  {
    title: '全部',
    value: '',
  },
  {
    title: '4k',
    value: '4K|2160p|x2160',
  },
  {
    title: '1080p',
    value: '1080[pi]|x1080',
  },
  {
    title: '720p',
    value: '720[pi]|x720',
  },
])

// 特效选择框数据
const effectOptions = ref([
  {
    title: '全部',
    value: '',
  },
  {
    title: '杜比视界',
    value: 'Dolby[\\s.]+Vision|DOVI|[\\s.]+DV[\\s.]+',
  },
  {
    title: '杜比全景声',
    value: 'Dolby[\\s.]*\\+?Atmos|Atmos',
  },
  {
    title: 'HDR',
    value: '[\\s.]+HDR[\\s.]+|HDR10|HDR10\\+',
  },
  {
    title: 'SDR',
    value: '[\\s.]+SDR[\\s.]+',
  },
])

// 所有规则组列表
const filterRuleGroups = ref<FilterRuleGroup[]>([])

// 加载规则组
async function queryFilterRuleGroups() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/UserFilterRuleGroups')
    filterRuleGroups.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 计算过滤规则组选择框数据
const ruleGroupsOptions = computed(() => {
  return filterRuleGroups.value.map(group => ({
    title: group.name,
    value: group.name,
  }))
})

onMounted(() => {
  queryFilterRuleGroups()
})
</script>
<template>
  <VCard max-width="20rem">
    <Handle id="edge_in" type="target" :position="Position.Left" />
    <VCardItem>
      <template v-slot:prepend>
        <VAvatar>
          <VIcon icon="mdi-filter-multiple" size="x-large"></VIcon>
        </VAvatar>
      </template>
      <VCardTitle>过滤资源</VCardTitle>
      <VCardSubtitle>对资源列表数据进行过滤</VCardSubtitle>
    </VCardItem>
    <VDivider />
    <VCardText>
      <VRow>
        <VCol cols="6">
          <VSelect v-model="data.quality" label="质量" :items="qualityOptions" outlined dense />
        </VCol>
        <VCol cols="6">
          <VSelect v-model="data.resolution" label="分辨率" :items="resolutionOptions" outlined dense />
        </VCol>
        <VCol cols="6">
          <VSelect v-model="data.effect" label="特效" :items="effectOptions" outlined dense />
        </VCol>
        <VCol cols="6">
          <VTextField v-model="data.size" label="大小范围" placeholder="MB" outlined dense />
        </VCol>
        <VCol cols="12">
          <VTextField v-model="data.include" label="包含（关键字、正则式）" outlined dense />
        </VCol>
        <VCol cols="12">
          <VTextField v-model="data.exclude" label="排除（关键字、正则式）" outlined dense />
        </VCol>
        <VCol cols="12">
          <VSelect
            v-model="data.rule_groups"
            chips
            multiple
            label="过滤规则组"
            :items="ruleGroupsOptions"
            outlined
            dense
          />
        </VCol>
      </VRow>
    </VCardText>
    <Handle id="edge_out" type="source" :position="Position.Right" />
  </VCard>
</template>
