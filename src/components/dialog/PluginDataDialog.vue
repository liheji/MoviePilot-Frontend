<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { Plugin } from '@/api/types'
import PageRender from '@/components/render/PageRender.vue'
import api from '@/api'
import { useToast } from 'vue-toast-notification'

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

// Vue 模式：组件 URL
const vueComponentUrl = ref<string | null>(null)

// 插件数据页面配置项
let pluginPageItems = ref([])

//  Vue 模式：动态加载的组件
const dynamicComponent = computed(() => {
  if (renderMode.value === 'vue' && vueComponentUrl.value) {
    const url = vueComponentUrl.value
    return defineAsyncComponent(() =>
      api
        .get(url)
        .then((response: any) => {
          if (response) {
            const blob = new Blob([response.data], { type: 'text/javascript' })
            const blobUrl = URL.createObjectURL(blob)
            return import(/* @vite-ignore */ blobUrl)
          } else {
            return { render: () => h('div', '组件加载失败: 未读取到文件数据') }
          }
        })
        .then(module => {
          if (module.default) {
            return module.default
          } else {
            $toast.error(`无法从 ${url} 加载默认导出的 Vue 组件`)
            return { render: () => h('div', '组件加载失败: 无默认导出') }
          }
        })
        .catch(err => {
          $toast.error(`无法加载插件组件: ${url}`, err)
          return { render: () => h('div', '组件加载失败') }
        }),
    )
  }
  return null
})

// 调用API读取数据页面UI
async function loadPluginUIData() {
  isRefreshed.value = false
  pluginPageItems.value = []
  renderMode.value = 'vuetify'
  vueComponentUrl.value = null

  try {
    const result: { [key: string]: any } = await api.get(`plugin/page/${props.plugin?.id}`)
    if (!result || !result.render_mode) {
      console.error(`插件 ${props.plugin?.plugin_name} UI数据加载失败：无效的响应`)
      return
    }
    renderMode.value = result.render_mode
    if (renderMode.value === 'vue') {
      vueComponentUrl.value = result.component_url
      if (!vueComponentUrl.value) {
        console.error(`插件 ${props.plugin?.plugin_name} 配置错误：未提供Vue组件URL`)
        renderMode.value = 'vuetify'
      }
    } else {
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
        <div v-else-if="renderMode === 'vue' && dynamicComponent">
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
