<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import type { Workflow } from '@/api/types'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import { requiredValidator } from '@/@validators'
import api from '@/api'
import { useDisplay } from 'vuetify'

// 显示器宽度
const display = useDisplay()

// 注册事件
const emit = defineEmits(['save', 'remove', 'close'])

// 站点编辑表单数据
const workflowForm = ref<Workflow>({
  name: undefined,
  timer: undefined,
  description: undefined,
  state: 'P',
  run_count: 0,
})

// 提示框
const $toast = useToast()

// 调用API 新增工作流
async function addWorkflow() {
  if (!workflowForm.value.name || !workflowForm.value.timer) {
    $toast.error('请填写完整信息！')
    return
  }
  startNProgress()
  try {
    const result: { [key: string]: string } = await api.post('workflow/', workflowForm.value)
    if (result.success) {
      $toast.success('新增工作流成功，请编辑流程！')
      emit('save')
    } else {
      $toast.error(`新增工作流失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
  doneNProgress()
}
</script>

<template>
  <VDialog scrollable :close-on-back="false" persistent eager max-width="30rem" :fullscreen="!display.mdAndUp.value">
    <VCard title="新增工作流" class="rounded-t">
      <DialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardText>
        <VForm @submit.prevent="() => {}">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="workflowForm.name"
                label="别名"
                :rules="[requiredValidator]"
                persistent-hint
                hint="工作流名称"
              />
            </VCol>
            <VCol cols="12">
              <VCronField
                v-model="workflowForm.timer"
                label="定时"
                :rules="[requiredValidator]"
                placeholder="5位cron表达式"
                persistent-hint
                hint="工作流执行周期"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="workflowForm.description" label="工作流描述" />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="pt-3">
        <VSpacer />
        <VBtn block color="primary" variant="elevated" @click="addWorkflow" prepend-icon="mdi-plus" class="px-5">
          新增
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
