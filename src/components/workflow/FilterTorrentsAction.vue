<script setup lang="ts">
import api from '@/api'
import { FilterRuleGroup } from '@/api/types'
import { Handle, Position } from '@vue-flow/core'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
    title: t('workflow.filterTorrents.qualityOptions.all'),
    value: '',
  },
  {
    title: t('workflow.filterTorrents.qualityOptions.blurayOriginal'),
    value: 'Blu-?Ray.+VC-?1|Blu-?Ray.+AVC|UHD.+blu-?ray.+HEVC|MiniBD',
  },
  {
    title: t('workflow.filterTorrents.qualityOptions.remux'),
    value: 'Remux',
  },
  {
    title: t('workflow.filterTorrents.qualityOptions.bluray'),
    value: 'Blu-?Ray',
  },
  {
    title: t('workflow.filterTorrents.qualityOptions.uhd'),
    value: 'UHD|UltraHD',
  },
  {
    title: t('workflow.filterTorrents.qualityOptions.webdl'),
    value: 'WEB-?DL|WEB-?RIP',
  },
  {
    title: t('workflow.filterTorrents.qualityOptions.hdtv'),
    value: 'HDTV',
  },
  {
    title: t('workflow.filterTorrents.qualityOptions.h265'),
    value: '[Hx].?265|HEVC',
  },
  {
    title: t('workflow.filterTorrents.qualityOptions.h264'),
    value: '[Hx].?264|AVC',
  },
])

// 分辨率选择框数据
const resolutionOptions = ref([
  {
    title: t('workflow.filterTorrents.resolutionOptions.all'),
    value: '',
  },
  {
    title: t('workflow.filterTorrents.resolutionOptions.4k'),
    value: '4K|2160p|x2160',
  },
  {
    title: t('workflow.filterTorrents.resolutionOptions.1080p'),
    value: '1080[pi]|x1080',
  },
  {
    title: t('workflow.filterTorrents.resolutionOptions.720p'),
    value: '720[pi]|x720',
  },
])

// 特效选择框数据
const effectOptions = ref([
  {
    title: t('workflow.filterTorrents.effectOptions.all'),
    value: '',
  },
  {
    title: t('workflow.filterTorrents.effectOptions.dolbyVision'),
    value: 'Dolby[\\s.]+Vision|DOVI|[\\s.]+DV[\\s.]+',
  },
  {
    title: t('workflow.filterTorrents.effectOptions.dolbyAtmos'),
    value: 'Dolby[\\s.]*\\+?Atmos|Atmos',
  },
  {
    title: t('workflow.filterTorrents.effectOptions.hdr'),
    value: '[\\s.]+HDR[\\s.]+|HDR10|HDR10\\+',
  },
  {
    title: t('workflow.filterTorrents.effectOptions.sdr'),
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
  <div>
    <VCard max-width="20rem">
      <Handle id="edge_in" type="target" :position="Position.Left" />
      <VCardItem>
        <template v-slot:prepend>
          <VAvatar>
            <VIcon icon="mdi-filter-multiple" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>{{ t('workflow.filterTorrents.title') }}</VCardTitle>
        <VCardSubtitle>{{ t('workflow.filterTorrents.subtitle') }}</VCardSubtitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="6">
            <VSelect
              v-model="data.quality"
              :label="t('workflow.filterTorrents.quality')"
              :items="qualityOptions"
              outlined
              dense
            />
          </VCol>
          <VCol cols="6">
            <VSelect
              v-model="data.resolution"
              :label="t('workflow.filterTorrents.resolution')"
              :items="resolutionOptions"
              outlined
              dense
            />
          </VCol>
          <VCol cols="6">
            <VSelect
              v-model="data.effect"
              :label="t('workflow.filterTorrents.effect')"
              :items="effectOptions"
              outlined
              dense
            />
          </VCol>
          <VCol cols="6">
            <VTextField
              v-model="data.size"
              :label="t('workflow.filterTorrents.size')"
              placeholder="MB"
              outlined
              dense
            />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="data.include" :label="t('workflow.filterTorrents.include')" outlined dense />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="data.exclude" :label="t('workflow.filterTorrents.exclude')" outlined dense />
          </VCol>
          <VCol cols="12">
            <VSelect
              v-model="data.rule_groups"
              chips
              multiple
              :label="t('workflow.filterTorrents.ruleGroups')"
              :items="ruleGroupsOptions"
              outlined
              dense
            />
          </VCol>
        </VRow>
      </VCardText>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
