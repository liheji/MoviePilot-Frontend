<script setup lang="ts">
import { SystemNavMenus } from '@/router/menu'
import { useDisplay } from 'vuetify'

const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

const route = useRoute()

// 过滤出底部菜单项（排除电影和电视剧，因为我们会合并它们）
const footerMenus = computed(() => {
  return SystemNavMenus.filter(menu => menu.footer === true)
})

// 为每个底部菜单创建激活状态
const activeState = computed(() => {
  const activeStates: Record<string, boolean> = {}

  footerMenus.value.forEach(menu => {
    const pathKey = menu.to.replace(/\//g, '_')
    activeStates[pathKey] = route.path.startsWith(menu.to)
  })

  return activeStates
})

// 更多按钮的激活状态
const moreActiveState = computed(() => {
  return !Object.values(activeState.value).some(v => v)
})

// 用于动画的状态和方法
const indicator = ref<HTMLElement | null>(null)
const activeButton = ref<HTMLElement | null>(null)

// 更新指示器位置的方法
const updateIndicatorPosition = async () => {
  await nextTick()
  const activeEl = document.querySelector('.footer-nav-btn-active') as HTMLElement
  if (activeEl && indicator.value) {
    // 获取按钮的完整尺寸和位置信息
    const rect = activeEl.getBoundingClientRect()
    const parentRect = indicator.value.parentElement!.getBoundingClientRect()

    // 计算相对于父容器的位置
    const relativeLeft = rect.left - parentRect.left

    // 设置指示器宽度和位置
    indicator.value.style.width = `${rect.width}px`
    indicator.value.style.left = `${relativeLeft}px`

    activeButton.value = activeEl
  }
}

// 监听路由变化
watch(
  () => route.path,
  async () => {
    updateIndicatorPosition()
  },
  { immediate: false },
)

// 在组件挂载后初始化指示器位置
onMounted(() => {
  updateIndicatorPosition()
})
</script>

<template>
  <Teleport to="body">
    <div class="footer-nav-container">
      <VCard class="footer-nav-card border" rounded="pill">
        <VCardText class="footer-card-content">
          <!-- 添加指示器 -->
          <div ref="indicator" class="nav-indicator"></div>
          <VBtnToggle class="footer-btn-group" :mandatory="false">
            <!-- 遍历底部菜单项 -->
            <VBtn
              v-for="menu in footerMenus"
              :key="menu.to"
              :to="menu.to"
              variant="plain"
              :ripple="false"
              color="primary"
              class="footer-nav-btn"
              rounded="pill"
              :class="{ 'footer-nav-btn-active': activeState[menu.to.replace(/\//g, '_')] }"
            >
              <div class="btn-content">
                <VIcon :icon="menu.icon" size="24"></VIcon>
                <span class="text-xs">{{ menu.title }}</span>
              </div>
            </VBtn>

            <!-- 更多按钮 -->
            <VBtn
              variant="plain"
              :ripple="false"
              color="primary"
              to="/apps"
              rounded="pill"
              class="footer-nav-btn"
              :class="{ 'footer-nav-btn-active': moreActiveState }"
            >
              <div class="btn-content">
                <VIcon icon="mdi-dots-horizontal" size="24"></VIcon>
                <span class="btn-text">更多</span>
              </div>
            </VBtn>
          </VBtnToggle>
        </VCardText>
      </VCard>
    </div>
  </Teleport>
</template>

<style lang="scss">
.footer-nav-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.footer-nav-card {
  pointer-events: auto;
  overflow: hidden;
  background-color: rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: relative;
}

.footer-card-content {
  padding: 6px 8px;
  position: relative;
}

.nav-indicator {
  position: absolute;
  height: 48px;
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-radius: 100px;
  z-index: 1;
  top: 6px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  pointer-events: none;
}

.footer-btn-group {
  width: 100%;
  display: flex;
  justify-content: space-around;
  background-color: transparent;
  border: none;
  position: relative;
}

.footer-nav-btn {
  display: flex;
  flex-direction: column;
  flex-grow: 0;
  position: relative;
  background-color: transparent;

  &.v-btn--active {
    background-color: transparent;
    box-shadow: none;
  }

  .btn-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
