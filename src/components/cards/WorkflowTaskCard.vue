<script lang="ts" setup>
import { Workflow } from '@/api/types'
import { useToast } from 'vue-toast-notification'
import { useConfirm } from 'vuetify-use-dialog'
import WorkflowEditDialog from '@/components/dialog/WorkflowEditDialog.vue'
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

// 流程编辑对话框
const editDialog = ref(false)

// 加载中
const loading = ref(false)

// 编辑任务
function handleEdit(item: Workflow) {
  editDialog.value = true
}

// 编辑完成
function editDone() {
  editDialog.value = false
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
async function handleRun(item: Workflow) {
  loading.value = true
  try {
    const result: { [key: string]: string } = await api.post(`workflow/${item.id}/run`)
    if (result.success) {
      $toast.success('任务执行成功！')
      emit('refresh')
    } else {
      $toast.error(`任务执行失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}

// 计算状态颜色
const resolveStatusVariant = (status: string | undefined) => {
  if (status === 'S') return { color: 'success', text: '成功' }
  else if (status === 'R') return { color: 'primary', text: '运行中' }
  else if (status === 'F') return { color: 'error', text: '失败' }
  else if (status === 'P') return { color: 'warning', text: '暂停' }
  else return { color: 'secondary', text: '等待' }
}

// 计算当前动作占比
const resolveProgress = (item: Workflow) => {
  const current_action_index = item.actions?.findIndex(action => action.id === item.current_action) ?? 0
  return item.actions?.length ? Math.round((current_action_index / item.actions.length) * 100) : 0
}
</script>
<template>
  <div>
    <VCard class="mx-auto" @click="handleEdit(props.workflow)">
      <VCardItem class="py-3">
        <template #prepend>
          <VBadge v-if="props.workflow?.state" dot inline :color="resolveStatusVariant(props.workflow?.state).color" />
        </template>
        <VCardTitle>
          {{ props.workflow?.name }}
        </VCardTitle>
        <VCardSubtitle>{{ props.workflow?.description }}</VCardSubtitle>
        <template #append>
          <IconBtn v-if="props.workflow?.state === 'P'">
            <VIcon color="success" icon="mdi-play" @click.stop="handleEnable(props.workflow)" />
          </IconBtn>
          <IconBtn v-else>
            <VIcon color="warning" icon="mdi-pause" @click.stop="handlePause(props.workflow)" />
          </IconBtn>
          <IconBtn>
            <VIcon icon="mdi-dots-vertical" />
            <VMenu activator="parent" close-on-content-click>
              <VList>
                <VListItem variant="plain" base-color="primary" @click="handleEdit(props.workflow)">
                  <template #prepend>
                    <VIcon icon="mdi-pencil" />
                  </template>
                  <VListItemTitle>编辑流程</VListItemTitle>
                </VListItem>
                <VListItem variant="plain" base-color="info" @click="handleRun(props.workflow)">
                  <template #prepend>
                    <VIcon icon="mdi-run" />
                  </template>
                  <VListItemTitle>立即执行</VListItemTitle>
                </VListItem>
                <VListItem variant="plain" base-color="error" @click="handleDelete(props.workflow)">
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
        <div class="d-flex flex-column gap-y-6">
          <div class="d-flex flex-wrap gap-y-4">
            <div class="flex-1">
              <div class="mb-1">定时</div>
              <h5 class="text-h6">{{ props.workflow?.timer }}</h5>
            </div>
            <div class="flex-1">
              <div class="mb-1">状态</div>
              <h5 class="text-h6" :class="`text-${resolveStatusVariant(props.workflow?.state).color}`">
                {{ resolveStatusVariant(props.workflow?.state).text }}
              </h5>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-y-4">
            <div class="flex-1">
              <div class="mb-1">执行结果</div>
              <h5 class="text-h6">{{ props.workflow?.result || '无' }}</h5>
            </div>
            <div class="flex-1">
              <div class="mb-1">已执行次数</div>
              <h5 class="text-h6">{{ props.workflow?.run_count }}</h5>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-y-4">
            <div class="w-full">
              <div class="mb-1">进度</div>
              <div class="d-flex align-center gap-5">
                <div class="flex-grow-1">
                  <VProgressLinear rounded :value="resolveProgress(props.workflow)" color="primary" height="10" />
                </div>
                <span>75%</span>
              </div>
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>
    <!-- 编辑对话框 -->
    <WorkflowEditDialog
      v-if="editDialog"
      v-model="editDialog"
      @close="editDialog = false"
      @save="editDone"
      :workflow="props.workflow"
    />
  </div>
</template>
