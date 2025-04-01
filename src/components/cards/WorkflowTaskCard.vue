<script lang="ts" setup>
import { Workflow } from '@/api/types'
import { useToast } from 'vue-toast-notification'
import { useConfirm } from 'vuetify-use-dialog'
import WorkflowAddEditDialog from '@/components/dialog/WorkflowAddEditDialog.vue'
import WorkflowActionsDialog from '@/components/dialog/WorkflowActionsDialog.vue'
import api from '@/api'

// 定义输入参数
const props = defineProps({
  workflow: {
    required: true,
    type: Object as PropType<Workflow>,
  },
})

// 定义事件
const emit = defineEmits(['refresh'])

// 提示框
const $toast = useToast()

// 确认框
const createConfirm = useConfirm()

// 编辑对话框
const editDialog = ref(false)

// 流程对话框
const flowDialog = ref(false)

// 加载中
const loading = ref(false)

// 编辑任务
function handleEdit(item: Workflow) {
  editDialog.value = true
}

// 编辑流程
function handleFlow(item: Workflow) {
  flowDialog.value = true
}

// 计算已完成的动作数
function resolveDoneActions(item: Workflow) {
  return item.current_action?.split(',').length || 0
}

// 编辑完成
function editDone() {
  editDialog.value = false
  flowDialog.value = false
  emit('refresh')
}

