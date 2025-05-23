<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import { useConfirm } from 'vuetify-use-dialog'
import api from '@/api'
import type { Plugin } from '@/api/types'
import { isNullOrEmptyObject } from '@core/utils'
import noImage from '@images/logos/plugin.png'
import { getDominantColor } from '@/@core/utils/image'
import VersionHistory from '@/components/misc/VersionHistory.vue'
import ProgressDialog from '../dialog/ProgressDialog.vue'
import PluginConfigDialog from '../dialog/PluginConfigDialog.vue'
import PluginDataDialog from '../dialog/PluginDataDialog.vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

// 输入参数
const props = defineProps({
  plugin: Object as PropType<Plugin>,
  count: Number, // 下载次数
  action: Boolean, // 动作标识
  width: String,
  height: String,
})

// 定义触发的自定义事件
const emit = defineEmits(['remove', 'save', 'actionDone'])

// 多语言
const { t } = useI18n()

// 响应式显示
const display = useDisplay()

// 背景颜色
const backgroundColor = ref('#28A9E1')

// 图片对象
const imageRef = ref<any>()

// 提示框
const $toast = useToast()

// 确认框
const createConfirm = useConfirm()

// 本身是否可见
const isVisible = ref(true)

// 插件配置页面
const pluginConfigDialog = ref(false)

// 菜单显示状态
const menuVisible = ref(false)

// 进度框
const progressDialog = ref(false)

// 插件数据页面
const pluginInfoDialog = ref(false)

// 进度框文本
const progressText = ref('正在更新插件...')

// 用户头像是否加载完成
const isAvatarLoaded = ref(false)

// 图片是否加载完成
const isImageLoaded = ref(false)

// 图片是否加载失败
const imageLoadError = ref(false)

// 更新日志弹窗
const releaseDialog = ref(false)

// 获取当前插件的标签
const currentPluginLabels = computed(() => {
  if (!props.plugin?.plugin_label) return []
  
  return props.plugin.plugin_label.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
})

// 监听动作标识，如为true则打开详情
watch(
  () => props.action,
  (newAction, oldAction) => {
    if (newAction && !oldAction) {
      openPluginDetail()
      emit('actionDone')
    }
  },
)

// 图片加载完成
async function imageLoaded() {
  isImageLoaded.value = true
  const imageElement = imageRef.value?.$el.querySelector('img') as HTMLImageElement
  // 从图片中提取背景色
  backgroundColor.value = await getDominantColor(imageElement)
}

// 显示更新日志
function showUpdateHistory() {
  // 检查当前版本是否有更新日志
  if (isNullOrEmptyObject(props.plugin?.history)) {
    updatePlugin()
  } else {
    releaseDialog.value = true
  }
}

// 调用API卸载插件
async function uninstallPlugin() {
  const isConfirmed = await createConfirm({
    title: t('common.confirm'),
    content: t('plugin.confirmUninstall', { name: props.plugin?.plugin_name }),
  })

  if (!isConfirmed) return

  try {
    // 显示等待提示框
    progressDialog.value = true
    progressText.value = t('plugin.uninstalling', { name: props.plugin?.plugin_name })
    const result: { [key: string]: any } = await api.delete(`plugin/${props.plugin?.id}`)
    // 隐藏等待提示框
    progressDialog.value = false
    if (result.success) {
      $toast.success(t('plugin.uninstallSuccess', { name: props.plugin?.plugin_name }))

      // 通知父组件刷新
      emit('remove')
    } else {
      $toast.error(t('plugin.uninstallFailed', { name: props.plugin?.plugin_name, message: result.message }))
    }
  } catch (error) {
    console.error(error)
  }
}

// 显示插件数据
async function showPluginInfo() {
  pluginConfigDialog.value = false
  pluginInfoDialog.value = true
}

// 显示插件配置
async function showPluginConfig() {
  // 显示对话框
  pluginInfoDialog.value = false
  pluginConfigDialog.value = true
}

