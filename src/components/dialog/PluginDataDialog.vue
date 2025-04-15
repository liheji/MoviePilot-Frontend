<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { Plugin } from '@/api/types'
import PageRender from '@/components/render/PageRender.vue'
import api from '@/api'

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

// 插件数据页面配置项
let pluginPageItems = ref([])

// 调用API读取数据页面
async function loadPluginPage() {
  try {
    const result: [] = await api.get(`plugin/page/${props.plugin?.id}`)
    if (result) pluginPageItems.value = result
  } catch (error) {
    console.error(error)
  }
  isRefreshed.value = true
}

onMounted(() => {
  loadPluginPage()
})
</script>
<template>
  <VDialog scrollable max-width="80rem" :fullscreen="!display.mdAndUp.value">
    <VCard :title="`${props.plugin?.plugin_name}`" class="rounded-t">
      <VDialogCloseBtn @click="emit('close')" />
      <LoadingBanner v-if="!isRefreshed" class="mt-5" />
      <VCardText v-else class="min-h-40">
        <PageRender @action="loadPluginPage" v-for="(item, index) in pluginPageItems" :key="index" :config="item" />
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
