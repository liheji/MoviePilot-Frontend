<script setup lang="ts">
import { usePWAInstall } from '@/composables/usePWAInstall'

const { t } = useI18n()
const { 
  isInstallable, 
  isInstalled, 
  isPWASupported,
  showInstallPrompt,
  getInstallInstructions 
} = usePWAInstall()

const showBanner = ref(false)
const showInstructions = ref(false)
const dismissed = ref(false)

// 检查是否应该显示横幅
const shouldShowBanner = computed(() => {
  return isInstallable.value && !isInstalled.value && !dismissed.value && !showInstructions.value
})

// 显示延迟（避免立即显示）
onMounted(() => {
  setTimeout(() => {
    // 检查本地存储，看用户是否已经关闭过提示
    const dismissedTime = localStorage.getItem('pwa-install-dismissed')
    if (dismissedTime) {
      const dismissedDate = new Date(dismissedTime)
      const now = new Date()
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      
      // 如果距离上次关闭不到7天，不显示
      if (daysDiff < 7) {
        dismissed.value = true
        return
      }
    }
    
    showBanner.value = true
  }, 30000) // 30秒后显示
})

// 处理安装
const handleInstall = async () => {
  const installed = await showInstallPrompt()
  if (installed) {
    showBanner.value = false
    // 显示成功消息
    useToast().success(t('pwa.installSuccess'))
  } else {
    // 如果用户拒绝，显示手动安装说明
    showInstructions.value = true
  }
}

// 关闭横幅
const dismissBanner = () => {
  showBanner.value = false
  dismissed.value = true
  // 记录关闭时间
  localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
}

// 获取平台特定的安装说明
const instructions = computed(() => getInstallInstructions())
</script>

<template>
  <!-- 安装横幅 -->
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="shouldShowBanner && showBanner"
      class="pwa-install-banner"
    >
      <div class="banner-content">
        <VIcon icon="mdi-cellphone-link" size="24" class="me-3" />
        <div class="flex-grow-1">
          <div class="font-weight-medium">安装 MoviePilot 应用</div>
          <div class="text-sm opacity-70">获得更好的离线体验和性能</div>
        </div>
        <VBtn
          color="primary"
          size="small"
          variant="flat"
          @click="handleInstall"
        >
          安装
        </VBtn>
        <VBtn
          icon
          size="small"
          variant="text"
          @click="dismissBanner"
        >
          <VIcon icon="mdi-close" />
        </VBtn>
      </div>
    </div>
  </Transition>

  <!-- 手动安装说明对话框 -->
  <VDialog
    v-model="showInstructions"
    max-width="500"
  >
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon icon="mdi-information-outline" class="me-2" />
        安装指南
      </VCardTitle>
      
      <VCardText>
        <div class="mb-4">
          <div class="text-subtitle-1 mb-2">
            在 {{ instructions.platform }} 上安装 MoviePilot：
          </div>
          <VList density="compact">
            <VListItem
              v-for="(step, index) in instructions.steps"
              :key="index"
              :prepend-icon="`mdi-numeric-${index + 1}-circle`"
            >
              <VListItemTitle>{{ step }}</VListItemTitle>
            </VListItem>
          </VList>
        </div>
        
        <VAlert
          type="info"
          variant="tonal"
          density="compact"
        >
          安装后，您可以从主屏幕快速访问 MoviePilot，并享受离线功能。
        </VAlert>
      </VCardText>
      
      <VCardActions>
        <VSpacer />
        <VBtn
          color="primary"
          variant="text"
          @click="showInstructions = false"
        >
          知道了
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.pwa-install-banner {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  z-index: 1000;
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.banner-content {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 8px;
}

@media (min-width: 600px) {
  .pwa-install-banner {
    left: auto;
    right: 20px;
    max-width: 400px;
  }
}
</style>