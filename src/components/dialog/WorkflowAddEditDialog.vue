<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import type { Workflow } from '@/api/types'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import { requiredValidator } from '@/@validators'
import api from '@/api'
import { useDisplay } from 'vuetify'

// 输入参数
const props = defineProps({
  // 任务信息
  workflow: Object as PropType<Workflow>,
})

// 新增或修改字样
const title = computed(() => (props.workflow ? '编辑' : '创建'))

// 显示器宽度
const display = useDisplay()

// 注册事件
const emit = defineEmits(['save', 'remove', 'close'])

// 站点编辑表单数据
const workflowForm = ref<Workflow>(
  props.workflow || {
    name: undefined,
    timer: undefined,
    description: undefined,
    state: 'P',
    run_count: 0,
  },
)

// 提示框
const $toast = useToast()

// 调用API 新增任务
async function addWorkflow() {
  if (!workflowForm.value.name || !workflowForm.value.timer) {
    $toast.error('请填写完整信息！')
    return
  }
  startNProgress()
  try {
    const result: { [key: string]: string } = await api.post('workflow/', workflowForm.value)
    if (result.success) {
      $toast.success(`创建任务成功，请编辑流程！`)
      emit('save')
    } else {
      $toast.error(`创建任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
  doneNProgress()
}

// 调用API 编辑任务
async function editWorkflow() {
  if (!workflowForm.value.name || !workflowForm.value.timer) {
    $toast.error('请填写完整信息！')
    return
  }
  startNProgress()
  try {
    const result: { [key: string]: string } = await api.put(`workflow/${workflowForm.value.id}`, workflowForm.value)
    if (result.success) {
      $toast.success(`修改任务成功！`)
      emit('save')
    } else {
      $toast.error(`修改任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
  doneNProgress()
}
</script>

<template>
  <VDialog scrollable :close-on-back="false" eager max-width="30rem" :fullscreen="!display.mdAndUp.value">
    <VCard :title="`${title}任务`" class="rounded-t">
      <VDialogCloseBtn @click="emit('close')" />
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
                hint="任务名称"
              />
            </VCol>
            <VCol cols="12">
              <VCronField
                v-model="workflowForm.timer"
                label="定时"
                :rules="[requiredValidator]"
                placeholder="5位cron表达式"
                persistent-hint
                hint="任务执行周期"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="workflowForm.description" label="任务描述" />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="pt-3">
        <VSpacer />
        <VBtn
          v-if="workflow"
          block
          color="primary"
          variant="elevated"
          @click="editWorkflow"
          prepend-icon="mdi-content-save"
          class="px-5"
        >
          保存
        </VBtn>
        <VBtn v-else block color="primary" variant="elevated" @click="addWorkflow" prepend-icon="mdi-plus" class="px-5">
          创建
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
