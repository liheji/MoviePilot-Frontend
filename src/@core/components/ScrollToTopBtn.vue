<script lang="ts" setup>
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="global-action-buttons">
    <button class="global-action-button" @click="scrollToTop">
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
  </div>
</template>

<style lang="scss" scoped>
.global-action-buttons {
  position: fixed;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 16px;
  inset-block-end: 30px;
  inset-inline-end: 30px;
}

.global-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 50%;
  backdrop-filter: blur(6px);
  background-color: rgba(var(--v-theme-surface), 0.8);
  block-size: 44px;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  inline-size: 44px;
  opacity: 0.7;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    background-color: rgba(var(--v-theme-surface), 0.95);
    color: rgb(var(--v-theme-primary));
    opacity: 1;
    transform: translateY(-4px);
  }

  svg {
    block-size: 20px;
    inline-size: 20px;
    transition: all 0.3s ease;
  }
}
</style>
