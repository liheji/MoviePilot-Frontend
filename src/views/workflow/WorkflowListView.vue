<script setup lang="ts">
import api from '@/api'
import { Workflow } from '@/api/types'
import { useDisplay } from 'vuetify'
import WorkflowAddEditDialog from '@/components/dialog/WorkflowAddEditDialog.vue'
import WorkflowTaskCard from '@/components/cards/WorkflowTaskCard.vue'
import NoDataFound from '@/components/NoDataFound.vue'

// APP
const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

// 是否刷新
const isRefreshed = ref(false)

// 新增对话框
const addDialog = ref(false)

// 所有任务
const workflowList = ref<Workflow[]>([])

// 加载数据
async function fetchData() {
  try {
    workflowList.value = await api.get('workflow/')
    isRefreshed.value = true
  } catch (error) {
    console.error(error)
  }
}

// 新增完成
function addDone() {
  addDialog.value = false
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
  <div>
    <LoadingBanner v-if="!isRefreshed" class="mt-12" />
    <VRow v-if="workflowList.length > 0">
      <VCol cols="12" md="6" lg="4" v-for="item in workflowList" :key="item.id">
        <WorkflowTaskCard :workflow="item" @refresh="fetchData" />
      </VCol>
    </VRow>
    <NoDataFound
      v-if="workflowList.length === 0 && isRefreshed"
      error-code="404"
      error-title="没有工作流"
      error-description="点击添加按钮创建工作流任务。"
    />
  </div>

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
  <!-- 新增对话框 -->
  <WorkflowAddEditDialog v-if="addDialog" v-model="addDialog" @close="addDialog = false" @save="addDone" />
</template>
