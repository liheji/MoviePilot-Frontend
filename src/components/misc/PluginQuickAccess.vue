<script setup lang="ts">
import { useRouter } from 'vue-router'
import api from '@/api'
import type { Plugin } from '@/api/types'
import noImage from '@images/logos/plugin.png'
import { useI18n } from 'vue-i18n'
import { useRecentPlugins } from '@/composables/useRecentPlugins'

// 国际化
const { t } = useI18n()

// 路由
const router = useRouter()

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

// 上滑关闭相关状态
const swipeStartY = ref(0)
const isDraggingToClose = ref(false)
const dragOffset = ref(0)

// 计算显示状态
const isVisible = computed(() => {
  return props.visible // 只基于visible属性显示，不考虑pullDistance
})

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
  // 跳转到插件页面并自动打开详情
  router.push({
    path: '/plugins',
    query: {
      tab: 'installed',
      id: plugin.id,
    },
  })
}

// 关闭面板
function handleClose() {
  emit('close')
}

// 监听可见性变化，加载数据
watch(
  () => isVisible.value,
  visible => {
    if (visible) {
      if (pluginsWithPage.value.length === 0) {
        fetchPluginsWithPage()
      }
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
</template>

<style lang="scss" scoped>
.plugin-quick-access {
  position: fixed;
  z-index: 9999; /* 提高z-index确保在最上层 */
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(20px);
  background: rgba(var(--v-theme-surface), 0.95);
  block-size: 100vh;
  block-size: 100dvh; /* 使用动态视口高度，支持移动端 */
  inset-block-start: 0;
  inset-inline: 0;
  opacity: 0;
  padding-block: env(safe-area-inset-top) env(safe-area-inset-bottom);
  padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
  pointer-events: none; /* 隐藏时不阻挡点击 */
  transform: translateY(-100%);
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);

  &.visible {
    opacity: 1;
    pointer-events: auto; /* 显示时恢复点击 */
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

  /* 优化滚动体验 */
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
  padding-block: 24px;
  padding-inline: 20px;
  scroll-behavior: smooth;
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
  display: flex;
  gap: 16px;
  -webkit-overflow-scrolling: touch;
  -ms-overflow-style: none;
  overflow-x: auto;
  padding-block: 0 8px;
  padding-inline: 0;
  scroll-behavior: smooth;

  /* 隐藏滚动条但保持功能 */
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.all-plugins-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}

.plugin-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 12px;
  cursor: pointer;
  gap: 8px;
  padding-block: 12px;
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

.recent-plugins-row .plugin-item {
  flex-shrink: 0;
  min-inline-size: 80px;
}

.plugin-icon {
  position: relative;

  .plugin-avatar {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 10%);
    transition: box-shadow 0.2s ease;

    .plugin-item:hover & {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 15%);
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
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
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

  /* 增加可触摸区域 */
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

/* 优化触摸体验 */
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
