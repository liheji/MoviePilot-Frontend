<script lang="ts" setup>
import { ref } from 'vue'
import { VueFlow, useVueFlow, type Connection, type GraphNode } from '@vue-flow/core'
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

// 连接事件
onConnect((connection: Connection) => {
  // 双重校验
  if (!isValidConnection(connection)) {
    $toast.warning('非法连接：不能连接自身或同类型端口！')
    return
  }
  addEdges(connection)
})

// 获取指定节点端口的类型（输入/输出）
const getPortType = (node: GraphNode, handleId: string) => {
  // 检查是否是输入端口（对应 handleBounds.target）
  const isInput = node.handleBounds?.target?.some(h => h.id === handleId)
  if (isInput) return 'input'

  // 检查是否是输出端口（对应 handleBounds.source）
  const isOutput = node.handleBounds?.source?.some(h => h.id === handleId)
  return isOutput ? 'output' : null
}

// 校验连接是否合法
const isValidConnection = (connection: Connection) => {
  // 获取连接的源节点和目标节点
  const sourceNode = nodes.value.find(n => n.id === connection.source)
  const targetNode = nodes.value.find(n => n.id === connection.target)

  if (!sourceNode || !targetNode) return false

  // 获取端口类型
  const sourcePortType = getPortType(sourceNode, connection.sourceHandle!)
  const targetPortType = getPortType(targetNode, connection.targetHandle!)

  /* 同时满足三个条件，才允许连接：
   * 1. 源端口是输出类型（output）
   * 2. 目标端口是输入类型（input）
   * 3. 不是同一节点的连接
   */
  return sourcePortType === 'output' && targetPortType === 'input' && connection.source !== connection.target
}

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

onMounted(() => {
  if (props.workflow) {
    nodes.value = props.workflow.actions ?? []
    edges.value = props.workflow.flows ?? []
  }
})

// 判断是不是MACOS
const isMacOS = computed(() => {
  return /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent)
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
            <VBtn icon @click="updateWorkflow" class="mx-5">
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
            :is-valid-connection="isValidConnection"
            :default-edge-options="{ type: 'animation', animated: true }"
            :edge-updater-radius="10"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            :delete-key-code="isMacOS ? 'Backspace' : 'Delete'"
            auto-connect
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
  display: flex;
  flex-direction: column;
  block-size: 100%;
}

.dnd-flow aside {
  background: #10b981bf;
  border-inline-end: 1px solid #eee;
  box-shadow: 0 5px 10px 0 rgba(0, 0, 0, 30%);
  box-shadow: 0 5px 10px #0000004d;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding-block: 15px;
  padding-inline: 10px;
}

.dnd-flow aside .nodes > * {
  box-shadow: 5px 5px 10px 2px rgba(0, 0, 0, 25%);
  box-shadow: 5px 5px 10px 2px #00000040;
  cursor: grab;
  font-weight: 500;
  margin-block-end: 10px;
}

.dnd-flow aside .description {
  margin-block-end: 10px;
}

.dnd-flow .vue-flow-wrapper {
  flex-grow: 1;
  block-size: 100%;
}

@media screen and (width >= 640px) {
  .dnd-flow {
    flex-direction: row;
  }

  .dnd-flow aside {
    max-inline-size: 25%;
  }
}

@media screen and (width <= 639px) {
  .dnd-flow aside .nodes {
    display: flex;
    flex-direction: row;
    gap: 5px;
  }
}

.dropzone-background {
  position: relative;
  block-size: 100%;
  inline-size: 100%;
}

.dropzone-background .overlay {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  block-size: 100%;
  inline-size: 100%;
  inset-block-start: 0;
  inset-inline-start: 0;
  pointer-events: none;
}

.vue-flow__handle {
  border-radius: 4px;
  block-size: 24px;
  inline-size: 8px;
}

.vue-flow__edge-path,
.vue-flow__connection-path {
  stroke-width: 3;
}

.vue-flow__handle-left {
  background-color: rgb(var(--v-theme-info));
}

.vue-flow__handle-right {
  background-color: rgb(var(--v-theme-error));
}
</style>
