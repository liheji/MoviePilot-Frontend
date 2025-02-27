<script lang="ts" setup>
import api from '@/api'
import useDragAndDrop from '@core/utils/workflow'

const { onDragStart } = useDragAndDrop()

// 组件列表
const actions = ref([])

// 加载组件列表
async function load_actions() {
  try {
    actions.value = await api.get('workflow/actions')
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  load_actions()
})
</script>

<template>
  <aside>
    <div class="mb-3"><VLabel>可选动作组件：</VLabel></div>

    <div class="nodes">
      <div
        class="vue-flow__node-default"
        v-for="action in actions"
        :draggable="true"
        @dragstart="onDragStart($event, action)"
      >
        {{ action['name'] }}
      </div>
    </div>
  </aside>
</template>