// 计算图标路径
const iconPath: Ref<string> = computed(() => {
  if (imageLoadError.value) return noImage
  // 如果是网络图片则使用代理后返回
  if (props.plugin?.plugin_icon?.startsWith('http'))
    return `${import.meta.env.VITE_API_BASE_URL}system/img/1?imgurl=${encodeURIComponent(props.plugin?.plugin_icon)}`

  return `./plugin_icon/${props.plugin?.plugin_icon}`
})

// 插件作者头像路径
const authorPath: Ref<string> = computed(() => {
  // 网络图片则使用代理后返回
  return `${import.meta.env.VITE_API_BASE_URL}system/img/1?imgurl=${encodeURIComponent(
    props.plugin?.author_url + '.png',
  )}`
})

// 重置插件
async function resetPlugin() {
  const isConfirmed = await createConfirm({
    title: t('common.confirm'),
    content: t('plugin.confirmReset', { name: props.plugin?.plugin_name }),
  })

  if (!isConfirmed) return

  try {
    const result: { [key: string]: any } = await api.get(`plugin/reset/${props.plugin?.id}`)
    if (result.success) {
      $toast.success(t('plugin.resetSuccess', { name: props.plugin?.plugin_name }))
      // 通知父组件刷新
      emit('save')
    } else {
      $toast.error(t('plugin.resetFailed', { name: props.plugin?.plugin_name, message: result.message }))
    }
  } catch (error) {
    console.error(error)
  }
}

// 更新插件
async function updatePlugin() {
  try {
    releaseDialog.value = false
    // 显示等待提示框
    progressDialog.value = true
    progressText.value = t('plugin.updating', { name: props.plugin?.plugin_name })

    const result: { [key: string]: any } = await api.get(`plugin/install/${props.plugin?.id}`, {
      params: {
        repo_url: props.plugin?.repo_url,
        force: true,
      },
    })

    // 隐藏等待提示框
    progressDialog.value = false

    if (result.success) {
      $toast.success(t('plugin.updateSuccess', { name: props.plugin?.plugin_name }))

      // 通知父组件刷新
      emit('save')
    } else {
      $toast.error(t('plugin.updateFailed', { name: props.plugin?.plugin_name, message: result.message }))
    }
  } catch (error) {
    console.error(error)
  }
}

// 访问作者主页
function visitAuthorPage() {
  window.open(props.plugin?.author_url, '_blank')
}

// 查看日志URL
function openLoggerWindow() {
  const url = `${
    import.meta.env.VITE_API_BASE_URL
  }system/logging?length=-1&logfile=plugins/${props.plugin?.id?.toLowerCase()}.log`
  window.open(url, '_blank')
}

// 打开插件详情
function openPluginDetail() {
  if (props.plugin?.has_page) showPluginInfo()
  else showPluginConfig()
}

// 配置完成
function configDone() {
  pluginConfigDialog.value = false
  emit('save')
}

// 弹出菜单
const dropdownItems = ref([
  {
    title: t('plugin.viewData'),
    value: 1,
    show: props.plugin?.has_page,
    props: {
      prependIcon: 'mdi-information-outline',
      click: showPluginInfo,
    },
  },
  {
    title: t('plugin.settings'),
    value: 2,
    show: true,
    props: {
      prependIcon: 'mdi-cog-outline',
      click: showPluginConfig,
    },
  },
  {
    title: t('plugin.update'),
    value: 3,
    show: props.plugin?.has_update,
    props: {
      prependIcon: 'mdi-arrow-up-circle-outline',
      color: 'success',
      click: showUpdateHistory,
    },
  },
  {
    title: t('plugin.reset'),
    value: 4,
    show: true,
    props: {
      prependIcon: 'mdi-cancel',
      color: 'warning',
      click: resetPlugin,
    },
  },
  {
    title: t('plugin.uninstall'),
    value: 5,
    show: true,
    props: {
      prependIcon: 'mdi-trash-can-outline',
      color: 'error',
      click: uninstallPlugin,
    },
  },
  {
    title: t('plugin.viewLogs'),
    value: 6,
    show: true,
    props: {
      prependIcon: 'mdi-file-document-outline',
      click: () => {
        openLoggerWindow()
      },
    },
  },
  {
    title: t('plugin.authorHome'),
    value: 7,
    show: true,
    props: {
      prependIcon: 'mdi-home-circle-outline',
      click: visitAuthorPage,
    },
  },
])

