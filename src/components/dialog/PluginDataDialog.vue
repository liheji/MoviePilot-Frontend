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

// 远程组件加载错误
const remoteComponentError = ref<Error | string | null>(null)

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

      // 返回组件
      return module.default
    } catch (error) {
      console.error('加载远程组件失败:', error)
      remoteComponentError.value = error instanceof Error ? error.message : String(error)
      // 返回一个简单的错误组件
      return {
        template: `
          <div class="pa-4">
            <VAlert type="error" title="组件加载失败">
              无法加载远程组件: {{ error }}
            </VAlert>
          </div>
        `,
        props: ['error'],
        setup() {
          return { error: remoteComponentError.value }
        },
      }
    }
  },
  // 加载中显示的组件
  loadingComponent: {
    template: '<VSkeletonLoader type="card"></VSkeletonLoader>',
  },
  // 如果加载组件超时
  timeout: 10000,
  // 在显示loadingComponent之前的延迟 | 默认值：200（毫秒）
  delay: 200,
  // 定义组件是否可挂起 | 默认值：true
  suspensible: false,
  onError(error, retry, fail, attempts) {
    if (attempts <= 3) {
      // 重试3次
      retry()
    } else {
      // 超过重试次数后不再重试
      fail()
    }
  },
})

// 调用API读取数据页面UI
async function loadPluginUIData() {
  isRefreshed.value = false
  pluginPageItems.value = []
  renderMode.value = 'vuetify'
  remoteComponentError.value = null

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
          <div v-if="remoteComponentError">
            <v-alert type="error" title="组件加载失败"> 无法加载远程组件: {{ remoteComponentError }} </v-alert>
          </div>
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
