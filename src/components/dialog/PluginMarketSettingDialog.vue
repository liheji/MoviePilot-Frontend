<script lang="ts" setup>
import api from '@/api'
import { useToast } from 'vue-toast-notification'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()
const $toast = useToast()

// 插件仓库设置字符串
const repoString = ref('')

// 定义事件
const emit = defineEmits(['save', 'close'])

// 查询已设置的插件仓库
async function queryMarketRepoSetting() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/PLUGIN_MARKET')
    if (result && result.data && result.data.value) repoString.value = result.data.value
  } catch (error) {
    console.log(error)
  }
}

// 保存设置
async function saveHandle() {
  try {
    // 用户名密码
    const result: { [key: string]: any } = await api.post('system/setting/PLUGIN_MARKET', repoString.value)

    if (result.success) {
      $toast.success(t('dialog.pluginMarketSetting.saveSuccess'))
      emit('save')
    } else $toast.error(t('dialog.pluginMarketSetting.saveFailed', { message: result?.message }))
  } catch (error) {
    console.log(error)
  }
}

onMounted(() => {
  queryMarketRepoSetting()
})
</script>

<template>
  <VDialog width="50rem" scrollable max-height="85vh">
    <VCard class="rounded-t">
      <VCardItem>
        <VCardTitle>
          <VIcon icon="mdi-store-cog" class="me-2" />
          {{ t('dialog.pluginMarketSetting.title') }}
        </VCardTitle>
        <VDialogCloseBtn @click="emit('close')" />
      </VCardItem>
      <VCardText class="pt-2">
        <VTextarea
          v-model="repoString"
          :placeholder="t('dialog.pluginMarketSetting.repoPlaceholder')"
          :hint="t('dialog.pluginMarketSetting.repoHint')"
          persistent-hint
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="elevated" @click="saveHandle" prepend-icon="mdi-content-save-check" class="px-5 me-3">
          {{ t('dialog.pluginMarketSetting.save') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
