<script setup lang="ts">
import api from '@/api'
import { Workflow } from '@/api/types'
import { useDisplay } from 'vuetify'
import WorkflowEditDialog from '@/components/dialog/WorkflowEditDialog.vue'

// APP
const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

// 是否刷新
const isRefreshed = ref(false)

// 所有工作流
const workflowList = ref<Workflow[]>([])

const options = ref({ page: 1, itemsPerPage: 25, sortBy: [''], sortDesc: [false] })

// headers
const headers = [
  { title: '名称', key: 'name' },
  { title: '定时', key: 'timer' },
  { title: '当前任务', key: 'current_action' },
  { title: '状态', key: 'state' },
  { title: '进度', key: 'progress' },
  { title: '创建时间', key: 'add_time' },
]

// 加载数据
async function fetchData() {
  try {
    workflowList.value = await api.get('workflow/')
    isRefreshed.value = true
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

onMounted(() => {
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
      :items-per-page="options.itemsPerPage"
      :page="options.page"
      :options="options"
      loading-text="加载中..."
      class="text-no-wrap"
      hover
    >
      <!-- name -->
      <template #item.name="{ item }">
        <div class="d-flex align-center">
          <VAvatar size="32" color="primary" class="v-avatar-light-bg primary--text" variant="tonal">
            <span class="text-sm">{{ item.actions?.length }}</span>
          </VAvatar>
          <div class="d-flex flex-column ms-3">
            <span class="d-block font-weight-medium text-high-emphasis text-truncate">{{ item.name }}</span>
            <small>{{ item.description }}</small>
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
            <VProgressLinear rounded :value="resolveProgress" color="primary" height="8" />
          </div>
          <div>{{ resolveProgress }}%</div>
        </div>
      </template>
      <template #bottom>
        <VCardText class="pt-2">
          <div class="d-flex flex-wrap justify-space-between gap-y-2 mt-2">
            <VSelect
              v-model="options.itemsPerPage"
              :items="[10, 25, 50, 100]"
              label="每页记录数:"
              variant="underlined"
              style="max-inline-size: 8rem; min-inline-size: 5rem"
            />

            <VPagination
              v-model="options.page"
              :total-visible="$vuetify.display.smAndDown ? 2 : 3"
              :length="Math.ceil(workflowList.length / options.itemsPerPage)"
            />
          </div>
        </VCardText>
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
  />
</template>