// 监听插件状态变化
watch(
  () => props.plugin?.has_update,
  (newHasUpdate, _) => {
    const updateItemIndex = dropdownItems.value.findIndex(item => item.value === 3)
    if (updateItemIndex !== -1) dropdownItems.value[updateItemIndex].show = newHasUpdate
  },
)

// 监听插件窗口状态变化
watch(
  () => props.plugin?.page_open,
  (newOpenState, _) => {
    if (newOpenState) openPluginDetail()
  },
)
</script>

<template>
  <div>
    <!-- 重新设计的插件卡片 -->
    <VHover>
      <template #default="hover">
        <VCard
          v-if="isVisible"
          v-bind="hover.props"
          :width="props.width"
          :height="props.height"
          @click="openPluginDetail"
          class="plugin-card"
          :class="{
            'plugin-card--mobile': display.mobile,
            'plugin-card--hover': hover.isHovering,
          }"
          variant="elevated"
          :elevation="hover.isHovering ? 16 : 6"
        >
          <!-- 背景渐变层 -->
          <div 
            class="plugin-card__bg"
            :style="`background: linear-gradient(135deg, ${backgroundColor}15 0%, ${backgroundColor}25 100%)`"
          />
          
          <!-- 卡片内容 -->
          <div class="plugin-card__content">
            <!-- 主体内容 -->
            <div class="plugin-card__body">
              <!-- 左侧区域：图标和更新按钮 -->
              <div class="plugin-card__left-section">
                <!-- 插件图标 -->
                <div class="plugin-card__avatar-container">
                  <VAvatar
                    :size="display.mobile ? 40 : 48"
                    class="plugin-card__avatar"
                    variant="elevated"
                  >
                    <VImg
                      ref="imageRef"
                      :src="iconPath"
                      @load="imageLoaded"
                      @error="imageLoadError = true"
                    >
                      <template #placeholder>
                        <VSkeletonLoader type="avatar" />
                      </template>
                    </VImg>
                  </VAvatar>
                  
                  <!-- 拖拽手柄在图标上 -->
                  <VBtn
                    icon="mdi-arrow-all"
                    size="x-small"
                    variant="text"
                    class="cursor-move plugin-card__drag-btn-overlay"
                    :class="{ 'plugin-card__drag-btn-overlay--visible': hover.isHovering }"
                    @click.stop
                  />
                </div>

                <!-- 更新按钮在图标下方 -->
                <VBtn
                  v-if="props.plugin?.has_update"
                  size="x-small"
                  color="warning"
                  variant="elevated"
                  @click.stop="showUpdateHistory"
                  class="plugin-card__update-btn-compact plugin-card__update-btn--blink"
                >
                  <VIcon icon="mdi-arrow-up-circle" size="12" />
                  更新
                </VBtn>
              </div>

              <!-- 右侧信息区域 -->
              <div class="plugin-card__info-section">
                <!-- 标题行 -->
                <div class="plugin-card__title-row">
                  <!-- 启用状态指示器 -->
                  <VIcon 
                    :icon="props.plugin?.state ? 'mdi-check-circle' : 'mdi-pause-circle'"
                    :size="display.mobile ? 14 : 16"
                    :color="props.plugin?.state ? 'success' : 'warning'"
                    class="plugin-card__status-icon"
                  />
                  <h3 class="plugin-card__title">
                    {{ props.plugin?.plugin_name }}
                  </h3>
                  <VChip
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    class="plugin-card__version-chip"
                  >
                    v{{ props.plugin?.plugin_version }}
                  </VChip>
                </div>

                <!-- 描述 -->
                <VTooltip :text="props.plugin?.plugin_desc" location="bottom">
                  <template #activator="{ props: tooltipProps }">
                    <p 
                      class="plugin-card__description"
                      v-bind="tooltipProps"
                    >
                      {{ props.plugin?.plugin_desc }}
                    </p>
                  </template>
                </VTooltip>

                <!-- 插件标签 -->
                <div 
                  v-if="currentPluginLabels.length > 0" 
                  class="plugin-card__tags-section"
                >
                  <VChip
                    v-for="tag in currentPluginLabels"
                    :key="tag"
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    class="plugin-card__tag"
                  >
                    {{ tag }}
                  </VChip>
                </div>
              </div>
            </div>

            <!-- 底部信息栏 -->
            <div class="plugin-card__footer">
              <!-- 作者信息 -->
              <div class="plugin-card__author-info">
                <VAvatar size="18" class="plugin-card__author-avatar">
                  <VImg :src="authorPath" @load="isAvatarLoaded = true">
                    <VIcon v-if="!isAvatarLoaded" icon="mdi-github" size="10" />
                  </VImg>
                </VAvatar>
                <span class="plugin-card__author-name">
                  {{ props.plugin?.plugin_author }}
                </span>
              </div>

              <!-- 统计信息 -->
              <div class="plugin-card__stats-info">
                <div v-if="props.count" class="plugin-card__download-stats">
                  <VIcon icon="mdi-download" size="14" />
                  <span class="plugin-card__stats-text">{{ props.count?.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- 更多菜单按钮 - 右下角 -->
            <div class="plugin-card__menu-section" :class="{ 'plugin-card__menu-section--with-update': props.plugin?.has_update }">
              <VMenu v-model="menuVisible" location="top end" :close-on-content-click="true">
                <template #activator="{ props: menuProps }">
                  <VBtn
                    v-bind="menuProps"
                    icon="mdi-dots-vertical"
                    size="small"
                    variant="text"
                    @click.stop
                    class="plugin-card__menu-btn-corner"
                    :class="{ 'plugin-card__menu-btn-corner--visible': hover.isHovering || display.mobile }"
                  />
                </template>
                <VList>
                  <VListItem
                    v-for="(item, i) in dropdownItems"
                    v-show="item.show"
                    :key="i"
                    :base-color="item.props.color"
                    @click="item.props.click"
                    density="compact"
                  >
                    <template #prepend>
                      <VIcon :icon="item.props.prependIcon" size="16" />
                    </template>
                    <VListItemTitle class="text-body-2">{{ item.title }}</VListItemTitle>
                  </VListItem>
                </VList>
              </VMenu>
            </div>
          </div>
        </VCard>
      </template>
    </VHover>

    <!-- 插件配置页面 -->
    <PluginConfigDialog
      v-if="pluginConfigDialog"
      v-model="pluginConfigDialog"
      :plugin="props.plugin"
      @save="configDone"
      @close="pluginConfigDialog = false"
      @switch="showPluginInfo"
    />

    <!-- 插件数据页面 -->
    <PluginDataDialog
      v-if="pluginInfoDialog"
      v-model="pluginInfoDialog"
      :plugin="props.plugin"
      @close="pluginInfoDialog = false"
      @switch="showPluginConfig"
    />

    <!-- 进度框 -->
    <ProgressDialog v-if="progressDialog" v-model="progressDialog" :text="progressText" />

    <!-- 更新日志 -->
    <VDialog v-if="releaseDialog" v-model="releaseDialog" width="600" max-height="85vh" scrollable>
      <VCard :title="t('plugin.updateHistoryTitle', { name: props.plugin?.plugin_name })">
        <VDialogCloseBtn @click="releaseDialog = false" />
        <VDivider />
        <VersionHistory :history="props.plugin?.history" />
        <VDivider />
        <VCardItem>
          <VBtn @click="updatePlugin" block>
            <template #prepend>
              <VIcon icon="mdi-arrow-up-circle-outline" />
            </template>
            {{ t('plugin.updateToLatest') }}
          </VBtn>
        </VCardItem>
      </VCard>
    </VDialog>
  </div>
</template>

<style lang="scss" scoped>
.plugin-card {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  
  // 降低高度
  height: 170px;
  
  &--mobile {
    border-radius: 12px;
    height: 150px; // 移动端高度
  }
  
  &--hover {
    transform: translateY(-6px);
  }
  
  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
  }
  
  &__content {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px;
    padding-bottom: 12px; // 为右下角按钮留空间
    
    .plugin-card--mobile & {
      padding: 12px;
      padding-bottom: 10px;
    }
  }
  
  &__body {
    display: flex;
    gap: 12px;
    flex: 1;
    align-items: flex-start;
    margin-bottom: 8px;
    
    .plugin-card--mobile & {
      gap: 10px;
      margin-bottom: 6px;
    }
  }
  
  &__left-section {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  
  &__avatar-container {
    position: relative;
  }
  
  &__avatar {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    border: 2px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }
  
  &__drag-btn-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: all 0.3s ease;
    color: rgba(255, 255, 255, 0.9) !important;
    
    &--visible {
      opacity: 0.8;
    }
    
    &:hover {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }
  }
  
  &__update-btn-compact {
    font-size: 0.7rem;
    height: 24px;
    padding: 0 8px;
    min-width: auto;
    border-radius: 4px;
    
    .plugin-card--mobile & {
      font-size: 0.65rem;
      height: 22px;
      padding: 0 6px;
    }
  }
  
  // 更新按钮闪烁效果
  &__update-btn--blink {
    animation: plugin-card-blink 1.5s infinite;
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
  }
  
  @keyframes plugin-card-blink {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.1);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
    }
  }
  
  &__info-section {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px; // 增加间距
    
    .plugin-card--mobile & {
      gap: 8px;
    }
  }
  
  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 0; // 移除额外间距
  }
  
  &__status-icon {
    flex-shrink: 0;
    opacity: 0.9;
    transition: opacity 0.3s ease;
    
    &:hover {
      opacity: 1;
    }
  }
  
  &__title {
    margin: 0;
    font-size: 1.0rem; // 稍微缩小字体
    font-weight: 600;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    
    .plugin-card--mobile & {
      font-size: 0.9rem;
    }
  }
  
  &__version-chip {
    flex-shrink: 0;
    font-size: 0.7rem;
  }
  
  &__description {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.3;
    opacity: 0.8;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    cursor: help;
    min-height: 2.6rem; // 固定最小高度，确保标签位置一致
    
    .plugin-card--mobile & {
      font-size: 0.75rem;
      line-height: 1.25;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      min-height: 2.5rem; // 移动端固定高度
    }
  }
  
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    gap: 8px;
    padding-top: 12px; // 增加上边距
  }
  
  &__author-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }
  
  &__author-avatar {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }
  
  &__author-name {
    font-size: 0.8rem;
    opacity: 0.8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  &__stats-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 36px;
    
    .plugin-card--mobile & {
      margin-right: 32px;
    }
  }
  
  &__download-stats {
    display: flex;
    align-items: center;
    gap: 3px;
    opacity: 0.8;
  }
  
  &__stats-text {
    font-size: 0.8rem;
  }
  
  &__tags-section {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    margin: 0;
    overflow-x: hidden;
    padding-right: 8px;
    min-height: 20px; // 固定最小高度，即使没有标签也占位
    align-items: flex-start; // 标签顶部对齐
    
    .plugin-card--mobile & {
      gap: 4px;
      min-height: 18px;
    }
  }
  
  &__tag {
    font-size: 0.65rem;
    height: 20px; // 缩小高度
    opacity: 0.9;
    font-weight: 500;
    border-radius: 6px;
    transition: all 0.2s ease;
    flex-shrink: 0;
    white-space: nowrap;
    
    .plugin-card--mobile & {
      font-size: 0.6rem;
      height: 18px;
    }
    
    &:hover {
      opacity: 1;
      transform: scale(1.05);
    }
  }
  
  &__menu-section {
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 10;
    
    .plugin-card--mobile & {
      bottom: 6px;
      right: 6px;
    }
  }
  
  &__menu-btn-corner {
    opacity: 0;
    transition: opacity 0.2s ease;
    background: rgba(255, 255, 255, 0.1) !important;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &--visible {
      opacity: 0.9;
    }
    
    &:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.2) !important;
      transform: scale(1.05);
    }
  }
}

// 全局网格布局调整
:global(.grid-plugin-card) {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr; // 移动端单列
    gap: 12px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr; // 小屏幕单列
    gap: 10px;
  }
}
</style>