// 删除任务
async function handleDelete(item: Workflow) {
  const isConfirmed = await createConfirm({
    title: '确认',
    content: `是否确认删除任务 ${item.name} ?`,
  })

  if (!isConfirmed) return

  try {
    const result: { [key: string]: string } = await api.delete(`workflow/${item.id}`)
    if (result.success) {
      $toast.success('删除任务成功！')
      emit('refresh')
    } else {
      $toast.error(`删除任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
}

// 开始任务
async function handleEnable(item: Workflow) {
  loading.value = true
  try {
    const result: { [key: string]: string } = await api.post(`workflow/${item.id}/start`)
    if (result.success) {
      $toast.success('启用任务成功！')
      emit('refresh')
    } else {
      $toast.error(`启用任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}

// 停用任务
async function handlePause(item: Workflow) {
  loading.value = true
  try {
    const result: { [key: string]: string } = await api.post(`workflow/${item.id}/pause`)
    if (result.success) {
      $toast.success('停用任务成功！')
      emit('refresh')
    } else {
      $toast.error(`停用任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}

// 立即执行任务
async function handleRun(item: Workflow, from_begin: boolean) {
  loading.value = true
  try {
    setTimeout(() => {
      emit('refresh')
    }, 500)
    const result: { [key: string]: string } = await api.post(`workflow/${item.id}/run?from_begin=${from_begin}`, {
      from_begin,
    })
    if (result.success) {
      $toast.success('任务执行完成！')
      emit('refresh')
    } else {
      $toast.error(`任务执行失败：${result.message}`)
      emit('refresh')
    }
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}

// 重置任务
async function handleReset(item: Workflow) {
  const isConfirmed = await createConfirm({
    title: '确认',
    content: `是否确认重置任务 ${item.name} ?`,
  })

  if (!isConfirmed) return

  try {
    const result: { [key: string]: string } = await api.post(`workflow/${item.id}/reset`)
    if (result.success) {
      $toast.success('重置任务成功！')
      emit('refresh')
    } else {
      $toast.error(`重置任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
}

// 计算状态颜色
const resolveStatusVariant = (status: string | undefined) => {
  if (status === 'S') return { color: 'success', text: '成功' }
  else if (status === 'R') return { color: 'primary', text: '运行中' }
  else if (status === 'F') return { color: 'error', text: '失败' }
  else if (status === 'P') return { color: 'secondary', text: '暂停' }
  else return { color: 'info', text: '等待' }
}

// 计算当前动作占比
const resolveProgress = (item: Workflow) => {
  const current_action_length = item.current_action?.split(',').length || 0
  return item.actions?.length ? Math.round((current_action_length / (item.actions.length || 1)) * 100) : 0
}
</script>
<template>
  <div class="h-full">
    <VHover v-slot="hover">
      <VCard
        v-bind="hover.props"
        class="mx-auto h-full"
        @click="handleFlow(workflow)"
        :ripple="false"
        :loading="loading"
        :class="{ 'transition transform-cpu duration-300 -translate-y-1': hover.isHovering }"
      >
        <VCardItem class="py-3" :class="`bg-${resolveStatusVariant(workflow?.state).color}`">
          <template #prepend>
            <VAvatar variant="text" class="me-2">
              <VIcon
                v-if="workflow?.state === 'P'"
                color="success"
                size="x-large"
                icon="mdi-play"
                @click.stop="handleEnable(workflow)"
              />
              <VIcon v-else color="warning" icon="mdi-pause" size="x-large" @click.stop="handlePause(workflow)" />
            </VAvatar>
          </template>
          <VCardTitle class="text-white">
            {{ workflow?.name }}
          </VCardTitle>
          <VCardSubtitle class="text-white">{{ workflow?.description }}</VCardSubtitle>
          <template #append>
            <IconBtn>
              <VIcon icon="mdi-vector-polyline-edit" @click.stop="handleFlow(workflow)" />
            </IconBtn>
            <IconBtn>
              <VIcon icon="mdi-dots-vertical" />
              <VMenu activator="parent" close-on-content-click>
                <VList>
                  <VListItem variant="plain" base-color="primary" @click="handleEdit(workflow)">
                    <template #prepend>
                      <VIcon icon="mdi-note-edit" />
                    </template>
                    <VListItemTitle>编辑任务</VListItemTitle>
                  </VListItem>
                  <VListItem
                    v-if="workflow.current_action"
                    variant="plain"
                    base-color="info"
                    @click="handleRun(workflow, false)"
                  >
                    <template #prepend>
                      <VIcon icon="mdi-play-speed" />
                    </template>
                    <VListItemTitle>继续执行</VListItemTitle>
                  </VListItem>
                  <VListItem
                    v-if="workflow.current_action"
                    variant="plain"
                    base-color="info"
                    @click="handleRun(workflow, true)"
                  >
                    <template #prepend>
                      <VIcon icon="mdi-replay" />
                    </template>
                    <VListItemTitle>重新执行</VListItemTitle>
                  </VListItem>
                  <VListItem v-else variant="plain" base-color="info" @click="handleRun(workflow, true)">
                    <template #prepend>
                      <VIcon icon="mdi-run" />
                    </template>
                    <VListItemTitle>立即执行</VListItemTitle>
                  </VListItem>
                  <VListItem variant="plain" base-color="warning" @click="handleReset(workflow)">
                    <template #prepend>
                      <VIcon icon="mdi-restore-alert" />
                    </template>
                    <VListItemTitle>重置任务</VListItemTitle>
                  </VListItem>
                  <VListItem variant="plain" base-color="error" @click="handleDelete(workflow)">
                    <template #prepend>
                      <VIcon icon="mdi-delete" />
                    </template>
                    <VListItemTitle>删除任务</VListItemTitle>
                  </VListItem>
                </VList>
              </VMenu>
            </IconBtn>
          </template>
        </VCardItem>
        <VDivider />
        <VCardText>
          <div class="d-flex flex-column gap-y-4">
            <div class="d-flex flex-wrap gap-x-6">
              <div class="flex-1">
                <div class="mb-1">定时</div>
                <h5 class="text-h6">{{ workflow?.timer }}</h5>
              </div>
              <div class="flex-1">
                <div class="mb-1">状态</div>
                <h5 class="text-h6" :class="`text-${resolveStatusVariant(workflow?.state).color}`">
                  {{ resolveStatusVariant(workflow?.state).text }}
                </h5>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-x-6">
              <div class="flex-1">
                <div class="mb-1">动作数</div>
                <div>
                  <VAvatar size="32" color="primary" variant="tonal">
                    <span class="text-sm">{{ workflow?.actions?.length }}</span>
                  </VAvatar>
                </div>
              </div>
              <div class="flex-1">
                <div class="mb-1">已执行次数</div>
                <h5 class="text-h6">{{ workflow?.run_count }}</h5>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-x-6">
              <div class="flex-1">
                <div class="mb-1">进度</div>
                <div class="d-flex align-center gap-5">
                  <div class="flex-grow-1">
                    <VProgressLinear color="info" rounded :model-value="resolveProgress(workflow)" />
                  </div>
                  <span> {{ resolveProgress(workflow) }}% </span>
                </div>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-x-6" v-if="workflow?.result">
              <div class="flex-1">
                <div class="mb-1">错误信息</div>
                <div class="text-error">{{ workflow?.result }}</div>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VHover>
    <!-- 流程对话框 -->
    <WorkflowActionsDialog
      v-if="flowDialog"
      v-model="flowDialog"
      @close="flowDialog = false"
      @save="editDone"
      :workflow="workflow"
    />
    <!-- 编辑对话框 -->
    <WorkflowAddEditDialog
      v-if="editDialog"
      v-model="editDialog"
      @close="editDialog = false"
      @save="editDone"
      :workflow="workflow"
    />
  </div>
</template>
