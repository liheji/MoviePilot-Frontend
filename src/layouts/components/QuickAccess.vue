<script setup lang="ts">
import api from '@/api'
import type { Plugin } from '@/api/types'
import noImage from '@images/logos/plugin.png'
import { useI18n } from 'vue-i18n'
import { useRecentPlugins } from '@/composables/useRecentPlugins'
import PluginDataDialog from '@/components/dialog/PluginDataDialog.vue'

// 国际化
const { t } = useI18n()

// 最近访问插件管理
const { getRecentPlugins, addRecentPlugin } = useRecentPlugins()

// 输入参数
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  pullDistance: {
    type: Number,
    default: 0,
  },
})

// 事件
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'plugin-click', plugin: Plugin): void
}>()

// 有详情页面的插件列表
const pluginsWithPage = ref<Plugin[]>([])

// 最近访问的插件列表
const recentPlugins = ref<Plugin[]>([])

// 是否加载中
const loading = ref(false)

// 各插件的图标加载状态
const pluginIconLoading = ref<Record<string, boolean>>({})

// 上滑关闭相关状态
const isDraggingToClose = ref(false)
const dragOffset = ref(0)

// 插件弹窗相关状态
const showPluginDataDialog = ref(false)
const currentPlugin = ref<Plugin | null>(null)

// 计算显示状态
const isVisible = computed(() => {
  return props.visible // 只基于visible属性显示，不考虑pullDistance
})

// 处理插件图标加载错误
function handleIconError(plugin: Plugin) {
  pluginIconLoading.value[plugin.id] = false
}

// 计算整个组件的transform（包含拖动偏移）
const componentTransform = computed(() => {
  let baseTransform = ''
  if (props.visible) {
    baseTransform = 'translateY(0)'
  } else {
    baseTransform = 'translateY(-100%)' // 完全隐藏在顶部
  }

  // 如果正在拖动关闭，添加拖动偏移
  if (isDraggingToClose.value) {
    return `${baseTransform} translateY(${dragOffset.value}px)`
  }

  return baseTransform
})

// 计算组件透明度（包含拖动透明度变化）
const componentOpacity = computed(() => {
  let baseOpacity = props.visible ? 1 : 0 // 只基于visible属性决定透明度

  // 如果正在拖动关闭，根据拖动距离调整透明度
  if (isDraggingToClose.value) {
    const dragProgress = Math.min(dragOffset.value / 200, 1)
    return baseOpacity * (1 - dragProgress * 0.3)
  }

  return baseOpacity
})

// 计算插件图标路径
function getPluginIcon(plugin: Plugin): string {
  if (!plugin.plugin_icon) return noImage
  if (!pluginIconLoading.value[plugin.id]) return noImage

  // 如果是网络图片则使用代理后返回
  if (plugin?.plugin_icon?.startsWith('http'))
    return `${import.meta.env.VITE_API_BASE_URL}system/img/1?imgurl=${encodeURIComponent(plugin?.plugin_icon)}`

  return `${import.meta.env.VITE_API_BASE_URL}plugin_icon/${plugin?.plugin_icon}`
}

