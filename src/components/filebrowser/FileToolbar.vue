<script lang="ts" setup>
import type { Axios, AxiosRequestConfig } from 'axios'
import type { EndPoints, FileItem } from '@/api/types'
import { useDisplay } from 'vuetify'

// 显示器宽度
const display = useDisplay()

// 输入参数
const inProps = defineProps({
  storages: Array as PropType<any[]>,
  storage: String,
  item: {
    type: Object as PropType<FileItem>,
    required: true,
  },
  itemstack: {
    type: Array as PropType<FileItem[]>,
    required: true,
  },
  endpoints: Object as PropType<EndPoints>,
  axios: {
    type: Object as PropType<Axios>,
    required: true,
  },
})

// 对外事件
const emit = defineEmits(['storagechanged', 'pathchanged', 'loading', 'foldercreated', 'sortchanged'])

// 新建文件夹名称
const newFolderPopper = ref(false)

// 新建文件名称
const newFolderName = ref('')

// 排序方式
const sort = ref('name')

// 调整排序方式
function changeSort() {
  if (sort.value === 'name') sort.value = 'time'
  else sort.value = 'name'

  emit('sortchanged', sort.value)
}

// 计算PATH面包屑
const pathSegments = computed(() => {
  let path_str = ''
  const isFolder = inProps.item.path?.endsWith('/')
  const segments = inProps.item.path?.split('/').filter(item => item)
  return (
    segments?.map((item, index) => {
      path_str += item + (index < segments.length - 1 || isFolder ? '/' : '')
      return {
        name: item,
        path: path_str,
      }
    }) ?? []
  )
})

// 路径变化
function changePath(item: FileItem) {
  emit('pathchanged', item)
}

// 返回上一级
function goUp() {
  const segments = pathSegments.value ?? []
  const fileitem = inProps.itemstack[segments.length - 1]
  changePath(fileitem)
}

// 创建目录
async function mkdir() {
  emit('loading', true)
  const url = inProps.endpoints?.mkdir.url.replace(/{name}/g, newFolderName.value)

  const config: AxiosRequestConfig<FileItem> = {
    url,
    method: inProps.endpoints?.mkdir.method || 'post',
    data: inProps.item,
  }

  // 调API
  await inProps.axios.request(config)

  newFolderPopper.value = false
  newFolderName.value = ''
  emit('loading', false)

  // 通知重新加载
  emit('foldercreated')
}

// 计算排序图标
const sortIcon = computed(() => {
  if (sort.value === 'time') return 'mdi-sort-clock-ascending-outline'
  else return 'mdi-sort-alphabetical-ascending'
})

// 保存路径片段引用
const pathSegmentRef = ref<HTMLElement | null>(null)

// 检查文本是否被截断
function checkTextTruncated(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target) return

  // 动态设置tooltip是否禁用
  const isTextOverflowing = target.offsetWidth < target.scrollWidth

  // 找到最近的tooltip组件并设置disabled属性
  const tooltipEl = target.closest('.v-tooltip')
  if (tooltipEl) {
    const tooltipComponent = (tooltipEl as any).__vue__
    if (tooltipComponent && tooltipComponent.isActive !== undefined) {
      tooltipComponent.isActive = isTextOverflowing
    }
  }
}
</script>

