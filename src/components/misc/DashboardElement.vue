<script setup lang="ts">
import { DashboardItem } from '@/api/types'
import AnalyticsMediaStatistic from '@/views/dashboard/AnalyticsMediaStatistic.vue'
import AnalyticsScheduler from '@/views/dashboard/AnalyticsScheduler.vue'
import AnalyticsSpeed from '@/views/dashboard/AnalyticsSpeed.vue'
import AnalyticsStorage from '@/views/dashboard/AnalyticsStorage.vue'
import AnalyticsWeeklyOverview from '@/views/dashboard/AnalyticsWeeklyOverview.vue'
import AnalyticsCpu from '@/views/dashboard/AnalyticsCpu.vue'
import AnalyticsMemory from '@/views/dashboard/AnalyticsMemory.vue'
import MediaServerLatest from '@/views/dashboard/MediaServerLatest.vue'
import MediaServerLibrary from '@/views/dashboard/MediaServerLibrary.vue'
import MediaServerPlaying from '@/views/dashboard/MediaServerPlaying.vue'
import DashboardRender from '@/components/render/DashboardRender.vue'
import { isNullOrEmptyObject } from '@/@core/utils'
import api from '@/api'

// 输入参数
const props = defineProps({
  // 仪表板配置
  config: Object as PropType<DashboardItem>,
  // 刷新状态
  refreshStatus: Boolean,
  // 是否允许刷新数据
  allowRefresh: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:refreshStatus'])

// 插件UI渲染模式 ('vuetify' 或 'vue')
const pluginRenderMode = computed(() => props.config?.render_mode || 'vuetify')

// Vue 模式：动态加载的组件
const dynamicPluginComponent = computed(() => {
  // 确保 config 存在并且 component_url 也存在
  if (pluginRenderMode.value === 'vue' && props.config?.component_url) {
    const url = props.config?.component_url
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
            return { render: () => h('div', '组件加载失败: 无默认导出') }
          }
        })
        .catch(err => {
          return { render: () => h('div', '组件加载失败') }
        }),
    )
  }
  return null
})

onUnmounted(() => {
  // 组件卸载时禁用刷新状态
  emit('update:refreshStatus', false)
})
</script>
<template>
  <!-- 系统内置的仪表板 -->
  <AnalyticsStorage v-if="config?.id === 'storage'" />
  <AnalyticsMediaStatistic v-else-if="config?.id === 'mediaStatistic'" />
  <AnalyticsWeeklyOverview v-else-if="config?.id === 'weeklyOverview'" />
  <AnalyticsSpeed v-else-if="config?.id === 'speed'" :allowRefresh="props.allowRefresh" />
  <AnalyticsScheduler v-else-if="config?.id === 'scheduler'" :allowRefresh="props.allowRefresh" />
  <AnalyticsCpu v-else-if="config?.id === 'cpu'" :allowRefresh="props.allowRefresh" />
  <AnalyticsMemory v-else-if="config?.id === 'memory'" :allowRefresh="props.allowRefresh" />
  <MediaServerLibrary v-else-if="config?.id === 'library'" />
  <MediaServerPlaying v-else-if="config?.id === 'playing'" />
  <MediaServerLatest v-else-if="config?.id === 'latest'" />
  <!-- 插件仪表板 -->
  <template v-else-if="!isNullOrEmptyObject(props.config)">
    <!-- Vue 渲染模式 -->
    <div v-if="pluginRenderMode === 'vue' && dynamicPluginComponent">
      <component :is="dynamicPluginComponent" :config="props.config" :allow-refresh="props.allowRefresh" />
      <!-- Vue 模式下也可以显示拖拽句柄 -->
      <div class="absolute right-5 top-5">
        <VIcon class="cursor-move">mdi-drag</VIcon>
      </div>
    </div>
    <!-- Vuetify 渲染模式 -->
    <VHover v-else-if="pluginRenderMode === 'vuetify'">
      <template #default="hover">
        <!-- 无边框 -->
        <div v-if="props.config?.attrs.border === false">
          <VCard v-bind="hover.props">
            <VCardText class="p-0">
              <DashboardRender v-for="(item, index) in props.config?.elements" :key="index" :config="item" />
            </VCardText>
            <div v-if="hover.isHovering" class="absolute right-5 top-5">
              <VIcon class="cursor-move">mdi-drag</VIcon>
            </div>
          </VCard>
        </div>
        <!-- 有边框 -->
        <VCard v-else v-bind="hover.props">
          <VCardItem v-if="props.config?.attrs.border !== false">
            <template #append>
              <VIcon class="cursor-move" v-if="hover.isHovering">mdi-drag</VIcon>
            </template>
            <VCardTitle>
              {{ props.config?.attrs?.title ?? props.config?.name }}
            </VCardTitle>
            <VCardSubtitle v-if="props.config?.attrs?.subtitle"> {{ props.config?.attrs?.subtitle }}</VCardSubtitle>
          </VCardItem>
          <VCardText>
            <DashboardRender v-for="(item, index) in props.config?.elements" :key="index" :config="item" />
          </VCardText>
        </VCard>
      </template>
    </VHover>
    <!-- 未知模式或错误 -->
    <VCard v-else>
      <VCardText>无法渲染插件仪表盘部件: 未知渲染模式或配置错误</VCardText>
    </VCard>
  </template>
</template>
