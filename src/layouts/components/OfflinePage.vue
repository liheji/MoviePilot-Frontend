<script setup lang="ts">
import { useGlobalOfflineStatus } from '@/composables/useOfflineStatus'

interface Props {
  type?: 'offline' | 'online'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'offline',
})

const { t } = useI18n()
const { isOnline, canPerformNetworkAction, getOfflineMessage } = useGlobalOfflineStatus()

// 重试连接
const retrying = ref(false)
const handleRetry = async () => {
  if (retrying.value) return

  retrying.value = true

  try {
    // 尝试发送一个简单的请求来检测网络
    await fetch('/favicon.ico?' + new Date().getTime(), {
      method: 'HEAD',
      cache: 'no-cache',
    })

    // 如果成功，等待一下让状态更新
    setTimeout(() => {
      retrying.value = false
    }, 1000)
  } catch (error) {
    retrying.value = false
  }
}

// 当网络恢复时自动隐藏页面
const shouldShow = computed(() => {
  return !canPerformNetworkAction.value
})

// 状态文本
const statusText = computed(() => {
  if (props.type === 'online') {
    return t('app.onlineMessage')
  }
  return getOfflineMessage()
})

// 图标
const statusIcon = computed(() => {
  return props.type === 'online' ? 'mdi-wifi' : 'mdi-wifi-off'
})

// 颜色主题
const colorTheme = computed(() => {
  return props.type === 'online' ? 'success' : 'error'
})
</script>

<template>
  <VDialog :model-value="shouldShow" persistent max-width="420" scrollable>
    <VCard class="offline-dialog">
      <!-- 状态图标 -->
      <div class="status-icon-wrapper">
        <div class="status-icon-bg">
          <VIcon :icon="statusIcon" size="48" :color="colorTheme" />
        </div>
      </div>

      <!-- 主要信息 -->
      <VCardText class="text-center">
        <h2 class="offline-title mb-4">
          {{ props.type === 'online' ? t('app.online') : t('app.offline') }}
        </h2>

        <p class="offline-message mb-6">
          {{ statusText }}
        </p>

        <!-- 重试按钮 -->
        <div class="action-section mb-6">
          <VBtn
            v-if="props.type === 'offline'"
            :loading="retrying"
            :color="colorTheme"
            size="default"
            variant="flat"
            @click="handleRetry"
          >
            <VIcon icon="mdi-refresh" class="me-2" />
            {{ retrying ? t('common.checking') : t('common.retry') }}
          </VBtn>
        </div>

        <!-- 状态指示器 -->
        <div class="status-indicators">
          <VChip
            :color="isOnline ? 'success' : 'error'"
            :prepend-icon="isOnline ? 'mdi-wifi' : 'mdi-wifi-off'"
            variant="tonal"
            size="small"
            class="me-2"
          >
            {{ isOnline ? t('common.networkOnline') : t('common.networkOffline') }}
          </VChip>

          <VChip
            :color="canPerformNetworkAction ? 'success' : 'warning'"
            :prepend-icon="canPerformNetworkAction ? 'mdi-check-circle' : 'mdi-alert-circle'"
            variant="tonal"
            size="small"
          >
            {{ canPerformNetworkAction ? t('common.serviceAvailable') : t('common.serviceUnavailable') }}
          </VChip>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.offline-dialog {
  border-radius: 16px;
}

.status-icon-wrapper {
  padding-block: 24px 0;
  padding-inline: 24px;
  text-align: center;
}

.status-icon-bg {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  animation: icon-pulse 3s ease-in-out infinite;
  background: rgba(var(--v-theme-surface-variant), 0.5);
  block-size: 80px;
  inline-size: 80px;
  margin-block: 0;
  margin-inline: auto;
}

.status-icon-bg::before {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  animation: icon-glow 2s ease-in-out infinite alternate;
  background: linear-gradient(45deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  content: '';
  inset: -3px;
  opacity: 0.1;
}

@keyframes icon-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}

@keyframes icon-glow {
  0% {
    opacity: 0.1;
    transform: scale(1);
  }

  100% {
    opacity: 0.3;
    transform: scale(1.1);
  }
}

.offline-title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.5rem;
  font-weight: 600;
}

.offline-message {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
  line-height: 1.5;
  opacity: 0.7;
}

.status-indicators {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

/* 移动端优化 */
@media (width <= 600px) {
  .status-icon-bg {
    block-size: 70px;
    inline-size: 70px;
  }

  .offline-title {
    font-size: 1.25rem;
  }

  .offline-message {
    font-size: 0.9rem;
  }

  .status-indicators {
    flex-direction: column;
    align-items: center;
  }
}
</style>
