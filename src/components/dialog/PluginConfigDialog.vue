<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { Plugin } from '@/api/types'
import { isNullOrEmptyObject } from '@/@core/utils'
import api from '@/api'
import { useToast } from 'vue-toast-notification'
import FormRender from '../render/FormRender.vue'
import ProgressDialog from '../dialog/ProgressDialog.vue'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

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

// 插件配置表单数据
const pluginConfigForm = ref({})

// 插件表单配置项
let pluginFormItems = reactive([])

// 进度框
const progressDialog = ref(false)

// 进度文字
const progressText = ref('')

// 提示框
const $toast = useToast()

// 是否刷新
const isRefreshed = ref(false)

// 渲染模式: 'vuetify' 或 'vue'
const renderMode = ref('vuetify')

//Vue 模式：组件 URL
const vueComponentUrl = ref<string | null>(null)

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
            return { render: () => h('div', '组件加载失败: 无默认导出') }
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

//调用API读取UI和配置数据
async function loadPluginUIData() {
  // 重置
  isRefreshed.value = false
  pluginFormItems = []
  pluginConfigForm.value = {}
  renderMode.value = 'vuetify'
  vueComponentUrl.value = null

  try {
    // 获取UI定义
    const result: { [key: string]: any } = await api.get(`plugin/form/${props.plugin?.id}`)
    if (!result) {
      console.error(`插件 ${props.plugin?.plugin_name} UI数据加载失败：无效的响应`)
      return
    }
    renderMode.value = result.render_mode
    if (renderMode.value === 'vue') {
      // 使用 component_url
      vueComponentUrl.value = result.component_url
      // Vue模式下，初始配置在同一个API返回
      if (!isNullOrEmptyObject(result.model)) {
        pluginConfigForm.value = result.model
      }
      if (!vueComponentUrl.value) {
        console.error(`插件 ${props.plugin?.plugin_name} 配置错误：未提供Vue组件URL`)
      }
    } else {
      // Vuetify模式
      pluginFormItems = result.conf || []
      if (result.model) {
        pluginConfigForm.value = result.model
      }
    }
  } catch (error: any) {
    console.error(error)
  } finally {
    isRefreshed.value = true
  }
}

// 处理 Vue 组件触发的保存事件
function handleVueComponentSave(newConfig: Record<string, any>) {
  pluginConfigForm.value = newConfig
  savePluginConf()
}

// 调用API保存配置数据
async function savePluginConf() {
  // 显示等待提示框
  progressDialog.value = true
  progressText.value = t('dialog.pluginConfig.saving', { name: props.plugin?.plugin_name })
  try {
    const result: { [key: string]: any } = await api.put(`plugin/${props.plugin?.id}`, pluginConfigForm.value)
    if (result.success) {
      $toast.success(t('dialog.pluginConfig.saveSuccess', { name: props.plugin?.plugin_name }))
      // 通知父组件刷新
      emit('save')
    } else {
      $toast.error(t('dialog.pluginConfig.saveFailed', { name: props.plugin?.plugin_name, message: result.message }))
    }
  } catch (error) {
    console.error(error)
  }
  progressDialog.value = false
}

onBeforeMount(async () => {
  await loadPluginUIData()
})
</script>
<template>
  <VDialog scrollable max-width="60rem" :fullscreen="!display.mdAndUp.value">
    <VCard :title="`${props.plugin?.plugin_name} - ${t('dialog.pluginConfig.title')}`" class="rounded-t">
      <VDialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardText v-if="isRefreshed">
        <!-- Vuetify 渲染模式 -->
        <div v-if="renderMode === 'vuetify'">
          <FormRender v-for="(item, index) in pluginFormItems" :key="index" :config="item" :model="pluginConfigForm" />
          <div v-if="!pluginFormItems || pluginFormItems.length === 0">此插件没有可配置项</div>
        </div>
        <!-- Vue 渲染模式 -->
        <div v-else-if="renderMode === 'vue' && dynamicComponent">
          <component :is="dynamicComponent" :initial-config="pluginConfigForm" @save="handleVueComponentSave" />
        </div>
        <!-- 加载中或错误 -->
        <div v-else><VProgressCircular indeterminate /> 加载中...</div>
      </VCardText>
      <VCardActions class="pt-3">
        <VBtn v-if="props.plugin?.has_page" @click="emit('switch')" variant="outlined" color="info">
          {{ t('dialog.pluginConfig.viewData') }}
        </VBtn>
        <VSpacer />
        <!-- 只有Vuetify模式显示默认保存按钮，Vue模式由组件内部控制 -->
        <VBtn
          v-if="renderMode === 'vuetify'"
          @click="savePluginConf"
          variant="elevated"
          prepend-icon="mdi-content-save"
          class="px-5"
        >
          保存
        </VBtn>
      </VCardActions>
    </VCard>
    <!-- 进度框 -->
    <ProgressDialog v-if="progressDialog" v-model="progressDialog" :text="progressText" />
  </VDialog>
</template>
