<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import api from '@/api'
import type { FilterRuleGroup, Site } from '@/api/types'
import debounce from 'lodash/debounce'

// 防抖时间
const debounceTime = 500

// 提示框
const $toast = useToast()

// 所有站点
const allSites = ref<Site[]>([])

// 选中订阅站点
const selectedSites = ref<number[]>([])

// 系统设置
const SystemSettings = ref<any>({
  Basis: {

  },
  Advanced: {
    SEARCH_MULTIPLE_NAME: false,
    DOWNLOAD_SUBTITLE: false,
    AUTO_DOWNLOAD_USER: '',
  },
})

// 媒体信息数据源字典
const mediaSourcesDict = [
  {
    title: 'TheMovieDb',
    value: 'themoviedb',
  },
  {
    title: '豆瓣',
    value: 'douban',
  },
  {
    title: 'Bangumi',
    value: 'bangumi',
  },
]

// 当前选中的媒体信息数据源
const selectedMediaSource = ref([])

// 当前选中的过滤规则组
const selectedFilterGroup = ref([])

// 过滤规则组选择项
const filterRuleGroupOptions = computed(() => {
  return filterRuleGroups.value.map(item => ({
    title: item.name,
    value: item.name,
  }))
})

// 所有规则组列表
const filterRuleGroups = ref<FilterRuleGroup[]>([])

// 查询所有站点
async function querySites() {
  try {
    const data: Site[] = await api.get('site/')

    // 过滤站点，只有启用的站点才显示
    allSites.value = data.filter(item => item.is_active)
  } catch (error) {
    console.log(error)
  }
}

// 加载规则组
async function queryFilterRuleGroups() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/UserFilterRuleGroups')
    filterRuleGroups.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 查询用户选中的站点
async function querySelectedSites() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/IndexerSites')

    selectedSites.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 保存用户选中的站点
const saveSelectedSites = debounce(async () => {
  try {
    // 用户名密码
    const result: { [key: string]: any } = await api.post('system/setting/IndexerSites', selectedSites.value)

    if (result.success) $toast.success('搜索站点保存成功')
    else $toast.error('搜索站点保存失败！')
  } catch (error) {
    console.log(error)
  }
}, debounceTime)

// 调用API查询设置
async function loadSearchSetting() {
  try {
    const result1: { [key: string]: any } = await api.get('system/setting/SEARCH_SOURCE')
    if (result1.success) selectedMediaSource.value = result1.data?.value?.split(',')
    const result2: { [key: string]: any } = await api.get('system/setting/SearchFilterRuleGroups')
    if (result2.success) selectedFilterGroup.value = result2.data?.value
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存设置
const saveSearchSetting = debounce(async () => {
  try {
    const result1: { [key: string]: any } = await api.post(
      'system/setting/SEARCH_SOURCE',
      selectedMediaSource.value.join(','),
    )

    const result2: { [key: string]: any } = await api.post(
      'system/setting/SearchFilterRuleGroups',
      selectedFilterGroup.value,
    )

    if (result1.success && result2.success) {
      $toast.success('保存设置成功')
      await reloadSystem()
    } else {
      $toast.error('保存设置失败！')
    }
  } catch (error) {
    console.log(error)
  }
}, debounceTime)

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      // 将API返回的值赋值给SystemSettings
      for (const sectionKey of Object.keys(SystemSettings.value) as Array<keyof typeof SystemSettings.value>) {
        Object.keys(SystemSettings.value[sectionKey]).forEach((key: string) => {
          let v: any
          if (result.data.hasOwnProperty(key)) {
            v = result.data[key]
            // 空字符串转为null，避免空字符串导致前端显示问题
            if (v === '') {
              v = null
            }
            (SystemSettings.value[sectionKey] as any)[key] = v
          }
        })
      }
    } else $toast.error('加载设置失败！')
  } catch (error) {
    console.log(error)
  }
}

// 保存设置
const saveSystemSettings = debounce(async (value: any) => {
  try {
    const result: { [key: string]: any } = await api.post('system/env', value)
    if (result.success) {
      $toast.success('保存设置成功')
      await reloadSystem()
      await loadSystemSettings()
    } else {
      $toast.error('保存设置失败！')
    }
  } catch (error) {
    console.log(error)
  }
}, debounceTime)

// 重载系统生效配置
async function reloadSystem() {
  try {
    const result: { [key: string]: any } = await api.get('system/reload')
    if (result.success) {
      $toast.success('系统配置已生效')
      await loadSystemSettings()
    } else $toast.error('重载系统失败！')
  } catch (error) {
    console.log(error)
  }
}

onMounted(() => {
  querySites()
  queryFilterRuleGroups()
  querySelectedSites()
  loadSearchSetting()
  loadSystemSettings()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>数据源 & 规则</VCardTitle>
          <VCardSubtitle>设定数据源、规则组等基础信息。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VSelect
                v-model="selectedMediaSource"
                multiple
                clearable
                chips
                :items="mediaSourcesDict"
                label="媒体搜索数据源"
                hint="搜索媒体信息时使用的数据源以及排序"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="selectedFilterGroup"
                multiple
                clearable
                chips
                :items="filterRuleGroupOptions"
                label="优先级规则组"
                hint="搜索媒体信息时按选定的过滤规则组对结果进行过滤"
                persistent-hint
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSearchSetting"> 保存 </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>搜索站点</VCardTitle>
          <VCardSubtitle> 只有选中的站点才会在搜索中使用。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VChipGroup v-model="selectedSites" column multiple>
            <VChip
              v-for="site in allSites"
              :key="site.id"
              :color="selectedSites.includes(site.id) ? 'primary' : ''"
              filter
              variant="outlined"
              :value="site.id"
            >
              {{ site.name }}
            </VChip>
          </VChipGroup>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSelectedSites"> 保存 </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>高级设置</VCardTitle>
          <VCardSubtitle>设置交互搜索自动下载用户ID、字幕。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VSwitch
                v-model="SystemSettings.Advanced.SEARCH_MULTIPLE_NAME"
                label="整合多名称资源搜索结果"
                hint="搜索多个名称的资源时，整合多名称的结果"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSwitch
                v-model="SystemSettings.Advanced.DOWNLOAD_SUBTITLE"
                label="下载站点字幕"
                hint="当选定的资源所在站点中，存在字幕文件时，同步自动下载"
                persistent-hint
              />
            </VCol>
            <VCol cols="12">
              <VCombobox
                v-model="SystemSettings.Advanced.AUTO_DOWNLOAD_USER"
                label="交互式搜索自动下载用户"
                hint="针对使用tg、微信等第三方交互的特化功能。使用逗号分割，设置为 all 代表所有用户自动择优下载，未设置时，需要用户手动选择资源 或 回复 ` 0 ` 才自动择优下载"
                persistent-hint
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSystemSettings(SystemSettings.Advanced)"> 保存 </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
