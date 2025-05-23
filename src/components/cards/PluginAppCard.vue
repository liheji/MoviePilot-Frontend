<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import VersionHistory from '../misc/VersionHistory.vue'
import api from '@/api'
import type { Plugin } from '@/api/types'
import noImage from '@images/logos/plugin.png'
import { getDominantColor } from '@/@core/utils/image'
import { isNullOrEmptyObject } from '@/@core/utils'
import ProgressDialog from '@/components/dialog/ProgressDialog.vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

// 输入参数
const props = defineProps({
  plugin: Object as PropType<Plugin>,
  width: String,
  height: String,
  count: Number,
})

// 定义触发的自定义事件
const emit = defineEmits(['install'])

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

// 进度框
const progressDialog = ref(false)

// 进度框文本
const progressText = ref('正在安装插件...')

// 图片是否加载完成
const isImageLoaded = ref(false)

// 图片是否加载失败
const imageLoadError = ref(false)

// 更新日志弹窗
const releaseDialog = ref(false)

// 插件详情弹窗
const detailDialog = ref(false)

// 用户头像是否加载完成
const isAvatarLoaded = ref(false)

// 菜单显示状态
const menuVisible = ref(false)

// 获取当前插件的标签
const currentPluginLabels = computed(() => {
  if (!props.plugin?.plugin_label) return []
  
  return props.plugin.plugin_label.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
})

// 图片加载完成
async function imageLoaded() {
  isImageLoaded.value = true
  const imageElement = imageRef.value?.$el.querySelector('img') as HTMLImageElement
  // 从图片中提取背景色
  backgroundColor.value = await getDominantColor(imageElement)
}

