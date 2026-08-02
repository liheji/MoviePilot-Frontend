<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import api from '@/api'
import type { Site } from '@/api/types'
import { useI18n } from 'vue-i18n'
import { useSilentSettingRefresh } from '@/composables/useSilentSettingRefresh'

// 国际化
const { t } = useI18n()

const props = defineProps({
  active: {
    type: Boolean,
    default: true,
  },
})

// 提示框
const $toast = useToast()

// 所有站点
const allSites = ref<Site[]>([])

// 选中搜索站点
const selectedSites = ref<number[]>([])

// 系统设置
const SystemSettings = ref<any>({
  Basic: {
    TORRENT_TAG: 'MOVIEPILOT',
  },
})

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

// 查询用户选中的站点
async function querySelectedSites() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/public/IndexerSites')

    selectedSites.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 保存用户选中的站点
async function saveSelectedSites() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/IndexerSites', selectedSites.value)

    if (result.success) $toast.success(t('setting.search.saveSuccess'))
    else $toast.error(t('setting.search.saveFailed'))
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存设置
async function saveSystemSetting(value: { [key: string]: any }) {
  try {
    const result: { [key: string]: any } = await api.post('system/env', value)

    if (result.success) {
      return true
    }
  } catch (error) {}
  return false
}

// 调用API保存设置
async function saveSearchSetting() {
  try {
    const result3 = await saveSystemSetting(SystemSettings.value.Basic)

    if (result3) {
      $toast.success(t('setting.search.saveSuccess'))
    } else {
      $toast.error(t('setting.search.saveFailed'))
    }
  } catch (error) {
    console.log(error)
  }
}

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      // 将API返回的值赋值给SystemSettings
      for (const sectionKey of Object.keys(SystemSettings.value) as Array<keyof typeof SystemSettings.value>) {
        Object.keys(SystemSettings.value[sectionKey]).forEach((key: string) => {
          if (result.data.hasOwnProperty(key)) (SystemSettings.value[sectionKey] as any)[key] = result.data[key]
        })
      }
    }
  } catch (error) {
    console.log(error)
  }
}

async function loadPageData() {
  await Promise.all([querySites(), querySelectedSites(), loadSystemSettings()])
}

onMounted(() => {
  loadPageData()
})

useSilentSettingRefresh(loadPageData, {
  active: computed(() => props.active),
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.search.basicSettings') }}</VCardTitle>
          <VCardSubtitle>{{ t('liteSearch.settings.basicDescription') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="SystemSettings.Basic.TORRENT_TAG"
                :label="t('setting.search.downloadLabel')"
                placeholder="MOVIEPILOT"
                :hint="t('setting.search.downloadLabelHint')"
                persistent-hint
                prepend-inner-icon="mdi-tag"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSearchSetting" prepend-icon="mdi-content-save">
                {{ t('common.save') }}
              </VBtn>
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
          <VCardTitle>{{ t('setting.search.downloadSite') }}</VCardTitle>
          <VCardSubtitle>{{ t('liteSearch.settings.siteScopeDescription') }}</VCardSubtitle>
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
              <VBtn type="submit" @click="saveSelectedSites" prepend-icon="mdi-content-save">
                {{ t('common.save') }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
