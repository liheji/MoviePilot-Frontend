<script lang="ts" setup>
import api from '@/api'
import { useI18n } from 'vue-i18n'

// 多语言支持
const { t } = useI18n()

// 定义输入
const props = defineProps({
  conf: {
    type: Object as PropType<{ [key: string]: any }>,
    required: true,
  },
})

// 定义事件
const emit = defineEmits(['done', 'close'])

// 完成
async function handleDone() {
  await savaAlistConfig()
  emit('done')
}

// 重置配置
async function handleReset() {
  try {
    const result: { [key: string]: any } = await api.get('/storage/reset/alist')
    if (result.success) {
      // 重置成功
      alertType.value = 'success'
      handleDone()
    } else {
      alertType.value = 'error'
      text.value = result.message
    }
  } catch (e) {
    console.error(e)
  }
}

// 保存alist设置
async function savaAlistConfig() {
  try {
    await api.post(`storage/save/alist`, props.conf)
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <VDialog width="50rem" scrollable max-height="85vh">
    <VCard :title="t('dialog.alistConfig.title')">
      <VDialogCloseBtn @click="emit('close')" />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VTextField
              v-model="props.conf.url"
              :hint="t('dialog.alistConfig.serverUrl')"
              :label="t('dialog.alistConfig.serverUrl')"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model="props.conf.username"
              :hint="t('dialog.alistConfig.username')"
              :label="t('dialog.alistConfig.username')"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              type="password"
              v-model="props.conf.password"
              :hint="t('dialog.alistConfig.password')"
              :label="t('dialog.alistConfig.password')"
              persistent-hint
            />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="elevated" @click="handleReset" prepend-icon="mdi-restore" class="px-5 me-3">
          {{ t('dialog.alistConfig.reset') }}
        </VBtn>
        <VBtn variant="elevated" @click="handleDone" prepend-icon="mdi-check" class="px-5 me-3">
          {{ t('dialog.alistConfig.complete') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
