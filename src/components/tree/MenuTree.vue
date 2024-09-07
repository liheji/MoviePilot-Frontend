<script lang="ts" setup>
import store from '@/store'
import { SystemMenuTemplate } from '@/router/menu'

interface TreeNode {
  title: string
  value: string | number
  children?: TreeNode[]
}

const openedNodes = ref<string[]>([])
const treeSelected = ref<string[]>([])
const headerTreeData = ref<TreeNode[]>([])

// 从Vuex Store中获取菜单信息
const systemMenu = ref(store.state.menu.system)

// 计算属性，获取菜单
watch(() => store.state.menu.system,
  (newValue): void => {
    systemMenu.value = newValue
  }, { deep: true },
)

const treeOpen = (val: any) => {
  const openedValue = openedNodes.value
  while (openedValue.length > 0 && openedValue[0] !== val.id) {
    openedValue.shift()
  }
  return true
}

function loadTreeData() {
  const selectedItems: string[] = []
  const headerMap = new Map<string, TreeNode>()
  systemMenu.value.forEach((item, index) => {
    if ('enable' in item) {
      // 已选中
      if (item.enable) {
        selectedItems.push(item.to as string)
      }
      // 添加大类节点
      if (!headerMap.has(item.header)) {
        headerMap.set(item.header, {
          title: item.header,
          value: index,
          children: [],
        })
      }
      // 子类节点
      const children = headerMap.get(item.header)?.children
      children?.push({
        title: item.title,
        value: item.to as string,
      })
    }
  })
  headerTreeData.value = Array.from(headerMap.values())
  treeSelected.value = selectedItems
}

onBeforeMount(() => {
  loadTreeData()
})

function updateSystemMenu() {
  // 保存系统菜单到本地
  const treeSet = new Set(treeSelected.value)
  const saveMenu = SystemMenuTemplate.map(
    item => {
      if ('enable' in item) {
        item.enable = treeSet.has(item.to)
      }
      return item
    },
  )
  store.dispatch('menu/update', saveMenu)
}

defineExpose({
  updateSystemMenu,
})
</script>

<template>
  <VTreeview
    v-model:selected="treeSelected"
    v-model:opened="openedNodes"
    @click:open="treeOpen"
    :items="headerTreeData"
    select-strategy="classic"
    return-object
    selectable
    :max-height="160"
    style="top: -20px;"
  />
</template>
