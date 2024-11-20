<script setup lang="ts">
import api from '@/api'
import { FileItem } from '@/api/types'
import { VTreeview } from 'vuetify/labs/VTreeview'

const props = defineProps({
  root: {
    type: String,
    default: '/',
    required: true,
  },
  storage: {
    type: String,
    default: 'local',
  },
})

const emit = defineEmits(['update:modelValue'])

const activedDirs = ref<string[]>([])
const openedDirs = ref<string[]>([])
const isUserAction = ref(false) // 标志：是否为用户主动操作

const treeItems = ref<FileItem[]>([
  {
    name: '/',
    path: props.root,
    children: [],
    type: 'dir',
    basename: props.root,
    storage: props.storage,
  },
])

async function fetchDirs(item: any) {
  return api
    .post('/storage/list', item)
    .then((data: any) => {
      data = data.filter((i: any) => i.type === 'dir')
      item.children.push(...data)
    })
    .catch(err => console.warn(err))
}

const selectedPath = computed(() => {
  if (activedDirs.value.length > 0) {
    return activedDirs.value[0]
  }
  return ''
})

watch(activedDirs, newVal => {
  if (!newVal.length || !isUserAction.value) return
  emit('update:modelValue', selectedPath.value)
  isUserAction.value = false
})

watch(
  () => props.storage,
  async newVal => {
    treeItems.value = [
      {
        name: '/',
        path: props.root,
        children: [],
        type: 'dir',
        basename: props.root,
        storage: newVal,
      },
    ]
    openedDirs.value = []
    activedDirs.value = []
  },
)

function handleUserSelect() {
  isUserAction.value = true
}
</script>

<template>
  <VMenu :close-on-content-click="false" content-class="cursor-default">
    <template v-slot:activator="{ props }">
      <slot name="activator" :menuprops="props" />
    </template>
    <VTreeview
      v-model:activated="activedDirs"
      v-model:opened="openedDirs"
      :items="treeItems"
      :load-children="fetchDirs"
      item-key="path"
      item-title="name"
      item-value="path"
      item-type="unknown"
      activatable
      return-object
      max-height="20rem"
      expand-icon="mdi-folder"
      collapse-icon="mdi-folder-open"
      @update:activated="handleUserSelect"
    />
  </VMenu>
</template>
