<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { Plugin } from '@/api/types'
import { isNullOrEmptyObject } from '@/@core/utils'
import api from '@/api'
import { useToast } from 'vue-toast-notification'
import FormRender from '../render/FormRender.vue'
import ProgressDialog from '../dialog/ProgressDialog.vue'
import { useI18n } from 'vue-i18n'
import { defineAsyncComponent } from 'vue'
import { loadRemoteComponent, clearRemoteComponentCache, ComponentType } from '@/utils/federationLoader'

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

// 挂载状态
const componentMounted = ref(false)

// Vue 模式：动态加载的组件
const dynamicComponent = defineAsyncComponent({
  loader: async () => {
    if (renderMode.value !== 'vue' || !props.plugin?.id) {
      return { render: () => null }
    }

    try {
      // 加载配置组件
      componentMounted.value = false
      const component = await loadRemoteComponent(props.plugin.id, ComponentType.CONFIG)
      componentMounted.value = true

      if (!component) {
        throw new Error('组件加载失败')
      }

      return component
    } catch (error: any) {
      console.error(`加载插件配置组件失败: ${props.plugin.id}`, error)
      return {
        render: () => h('div', { class: 'text-error pa-4' }, `加载失败: ${error.message || '未知错误'}`),
      }
    }
  },
  loadingComponent: {
    render: () =>
      h('div', { class: 'text-center pa-4' }, [
        h('VProgressCircular', { indeterminate: true, class: 'mr-2' }),
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

//调用API读取UI和配置数据
async function loadPluginUIData() {
  // 重置
  isRefreshed.value = false
  pluginFormItems = []
  pluginConfigForm.value = {}
  renderMode.value = 'vuetify'

  // 清除组件缓存
  if (props.plugin?.id) {
    clearRemoteComponentCache(props.plugin.id)
  }

  try {
    // 获取UI定义
    const result: { [key: string]: any } = await api.get(`plugin/form/${props.plugin?.id}`)
    if (!result) {
      console.error(`插件 ${props.plugin?.plugin_name} UI数据加载失败：无效的响应`)
      return
    }
    renderMode.value = result.render_mode
    if (renderMode.value === 'vue') {
      // Vue模式下，初始配置在同一个API返回
      if (!isNullOrEmptyObject(result.model)) {
        pluginConfigForm.value = result.model
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

// 组件卸载时清理资源
onUnmounted(() => {
  if (props.plugin?.id) {
    clearRemoteComponentCache(props.plugin.id, ComponentType.CONFIG)
  }
})
</script>
<template>
  <VDialog scrollable max-width="60rem" :fullscreen="!display.mdAndUp.value">
    <VCard :title="`${props.plugin?.plugin_name} - ${t('dialog.pluginConfig.title')}`" class="rounded-t">
      <VDialogCloseBtn @click="emit('close')" />
      <VDivider />
      <LoadingBanner v-if="!isRefreshed" class="mt-5" />
      <VCardText v-else="isRefreshed">
        <!-- Vuetify 渲染模式 -->
        <div v-if="renderMode === 'vuetify'">
          <FormRender v-for="(item, index) in pluginFormItems" :key="index" :config="item" :model="pluginConfigForm" />
          <div v-if="!pluginFormItems || pluginFormItems.length === 0">此插件没有可配置项</div>
        </div>
        <!-- Vue 渲染模式 -->
        <div v-else-if="renderMode === 'vue'">
          <component :is="dynamicComponent" :initial-config="pluginConfigForm" @save="handleVueComponentSave" />
        </div>
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
