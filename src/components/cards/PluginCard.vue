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
    <!-- 插件卡片 -->
    <VHover>
      <template #default="hover">
        <VCard
          v-if="isVisible"
          v-bind="hover.props"
          :width="props.width"
          :height="props.height"
          @click="openPluginDetail"
          class="flex flex-col h-full"
          :class="{
            'transition transform-cpu duration-300 -translate-y-1': hover.isHovering,
          }"
        >
          <div
            :style="`background: linear-gradient(rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(${backgroundColor} 0%, ${backgroundColor} 100%)`"
          >
            <VCardText class="px-2 pt-2 pb-0">
              <VCardTitle
                class="text-white px-2 pb-0 text-lg text-shadow whitespace-nowrap overflow-hidden text-ellipsis"
              >
                <VBadge v-if="props.plugin?.state" dot inline color="success" />
                {{ props.plugin?.plugin_name }}
                <span class="text-sm mt-1 text-gray-200"> v{{ props.plugin?.plugin_version }} </span>
              </VCardTitle>
            </VCardText>
            <div class="relative flex flex-row items-start px-2 justify-between grow">
              <div class="relative flex-1 min-w-0">
                <VCardText class="px-2 py-0 text-white text-sm text-shadow overflow-hidden line-clamp-3 ...">
                  {{ props.plugin?.plugin_desc }}
                </VCardText>
              </div>
              <div class="relative flex-shrink-0 self-center cursor-move pb-3">
                <VAvatar size="48">
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
            </div>
          </div>
          <VCardText class="flex flex-none align-self-baseline py-2 w-full align-end">
            <span class="author-info">
              <VImg :src="authorPath" class="author-avatar" @load="isAvatarLoaded = true">
                <VIcon v-if="!isAvatarLoaded" icon="mdi-github" class="me-1" />
              </VImg>
              <a :href="props.plugin?.author_url" target="_blank" @click.stop>
                {{ props.plugin?.plugin_author }}
              </a>
            </span>
            <span v-if="props.count" class="ms-3">
              <VIcon icon="mdi-download" />
              <span class="text-sm ms-1 mt-1">{{ props.count?.toLocaleString() }}</span>
            </span>
            <div class="me-n3 absolute bottom-0 right-3">
              <IconBtn>
                <VIcon icon="mdi-dots-vertical" />
                <VMenu v-model="menuVisible" activator="parent" close-on-content-click>
                  <VList>
                    <VListItem
                      v-for="(item, i) in dropdownItems"
                      v-show="item.show"
                      :key="i"
                      :base-color="item.props.color"
                      @click="item.props.click"
                    >
                      <template #prepend>
                        <VIcon :icon="item.props.prependIcon" />
                      </template>
                      <VListItemTitle v-text="item.title" />
                    </VListItem>
                  </VList>
                </VMenu>
              </IconBtn>
            </div>
          </VCardText>
          <div v-if="props.plugin?.has_update" class="me-n3 absolute top-0 right-5">
            <VIcon icon="mdi-new-box" class="text-white" />
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
.card-cover-blurred::before {
  position: absolute;
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  background: rgba(29, 39, 59, 48%);
  content: '';
  inset: 0;
}

.author-info {
  display: flex;
  align-items: center;
}

.author-avatar {
  border-radius: 50%;
  block-size: 24px;
  inline-size: 24px;
  margin-inline-end: 8px;
  object-fit: cover;
}
</style>
