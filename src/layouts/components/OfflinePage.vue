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

// 动画时长
const ENTER_DURATION = 600
const LEAVE_DURATION = 400

// 进入动画
function onEnter(el: HTMLElement, done: () => void) {
  // 初始状态
  el.style.opacity = '0'
  el.style.transform = 'scale(0.9)'
  el.style.filter = 'blur(10px)'
  
  // 强制重绘
  el.offsetHeight
  
  // 应用过渡
  el.style.transition = `all ${ENTER_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
  
  // 目标状态
  requestAnimationFrame(() => {
    el.style.opacity = '1'
    el.style.transform = 'scale(1)'
    el.style.filter = 'blur(0)'
  })
  
  // 动画完成
  setTimeout(done, ENTER_DURATION)
}

// 离开动画
function onLeave(el: HTMLElement, done: () => void) {
  // 应用过渡
  el.style.transition = `all ${LEAVE_DURATION}ms cubic-bezier(0.4, 0, 1, 1)`
  
  // 目标状态
  requestAnimationFrame(() => {
    el.style.opacity = '0'
    el.style.transform = 'scale(1.1)'
    el.style.filter = 'blur(20px)'
  })
  
  // 动画完成
  setTimeout(done, LEAVE_DURATION)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      :css="false"
      @enter="onEnter"
      @leave="onLeave"
    >
            <div v-if="shouldShow" class="offline-page" ref="offlinePage">
        <div class="offline-container" :class="{ 'container-animate': shouldShow }">
        <!-- 状态图标 -->
        <div class="status-icon-wrapper">
          <div class="status-icon-bg">
            <VIcon :icon="statusIcon" size="64" :color="colorTheme" />
          </div>
        </div>

        <!-- 主要信息 -->
        <div class="content-section">
          <h1 class="offline-title">
            {{ props.type === 'online' ? t('app.online') : t('app.offline') }}
          </h1>

          <p class="offline-message">
            {{ statusText }}
          </p>

          <!-- 重试按钮 -->
          <div class="action-section">
            <VBtn
              v-if="props.type === 'offline'"
              :loading="retrying"
              :color="colorTheme"
              size="large"
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
              class="me-2"
            >
              {{ isOnline ? t('common.networkOnline') : t('common.networkOffline') }}
            </VChip>

            <VChip
              :color="canPerformNetworkAction ? 'success' : 'warning'"
              :prepend-icon="canPerformNetworkAction ? 'mdi-check-circle' : 'mdi-alert-circle'"
              variant="tonal"
            >
              {{ canPerformNetworkAction ? t('common.serviceAvailable') : t('common.serviceUnavailable') }}
            </VChip>
          </div>
        </div>

        <!-- 底部信息 -->
        <div class="footer-section">
          <p class="app-info">{{ t('app.moviepilot') }}</p>
        </div>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.offline-page {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(10px);
  background: linear-gradient(135deg, rgb(var(--v-theme-surface)) 0%, rgb(var(--v-theme-surface-variant)) 100%);
  inset: 0;
  will-change: transform, opacity, filter;
}

.offline-container {
  padding: 40px;
  border-radius: 24px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 20px 40px rgba(0, 0, 0, 10%), 0 0 0 1px rgba(var(--v-border-color), var(--v-border-opacity));
  inline-size: 100%;
  max-inline-size: 500px;
  text-align: center;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.offline-page .offline-container.container-animate {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.2s;
}

.status-icon-wrapper {
  margin-block-end: 32px;
}

.status-icon-bg {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--v-theme-surface-variant), 0.5);
  block-size: 120px;
  inline-size: 120px;
  margin-block: 0;
  margin-inline: auto;
}

.status-icon-bg {
  animation: iconPulse 3s ease-in-out infinite;
}

.status-icon-bg::before {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  background: linear-gradient(45deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  content: '';
  inset: -4px;
  opacity: 0.1;
  animation: iconGlow 2s ease-in-out infinite alternate;
}

@keyframes iconPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes iconGlow {
  0% {
    opacity: 0.1;
    transform: scale(1);
  }
  100% {
    opacity: 0.3;
    transform: scale(1.1);
  }
}

.content-section {
  margin-block-end: 32px;
}

.offline-title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 2rem;
  font-weight: 600;
  margin-block-end: 16px;
}

.offline-message {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.1rem;
  line-height: 1.6;
  margin-block-end: 32px;
  opacity: 0.7;
}

.action-section {
  margin-block-end: 32px;
}

.status-indicators {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.help-section {
  margin-block-end: 32px;
}

.help-panels {
  text-align: start;
}

.footer-section {
  opacity: 0.7;
}

.app-info {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
}

/* 移动端优化 */
@media (width <= 600px) {
  .offline-container {
    padding: 24px;
    margin: 16px;
  }

  .offline-title {
    font-size: 1.5rem;
  }

  .offline-message {
    font-size: 1rem;
  }

  .status-icon-bg {
    block-size: 100px;
    inline-size: 100px;
  }

  .status-indicators {
    flex-direction: column;
    align-items: center;
  }
}

/* 暗黑模式优化 */
.v-theme--dark .offline-page {
  background: linear-gradient(135deg, rgb(var(--v-theme-surface)) 0%, rgba(var(--v-theme-surface-variant), 0.8) 100%);
}

.v-theme--dark .offline-container {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 30%), 0 0 0 1px rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
