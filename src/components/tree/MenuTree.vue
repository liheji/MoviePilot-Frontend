<script lang="ts" setup>
import { MenuTemplate } from '@/router/menu'
import store from '@/store'

interface TreeNode {
  title: string
  value: string | number
  children?: TreeNode[]
}

const openedNodes = ref([])
const treeSelected = ref([])
const headerTreeData = ref([])

// 从Vuex Store中获取菜单信息
const systemMenu = ref(store.state.menu.systemMenu)

// 计算属性，获取菜单
watch(() => store.state.menu.systemMenu,
  (newValue): void => {
    systemMenu.value = newValue
  }, { deep: true })

const treeOpen = (val) => {
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
        selectedItems.push(item.to)
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
      const children = headerMap.get(item.header).children
      children?.push({
        title: item.title,
        value: item.to,
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
  const saveMenu = MenuTemplate.map(
    item => {
      if ('enable' in item) {
        item.enable = treeSet.has(item.to)
      }
      return item
    },
  )
  store.dispatch('menu/update', { systemMenu: saveMenu })
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
