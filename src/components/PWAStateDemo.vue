<template>
  <VCard class="ma-4" title="PWA状态管理演示">
    <VCardText>
      <VAlert 
        v-if="isPWAMode" 
        type="success" 
        class="mb-4"
      >
        <VIcon icon="mdi-check-circle" class="me-2" />
        检测到PWA模式，状态管理功能已启用
      </VAlert>
      
      <VAlert 
        v-else 
        type="info" 
        class="mb-4"
      >
        <VIcon icon="mdi-information" class="me-2" />
        当前在浏览器模式，请添加到桌面后体验状态管理功能
      </VAlert>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="outlined">
            <VCardTitle>状态信息</VCardTitle>
            <VCardText>
              <VList density="compact">
                <VListItem>
                  <VListItemTitle>PWA模式</VListItemTitle>
                  <VListItemSubtitle>{{ isPWAMode ? '是' : '否' }}</VListItemSubtitle>
                </VListItem>
                <VListItem>
                  <VListItemTitle>状态管理器可用</VListItemTitle>
                  <VListItemSubtitle>{{ isStateManagerAvailable() ? '是' : '否' }}</VListItemSubtitle>
                </VListItem>
                <VListItem>
                  <VListItemTitle>状态恢复次数</VListItemTitle>
                  <VListItemSubtitle>{{ stateRestoreCount }}</VListItemSubtitle>
                </VListItem>
                <VListItem v-if="isStateRestored">
                  <VListItemTitle>最后恢复时间</VListItemTitle>
                  <VListItemSubtitle>{{ lastRestoredState?.timestamp ? new Date(lastRestoredState.timestamp).toLocaleString() : '无' }}</VListItemSubtitle>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" md="6">
          <VCard variant="outlined">
            <VCardTitle>操作面板</VCardTitle>
            <VCardText class="d-flex flex-column ga-3">
              <VBtn 
                @click="saveCurrentState"
                :disabled="!isStateManagerAvailable()"
                color="primary"
                prepend-icon="mdi-content-save"
              >
                手动保存状态
              </VBtn>
              
              <VBtn 
                @click="checkStateRestore"
                :disabled="!isStateManagerAvailable()"
                color="secondary"
                prepend-icon="mdi-restore"
              >
                检查状态恢复
              </VBtn>
              
              <VBtn 
                @click="clearStoredState"
                color="warning"
                prepend-icon="mdi-delete"
              >
                清除存储状态
              </VBtn>
              
              <VBtn 
                @click="resetStateRestored"
                v-if="isStateRestored"
                color="info"
                prepend-icon="mdi-refresh"
              >
                重置恢复标志
              </VBtn>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- 测试表单 -->
      <VCard variant="outlined" class="mt-4">
        <VCardTitle>测试表单（用于验证状态恢复）</VCardTitle>
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="testForm.name"
                  label="姓名"
                  name="test-name"
                  persistent-hint
                  hint="切换应用后再回来，这个值应该被恢复"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="testForm.email"
                  label="邮箱"
                  name="test-email"
                  type="email"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="testForm.message"
                  label="消息"
                  name="test-message"
                  rows="3"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>

      <!-- 状态恢复提示 -->
      <VAlert 
        v-if="isStateRestored" 
        type="success" 
        class="mt-4"
        closable
        @click:close="resetStateRestored"
      >
        <VIcon icon="mdi-check-circle" class="me-2" />
        状态已成功恢复！滚动位置和表单数据应该已经恢复到之前的状态。
      </VAlert>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import { usePWAState, useGlobalPWAState } from '@/composables/usePWAState'

// 使用PWA状态管理
const {
  isPWAMode,
  isStateRestored,
  stateRestoreCount,
  lastRestoredState,
  saveCurrentState,
  checkStateRestore,
  resetStateRestored,
  isStateManagerAvailable
} = usePWAState()

// 使用全局PWA状态管理
const { clearStoredState } = useGlobalPWAState()

// 测试表单数据
const testForm = ref({
  name: '',
  email: '',
  message: ''
})

// 监听状态恢复事件，恢复表单数据
watch(isStateRestored, (restored) => {
  if (restored && lastRestoredState.value?.appData?.formState) {
    console.log('检测到状态恢复，尝试恢复表单数据')
    // 这里可以添加更复杂的表单数据恢复逻辑
  }
})

onMounted(() => {
  console.log('PWA状态演示组件已挂载')
})
</script>

<style scoped>
.v-card {
  transition: all 0.3s ease;
}
</style>