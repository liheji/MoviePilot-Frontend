<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import { useConfirm } from 'vuetify-use-dialog'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import api from '@/api'

// 文件夹配置接口
interface FolderConfig {
  plugins?: string[]
  order?: number
  background?: string
  icon?: string
  color?: string
  gradient?: string
  showIcon?: boolean
}

// 输入参数
const props = defineProps({
  folderName: String,
  pluginCount: Number,
  folderConfig: {
    type: Object as PropType<FolderConfig>,
    default: () => ({})
  },
  width: String,
  height: String,
})

// 定义触发的自定义事件
const emit = defineEmits(['open', 'delete', 'rename', 'update-config'])

// 多语言
const { t } = useI18n()

// 响应式显示
const display = useDisplay()

// 提示框
const $toast = useToast()

// 确认框
const createConfirm = useConfirm()

// 菜单显示状态
const menuVisible = ref(false)

// 重命名对话框
const renameDialog = ref(false)

// 设置对话框
const settingDialog = ref(false)

// 新名称
const newFolderName = ref('')

// 文件夹设置
const folderSettings = ref<FolderConfig>({
  background: '',
  icon: 'mdi-folder',
  color: '#2196F3',
  gradient: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.15) 100%)',
  showIcon: true,
})

// 预设图标选项
const iconOptions = [
  'mdi-folder',
  'mdi-folder-star',
  'mdi-folder-heart',
  'mdi-folder-cog',
  'mdi-folder-music',
  'mdi-folder-image',
  'mdi-folder-video',
  'mdi-folder-download',
  'mdi-folder-network',
  'mdi-folder-special',
]

// 预设颜色选项
const colorOptions = [
  '#2196F3', // 蓝色
  '#4CAF50', // 绿色
  '#FF9800', // 橙色
  '#9C27B0', // 紫色
  '#F44336', // 红色
  '#607D8B', // 蓝灰色
  '#795548', // 棕色
  '#E91E63', // 粉色
]

// 预设渐变选项
const gradientOptions = [
  'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.15) 100%)',
  'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.15) 100%)',
  'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.15) 100%)',
  'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(156, 39, 176, 0.15) 100%)',
  'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.15) 100%)',
  'linear-gradient(135deg, rgba(96, 125, 139, 0.1) 0%, rgba(96, 125, 139, 0.15) 100%)',
  'linear-gradient(135deg, rgba(233, 30, 99, 0.1) 0%, rgba(233, 30, 99, 0.15) 100%)',
  'linear-gradient(135deg, rgba(63, 81, 181, 0.1) 0%, rgba(156, 39, 176, 0.15) 100%)',
]

