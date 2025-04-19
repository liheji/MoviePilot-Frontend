<script setup lang="ts">
import { SystemNavMenus } from '@/router/menu'
import { useDisplay } from 'vuetify'

const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value

const route = useRoute()

// 根据当前路径获取匹配的菜单路径
function getMenuPathFromRoute(path: string): string {
  const matchedMenu = SystemNavMenus.find(menu => menu.footer === true && path.startsWith(menu.to))
  return matchedMenu ? matchedMenu.to : '/apps'
}

// 当前选中的菜单，初始值基于当前路由
const currentMenu = ref<string>(getMenuPathFromRoute(route.path))

// 过滤出底部菜单项
const footerMenus = computed(() => {
  return SystemNavMenus.filter(menu => menu.footer === true)
})

// 监听路由变化来更新currentMenu
watch(
  () => route.path,
  newPath => {
    currentMenu.value = getMenuPathFromRoute(newPath)
  },
  { immediate: false },
)
</script>

<template>
  <Teleport v-if="appMode" to="body">
    <div class="footer-nav-container">
      <VCard class="footer-nav-card border" rounded="pill">
        <VCardText class="footer-card-content">
          <!-- 添加指示器 -->
          <div ref="indicator" class="nav-indicator"></div>
          <VBtnToggle class="footer-btn-group" :mandatory="true" v-model="currentMenu">
            <!-- 遍历底部菜单项 -->
            <VBtn
              v-for="menu in footerMenus"
              :key="menu.to"
              :to="menu.to"
              :variant="currentMenu === menu.to ? 'text' : 'plain'"
              color="primary"
              :ripple="false"
              class="footer-nav-btn"
              rounded="pill"
              :class="{ 'footer-nav-btn-active': currentMenu === menu.to }"
              :value="menu.to"
            >
              <div class="btn-content">
                <VIcon :icon="menu.icon" size="24"></VIcon>
                <span class="text-xs">{{ menu.title }}</span>
              </div>
            </VBtn>

            <!-- 更多按钮 -->
            <VBtn
              :variant="currentMenu === '/apps' ? 'text' : 'plain'"
              color="primary"
              :ripple="false"
              to="/apps"
              rounded="pill"
              class="footer-nav-btn"
              :class="{ 'footer-nav-btn-active': currentMenu === '/apps' }"
              value="/apps"
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
  z-index: 1999;
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
