<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { Plugin } from '@/api/types'
import PageRender from '@/components/render/PageRender.vue'
import api from '@/api'
import { useToast } from 'vue-toast-notification'
import { defineAsyncComponent } from 'vue'
import {
  loadRemoteComponent,
  clearRemoteComponentCache,
  registerRemotePlugin,
  isRemoteComponentLoaded,
  ComponentType,
} from '@/utils/federationLoader'

// 输入参数
const props = defineProps({
  plugin: {
    type: Object as PropType<Plugin>,
  },
})

// 定义事件
const emit = defineEmits(['close', 'save', 'switch'])

// 显示器宽度
const display = useDisplay()
// APP
const appMode = inject('pwaMode') && display.mdAndDown.value

// 提示框
const $toast = useToast()

// 是否刷新
const isRefreshed = ref(false)

// 渲染模式: 'vuetify' 或 'vue'
const renderMode = ref('vuetify')

// 挂载状态
const componentMounted = ref(false)

// 插件数据页面配置项
let pluginPageItems = ref([])

// Vue 模式：动态加载的组件
const dynamicComponent = defineAsyncComponent({
  loader: async () => {
    if (renderMode.value !== 'vue' || !props.plugin?.id) {
      return { render: () => null }
    }

    try {
      componentMounted.value = false

      // 确保插件已注册
      if (!isRemoteComponentLoaded(props.plugin.id, ComponentType.PAGE)) {
        await registerRemotePlugin(props.plugin.id)
      }

      // 加载页面组件
      const component = await loadRemoteComponent(props.plugin.id, ComponentType.PAGE)
      componentMounted.value = true

      if (!component) {
        throw new Error('组件加载失败')
      }

      return component
    } catch (error: any) {
      console.error(`加载插件页面组件失败: ${props.plugin.id}`, error)
      $toast.error(`加载插件组件失败: ${error.message || '未知错误'}`)
      return {
        render: () => h('div', { class: 'text-error pa-4' }, `加载失败: ${error.message || '未知错误'}`),
      }
    }
  },
  loadingComponent: {
    render: () =>
      h('div', { class: 'text-center pa-4' }, [
        h('v-progress-circular', { indeterminate: true, class: 'mr-2' }),
        '加载组件中...',
      ]),
  },
  errorComponent: {
    render: () => h('div', { class: 'text-error pa-4 text-center' }, '组件加载失败'),
  },
  onError: error => {
    console.error('加载插件组件出错', error)
  },
})

// 调用API读取数据页面UI
async function loadPluginUIData() {
  isRefreshed.value = false
  pluginPageItems.value = []
  renderMode.value = 'vuetify'
  componentMounted.value = false

  // 清除组件缓存
  if (props.plugin?.id) {
    clearRemoteComponentCache(props.plugin.id)
  }

  try {
    const result: { [key: string]: any } = await api.get(`plugin/page/${props.plugin?.id}`)
    if (!result || !result.render_mode) {
      console.error(`插件 ${props.plugin?.plugin_name} UI数据加载失败：无效的响应`)
      return
    }

    renderMode.value = result.render_mode
    if (renderMode.value === 'vue') {
      // 注册远程插件 (如果提供了组件URL，则使用它)
      if (props.plugin?.id) {
        registerRemotePlugin(props.plugin.id, result.component_url)
      }
    } else {
      // Vuetify模式
      pluginPageItems.value = result.page || []
    }
  } catch (error: any) {
    console.error(error)
  } finally {
    isRefreshed.value = true
  }
}

// 重新加载数据（可由 PageRender 或 Vue component 触发）
function handleAction() {
  loadPluginUIData()
}

onMounted(() => {
  loadPluginUIData()
})

// 组件卸载时清理资源
onUnmounted(() => {
  if (props.plugin?.id) {
    clearRemoteComponentCache(props.plugin.id, ComponentType.PAGE)
  }
})
</script>
<template>
  <VDialog scrollable max-width="80rem" :fullscreen="!display.mdAndUp.value">
    <VCard :title="`${props.plugin?.plugin_name}`" class="rounded-t">
      <VDialogCloseBtn @click="emit('close')" />
      <LoadingBanner v-if="!isRefreshed" class="mt-5" />
      <VCardText v-else class="min-h-40">
        <!-- Vuetify 渲染模式 -->
        <div v-if="renderMode === 'vuetify'">
          <PageRender @action="handleAction" v-for="(item, index) in pluginPageItems" :key="index" :config="item" />
          <div v-if="!pluginPageItems || pluginPageItems.length === 0">此插件没有详情页面</div>
        </div>
        <!-- Vue 渲染模式 -->
        <div v-else-if="renderMode === 'vue'">
          <component :is="dynamicComponent" @action="handleAction" />
        </div>
      </VCardText>
      <VFab
        icon="mdi-cog"
        location="bottom"
        size="x-large"
        fixed
        app
        appear
        @click="emit('switch')"
        :class="{ 'mb-10': appMode }"
      />
    </VCard>
  </VDialog>
</template>