// 计算文件夹样式
const folderStyle = computed(() => {
  const config = props.folderConfig || {}
  const settings = folderSettings.value
  
  let style = {}
  
  // 背景图片
  if (config.background || settings.background) {
    const bg = config.background || settings.background
    if (bg.startsWith('http')) {
      style = {
        ...style,
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }
  }
  
  return style
})

// 计算背景渐变
const backgroundGradient = computed(() => {
  const config = props.folderConfig || {}
  const settings = folderSettings.value
  
  return config.gradient || settings.gradient || gradientOptions[0]
})

// 计算图标
const folderIcon = computed(() => {
  const config = props.folderConfig || {}
  const settings = folderSettings.value
  
  return config.icon || settings.icon || 'mdi-folder'
})

// 计算图标颜色
const iconColor = computed(() => {
  const config = props.folderConfig || {}
  const settings = folderSettings.value
  
  return config.color || settings.color || '#2196F3'
})

// 计算是否显示图标
const shouldShowIcon = computed(() => {
  const config = props.folderConfig || {}
  const settings = folderSettings.value
  
  return config.showIcon !== undefined ? config.showIcon : (settings.showIcon !== undefined ? settings.showIcon : true)
})

// 监听props变化，更新本地设置
watch(() => props.folderConfig, (newConfig) => {
  if (newConfig) {
    folderSettings.value = {
      ...folderSettings.value,
      ...newConfig,
    }
  }
}, { deep: true, immediate: true })

// 打开文件夹
function openFolder() {
  emit('open', props.folderName)
}

// 重命名文件夹
function showRenameDialog() {
  newFolderName.value = props.folderName || ''
  renameDialog.value = true
}

// 确认重命名
async function confirmRename() {
  if (!newFolderName.value.trim()) {
    $toast.error('文件夹名称不能为空')
    return
  }
  
  if (newFolderName.value === props.folderName) {
    renameDialog.value = false
    return
  }
  
  try {
    emit('rename', props.folderName, newFolderName.value)
    renameDialog.value = false
  } catch (error) {
    console.error(error)
  }
}

// 删除文件夹
async function deleteFolder() {
  const isConfirmed = await createConfirm({
    title: t('common.confirm'),
    content: `确定要删除文件夹 "${props.folderName}" 吗？文件夹中的插件将移回主列表。`,
  })

  if (!isConfirmed) return

  try {
    emit('delete', props.folderName)
  } catch (error) {
    console.error(error)
  }
}

// 显示设置对话框
function showSettingDialog() {
  folderSettings.value = {
    background: props.folderConfig?.background || '',
    icon: props.folderConfig?.icon || 'mdi-folder',
    color: props.folderConfig?.color || '#2196F3',
    gradient: props.folderConfig?.gradient || gradientOptions[0],
    showIcon: props.folderConfig?.showIcon !== undefined ? props.folderConfig.showIcon : true,
  }
  settingDialog.value = true
}

// 保存设置
function saveSettings() {
  const config = {
    ...props.folderConfig,
    ...folderSettings.value,
  }
  
  emit('update-config', props.folderName, config)
  settingDialog.value = false
  $toast.success('文件夹设置已保存')
}

// 弹出菜单
const dropdownItems = ref([
  {
    title: '设置外观',
    value: 0,
    show: true,
    props: {
      prependIcon: 'mdi-palette',
      click: showSettingDialog,
    },
  },
  {
    title: '重命名',
    value: 1,
    show: true,
    props: {
      prependIcon: 'mdi-pencil',
      click: showRenameDialog,
    },
  },
  {
    title: '删除文件夹',
    value: 2,
    show: true,
    props: {
      prependIcon: 'mdi-delete',
      color: 'error',
      click: deleteFolder,
    },
  },
])
</script>

<template>
  <div>
    <!-- 文件夹卡片 -->
    <VHover>
      <template #default="hover">
        <VCard
          v-bind="hover.props"
          :width="props.width"
          :height="props.height"
          @click="openFolder"
          class="plugin-folder-card cursor-move"
          :class="{
            'plugin-folder-card--mobile': display.mobile,
            'plugin-folder-card--hover': hover.isHovering,
          }"
          variant="elevated"
          :elevation="hover.isHovering ? 16 : 6"
          :style="folderStyle"
        >
          <!-- 背景渐变层 -->
          <div class="plugin-folder-card__bg" :style="{ background: backgroundGradient }" />
          
          <!-- 背景遮罩（当有背景图片时） -->
          <div v-if="folderStyle.backgroundImage" class="plugin-folder-card__overlay" />
          
          <!-- 卡片内容 -->
          <div class="plugin-folder-card__content">
            <!-- 主体内容 -->
            <div class="plugin-folder-card__body" :class="{ 'plugin-folder-card__body--no-icon': !shouldShowIcon }">
              <!-- 文件夹图标 -->
              <div v-if="shouldShowIcon" class="plugin-folder-card__icon-container">
                <VIcon 
                  :icon="folderIcon" 
                  :size="display.mobile ? 56 : 72"
                  class="plugin-folder-card__folder-icon"
                  :color="iconColor"
                />
              </div>

              <!-- 文件夹信息 -->
              <div class="plugin-folder-card__info" :class="{ 'plugin-folder-card__info--no-icon': !shouldShowIcon }">
                <!-- 文件夹名称 -->
                <h3 class="plugin-folder-card__name">
                  {{ props.folderName }}
                </h3>
                <!-- 插件数量 -->
                <p class="plugin-folder-card__count">
                  {{ props.pluginCount }} 个插件
                </p>
              </div>
            </div>

            <!-- 更多菜单按钮 - 右下角 -->
            <div class="plugin-folder-card__menu-section">
              <VMenu v-model="menuVisible" location="top end" :close-on-content-click="true">
                <template #activator="{ props: menuProps }">
                  <VBtn
                    v-bind="menuProps"
                    icon="mdi-dots-vertical"
                    size="small"
                    variant="text"
                    @click.stop
                    class="plugin-folder-card__menu-btn-corner"
                    :class="{ 'plugin-folder-card__menu-btn-corner--visible': hover.isHovering || display.mobile }"
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

    <!-- 重命名对话框 -->
    <VDialog v-if="renameDialog" v-model="renameDialog" max-width="400">
      <VCard>
        <VCardTitle>重命名文件夹</VCardTitle>
        <VCardText>
          <VTextField
            v-model="newFolderName"
            label="文件夹名称"
            variant="outlined"
            autofocus
            @keyup.enter="confirmRename"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="renameDialog = false">取消</VBtn>
          <VBtn color="primary" @click="confirmRename">确认</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 设置对话框 -->
    <VDialog v-if="settingDialog" v-model="settingDialog" max-width="600">
      <VCard>
        <VCardTitle>
          <VIcon icon="mdi-palette" class="mr-2" />
          文件夹外观设置
        </VCardTitle>
        <VCardText>
          <VRow>
            <!-- 显示图标开关 -->
            <VCol cols="12">
              <VSwitch
                v-model="folderSettings.showIcon"
                label="显示文件夹图标"
                color="primary"
                hide-details
              />
            </VCol>
            
            <!-- 图标选择 -->
            <VCol v-if="folderSettings.showIcon" cols="12" md="6">
              <VCardSubtitle class="pa-0 mb-2">图标</VCardSubtitle>
              <div class="icon-grid">
                <VBtn
                  v-for="icon in iconOptions"
                  :key="icon"
                  :variant="folderSettings.icon === icon ? 'tonal' : 'text'"
                  :color="folderSettings.icon === icon ? 'primary' : 'default'"
                  size="large"
                  class="ma-1"
                  @click="folderSettings.icon = icon"
                >
                  <VIcon :icon="icon" size="24" />
                </VBtn>
              </div>
            </VCol>
            
            <!-- 颜色选择 -->
            <VCol v-if="folderSettings.showIcon" cols="12" md="6">
              <VCardSubtitle class="pa-0 mb-2">图标颜色</VCardSubtitle>
              <div class="color-grid">
                <VBtn
                  v-for="color in colorOptions"
                  :key="color"
                  :variant="folderSettings.color === color ? 'tonal' : 'text'"
                  :color="color"
                  size="large"
                  class="ma-1 color-btn"
                  :style="{ backgroundColor: color }"
                  @click="folderSettings.color = color"
                >
                  <VIcon v-if="folderSettings.color === color" icon="mdi-check" color="white" />
                </VBtn>
              </div>
            </VCol>
            
            <!-- 渐变背景选择 -->
            <VCol cols="12">
              <VCardSubtitle class="pa-0 mb-2">背景渐变</VCardSubtitle>
              <div class="gradient-grid">
                <VBtn
                  v-for="(gradient, index) in gradientOptions"
                  :key="index"
                  :variant="folderSettings.gradient === gradient ? 'tonal' : 'text'"
                  class="ma-1 gradient-btn"
                  :style="{ background: gradient }"
                  size="large"
                  @click="folderSettings.gradient = gradient"
                >
                  <VIcon v-if="folderSettings.gradient === gradient" icon="mdi-check" color="white" />
                </VBtn>
              </div>
            </VCol>
            
            <!-- 自定义背景图片 -->
            <VCol cols="12">
              <VTextField
                v-model="folderSettings.background"
                label="自定义背景图片URL（可选）"
                placeholder="https://example.com/image.jpg"
                variant="outlined"
                hint="支持网络图片URL，留空则使用渐变背景"
                persistent-hint
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="settingDialog = false">取消</VBtn>
          <VBtn color="primary" @click="saveSettings">保存</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style lang="scss" scoped>
