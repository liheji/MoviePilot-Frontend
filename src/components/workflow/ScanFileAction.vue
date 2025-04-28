<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { storageOptions } from '@/api/constants'
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
</script>
<template>
  <div>
    <VCard max-width="20rem">
      <Handle id="edge_in" type="target" :position="Position.Left" />
      <VCardItem>
        <template v-slot:prepend>
          <VAvatar>
            <VIcon icon="mdi-folder-search" size="x-large"></VIcon>
          </VAvatar>
        </template>
        <VCardTitle>{{ t('workflow.scanFile.title') }}</VCardTitle>
        <VCardSubtitle>{{ t('workflow.scanFile.subtitle') }}</VCardSubtitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VSelect
              v-model="data.storage"
              :label="t('workflow.scanFile.storage')"
              :items="storageOptions"
              outlined
              dense
            />
          </VCol>
          <VCol cols="12">
            <VPathField
              v-model="data.directory"
              :storage="data.storage"
              :label="t('workflow.scanFile.directory')"
              clearable
            />
          </VCol>
        </VRow>
      </VCardText>
      <Handle id="edge_out" type="source" :position="Position.Right" />
    </VCard>
  </div>
</template>
