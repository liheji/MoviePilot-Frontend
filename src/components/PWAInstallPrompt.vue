<script setup lang="ts">
import { usePWAInstall } from '@/composables/usePWAInstall'
import { useToast } from 'vue-toastification'

const { t } = useI18n()
const { isInstallable, isInstalled, showInstallPrompt, getInstallInstructions } = usePWAInstall()

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
const instructions = computed(() => {
  const rawInstructions = getInstallInstructions()
  const platformKey = rawInstructions.platformKey

  // 获取平台显示名称
  const platformName = t(`pwa.platforms.${platformKey}`)

  // 获取安装步骤
  const steps = t(`pwa.installSteps.${platformKey}`)

  return {
    platform: platformName,
    steps: Array.isArray(steps) ? steps : [],
  }
})
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
    <div v-if="shouldShowBanner && showBanner" class="pwa-install-banner">
      <div class="banner-content">
        <VIcon icon="mdi-cellphone-link" size="24" class="me-3" />
        <div class="flex-grow-1">
          <div class="font-weight-medium">{{ t('pwa.installApp') }}</div>
          <div class="text-sm opacity-70">{{ t('pwa.installDescription') }}</div>
        </div>
        <VBtn color="primary" size="small" variant="flat" @click="handleInstall">
          {{ t('pwa.install') }}
        </VBtn>
        <VBtn icon size="small" variant="text" @click="dismissBanner">
          <VIcon icon="mdi-close" />
        </VBtn>
      </div>
    </div>
  </Transition>

  <!-- 手动安装说明对话框 -->
  <VDialog v-model="showInstructions" max-width="500">
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon icon="mdi-information-outline" class="me-2" />
        {{ t('pwa.installGuide') }}
      </VCardTitle>

      <VCardText>
        <div class="mb-4">
          <div class="text-subtitle-1 mb-2">
            {{ t('pwa.installInstructions', { platform: instructions.platform }) }}
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

        <VAlert type="info" variant="tonal" density="compact">
          {{ t('pwa.installNote') }}
        </VAlert>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn color="primary" variant="text" @click="showInstructions = false">
          {{ t('pwa.gotIt') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.pwa-install-banner {
  position: fixed;
  z-index: 1000;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 10%);
  inset-block-end: 20px;
  inset-inline: 20px;
}

.banner-content {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 8px;
}

@media (width >= 600px) {
  .pwa-install-banner {
    inset-inline: auto 20px;
    max-inline-size: 400px;
  }
}
</style>
