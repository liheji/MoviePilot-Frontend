<script setup lang="ts">
import { cloneDeep } from "lodash"

const props = defineProps({
  AdvancedNetworkSettings: Object as any,
})

// 高级设置默认值，使用深复制，避免引用传递
const AdvancedSettings = ref(cloneDeep(props.AdvancedNetworkSettings))

// 定义触发的自定义事件
const emit = defineEmits(['change', 'close'])

// 保存高级设置
function saveAdvancedSettings() {
  emit('change', AdvancedSettings.value, 'AdvancedNetwork')
}

// 恢复默认值
function loadAdvancedSettings() {
  // 将AdvancedNetworkSettings中部分值赋值为默认值
  AdvancedSettings.value = {
    OCR_HOST: 'https://movie-pilot.org',
    DOH_RESOLVERS: '1.0.0.1,1.1.1.1,9.9.9.9,149.112.112.112',
    DOH_DOMAINS:
      'api.themoviedb.org,api.tmdb.org,webservice.fanart.tv,api.github.com,github.com,raw.githubusercontent.com,api.telegram.org',
  }
}
</script>

<template>
  <VDialog scrollable max-width="60rem" persistent>
    <VCard>
      <VCardItem>
        <VCardTitle>高级网络设置</VCardTitle>
        <VCardSubtitle>修改前，请先了解清楚这些设置的作用。</VCardSubtitle>
      </VCardItem>
      <DialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardText>
        <VForm>
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="AdvancedSettings.OCR_HOST"
                label="验证码识别服务器"
                hint="用于识别验证码"
                persistent-hint
                clearable
                active
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="AdvancedSettings.DOH_RESOLVERS"
                label="DOH 服务器"
                placeholder="格式：https://dns.google/dns-query,1.1.1.1"
                hint="多个服务器使用逗号分隔"
                persistent-hint
                clearable
                active
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="AdvancedSettings.DOH_DOMAINS"
                label="DOH 域名"
                placeholder="格式：example.com,example2.com"
                hint="多个域名使用逗号分隔"
                persistent-hint
                clearable
                active
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="pt-3">
        <VForm @submit.prevent="() => {}">
          <div class="d-flex flex-wrap gap-4 mt-4">
            <VBtn color="info" variant="elevated" prepend-icon="mdi-reload" @click="loadAdvancedSettings" class="px-5">
              恢复默认值
            </VBtn>
            <VBtn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-content-save"
              @click="saveAdvancedSettings"
              class="px-5"
            >
              确定
            </VBtn>
          </div>
        </VForm>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
