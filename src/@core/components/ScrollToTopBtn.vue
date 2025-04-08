<script lang="ts" setup>
// 控制回到顶部按钮的可见性
const showScrollToTop = ref(false)
const scrollThreshold = 200 // 滚动多少像素后显示按钮

// 滚动事件处理函数
const handleScroll = () => {
  showScrollToTop.value = window.scrollY > scrollThreshold
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll)
  // Initial check for scroll-to-top
  handleScroll()
})

onUnmounted(() => {
  // Remove scroll event listener
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="global-action-buttons">
    <Transition name="scroll-fade">
      <button v-show="showScrollToTop" class="global-action-button" @click="scrollToTop">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7 14L12 9L17 14"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
/* Global Action Button Styles (FAB) */
.global-action-buttons {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.global-action-button {
  width: 44px;
  height: 44px;
  background-color: rgba(var(--v-theme-background), 0.8);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 50%;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.12);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface));
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    background-color: rgba(var(--v-theme-background), 0.95);
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
    color: rgb(var(--v-theme-primary));
  }

  svg {
    transition: all 0.3s ease;
    width: 20px;
    height: 20px;
  }
}
</style>