// 获取有详情页面的插件
async function fetchPluginsWithPage() {
  if (loading.value) return

  try {
    loading.value = true
    const allPlugins: Plugin[] = await api.get('plugin/', {
      params: {
        state: 'installed',
      },
    })

    // 只保留有详情页面且已启用的插件
    pluginsWithPage.value = allPlugins
      .filter(plugin => plugin.has_page && plugin.state)
      .sort((a, b) => {
        // 按插件名称排序
        return (a.plugin_name || '').localeCompare(b.plugin_name || '')
      })
  } catch (error) {
    console.error('获取插件列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载最近访问的插件
function loadRecentPlugins() {
  recentPlugins.value = getRecentPlugins()
}

// 点击插件
function handlePluginClick(plugin: Plugin) {
  // 添加到最近访问列表
  addRecentPlugin(plugin)

  // 更新最近访问列表显示
  loadRecentPlugins()

  emit('plugin-click', plugin)

  // 设置当前插件并显示数据弹窗
  currentPlugin.value = plugin
  showPluginDataDialog.value = true
}

// 关闭面板
function handleClose() {
  emit('close')
}

// 关闭插件数据弹窗
function handleClosePluginDataDialog() {
  showPluginDataDialog.value = false
  currentPlugin.value = null
}

// 监听可见性变化，加载数据
watch(
  () => isVisible.value,
  visible => {
    if (visible) {
      fetchPluginsWithPage()
      loadRecentPlugins()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (isVisible.value) {
    fetchPluginsWithPage()
    loadRecentPlugins()
  }
})

// 点击底部空白区域关闭
function handleBackdropClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  // 点击根容器或底部提示区域时关闭
  if (
    target.classList.contains('plugin-quick-access') ||
    target.classList.contains('footer-hint') ||
    target.classList.contains('hint-text') ||
    target.classList.contains('bottom-drag-area')
  ) {
    emit('close')
  }
}
</script>

<template>
  <div
    class="plugin-quick-access"
    :class="{ 'visible': isVisible }"
    :style="{
      opacity: componentOpacity,
      transform: componentTransform,
      transition: isDraggingToClose ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }"
    @click="handleBackdropClick"
  >
    <!-- 顶部指示器 -->
    <div class="top-indicator">
      <div class="indicator-bar"></div>
    </div>

    <!-- 标题栏 -->
    <div class="header">
      <div class="header-title">{{ t('plugin.quickAccess') }}</div>
      <VBtn icon variant="text" size="small" @click="handleClose" class="close-btn">
        <VIcon icon="mdi-close" />
      </VBtn>
    </div>

    <!-- 插件网格 -->
    <div class="plugin-grid">
      <!-- 加载状态 -->
      <LoadingBanner v-if="loading" />

      <!-- 最近访问 -->
      <template v-else>
        <div class="section-header">
          <div class="section-title">{{ t('plugin.recentlyUsed') }}</div>
        </div>

        <div v-if="recentPlugins.length > 0" class="recent-plugins-row">
          <div
            v-for="plugin in recentPlugins"
            :key="`recent-${plugin.id}`"
            class="plugin-item"
            @click="handlePluginClick(plugin)"
          >
            <div class="plugin-icon">
              <VAvatar size="48" class="plugin-avatar">
                <VImg :src="getPluginIcon(plugin)" :alt="plugin.plugin_name" cover @error="handleIconError(plugin)">
                  <template #error>
                    <VIcon icon="mdi-puzzle" size="24" />
                  </template>
                </VImg>
              </VAvatar>
              <!-- 运行状态指示 -->
              <div class="status-dot" :class="{ 'active': plugin.state }"></div>
            </div>
            <div class="plugin-name">{{ plugin.plugin_name }}</div>
          </div>
        </div>

        <!-- 没有最近访问时显示"无" -->
        <div v-else class="no-recent-plugins">
          <div class="no-recent-text">{{ t('plugin.noRecentPlugins') }}</div>
        </div>

        <!-- 所有插件 -->
        <div v-if="pluginsWithPage.length > 0" class="section-header with-margin">
          <div class="section-title">{{ t('plugin.allPlugins') }}</div>
        </div>

        <div v-if="pluginsWithPage.length > 0" class="all-plugins-grid">
          <div
            v-for="plugin in pluginsWithPage"
            :key="plugin.id"
            class="plugin-item"
            @click="handlePluginClick(plugin)"
          >
            <div class="plugin-icon">
              <VAvatar size="48" class="plugin-avatar">
                <VImg :src="getPluginIcon(plugin)" :alt="plugin.plugin_name" cover>
                  <template #error>
                    <VIcon icon="mdi-puzzle" size="24" />
                  </template>
                </VImg>
              </VAvatar>
              <!-- 运行状态指示 -->
              <div class="status-dot" :class="{ 'active': plugin.state }"></div>
            </div>
            <div class="plugin-name">{{ plugin.plugin_name }}</div>
          </div>
        </div>

        <!-- 空状态（只有在没有插件时显示） -->
        <div v-else-if="pluginsWithPage.length === 0" class="empty-state">
          <VIcon icon="mdi-puzzle-outline" size="48" color="grey" />
          <div class="empty-text">{{ t('plugin.noPluginsWithPage') }}</div>
        </div>
      </template>
    </div>

    <!-- 底部拖动区域 -->
    <div class="bottom-drag-area" @click="handleBackdropClick">
      <!-- 底部提示 -->
      <div class="footer-hint">
        <div class="hint-text">{{ t('plugin.tapToOpen') }}</div>
      </div>
    </div>
  </div>

  <!-- 插件数据弹窗 -->
  <PluginDataDialog
    v-if="showPluginDataDialog && currentPlugin"
    v-model="showPluginDataDialog"
    :plugin="currentPlugin"
    @close="handleClosePluginDataDialog"
  />
</template>

<style lang="scss" scoped>
.plugin-quick-access {
  position: fixed;
  z-index: 9999;
  display: flex;
  overflow: hidden; /* 防止整个容器溢出 */
  flex-direction: column;
  backdrop-filter: blur(20px);
  background: rgba(var(--v-theme-surface), 0.95);
  block-size: 100vh;
  block-size: 100dvh;
  inset-block-start: 0;
  inset-inline: 0;
  opacity: 0;
  padding-block: env(safe-area-inset-top) env(safe-area-inset-bottom);
  padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
  pointer-events: none;
  transform: translateY(-100%);
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);

  &.visible {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
}

.top-indicator {
  display: flex;
  justify-content: center;
  padding-block: 12px 8px;
  padding-inline: 0;

  .indicator-bar {
    border-radius: 2px;
    background: rgba(var(--v-theme-on-surface), 0.12);
    block-size: 4px;
    inline-size: 36px;
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-block: 0 20px;
  padding-inline: 20px;

  .header-title {
    color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
    font-size: 20px;
    font-weight: 600;
  }

  .close-btn {
    opacity: 0.6;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.04);
      opacity: 1;
    }
  }
}

.plugin-grid {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-block-size: 0;
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
  padding-block: 24px;
  padding-inline: 20px;
  scroll-behavior: smooth;
  scrollbar-color: rgba(var(--v-theme-on-surface), 0.2) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    inline-size: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: rgba(var(--v-theme-on-surface), 0.2);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(var(--v-theme-on-surface), 0.3);
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  grid-column: 1 / -1;
  padding-block: 40px;
  padding-inline: 0;

  .loading-text {
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    font-size: 14px;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-block: 0 16px;
  margin-inline: 0;

  &.with-margin {
    margin-block-start: 24px;
  }

  .section-title {
    color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
  }
}

.no-recent-plugins {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-block: 16px;
  padding-inline: 0;

  .no-recent-text {
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    font-size: 14px;
  }
}

.recent-plugins-row {
  display: grid;
  gap: 16px;
  grid-auto-rows: 100px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  max-block-size: 220px;
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
  padding-block: 0 8px;
  padding-inline: 0;
  scroll-behavior: smooth;
  scrollbar-color: rgba(var(--v-theme-on-surface), 0.2) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    inline-size: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 2px;
    background: rgba(var(--v-theme-on-surface), 0.2);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(var(--v-theme-on-surface), 0.3);
  }
}

.all-plugins-grid {
  display: grid;
  gap: 20px;
  grid-auto-rows: 100px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}

.plugin-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  block-size: 100px;
  cursor: pointer;
  gap: 6px;
  padding-block: 8px;
  padding-inline: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.04);
    transform: translateY(-2px);
  }

  &:active {
    background: rgba(var(--v-theme-on-surface), 0.08);
    transform: translateY(0);
  }
}

