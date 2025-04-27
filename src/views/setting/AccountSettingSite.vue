<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import api from '@/api'
import ProgressDialog from '@/components/dialog/ProgressDialog.vue'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 提示框
const $toast = useToast()

// 进度框
const progressDialog = ref(false)

// 站点重置
const isConfirmResetSites = ref(false)

// 站点重置按钮文本
const resetSitesText = ref(t('site.resetSites'))

// 站点重置按钮可用状态
const resetSitesDisabled = ref(false)

const isPasswordVisible = ref(false)

// 站点设置默认值
const siteSetting = ref<any>({
  CookieCloud: {
    COOKIECLOUD_HOST: '',
    COOKIECLOUD_KEY: '',
    COOKIECLOUD_PASSWORD: '',
    COOKIECLOUD_INTERVAL: 0,
    USER_AGENT: '',
    COOKIECLOUD_ENABLE_LOCAL: false,
    COOKIECLOUD_BLACKLIST: '',
  },
  Site: {
    SITEDATA_REFRESH_INTERVAL: 0,
    SITE_MESSAGE: false,
  },
})

// 同步间隔下拉框
const CookieCloudIntervalItems = [
  { title: t('site.syncInterval.hourly'), value: 60 },
  { title: t('site.syncInterval.every6Hours'), value: 360 },
  { title: t('site.syncInterval.every12Hours'), value: 720 },
  { title: t('site.syncInterval.daily'), value: 1440 },
  { title: t('site.syncInterval.weekly'), value: 10080 },
  { title: t('site.syncInterval.monthly'), value: 43200 },
  { title: t('site.syncInterval.never'), value: 0 },
]

// 站点数据刷新间隔
const SiteDataRefreshIntervalItems = [
  { title: t('site.syncInterval.hourly'), value: 1 },
  { title: t('site.syncInterval.every6Hours'), value: 6 },
  { title: t('site.syncInterval.every12Hours'), value: 12 },
  { title: t('site.syncInterval.daily'), value: 24 },
  { title: t('site.syncInterval.weekly'), value: 168 },
  { title: t('site.syncInterval.never'), value: 0 },
]

// 重置站点
async function resetSites() {
  try {
    resetSitesDisabled.value = true
    resetSitesText.value = t('site.resettingSites')

    const result: { [key: string]: any } = await api.get('site/reset')
    if (result.success) $toast.success(t('site.resetSuccess'))
    else $toast.error(t('site.resetFailed'))

    resetSitesDisabled.value = false
    resetSitesText.value = t('site.resetSites')
  } catch (error) {
    console.log(error)
  }
}

// 加载站点设置
async function loadSiteSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      // 将API返回的值赋值给SystemSettings
      for (const sectionKey of Object.keys(siteSetting.value) as Array<keyof typeof siteSetting.value>) {
        Object.keys(siteSetting.value[sectionKey]).forEach((key: string) => {
          if (result.data.hasOwnProperty(key)) (siteSetting.value[sectionKey] as any)[key] = result.data[key]
        })
      }
    }
  } catch (error) {
    console.log(error)
  }
}

// 重载系统生效配置
async function reloadSystem() {
  progressDialog.value = true
  try {
    const result: { [key: string]: any } = await api.get('system/reload')
    if (result.success) $toast.success(t('setting.system.reloadSuccess'))
    else $toast.error(t('setting.system.reloadFailed'))
  } catch (error) {
    console.log(error)
  }
  progressDialog.value = false
}

// 调用API保存设置
async function saveSiteSetting(value: { [key: string]: any }) {
  console.log(`正在保存设置：${JSON.stringify(value)}`)
  try {
    const result: { [key: string]: any } = await api.post('system/env', value)
    if (result.success) {
      $toast.success(t('site.saveSuccess'))
      await reloadSystem()
    } else {
      $toast.error(t('site.saveFailed'))
    }
  } catch (error) {
    console.log(error)
    $toast.error(t('setting.system.saveFailed', { message: error }))
  }
}

// 加载数据
onMounted(() => {
  loadSiteSettings()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('site.siteSync') }}</VCardTitle>
          <VCardSubtitle>{{ t('site.siteSyncDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6">
                <VCheckbox
                  v-model="siteSetting.CookieCloud.COOKIECLOUD_ENABLE_LOCAL"
                  :label="t('site.enableLocalCookieCloud')"
                  :hint="t('site.enableLocalCookieCloudHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="siteSetting.CookieCloud.COOKIECLOUD_HOST"
                  :label="t('site.serviceAddress')"
                  :placeholder="t('site.serviceAddressPlaceholder')"
                  :disabled="siteSetting.CookieCloud.COOKIECLOUD_ENABLE_LOCAL"
                  :hint="t('site.serviceAddressHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="siteSetting.CookieCloud.COOKIECLOUD_KEY"
                  :label="t('site.userKey')"
                  :hint="t('site.userKeyHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="siteSetting.CookieCloud.COOKIECLOUD_PASSWORD"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                  :label="t('site.e2ePassword')"
                  :hint="t('site.e2ePasswordHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="siteSetting.CookieCloud.COOKIECLOUD_INTERVAL"
                  :label="t('site.autoSyncInterval')"
                  :items="CookieCloudIntervalItems"
                  :hint="t('site.autoSyncIntervalHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="siteSetting.CookieCloud.COOKIECLOUD_BLACKLIST"
                  :label="t('site.syncBlacklist')"
                  :placeholder="t('site.syncBlacklistPlaceholder')"
                  :hint="t('site.syncBlacklistHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="siteSetting.CookieCloud.USER_AGENT"
                  :label="t('site.userAgent')"
                  :hint="t('site.userAgentHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSiteSetting(siteSetting.CookieCloud)"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard :title="t('site.siteDataRefresh')">
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="siteSetting.Site.SITEDATA_REFRESH_INTERVAL"
                  :label="t('site.siteDataRefreshInterval')"
                  :items="SiteDataRefreshIntervalItems"
                  :hint="t('site.siteDataRefreshIntervalHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="siteSetting.Site.SITE_MESSAGE"
                  :label="t('site.readSiteMessage')"
                  :hint="t('site.readSiteMessageHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSiteSetting(siteSetting.Site)"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard :title="t('site.siteReset')">
        <VCardText>
          <div>
            <VCheckbox
              v-model="isConfirmResetSites"
              :label="t('site.confirmReset')"
              :hint="t('site.confirmResetHint')"
              persistent-hint
            />
          </div>

          <VBtn :disabled="!isConfirmResetSites || resetSitesDisabled" color="error" class="mt-3" @click="resetSites">
            {{ resetSitesText }}
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <!-- 进度框 -->
  <ProgressDialog
    v-if="progressDialog"
    v-model="progressDialog"
    :text="t('setting.system.reloading')"
    :indeterminate="true"
  />
</template>