<template>
  <VToolbar flat dense class="file-toolbar">
    <VToolbarItems class="overflow-hidden w-100">
      <VBtn
        variant="text"
        :input-value="inProps.item?.path === '/'"
        color="primary"
        class="px-1 path-button home-button"
        @click="changePath(inProps.itemstack[0])"
      >
        <VIcon icon="mdi-home" class="mx-2" />
      </VBtn>

      <div class="breadcrumb">
        <template v-for="(segment, index) in pathSegments" :key="index">
          <VBtn
            v-if="display.mdAndUp.value"
            variant="text"
            color="primary"
            density="comfortable"
            :input-value="index === pathSegments.length - 1"
            :class="['px-1', 'path-button', { 'current-path': index === pathSegments.length - 1 }]"
            @click="changePath(inProps.itemstack[index + 1])"
          >
            <VIcon icon="mdi-chevron-right" size="small" />
            <VTooltip>
              <template #activator="{ props }">
                <span class="path-segment" v-bind="props" ref="pathSegmentRef" @mouseover="checkTextTruncated">
                  {{ segment.name }}
                </span>
              </template>
              {{ segment.name }}
            </VTooltip>
          </VBtn>
        </template>
      </div>

      <VSpacer />

      <div class="file-actions">
        <VTooltip text="调整排序">
          <template #activator="{ props }">
            <VBtn v-bind="props" @click="changeSort" icon variant="text" color="primary" class="action-button">
              <VIcon :icon="sortIcon" />
            </VBtn>
          </template>
        </VTooltip>

        <VTooltip text="返回上一级" v-if="pathSegments.length > 0">
          <template #activator="{ props }">
            <VBtn v-bind="props" @click="goUp" icon variant="text" color="primary" class="action-button">
              <VIcon icon="mdi-arrow-up" />
            </VBtn>
          </template>
        </VTooltip>

        <VDialog v-model="newFolderPopper" max-width="40rem" class="mkdir-dialog">
          <template #activator="{ props }">
            <VBtn v-bind="props" icon variant="text" color="primary" class="action-button">
              <VTooltip text="新建文件夹">
                <template #activator="{ props: _props }">
                  <VIcon v-bind="_props" icon="mdi-folder-plus" />
                </template>
              </VTooltip>
            </VBtn>
          </template>
          <VCard title="新建文件夹" class="pa-2">
            <template #title>
              <div class="d-flex align-center px-4 pt-4">
                <VIcon icon="mdi-folder-plus" color="primary" class="me-2" />
                <span class="text-h6">新建文件夹</span>
              </div>
            </template>
            <DialogCloseBtn @click="newFolderPopper = false" />
            <VDivider class="mt-3" />
            <VCardText>
              <VTextField
                v-model="newFolderName"
                label="文件夹名称"
                placeholder="请输入文件夹名称"
                variant="outlined"
                hide-details="auto"
                autofocus
                @keyup.enter="mkdir"
              />
            </VCardText>
            <VCardActions class="pa-4 pt-0">
              <VSpacer />
              <VBtn color="grey" variant="text" @click="newFolderPopper = false">取消</VBtn>
              <VBtn :disabled="!newFolderName" color="primary" variant="elevated" @click="mkdir" class="ms-2">
                创建
              </VBtn>
            </VCardActions>
          </VCard>
        </VDialog>
      </div>
    </VToolbarItems>
  </VToolbar>
</template>

<style lang="scss" scoped>
.file-toolbar {
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.home-button {
  min-width: 50px;
  flex-shrink: 0;

  @media (min-width: 960px) {
    max-width: unset;
  }

  @media (max-width: 959px) {
    max-width: 120px;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
  flex: 1;
  min-width: 0;

  &::-webkit-scrollbar {
    display: none;
  }

  // 确保当面包屑宽度超出容器时，最后一个元素可见
  &:hover {
    scroll-behavior: smooth;
  }

  // 允许在触摸设备上滚动
  touch-action: pan-x;
}

.path-button {
  padding: 0 4px;
  min-width: auto;
  height: 36px;
  font-weight: normal;
  flex-shrink: 0;

  &:not(.current-path) {
    @media (max-width: 959px) {
      max-width: 120px;
    }
  }

  &.current-path {
    flex-shrink: 1;
  }
}

.path-segment {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;

  .path-button:not(.current-path) & {
    @media (min-width: 1200px) {
      max-width: 200px;
    }

    @media (min-width: 960px) and (max-width: 1199px) {
      max-width: 150px;
    }

    @media (min-width: 600px) and (max-width: 959px) {
      max-width: 100px;
    }

    @media (max-width: 599px) {
      max-width: 80px;
    }
  }

  .current-path & {
    @media (min-width: 960px) {
      max-width: unset;
    }

    @media (max-width: 959px) {
      max-width: 150px;
    }

    @media (max-width: 599px) {
      max-width: 120px;
    }
  }
}

.action-button {
  margin: 0 2px;
  border-radius: 4px;
  flex-shrink: 0;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.05);
  }
}

.mkdir-dialog {
  .v-card {
    border-radius: 8px;
  }
}

.file-actions {
  display: flex;
  align-items: center;
}
</style>
