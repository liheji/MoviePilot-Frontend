<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import { useConfirm } from 'vuetify-use-dialog'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

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
    default: () => ({}),
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

// 默认颜色
const defaultColor = '#2196F3'
// 默认图标
const defaultIcon = 'mdi-folder'
// 默认渐变
const defaultGradient =
  'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(135deg, rgba(33, 150, 243, 0.7) 0%, rgba(33, 150, 243, 0.8s) 100%)'

// 文件夹设置
const folderSettings = ref<FolderConfig>({
  background: '',
  icon: defaultIcon,
  color: defaultColor,
  gradient: defaultGradient,
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
  'linear-gradient(rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.4) 100%), linear-gradient(135deg, rgba(33, 150, 243, 0.7) 0%, rgba(33, 150, 243, 0.8) 100%)',
  'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(135deg, rgba(76, 175, 80, 0.7) 0%, rgba(76, 175, 80, 0.8) 100%)',
  'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(135deg, rgba(255, 152, 0, 0.7) 0%, rgba(255, 152, 0, 0.8) 100%)',
  'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(135deg, rgba(156, 39, 176, 0.7) 0%, rgba(156, 39, 176, 0.8) 100%)',
  'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(135deg, rgba(244, 67, 54, 0.7) 0%, rgba(244, 67, 54, 0.8) 100%)',
  'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(135deg, rgba(96, 125, 139, 0.7) 0%, rgba(96, 125, 139, 0.8) 100%)',
  'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(135deg, rgba(233, 30, 99, 0.7) 0%, rgba(233, 30, 99, 0.8) 100%)',
  'linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(135deg, rgba(63, 81, 181, 0.7) 0%, rgba(156, 39, 176, 0.8) 100%)',
]

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

  return config.icon || settings.icon || defaultIcon
})

// 计算图标颜色
const iconColor = computed(() => {
  const config = props.folderConfig || {}
  const settings = folderSettings.value

  return config.color || settings.color || defaultColor
})

// 计算是否显示图标
const shouldShowIcon = computed(() => {
  const config = props.folderConfig || {}
  const settings = folderSettings.value

  return config.showIcon !== undefined ? config.showIcon : settings.showIcon !== undefined ? settings.showIcon : true
})

// 监听props变化，更新本地设置
watch(
  () => props.folderConfig,
  newConfig => {
    if (newConfig) {
      folderSettings.value = {
        ...folderSettings.value,
        ...newConfig,
      }
    }
  },
  { deep: true, immediate: true },
)

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
    $toast.error(t('folder.folderNameCannotBeEmpty'))
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
    content: t('folder.confirmDeleteFolder', { folderName: props.folderName }),
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
    icon: props.folderConfig?.icon || defaultIcon,
    color: props.folderConfig?.color || defaultColor,
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
  $toast.success(t('folder.folderSettingsSaved'))
}

// 弹出菜单
const dropdownItems = ref([
  {
    title: t('folder.settingAppearance'),
    value: 0,
    show: true,
    props: {
      prependIcon: 'mdi-palette',
      click: showSettingDialog,
    },
  },
  {
    title: t('folder.rename'),
    value: 1,
    show: true,
    props: {
      prependIcon: 'mdi-pencil',
      click: showRenameDialog,
    },
  },
  {
    title: t('folder.deleteFolder'),
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
  <div class="h-full">
    <!-- 文件夹卡片 -->
    <VHover>
      <template #default="hover">
        <VCard
          v-bind="hover.props"
          :ripple="false"
          :width="props.width"
          :height="props.height"
          min-height="8.5rem"
          @click="openFolder"
          class="plugin-folder-card h-full"
          :class="{
            'plugin-folder-card--mobile': display.mobile,
            'plugin-folder-card--hover': hover.isHovering,
          }"
        >
          <template v-if="props.folderConfig.background || folderSettings.background" #image>
            <VImg :src="props.folderConfig.background || folderSettings.background" cover position="top"> </VImg>
          </template>

          <!-- 背景渐变层 -->
          <div class="plugin-folder-card__bg" :style="{ background: backgroundGradient }" />

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
                <p class="plugin-folder-card__count">{{ t('folder.pluginCount', { count: props.pluginCount }) }}</p>
              </div>
            </div>

            <!-- 更多菜单按钮 - 右下角 -->
            <div class="absolute top-0 right-0">
              <VMenu v-model="menuVisible" location="top end" :close-on-content-click="true">
                <template #activator="{ props: menuProps }">
                  <IconBtn v-bind="menuProps" @click.stop>
                    <VIcon size="small" icon="mdi-dots-vertical" class="text-white" />
                  </IconBtn>
                </template>
                <VList>
                  <VListItem
                    v-for="(item, i) in dropdownItems"
                    v-show="item.show"
                    :key="i"
                    :base-color="item.props.color"
                    @click="item.props.click"
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
        <VDialogCloseBtn @click="renameDialog = false" />
        <VCardItem>
          <VCardTitle>{{ t('folder.renameFolder') }}</VCardTitle>
        </VCardItem>
        <VDivider />
        <VCardText>
          <VTextField
            v-model="newFolderName"
            :label="t('folder.folderName')"
            variant="outlined"
            autofocus
            @keyup.enter="confirmRename"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn color="primary" prepend-icon="mdi-check" class="px-5" @click="confirmRename">确认</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 设置对话框 -->
    <VDialog v-if="settingDialog" max-height="85vh" v-model="settingDialog" max-width="600" scrollable>
      <VCard>
        <VDialogCloseBtn @click="settingDialog = false" />
        <VCardItem>
          <VCardTitle>
            <VIcon icon="mdi-palette" class="mr-2" />
            {{ t('folder.folderAppearanceSettings') }}
          </VCardTitle>
        </VCardItem>
        <VDivider />
        <VCardText>
          <VRow>
            <!-- 显示图标开关 -->
            <VCol cols="12">
              <VSwitch
                v-model="folderSettings.showIcon"
                :label="t('folder.showFolderIcon')"
                color="primary"
                hide-details
              />
            </VCol>

            <!-- 图标选择 -->
            <VCol v-if="folderSettings.showIcon" cols="12" md="6">
              <VCardSubtitle class="pa-0 mb-2">{{ t('folder.icon') }}</VCardSubtitle>
              <div class="icon-grid">
                <VBtn
                  v-for="icon in iconOptions"
                  icon
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
              <VCardSubtitle class="pa-0 mb-2">{{ t('folder.iconColor') }}</VCardSubtitle>
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
              <VCardSubtitle class="pa-0 mb-2">{{ t('folder.backgroundGradient') }}</VCardSubtitle>
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
                :label="t('folder.customBackgroundImageURL')"
                placeholder="https://example.com/image.jpg"
                variant="outlined"
                :hint="t('folder.customBackgroundImageHint')"
                persistent-hint
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn color="primary" prepend-icon="mdi-content-save" class="px-5" @click="saveSettings">保存</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style lang="scss" scoped>
.plugin-folder-card {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  cursor: pointer;

  &--hover {
    transform: translateY(-4px);
  }

  &__bg {
    position: absolute;
    inset: 0;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    outline: none;
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
      font-size: 1rem;
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
