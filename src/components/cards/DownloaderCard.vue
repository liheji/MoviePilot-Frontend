<script setup lang="ts">
import type { DownloaderConf } from '@/api/types'
import { getLogoUrl } from '@/utils/imageUtils'
import { openSharedDialog } from '@/composables/useSharedDialog'
import { useCardAccentColor } from '@/composables/useCardAccentColor'

const DownloaderInfoDialog = defineAsyncComponent(() => import('@/components/dialog/DownloaderInfoDialog.vue'))

const { accentRgb, imageRef, updateAccentColor } = useCardAccentColor()

// 定义输入
const props = defineProps({
  // 单个下载器
  downloader: {
    type: Object as PropType<DownloaderConf>,
    required: true,
  },
  editable: {
    type: Boolean,
    default: true,
  },
  // 所有下载器
  downloaders: {
    type: Array as PropType<DownloaderConf[]>,
    required: true,
  },
})

// 定义触发的自定义事件
const emit = defineEmits(['close', 'done', 'change'])

/** 打开共享下载器配置弹窗。 */
function openDownloaderInfoDialog() {
  openSharedDialog(
    DownloaderInfoDialog,
    {
      downloader: props.downloader,
      downloaders: props.downloaders,
    },
    {
      change: (...args: unknown[]) => emit('change', ...args),
      done: () => emit('done'),
    },
    { closeOn: ['close', 'update:modelValue'] },
  )
}

// 根据下载器类型选择图标
const getIcon = computed(() => {
  switch (props.downloader.type) {
    case 'qbittorrent':
      return getLogoUrl('qbittorrent')
    case 'transmission':
      return getLogoUrl('transmission')
    case 'rtorrent':
      return getLogoUrl('rtorrent')
    default:
      return getLogoUrl('downloader')
  }
})

/** 关闭下载器卡片。 */
function onClose() {
  emit('close')
}

</script>

<template>
  <VHover v-slot="hover">
    <VCard
      v-bind="hover.props"
      variant="tonal"
      class="app-card-shell app-card-colorful"
      :style="{ '--app-card-accent-rgb': accentRgb }"
      @click="openDownloaderInfoDialog"
    >
      <VDialogCloseBtn v-if="props.editable" @click="onClose" />
      <span v-if="props.editable" class="app-card-top-action absolute top-3 right-12">
        <IconBtn @click.stop>
          <VIcon class="cursor-move" icon="mdi-drag" />
        </IconBtn>
      </span>
      <VCardText class="app-card-summary app-card-summary--double-action">
        <div class="app-card-summary__content">
          <div class="app-card-summary__title-row">
            <VBadge
              v-if="props.downloader.default && props.downloader.enabled"
              dot
              inline
              color="success"
              class="me-1"
            />
            <span class="app-card-summary__title text-h6">{{ downloader.name }}</span>
          </div>
        </div>
        <div class="app-card-summary__media" aria-hidden="true">
          <VImg ref="imageRef" :src="getIcon" contain class="app-card-summary__image" @load="updateAccentColor" />
        </div>
      </VCardText>
    </VCard>
  </VHover>
</template>
