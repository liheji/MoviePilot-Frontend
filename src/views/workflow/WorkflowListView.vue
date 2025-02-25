<script setup lang="ts">
import api from '@/api'
import { Workflow } from '@/api/types'
import { useDisplay } from 'vuetify'
import WorkflowEditDialog from '@/components/dialog/WorkflowEditDialog.vue'
import WorkflowAddDialog from '@/components/dialog/WorkflowAddDialog.vue'
import { useToast } from 'vue-toast-notification'
import { useConfirm } from 'vuetify-use-dialog'

// APP
const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

// 是否刷新
const isRefreshed = ref(false)

// 过滤关键字
const filter = ref('')

// 新增对话框
const addDialog = ref(false)

// 流程编辑对话框
const editDialog = ref(false)

// 所有任务
const workflowList = ref<Workflow[]>([])

// 当前编辑任务
const currentWorkflow = ref<Workflow>()

// headers
const headers = [
  { title: '任务', key: 'name' },
  { title: '定时', key: 'timer' },
  { title: '状态', key: 'state' },
  { title: '进度', key: 'progress' },
  { title: '操作', key: 'action' },
]

// 表格样式
const tableStyle = computed(() => {
  return appMode
    ? 'height: calc(100vh - 12.5rem - env(safe-area-inset-bottom)'
    : 'height: calc(100vh - 11.5rem - env(safe-area-inset-bottom)'
})

// 提示框
const $toast = useToast()

// 确认框
const createConfirm = useConfirm()

// 加载数据
async function fetchData() {
  try {
    workflowList.value = await api.get('workflow/')
    isRefreshed.value = true
  } catch (error) {
    console.error(error)
  }
}

// 编辑任务
function handleEdit(item: Workflow) {
  currentWorkflow.value = item
  editDialog.value = true
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
      fetchData()
    } else {
      $toast.error(`删除任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
}

// 开始任务
async function handleEnable(item: Workflow) {
  try {
    const result: { [key: string]: string } = await api.post(`workflow/${item.id}/start`)
    if (result.success) {
      $toast.success('启用任务成功！')
      fetchData()
    } else {
      $toast.error(`启用任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
}

// 停用任务
async function handlePause(item: Workflow) {
  try {
    const result: { [key: string]: string } = await api.post(`workflow/${item.id}/pause`)
    if (result.success) {
      $toast.success('停用任务成功！')
      fetchData()
    } else {
      $toast.error(`停用任务失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
}

// 立即执行任务
async function handleRun(item: Workflow) {
  try {
    const result: { [key: string]: string } = await api.post(`workflow/${item.id}/run`)
    if (result.success) {
      $toast.success('任务执行成功！')
      fetchData()
    } else {
      $toast.error(`任务执行失败：${result.message}`)
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
  else if (status === 'P') return { color: 'warning', text: '暂停' }
  else return { color: '', text: '等待' }
}

// 计算当前动作占比
const resolveProgress = (item: Workflow) => {
  const current_action_index = item.actions?.findIndex(action => action.id === item.current_action) ?? 0
  return item.actions?.length ? Math.round((current_action_index / item.actions.length) * 100) : 0
}

// 新增任务成功
const addDone = () => {
  addDialog.value = false
  fetchData()
}

// 修改任务成功
const editDone = () => {
  editDialog.value = false
  fetchData()
}

onMounted(() => {
  fetchData()
})

onActivated(() => {
  fetchData()
})
</script>

<template>
  <VCard>
    <VCardItem>
      <div class="flex">
        <VCardTitle> 工作流 </VCardTitle>
        <VSpacer />
        <VCombobox
          v-model="filter"
          max-width="300"
          key="search_navbar"
          class="text-disabled"
          density="compact"
          label="搜索"
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          single-line
          hide-details
          flat
          rounded
          clearable
        />
      </div>
    </VCardItem>
    <VDataTable
      :headers="headers"
      :items="workflowList"
      :items-per-page="1000"
      loading-text="加载中..."
      class="text-no-wrap"
      hover
      fixed-header
      hide-default-footer
      :style="tableStyle"
      :search="filter"
    >
      <!-- name -->
      <template #item.name="{ item }">
        <div class="d-flex align-center">
          <VAvatar size="32" color="primary" variant="tonal">
            <span class="text-sm">{{ item.actions?.length }}</span>
          </VAvatar>
          <div class="d-flex flex-column ms-3">
            <span class="d-block text-base text-high-emphasis text-truncate">{{ item.name }}</span>
            <span class="text-sm">{{ item.description }}</span>
          </div>
        </div>
      </template>
      <!-- state -->
      <template #item.state="{ item }">
        <VChip :color="resolveStatusVariant(item.state).color" class="font-weight-medium" size="small">
          {{ resolveStatusVariant(item.state).text }}
        </VChip>
      </template>
      <!-- progress -->
      <template #item.progress="{ item }">
        <div class="d-flex align-center gap-x-4">
          <div class="w-100">
            <VProgressLinear rounded :value="resolveProgress(item)" color="primary" height="8" />
          </div>
          <div>{{ resolveProgress(item) }}%</div>
        </div>
      </template>
      <!-- action -->
      <template #item.action="{ item }">
        <IconBtn v-if="item.state === 'P'">
          <VIcon color="success" icon="mdi-play" @click="handleEnable(item)" />
        </IconBtn>
        <IconBtn v-else>
          <VIcon color="warning" icon="mdi-pause" @click="handlePause(item)" />
        </IconBtn>
        <IconBtn>
          <VIcon color="primary" icon="mdi-pencil" @click="handleEdit(item)" />
        </IconBtn>
        <IconBtn>
          <VIcon color="info" icon="mdi-run" @click="handleRun(item)" />
        </IconBtn>
        <IconBtn>
          <VIcon color="error" icon="mdi-delete" @click="handleDelete(item)" />
        </IconBtn>
      </template>
      <template #no-data> 没有数据 </template>
    </VDataTable>
  </VCard>
  <!-- 新增按钮 -->
  <VFab
    v-if="isRefreshed"
    icon="mdi-plus"
    location="bottom"
    size="x-large"
    fixed
    app
    appear
    :class="{ 'mb-12': appMode }"
    @click="addDialog = true"
  />
  <!-- 编辑对话框 -->
  <WorkflowEditDialog
    v-if="editDialog && currentWorkflow"
    v-model="editDialog"
    @close="editDialog = false"
    @save="editDone"
    :workflow="currentWorkflow"
  />
  <!-- 新增对话框 -->
  <WorkflowAddDialog v-if="addDialog" v-model="addDialog" @close="addDialog = false" @save="addDone" />
</template>
<style lang="scss">
.v-table th {
  white-space: nowrap;
}
</style>