// 安装插件
async function installPlugin() {
  try {
    // 显示等待提示框
    progressDialog.value = true
    progressText.value = t('plugin.installing', {
      name: props.plugin?.plugin_name,
      version: props?.plugin?.plugin_version,
    })

    const result: { [key: string]: any } = await api.get(`plugin/install/${props.plugin?.id}`, {
      params: {
        repo_url: props.plugin?.repo_url,
        force: props.plugin?.has_update,
      },
    })

    // 隐藏等待提示框
    progressDialog.value = false

    if (result.success) {
      $toast.success(t('plugin.installSuccess', { name: props.plugin?.plugin_name }))
      detailDialog.value = false
      // 通知父组件刷新
      emit('install')
    } else {
      $toast.error(t('plugin.installFailed', { name: props.plugin?.plugin_name, message: result.message }))
    }
  } catch (error) {
    console.error(error)
  }
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

// 访问插件页面
function visitPluginPage() {
  // 将raw.githubusercontent.com转换为项目地址
  let repoUrl = props.plugin?.repo_url
  if (repoUrl) {
    if (repoUrl.includes('raw.githubusercontent.com')) {
      if (!repoUrl.endsWith('/')) repoUrl += '/'

      if (repoUrl.split('/').length < 6) repoUrl = `${repoUrl}main/`

      try {
        const [user, repo] = repoUrl.split('/').slice(-4, -2)
        repoUrl = `https://github.com/${user}/${repo}`
      } catch (error) {
        return
      }
    }
  } else {
    repoUrl = props.plugin?.author_url
  }
  window.open(repoUrl, '_blank')
}

// 显示更新日志
function showUpdateHistory() {
  releaseDialog.value = true
}

// 弹出菜单
const dropdownItems = ref([
  {
    title: t('plugin.projectHome'),
    value: 1,
    show: true,
    props: {
      prependIcon: 'mdi-github',
      click: visitPluginPage,
    },
  },
  {
    title: t('plugin.updateHistory'),
    value: 2,
    show: !isNullOrEmptyObject(props.plugin?.history || {}),
    props: {
      prependIcon: 'mdi-update',
      click: showUpdateHistory,
    },
  },
])
</script>

<template>
  <div>
    <!-- 重新设计的插件卡片 -->
    <VHover>
      <template #default="hover">
        <VCard
          v-bind="hover.props"
          :width="props.width"
          :height="props.height"
          @click="detailDialog = true"
          class="plugin-app-card"
          :class="{
            'plugin-app-card--mobile': display.mobile,
            'plugin-app-card--hover': hover.isHovering,
          }"
          variant="elevated"
          :elevation="hover.isHovering ? 16 : 6"
        >
          <!-- 背景渐变层 -->
          <div 
            class="plugin-app-card__bg"
            :style="`background: linear-gradient(135deg, ${backgroundColor}15 0%, ${backgroundColor}25 100%)`"
          />
          
          <!-- 卡片内容 -->
          <div class="plugin-app-card__content">
            <!-- 主体内容 -->
            <div class="plugin-app-card__body">
              <!-- 左侧区域：图标和安装按钮 -->
              <div class="plugin-app-card__left-section">
                <!-- 插件图标 -->
                <div class="plugin-app-card__avatar-container">
                  <VAvatar
                    :size="display.mobile ? 40 : 48"
                    class="plugin-app-card__avatar"
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
                </div>

                <!-- 安装按钮在图标下方 -->
                <VBtn
                  size="x-small"
                  color="primary"
                  variant="elevated"
                  @click.stop="installPlugin"
                  class="plugin-app-card__install-btn-compact"
                >
                  <VIcon icon="mdi-download" size="12" />
                  安装
                </VBtn>
              </div>

              <!-- 右侧信息区域 -->
              <div class="plugin-app-card__info-section">
                <!-- 标题行 -->
                <div class="plugin-app-card__title-row">
                  <h3 class="plugin-app-card__title">
                    {{ props.plugin?.plugin_name }}
                  </h3>
                  <VChip
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    class="plugin-app-card__version-chip"
                  >
                    v{{ props.plugin?.plugin_version }}
                  </VChip>
                </div>

                <!-- 描述 -->
                <VTooltip :text="props.plugin?.plugin_desc" location="bottom">
                  <template #activator="{ props: tooltipProps }">
                    <p 
                      class="plugin-app-card__description"
                      v-bind="tooltipProps"
                    >
                      {{ props.plugin?.plugin_desc }}
                    </p>
                  </template>
                </VTooltip>

                <!-- 插件标签 -->
                <div 
                  v-if="currentPluginLabels.length > 0" 
                  class="plugin-app-card__tags-section"
                >
                  <VChip
                    v-for="tag in currentPluginLabels"
                    :key="tag"
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    class="plugin-app-card__tag"
                  >
                    {{ tag }}
                  </VChip>
                </div>
              </div>
            </div>

            <!-- 底部信息栏 -->
            <div class="plugin-app-card__footer">
              <!-- 作者信息 -->
              <div class="plugin-app-card__author-info">
                <VAvatar size="18" class="plugin-app-card__author-avatar">
                  <VImg :src="authorPath" @load="isAvatarLoaded = true">
                    <VIcon v-if="!isAvatarLoaded" icon="mdi-github" size="10" />
                  </VImg>
                </VAvatar>
                <span class="plugin-app-card__author-name">
                  {{ props.plugin?.plugin_author }}
                </span>
              </div>

              <!-- 统计信息 -->
              <div class="plugin-app-card__stats-info">
                <div v-if="props.count" class="plugin-app-card__download-stats">
                  <VIcon icon="mdi-download" size="14" />
                  <span class="plugin-app-card__stats-text">{{ props.count?.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- 更多菜单按钮 - 右下角 -->
            <div class="plugin-app-card__menu-section">
              <VMenu v-model="menuVisible" location="top end" :close-on-content-click="true">
                <template #activator="{ props: menuProps }">
                  <VBtn
                    v-bind="menuProps"
                    icon="mdi-dots-vertical"
                    size="small"
                    variant="text"
                    @click.stop
                    class="plugin-app-card__menu-btn-corner"
                    :class="{ 'plugin-app-card__menu-btn-corner--visible': hover.isHovering || display.mobile }"
                  />
                </template>
                <VList>
                  <VListItem
                    v-for="(item, i) in dropdownItems"
                    v-show="item.show"
                    :key="i"
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

    <!-- 安装插件进度框 -->
    <ProgressDialog v-if="progressDialog" v-model="progressDialog" :text="progressText" />
    
    <!-- 更新日志 -->
    <VDialog v-if="releaseDialog" v-model="releaseDialog" width="600" max-height="85vh" scrollable>
      <VCard :title="t('plugin.updateHistoryTitle', { name: props.plugin?.plugin_name })">
        <VDialogCloseBtn @click="releaseDialog = false" />
        <VDivider />
        <VersionHistory :history="props.plugin?.history" />
      </VCard>
    </VDialog>
    
    <!-- 插件详情-->
    <VDialog v-if="detailDialog" v-model="detailDialog" max-width="30rem">
      <VCard>
        <VDialogCloseBtn @click="detailDialog = false" />
        <VCardText>
          <VCol>
            <div class="d-flex justify-space-between flex-wrap flex-md-nowrap flex-column flex-md-row">
              <div class="mx-auto mt-5">
                <VAvatar size="64">
                  <VImg
                    ref="imageRef"
                    :src="iconPath"
                    aspect-ratio="4/3"
                    cover
                    @load="imageLoaded"
                    @error="imageLoadError = true"
                  />
                </VAvatar>
              </div>
              <div class="flex-grow">
                <VCardItem>
                  <VCardTitle class="text-center text-md-left">
                    {{ props.plugin?.plugin_name }}
                  </VCardTitle>
                  <VCardSubtitle
                    class="text-center text-md-left break-words whitespace-break-spaces line-clamp-4 overflow-hidden text-ellipsis ..."
                  >
                    {{ props.plugin?.plugin_desc }}
                  </VCardSubtitle>
                  <VList lines="one">
                    <VListItem class="ps-0">
                      <VListItemTitle class="text-center text-md-left">
                        <span class="font-weight-medium">{{ t('common.version') }}：</span>
                        <span class="text-body-1"> v{{ props.plugin?.plugin_version }}</span>
                      </VListItemTitle>
                    </VListItem>
                    <VListItem class="ps-0">
                      <VListItemTitle class="text-center text-md-left">
                        <span class="font-weight-medium">{{ t('common.author') }}：</span>
                        <span class="text-body-1 cursor-pointer" @click="visitPluginPage">
                          {{ props.plugin?.plugin_author }}
                        </span>
                      </VListItemTitle>
                    </VListItem>
                  </VList>
                  <div class="text-center text-md-left">
                    <VBtn color="primary" @click="installPlugin" prepend-icon="mdi-download">{{
                      t('plugin.installToLocal')
                    }}</VBtn>
                    <div class="text-xs mt-2" v-if="props.count">
                      <VIcon icon="mdi-fire" />{{
                        t('plugin.totalDownloads', { count: props.count?.toLocaleString() })
                      }}
                    </div>
                  </div>
                </VCardItem>
              </div>
            </div>
          </VCol>
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>

<style lang="scss" scoped>
.plugin-app-card {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  
  // 与PluginCard相同的高度
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
    
    .plugin-app-card--mobile & {
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
    
    .plugin-app-card--mobile & {
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
  
  &__install-btn-compact {
    font-size: 0.7rem;
    height: 24px;
    padding: 0 8px;
    min-width: auto;
    border-radius: 4px;
    
    .plugin-app-card--mobile & {
      font-size: 0.65rem;
      height: 22px;
      padding: 0 6px;
    }
  }
  
  &__info-section {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px; // 增加间距
    
    .plugin-app-card--mobile & {
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
    
    .plugin-app-card--mobile & {
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
    
    .plugin-app-card--mobile & {
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
    
    .plugin-app-card--mobile & {
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
    
    .plugin-app-card--mobile & {
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
    
    .plugin-app-card--mobile & {
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
    
    .plugin-app-card--mobile & {
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
