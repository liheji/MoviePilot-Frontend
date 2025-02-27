<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { Plugin } from '@/api/types'
import { isNullOrEmptyObject } from '@/@core/utils'
import api from '@/api'
import { useToast } from 'vue-toast-notification'
import FormRender from '../render/FormRender.vue'
import ProgressDialog from '../dialog/ProgressDialog.vue'

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

// 调用API读取表单页面
async function loadPluginForm() {
  try {
    const result: { [key: string]: any } = await api.get(`plugin/form/${props.plugin?.id}`)
    if (result) {
      pluginFormItems = result.conf
      if (result.model) pluginConfigForm.value = result.model
    }
  } catch (error) {
    console.error(error)
  }
  isRefreshed.value = true
}

// 调用API读取配置数据
async function loadPluginConf() {
  try {
    const result: { [key: string]: any } = await api.get(`plugin/${props.plugin?.id}`)
    if (!isNullOrEmptyObject(result)) pluginConfigForm.value = result
  } catch (error) {
    console.error(error)
  }
  isRefreshed.value = true
}

// 调用API保存配置数据
async function savePluginConf() {
  // 显示等待提示框
  progressDialog.value = true
  progressText.value = `正在保存 ${props.plugin?.plugin_name} 配置...`
  try {
    const result: { [key: string]: any } = await api.put(`plugin/${props.plugin?.id}`, pluginConfigForm.value)
    if (result.success) {
      progressDialog.value = false
      $toast.success(`插件 ${props.plugin?.plugin_name} 配置已保存`)
      // 通知父组件刷新
      emit('save')
    } else {
      progressDialog.value = false
      $toast.error(`插件 ${props.plugin?.plugin_name} 配置保存失败：${result.message}}`)
    }
  } catch (error) {
    console.error(error)
  }
}

onBeforeMount(async () => {
  await loadPluginForm()
  await loadPluginConf()
})
</script>
<template>
  <VDialog scrollable max-width="60rem" :fullscreen="!display.mdAndUp.value">
    <VCard :title="`${props.plugin?.plugin_name} - 配置`" class="rounded-t">
      <DialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardText v-if="isRefreshed">
        <FormRender v-for="(item, index) in pluginFormItems" :key="index" :config="item" :model="pluginConfigForm" />
      </VCardText>
      <VCardActions class="pt-3">
        <VBtn v-if="props.plugin?.has_page" @click="emit('switch')" variant="outlined" color="info"> 查看数据 </VBtn>
        <VSpacer />
        <VBtn @click="savePluginConf" variant="elevated" prepend-icon="mdi-content-save" class="px-5"> 保存 </VBtn>
      </VCardActions>
    </VCard>
    <!-- 进度框 -->
    <ProgressDialog v-if="progressDialog" v-model="progressDialog" :text="progressText" />
  </VDialog>
</template>
