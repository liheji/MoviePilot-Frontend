<script setup lang="ts">
import { formatDateDifference } from '@core/utils/formatters'
import { SystemNotification } from '@/api/types'

// 是否有新消息
const hasNewMessage = ref(false)

// 通知列表
const notificationList = ref<SystemNotification[]>([])

// 事件源
let eventSource: EventSource | null = null

// 弹窗
const appsMenu = ref(false)

// SSE持续接收消息
function startSSEMessager() {
  // 延迟 3 秒启动 SSE，避免相关认证信息尚未写入 Cookie 导致 403
  setTimeout(() => {
    eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}system/message`)
    eventSource.addEventListener('message', event => {
      if (event.data) {
        const noti: SystemNotification = JSON.parse(event.data)
        notificationList.value.unshift(noti)
        hasNewMessage.value = true
      }
    })
  }, 3000)
}

// 页面加载时，加载当前用户数据
onBeforeMount(async () => {
  startSSEMessager()
})

// 页面卸载时，关闭事件源
onBeforeUnmount(() => {
  if (eventSource) eventSource.close()
})
</script>

<template>
  <VMenu v-model="appsMenu" width="400" transition="scale-transition" close-on-content-click class="notification-menu">
    <!-- Menu Activator -->
    <template #activator="{ props }">
      <VBadge v-if="hasNewMessage" dot color="error" :offset-x="5" :offset-y="5" v-bind="props">
        <IconBtn>
          <VIcon icon="mdi-bell-outline" />
        </IconBtn>
      </VBadge>
      <IconBtn v-else v-bind="props">
        <VIcon icon="mdi-bell-outline" />
      </IconBtn>
    </template>
    <!-- Menu Content -->
    <VCard>
      <VCardItem class="notification-header">
        <VCardTitle class="font-weight-medium text-primary">通知中心</VCardTitle>
        <template #append>
          <VTooltip text="设为已读">
            <template #activator="{ props }">
              <IconBtn
                class="mark-read-btn"
                v-bind="props"
                @click="
                  () => {
                    hasNewMessage = false
                    appsMenu = false
                  }
                "
              >
                <VIcon icon="mdi-email-check-outline" size="20" />
              </IconBtn>
            </template>
          </VTooltip>
        </template>
      </VCardItem>
      <div v-if="notificationList.length > 0" class="notification-list">
        <VListItem v-for="(item, i) in notificationList" :key="i" lines="two" class="notification-item">
          <template #prepend>
            <VAvatar rounded class="notification-avatar">
              <VIcon v-if="item.type === 'user'" icon="mdi-account-alert" size="large"></VIcon>
              <VIcon v-else-if="item.type === 'plugin'" icon="mdi-robot" size="large"></VIcon>
              <VIcon v-else icon="mdi-laptop" size="large"></VIcon>
            </VAvatar>
          </template>
          <div class="notification-content">
            <div class="notification-title overflow-visiable break-words whitespace-break-spaces">
              {{ item.title }}
            </div>
            <div class="notification-text">{{ item.text }}</div>
            <div class="notification-time">{{ formatDateDifference(item.date) }}</div>
          </div>
        </VListItem>
      </div>
      <div v-else class="no-notification">
        <div class="text-center">
          <VIcon icon="mdi-bell-sleep-outline" size="40" class="mb-3 text-primary" />
          <div>暂无通知</div>
        </div>
      </div>
    </VCard>
  </VMenu>
</template>

<style lang="scss" scoped>
.notification-header {
  background: linear-gradient(to right, rgba(var(--v-theme-primary), 0.04), rgba(var(--v-theme-primary), 0.01));
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-block: 12px;
  padding-inline: 16px;
}

.notification-list {
  padding: 8px;
  max-block-size: 500px;
  overflow-y: auto;
}

.notification-item {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 12px;
  margin-block-end: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.03);
    transform: translateY(-2px);
  }

  .notification-avatar {
    background-color: rgba(var(--v-theme-primary), 0.1);
  }

  .notification-title {
    font-size: 0.95rem;
    font-weight: 600;
  }

  .notification-text {
    color: rgba(var(--v-theme-on-surface), 0.75);
    font-size: 0.85rem;
    margin-block-start: 6px;
  }

  .notification-time {
    color: rgba(var(--v-theme-primary), 0.8);
    font-size: 0.8rem;
    margin-block-start: 6px;
  }
}

.no-notification {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.95rem;
  padding-block: 30px;
  padding-inline: 0;
}

.mark-read-btn {
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.1);
    transform: scale(1.05);
  }
}

.notification-menu .v-overlay__content {
  overflow: hidden;
}
</style>
