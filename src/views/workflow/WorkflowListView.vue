<script setup lang="ts">
import api from '@/api'
import { Workflow } from '@/api/types'
import WorkflowAddEditDialog from '@/components/dialog/WorkflowAddEditDialog.vue'
import WorkflowTaskCard from '@/components/cards/WorkflowTaskCard.vue'
import NoDataFound from '@/components/NoDataFound.vue'
import { useI18n } from 'vue-i18n'
import { usePWA } from '@/composables/usePWA'
import { useDynamicButton } from '@/composables/useDynamicButton'

// 国际化
const { t } = useI18n()

// 是否刷新
const isRefreshed = ref(false)

// 路由
const route = useRoute()

// PWA模式检测
const { appMode } = usePWA()

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

// 使用动态按钮钩子 新增
useDynamicButton({
  icon: 'mdi-plus',
  onClick: () => {
    addDialog.value = true
  },
})

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
    <div v-if="workflowList.length > 0 && isRefreshed" class="grid gap-4 grid-workflow-card px-2">
      <WorkflowTaskCard v-for="item in workflowList" :key="item.id" :workflow="item" @refresh="fetchData" />
    </div>
    <NoDataFound
      v-if="workflowList.length === 0 && isRefreshed"
      error-code="404"
      :error-title="t('workflow.noWorkflow')"
      :error-description="t('workflow.noWorkflowDescription')"
    />
    <!-- 新增按钮 -->
    <Teleport to="body" v-if="route.path === '/workflow'">
      <VFab
        v-if="isRefreshed && !appMode"
        icon="mdi-plus"
        location="bottom"
        size="x-large"
        fixed
        app
        appear
        :class="{ 'mb-12': appMode }"
        @click="addDialog = true"
      />
    </Teleport>
    <!-- 新增对话框 -->
    <WorkflowAddEditDialog v-if="addDialog" v-model="addDialog" @close="addDialog = false" @save="addDone" />
  </div>
</template>