.plugin-icon {
  position: relative;
  display: flex;
  flex-shrink: 0; /* 防止图标被压缩 */
  align-items: center;
  justify-content: center;

  .plugin-avatar {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 10%);
    transition: box-shadow 0.2s ease;

    .plugin-item:hover & {
      box-shadow: 0 2px 6px rgba(0, 0, 0, 15%);
    }
  }

  .status-dot {
    position: absolute;
    z-index: 1;
    border: 2px solid rgba(var(--v-theme-surface), 1);
    border-radius: 50%;
    background: rgba(var(--v-theme-on-surface), 0.3);
    block-size: 12px;
    inline-size: 12px;
    inset-block-start: -2px;
    inset-inline-end: -2px;
    transition: background-color 0.2s ease;

    &.active {
      background: #4caf50;
    }
  }
}

.plugin-name {
  display: -webkit-box;
  overflow: hidden;
  flex-shrink: 0;
  -webkit-box-orient: vertical;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 12px;
  font-weight: 500;
  -webkit-line-clamp: 2;
  line-height: 1.2;
  max-block-size: 2.4em;
  text-align: center;
  word-break: break-all;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  grid-column: 1 / -1;
  padding-block: 40px;
  padding-inline: 0;

  .empty-text {
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    font-size: 14px;
  }
}

.bottom-drag-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;

  /* 增加触摸区域 */
  padding-block: 8px 0;
  padding-inline: 20px;
}

.drag-handle {
  display: flex;
  justify-content: center;
  inline-size: 100%;
  padding-block: 12px;
  padding-inline: 0;
}

.drag-bar {
  border-radius: 3px;
  background: rgba(var(--v-theme-on-surface), 0.3);
  block-size: 5px;
  inline-size: 36px;
  transition: all 0.2s ease;
}

.bottom-drag-area:active .drag-bar {
  background: rgba(var(--v-theme-on-surface), 0.5);
  transform: scaleY(1.2);
}

.footer-hint {
  border-block-start: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  inline-size: 100%;
  padding-block: 16px;
  padding-inline: 0;

  .hint-text {
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    font-size: 14px;
    text-align: center;
  }
}

@media (hover: none) and (pointer: coarse) {
  .plugin-item:hover {
    background: transparent;
    transform: none;
  }

  .plugin-item:active {
    background: rgba(var(--v-theme-on-surface), 0.08);
  }
}

// 深色模式适配
html[data-theme='dark'] .plugin-quick-access {
  background: rgba(var(--v-theme-surface), 0.9);

  .plugin-icon .plugin-avatar {
    border-color: rgba(var(--v-theme-on-surface), 0.2);
  }
}
</style>
