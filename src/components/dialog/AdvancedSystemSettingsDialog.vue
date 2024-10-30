<script setup lang="ts">
import { cloneDeep } from "lodash";

const props = defineProps({
  AdvancedSystemSettings: Object as any,
})

// 高级设置默认值，使用深复制，避免引用传递
const AdvancedSettings = ref(cloneDeep(props.AdvancedSystemSettings))

// 定义触发事件
const emit = defineEmits(['change', 'close'])

// 保存高级设置
function saveAdvancedSettings() {
  emit('change', AdvancedSettings.value, 'Advanced')
}
</script>

<template>
  <VDialog scrollable max-width="60rem" persistent>
    <VCard>
      <VCardItem>
        <VCardTitle>高级系统设置</VCardTitle>
        <VCardSubtitle>修改前，请先了解清楚这些设置的作用。</VCardSubtitle>
      </VCardItem>
      <DialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardText>
        <VRow>
          <VCol cols="12" md="3">
            <VSwitch
              v-model="AdvancedSettings.DEV"
              label="DEV模式"
              hint="包括DEBUG日志、插件热加载"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSwitch
              v-model="AdvancedSettings.DEBUG"
              label="DEBUG日志"
              hint="显示DEBUG日志"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSwitch
              v-model="AdvancedSettings.PLUGIN_AUTO_RELOAD"
              label="插件热加载"
              hint="插件热加载调试模式"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" class="justify-center">
            <VAlert
              type="error"
              variant="tonal"
              style="inline-size: fit-content"
              text="以上三项开关，需要在保存设置后，再重启MP，才能生效！"
            />
          </VCol>
          <VCol cols="12">
            <VTextarea
              v-model="AdvancedSettings.REPO_GITHUB_TOKEN"
              label="指定仓库Github token"
              placeholder="格式：{user1}/{repo1}:ghp_****,{user2}/{repo2}:github_pat_****"
              hint="指定的单个仓库Github token。支持多个仓库使用,分隔"
              persistent-hint
              clearable
              active
            />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="pt-3">
        <VForm @submit.prevent="() => {}">
          <div class="d-flex flex-wrap gap-4 mt-4">
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
