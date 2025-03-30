<script setup lang="ts">
const props = defineProps<Props>()

interface Props {
  errorCode?: string
  errorTitle?: string
  errorDescription?: string
  icon?: string
  iconColor?: string
}
</script>

<template>
  <div class="no-data-container">
    <!-- 图标容器 -->
    <div class="icon-wrapper">
      <div class="icon-glow"></div>
      <div class="icon-container">
        <VIcon
          :icon="props.icon || 'mdi-file-search-outline'"
          :color="props.iconColor || 'white'"
          size="48"
          class="main-icon"
        />
      </div>
      <div class="pulse-ring"></div>
    </div>
    
    <!-- 标题 -->
    <div class="error-title">
      {{ props.errorTitle || '暂无数据' }}
    </div>
    
    <!-- 描述 -->
    <div class="error-description">
      {{ props.errorDescription || '没有找到相关内容' }}
    </div>
    
    <!-- 按钮插槽 -->
    <div class="actions-container">
      <slot name="button" />
    </div>
  </div>
</template>

<style scoped>
.no-data-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 3rem 1rem;
  min-height: 300px;
  text-align: center;
  position: relative;
}

/* 图标样式 */
.icon-wrapper {
  position: relative;
  margin: 0 auto 2rem;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-glow {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--v-theme-primary), 0.8) 0%, rgba(var(--v-theme-primary), 0) 70%);
  filter: blur(15px);
  opacity: 0.8;
  animation: pulse 3s infinite ease-in-out;
}

.icon-container {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.9), rgba(var(--v-theme-secondary), 0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(var(--v-theme-primary), 0.3),
              0 2px 5px rgba(0, 0, 0, 0.1),
              inset 0 1px 1px rgba(255, 255, 255, 0.2);
  z-index: 2;
}

.main-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  animation: slight-bounce 3s infinite ease-in-out;
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px solid rgba(var(--v-theme-primary), 0.5);
  opacity: 0;
  z-index: 1;
  animation: ripple 2s infinite ease-out;
}

.pulse-ring::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 85px;
  height: 85px;
  border-radius: 50%;
  border: 2px solid rgba(var(--v-theme-primary), 0.3);
  animation: ripple 2s infinite 0.5s ease-out;
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

@keyframes pulse {
  0%, 100% { 
    opacity: 0.5;
    transform: scale(0.8);
  }
  50% { 
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes slight-bounce {
  0%, 100% { 
    transform: translateY(0);
  }
  50% { 
    transform: translateY(-3px);
  }
}

/* 文字样式 */
.error-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
}

.error-title::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.8), rgba(var(--v-theme-primary), 0.2));
  border-radius: 3px;
  margin: 0.5rem auto 0;
}

.error-description {
  font-size: 1.1rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
}

.actions-container {
  margin-top: 1.5rem;
}

.actions-container :deep(.v-btn) {
  transform: translateY(0);
  transition: transform 0.2s ease;
}

.actions-container :deep(.v-btn:hover) {
  transform: translateY(-2px);
}

/* 响应式调整 */
@media (max-width: 600px) {
  .no-data-container {
    padding: 2rem 1rem;
  }
  
  .icon-wrapper {
    width: 80px;
    height: 80px;
    margin-bottom: 1.5rem;
  }
  
  .icon-container {
    width: 70px;
    height: 70px;
  }
  
  .icon-glow {
    width: 70px;
    height: 70px;
  }
  
  .pulse-ring,
  .pulse-ring::before {
    width: 80px;
    height: 80px;
  }
  
  .error-title {
    font-size: 1.4rem;
  }
  
  .error-description {
    font-size: 0.95rem;
    max-width: 90%;
  }
}
</style>

