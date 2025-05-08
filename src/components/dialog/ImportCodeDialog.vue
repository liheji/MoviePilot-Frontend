<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

// 多语言支持
const { t } = useI18n()

// 输入参数
const props = defineProps({
  title: String,
  dataType: String,
})

// 代码
const codeString = ref('')

// 定义事件
const emit = defineEmits(['close', 'save'])

// 导入
function handleImport() {
  emit('save', props.dataType, codeString)
  emit('close')
}
</script>

<template>
  <VDialog width="40rem" scrollable max-height="85vh">
    <VCard :title="props.title">
      <VDialogCloseBtn @click="emit('close')" />
      <VCardText class="pt-2">
        <VTextarea v-model="codeString" />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="elevated" @click="handleImport" prepend-icon="mdi-import" class="px-5 me-3">
          {{ t('dialog.importCode.import') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
