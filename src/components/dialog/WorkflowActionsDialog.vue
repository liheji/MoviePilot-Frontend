<script lang="ts" setup>
import { ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import Sidebar from '../workflow/Sidebar.vue'
import DropzoneBackground from '../workflow/DropzoneBackground.vue'
import useDragAndDrop from '@core/utils/workflow'
import { Workflow } from '@/api/types'

const { onConnect, addEdges } = useVueFlow()

const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

const nodes = ref([])

onConnect(addEdges)

// 定义输入参数
const props = defineProps({
  workflow: Object as PropType<Workflow>,
})

// 定义事件
const emit = defineEmits(['close', 'save'])
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
          <VSpacer />
          <VToolbarItems>
            <VBtn icon @click="emit('save')" class="me-5">
              <VIcon size="large" color="white" icon="mdi-content-save" />
            </VBtn>
          </VToolbarItems>
        </VToolbar>
      </div>
      <VCardText>
        <div class="dnd-flow" @drop="onDrop">
          <VueFlow :nodes="nodes" @dragover="onDragOver" @dragleave="onDragLeave">
            <DropzoneBackground
              :style="{
                backgroundColor: isDragOver ? '#e7f3ff' : 'transparent',
                transition: 'background-color 0.2s ease',
              }"
            >
              <p v-if="isDragOver">Drop here</p>
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
</style>
