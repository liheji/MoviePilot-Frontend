<script lang="ts" setup>
import { ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import useDragAndDrop from '@core/utils/workflow'
import { Workflow } from '@/api/types'
import { useToast } from 'vue-toast-notification'
import api from '@/api'
import WorkflowSidebar from '@/layouts/components/WorkflowSidebar.vue'
import DropzoneBackground from '@/layouts/components/DropzoneBackground.vue'
import ImportCodeDialog from '@/components/dialog/ImportCodeDialog.vue'

const { onConnect, addEdges, nodes, edges } = useVueFlow()

const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

onConnect(addEdges)

// 自定义节点类型
const nodeTypes: Record<string, any> = ref({})

// 自动扫描目录下所有的 .vue 文件
const components = import.meta.glob('../workflow/*Action.vue')

// 动态加载某个组件
const loadComponent = async (componentName: string) => {
  const component = components[`../workflow/${componentName}.vue`]
  if (component) {
    return ((await component()) as any).default
  }
  throw new Error(`组件 ${componentName} 未找到`)
}

// 将所有components中的组件加载到nodeTypes中
for (const path in components) {
  const componentName = path.match(/\.\/workflow\/(.*).vue$/)?.[1]
  if (!componentName) {
    continue
  }
  loadComponent(componentName).then(component => {
    nodeTypes.value[componentName] = markRaw(component)
  })
}

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

// 导入代码对话框
const importCodeDialog = ref(false)

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

// 保存导入的代码，直接覆盖原有值
function saveCodeString(type: string, code: any) {
  try {
    if (code) {
      const codeObject = JSON.parse(code.value)
      if (type === 'workflow') {
        nodes.value = codeObject.actions || []
        edges.value = codeObject.flows || []
      }
      importCodeDialog.value = false
      $toast.success('导入成功！')
    }
  } catch (error) {
    $toast.error('导入失败！')
    console.error(error)
  }
}

// 分享工作流程
function shareWorkflow() {
  const codeString = JSON.stringify({ actions: nodes.value, flows: edges.value })
  navigator.clipboard.writeText(codeString)
  $toast.success('任务流程代码已复制到剪贴板！')
}

// 删除选中节点或连接线
const deleteSelectedNodeOrEdge = () => {
  // 删除选中的节点
  const selectedNode = nodes.value.find((node: { selected: any }) => node.selected)
  if (selectedNode) {
    // 删除节点
    nodes.value = nodes.value.filter((node: { id: any }) => node.id !== selectedNode.id)
    // 删除与该节点相关的 edges
    edges.value = edges.value.filter(
      (edge: { source: any; target: any }) => edge.source !== selectedNode.id && edge.target !== selectedNode.id,
    )
  }
  // 删除选中的连接线
  const selectedEdge = edges.value.find((edge: { selected: any }) => edge.selected)
  if (selectedEdge) {
    // 删除连接线
    edges.value = edges.value.filter((edge: { id: any }) => edge.id !== selectedEdge.id)
  }
}

// 键盘按键事件处理
const handleKeyDown = (event: { key: string }) => {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    deleteSelectedNodeOrEdge()
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
            <VBtn icon @click="importCodeDialog = true">
              <VIcon size="large" color="white" icon="mdi-import" />
            </VBtn>
            <VBtn icon @click="shareWorkflow">
              <VIcon size="large" color="white" icon="mdi-share" />
            </VBtn>
            <VBtn icon @click="updateWorkflow" class="me-5">
              <VIcon size="large" color="white" icon="mdi-content-save" />
            </VBtn>
          </VToolbarItems>
        </VToolbar>
      </div>
      <VDivider />
      <VCardText class="px-0 py-0">
        <div class="dnd-flow" @drop="onDrop">
          <VueFlow
            :nodes="nodes"
            :edges="edges"
            :nodeTypes="nodeTypes"
            :default-edge-options="{ type: 'animation', animated: true }"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @keydown="handleKeyDown"
          >
            <MiniMap />
            <DropzoneBackground
              :style="{
                backgroundColor: isDragOver ? '#e7f3ff' : 'transparent',
                transition: 'background-color 0.2s ease',
              }"
            >
            </DropzoneBackground>
          </VueFlow>
          <WorkflowSidebar />
        </div>
      </VCardText>
    </VCard>
    <ImportCodeDialog
      v-if="importCodeDialog"
      v-model="importCodeDialog"
      title="导入任务流程"
      dataType="workflow"
      @close="importCodeDialog = false"
      @save="saveCodeString"
    />
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
    max-width: 25%;
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

.vue-flow__handle {
  height: 24px;
  width: 8px;
  border-radius: 4px;
}

.vue-flow__edges {
  filter: invert(100%);
}

.vue-flow__handle-left {
  background-color: rgb(var(--v-theme-info));
}

.vue-flow__handle-right {
  background-color: rgb(var(--v-theme-error));
}
</style>
