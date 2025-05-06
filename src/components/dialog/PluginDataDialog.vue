<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { Plugin } from '@/api/types'
import PageRender from '@/components/render/PageRender.vue'
import api from '@/api'
import { loadRemoteComponent } from '@/utils/federationLoader'

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

// 是否刷新
const isRefreshed = ref(false)

// 渲染模式: 'vuetify' 或 'vue'
const renderMode = ref('vuetify')

// 插件数据页面配置项
let pluginPageItems = ref([])

// Vue 模式：动态加载的组件
const dynamicComponent = defineAsyncComponent({
  // 工厂函数
  loader: async () => {
    try {
      if (!props.plugin?.id) {
        throw new Error('插件ID不存在')
      }

      // 动态加载远程组件
      const module = await loadRemoteComponent(props.plugin.id, 'Page')

      return module
    } catch (error) {
      console.error('加载远程组件失败:', error)
    }
  },
  // 加载中显示的组件
  loadingComponent: {
    template: '<VSkeletonLoader type="card"></VSkeletonLoader>',
  },
  // 添加错误处理
  errorComponent: {
    template: `
      <div class="pa-4">
        <VAlert type="error" title="组件加载错误">
          无法加载组件，请稍后再试
        </VAlert>
      </div>
    `,
  },
  // 添加超时设置
  timeout: 20000,
})

// 调用API读取数据页面UI
async function loadPluginUIData() {
  isRefreshed.value = false
  pluginPageItems.value = []
  renderMode.value = 'vuetify'

  try {
    const result: { [key: string]: any } = await api.get(`plugin/page/${props.plugin?.id}`)
    if (!result || !result.render_mode) {
      console.error(`插件 ${props.plugin?.plugin_name} UI数据加载失败：无效的响应`)
      return
    }
    renderMode.value = result.render_mode
    if (renderMode.value === 'vuetify') {
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
