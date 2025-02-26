<script lang="ts" setup>
import { ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import useDragAndDrop from '@core/utils/workflow'
import { Workflow } from '@/api/types'
import { useToast } from 'vue-toast-notification'
import api from '@/api'
import { useConfirm } from 'vuetify-use-dialog'
import Sidebar from '../workflow/Sidebar.vue'
import DropzoneBackground from '../workflow/DropzoneBackground.vue'

const { onConnect, addEdges, nodes, edges, onNodesChange, applyNodeChanges, onEdgesChange, applyEdgeChanges } =
  useVueFlow()

const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

onConnect(addEdges)

onNodesChange(async (changes: any) => {
  const nextChanges = []
  for (const change of changes) {
    if (change.type === 'remove') {
      const isConfirmed = await createConfirm({
        title: '确认',
        content: `确定要删除该节点吗？`,
      })
      if (!isConfirmed) {
        nextChanges.push(change)
      }
    } else {
      nextChanges.push(change)
    }
  }
  applyNodeChanges(nextChanges)
})

onEdgesChange(async (changes: any) => {
  const nextChanges = []
  for (const change of changes) {
    if (change.type === 'remove') {
      const isConfirmed = await createConfirm({
        title: '确认',
        content: `确定要删除该节点吗？`,
      })
      if (isConfirmed) {
        nextChanges.push(change)
      }
    } else {
      nextChanges.push(change)
    }
  }

  applyEdgeChanges(nextChanges)
})

// 定义输入参数
const props = defineProps({
  workflow: Object as PropType<Workflow>,
})

// 定义事件
const emit = defineEmits(['close', 'save'])

// 站点编辑表单数据
const workflowForm = ref<any>(props.workflow || {})

// 提示框
const $toast = useToast()

// 确认框
const createConfirm = useConfirm()

// 调用API 编辑任务
async function updateWorkflow() {
  // 更新节点和流程
  workflowForm.value.actions = nodes
  workflowForm.value.flows = edges

  try {
    const result: { [key: string]: string } = await api.put(`workflow/${workflowForm.value.id}`, workflowForm.value)
    if (result.success) {
      $toast.success(`保存任务流程成功！`)
      emit('save')
    } else {
      $toast.error(`保存任务流程失败：${result.message}`)
    }
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  if (props.workflow) {
    nodes.value = props.workflow.actions ?? []
    edges.value = props.workflow.flows ?? []
  }
})
</script>

<template>
  <VDialog scrollable fullscreen :scrim="false" transition="dialog-bottom-transition">
    <VCard>
      <!-- Toolbar -->
      <div>
        <VToolbar color="primary">
          <VToolbarItems>
            <VBtn icon @click="emit('close')" class="ms-3">
              <VIcon size="large" color="white" icon="mdi-close" />
            </VBtn>
          </VToolbarItems>
          <VToolbarTitle> 编辑流程 - {{ workflow?.name }} </VToolbarTitle>
          <VToolbarItems>
            <VBtn icon @click="updateWorkflow" class="me-5">
              <VIcon size="large" color="white" icon="mdi-content-save" />
            </VBtn>
          </VToolbarItems>
        </VToolbar>
      </div>
      <VCardText class="px-0 py-0">
        <div class="dnd-flow" @drop="onDrop">
          <VueFlow :nodes="nodes" :edges="edges" @dragover="onDragOver" @dragleave="onDragLeave">
            <MiniMap />
            <DropzoneBackground
              :style="{
                backgroundColor: isDragOver ? '#e7f3ff' : 'transparent',
                transition: 'background-color 0.2s ease',
              }"
            >
            </DropzoneBackground>
          </VueFlow>
          <Sidebar />
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
@import '@vue-flow/node-resizer/dist/style.css';

.vue-flow__minimap {
  transform: scale(75%);
  transform-origin: bottom right;
}

.dnd-flow {
  flex-direction: column;
  display: flex;
  height: 100%;
}

.dnd-flow aside {
  color: #fff;
  font-weight: 700;
  border-right: 1px solid #eee;
  padding: 15px 10px;
  font-size: 12px;
  background: #10b981bf;
  -webkit-box-shadow: 0px 5px 10px 0px rgba(0, 0, 0, 0.3);
  box-shadow: 0 5px 10px #0000004d;
}

.dnd-flow aside .nodes > * {
  margin-bottom: 10px;
  cursor: grab;
  font-weight: 500;
  -webkit-box-shadow: 5px 5px 10px 2px rgba(0, 0, 0, 0.25);
  box-shadow: 5px 5px 10px 2px #00000040;
}

.dnd-flow aside .description {
  margin-bottom: 10px;
}

.dnd-flow .vue-flow-wrapper {
  flex-grow: 1;
  height: 100%;
}

@media screen and (min-width: 640px) {
  .dnd-flow {
    flex-direction: row;
  }

  .dnd-flow aside {
    min-width: 25%;
  }
}

@media screen and (max-width: 639px) {
  .dnd-flow aside .nodes {
    display: flex;
    flex-direction: row;
    gap: 5px;
  }
}

.dropzone-background {
  position: relative;
  height: 100%;
  width: 100%;
}

.dropzone-background .overlay {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  pointer-events: none;
}
</style>