.plugin-folder-card {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  
  // 与插件卡片相同的高度
  height: 170px;
  
  &--mobile {
    border-radius: 12px;
    height: 150px;
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
  
  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    background: rgba(0, 0, 0, 0.2);
  }
  
  &__content {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px;
    padding-bottom: 12px;
    
    .plugin-folder-card--mobile & {
      padding: 12px;
      padding-bottom: 10px;
    }
  }
  
  &__body {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    flex: 1;
    gap: 16px;
    padding: 0 8px;
    
    .plugin-folder-card--mobile & {
      gap: 12px;
      padding: 0 4px;
    }
    
    &--no-icon {
      justify-content: flex-start;
      align-items: flex-start;
      padding: 16px;
      gap: 0;
      
      .plugin-folder-card--mobile & {
        padding: 12px;
        gap: 0;
      }
    }
  }
  
  &__icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  &__folder-icon {
    transition: all 0.3s ease;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    
    .plugin-folder-card--hover & {
      transform: scale(1.05);
    }
  }
  
  &__info {
    text-align: left;
    min-height: 0;
    flex: 1;
    
    &--no-icon {
      text-align: left;
      flex: none;
    }
  }
  
  &__name {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    max-width: none;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    
    .plugin-folder-card--mobile & {
      font-size: 1.0rem;
    }
    
    .plugin-folder-card__info--no-icon & {
      font-size: 1.3rem;
      font-weight: 700;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      margin-bottom: 4px;
      
      .plugin-folder-card--mobile & {
        font-size: 1.2rem;
      }
    }
  }
  
  &__count {
    margin: 2px 0 0 0;
    font-size: 0.85rem;
    opacity: 0.9;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    
    .plugin-folder-card--mobile & {
      font-size: 0.8rem;
    }
    
    .plugin-folder-card__info--no-icon & {
      margin-top: 0;
      font-size: 0.9rem;
      
      .plugin-folder-card--mobile & {
        font-size: 0.85rem;
      }
    }
  }
  
  &__menu-section {
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 10;
    
    .plugin-folder-card--mobile & {
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

// 设置对话框样式
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
}

.gradient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.color-btn {
  min-width: 60px !important;
  height: 60px !important;
  border-radius: 8px !important;
}

.gradient-btn {
  min-width: 120px !important;
  height: 60px !important;
  border-radius: 8px !important;
}
</style> 