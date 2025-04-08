<script lang="ts" setup>
import NameTestView from '@/views/system/NameTestView.vue'
import NetTestView from '@/views/system/NetTestView.vue'
import LoggingView from '@/views/system/LoggingView.vue'
import RuleTestView from '@/views/system/RuleTestView.vue'
import ModuleTestView from '@/views/system/ModuleTestView.vue'
import MessageView from '@/views/system/MessageView.vue'
import api from '@/api'
import { useDisplay } from 'vuetify'
import { getQueryValue } from '@/@core/utils'

// 显示器宽度
const display = useDisplay()

// App捷径
const appsMenu = ref(false)

// 菜单最大宽度
const menuMaxWidth = ref(480)

// 名称测试弹窗
const nameTestDialog = ref(false)

// 网络测试弹窗
const netTestDialog = ref(false)

// 实时日志弹窗
const loggingDialog = ref(false)

// 过滤规则弹窗
const ruleTestDialog = ref(false)

// 系统健康检查弹窗
const systemTestDialog = ref(false)

// 消息中心弹窗
const messageDialog = ref(false)

// 输入消息
const user_message = ref('')

// 发送按钮是否可用
const sendButtonDisabled = ref(false)

// 聊天容器
const chatContainer = ref<HTMLElement>()

// 滚动到底部
function scrollMessageToEnd() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// 拼接全部日志url
function allLoggingUrl() {
  return `${import.meta.env.VITE_API_BASE_URL}system/logging?length=-1`
}

// 发送消息
async function sendMessage() {
  if (user_message.value) {
    try {
      sendButtonDisabled.value = true
      await api.post(`message/web?text=${user_message.value}`)
      user_message.value = ''
      sendButtonDisabled.value = false
      scrollMessageToEnd()
    } catch (error) {
      console.error(error)
    }
  }
}

onMounted(() => {
  scrollMessageToEnd()
  const shortcut = getQueryValue('shortcut')
  if (shortcut) {
    switch (shortcut) {
      case 'nameTest':
        nameTestDialog.value = true
        break
      case 'netTest':
        netTestDialog.value = true
        break
      case 'logging':
        loggingDialog.value = true
        break
      case 'ruleTest':
        ruleTestDialog.value = true
        break
      case 'systemTest':
        systemTestDialog.value = true
        break
      case 'message':
        messageDialog.value = true
        break
    }
  }
})
</script>

<template>
  <VMenu
    v-model="appsMenu"
    :max-width="menuMaxWidth"
    width="100%"
    max-height="560"
    location="top end"
    origin="top end"
    transition="scale-transition"
    close-on-content-click
    close-on-back
  >
    <!-- Menu Activator -->
    <template #activator="{ props }">
      <IconBtn class="ms-2" v-bind="props">
        <VIcon icon="mdi-apps" />
      </IconBtn>
    </template>
    <!-- Menu Content -->
    <VCard elevation="1" class="shortcut-menu-card">
      <VCardItem class="shortcut-header border-b">
        <VCardTitle class="font-weight-medium text-primary">捷径</VCardTitle>
        <template #append>
          <IconBtn @click="appsMenu = false" class="shortcut-close-btn">
            <VIcon icon="mdi-close" />
          </IconBtn>
        </template>
      </VCardItem>
      <div class="ps ps--active-y shortcut-menu-container">
        <div class="shortcut-grid">
          <!-- 识别 -->
          <div class="shortcut-item" @click="nameTestDialog = true">
            <div class="shortcut-icon-wrapper">
              <VIcon icon="mdi-text-recognition" size="24" />
            </div>
            <div class="shortcut-text">
              <div class="shortcut-title">识别</div>
              <div class="shortcut-subtitle">名称识别测试</div>
            </div>
          </div>

          <!-- 规则 -->
          <div class="shortcut-item" @click="ruleTestDialog = true">
            <div class="shortcut-icon-wrapper">
              <VIcon icon="mdi-filter-cog" size="24" />
            </div>
            <div class="shortcut-text">
              <div class="shortcut-title">规则</div>
              <div class="shortcut-subtitle">规则测试</div>
            </div>
          </div>

          <!-- 日志 -->
          <div class="shortcut-item" @click="loggingDialog = true">
            <div class="shortcut-icon-wrapper">
              <VIcon icon="mdi-file-document" size="24" />
            </div>
            <div class="shortcut-text">
              <div class="shortcut-title">日志</div>
              <div class="shortcut-subtitle">实时日志</div>
            </div>
          </div>

          <!-- 网络 -->
          <div class="shortcut-item" @click="netTestDialog = true">
            <div class="shortcut-icon-wrapper">
              <VIcon icon="mdi-network" size="24" />
            </div>
            <div class="shortcut-text">
              <div class="shortcut-title">网络</div>
              <div class="shortcut-subtitle">网速连通性测试</div>
            </div>
          </div>

          <!-- 系统 -->
          <div class="shortcut-item" @click="systemTestDialog = true">
            <div class="shortcut-icon-wrapper">
              <VIcon icon="mdi-cog" size="24" />
            </div>
            <div class="shortcut-text">
              <div class="shortcut-title">系统</div>
              <div class="shortcut-subtitle">健康检查</div>
            </div>
          </div>

          <!-- 消息 -->
          <div class="shortcut-item" @click="messageDialog = true">
            <div class="shortcut-icon-wrapper">
              <VIcon icon="mdi-message" size="24" />
            </div>
            <div class="shortcut-text">
              <div class="shortcut-title">消息</div>
              <div class="shortcut-subtitle">消息中心</div>
            </div>
          </div>
        </div>
      </div>
    </VCard>
  </VMenu>
  <!-- 名称测试弹窗 -->
  <VDialog v-if="nameTestDialog" v-model="nameTestDialog" max-width="50rem" scrollable>
    <VCard title="名称识别测试">
      <DialogCloseBtn @click="nameTestDialog = false" />
      <VCardText>
        <NameTestView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 网络测试弹窗 -->
  <VDialog v-if="netTestDialog" v-model="netTestDialog" max-width="35rem" max-height="85vh" scrollable>
    <VCard title="网络测试">
      <DialogCloseBtn @click="netTestDialog = false" />
      <VDivider />
      <VCardText>
        <NetTestView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 实时日志弹窗 -->
  <VDialog
    v-if="loggingDialog"
    v-model="loggingDialog"
    scrollable
    max-width="70rem"
    :fullscreen="!display.mdAndUp.value"
  >
    <VCard>
      <DialogCloseBtn @click="loggingDialog = false" />
      <VCardItem>
        <VCardTitle class="inline-flex">
          实时日志
          <a class="mx-2 inline-flex items-center justify-center" :href="allLoggingUrl()" target="_blank">
            <div
              class="inline-flex cursor-pointer items-center rounded-full bg-gray-600 px-2 text-sm text-gray-200 ring-1 ring-gray-500 transition hover:bg-gray-700"
            >
              <VIcon icon="mdi-open-in-new" />
              <span class="ms-1">在新窗口中打开</span>
            </div>
          </a>
        </VCardTitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <LoggingView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 规则测试弹窗 -->
  <VDialog v-if="ruleTestDialog" v-model="ruleTestDialog" max-width="50rem" scrollable>
    <VCard title="规则测试">
      <DialogCloseBtn @click="ruleTestDialog = false" />
      <VCardText>
        <RuleTestView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 系统健康检查弹窗 -->
  <VDialog v-if="systemTestDialog" v-model="systemTestDialog" max-width="35rem" max-height="85vh" scrollable>
    <VCard title="系统健康检查">
      <DialogCloseBtn @click="systemTestDialog = false" />
      <VDivider />
      <VCardText>
        <ModuleTestView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 消息中心弹窗 -->
  <VDialog
    v-if="messageDialog"
    v-model="messageDialog"
    max-width="45rem"
    scrollable
    :fullscreen="!display.mdAndUp.value"
  >
    <VCard title="消息中心">
      <DialogCloseBtn @click="messageDialog = false" />
      <VDivider />
      <VCardText ref="chatContainer">
        <MessageView @scroll="scrollMessageToEnd" />
      </VCardText>
      <VCardItem>
        <VTextField
          v-model="user_message"
          variant="solo"
          placeholder="输入消息或命令"
          clearable
          :disabled="sendButtonDisabled"
          @keydown.enter="sendMessage"
        >
          <template #append-inner>
            <VBtn color="primary" :disabled="sendButtonDisabled" @click="sendMessage"> 发送 </VBtn>
          </template>
        </VTextField>
      </VCardItem>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.shortcut-menu-card {
  overflow: hidden;
}

.shortcut-header {
  background: linear-gradient(to right, rgba(var(--v-theme-primary), 0.04), rgba(var(--v-theme-primary), 0.01));
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-block: 12px;
  padding-inline: 16px;
}

.shortcut-close-btn {
  transition: transform 0.3s ease;

  &:hover {
    transform: rotate(90deg);
  }
}

.shortcut-menu-container {
  padding: 16px;
}

.shortcut-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, 1fr);
}

.shortcut-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background-color: rgba(var(--v-theme-primary), 0.08);
  block-size: 48px;
  inline-size: 48px;
  margin-inline-end: 16px;
  transition: all 0.3s ease;

  .v-icon {
    color: rgba(var(--v-theme-primary), 1);
    transition: transform 0.3s ease;
  }
}

.shortcut-item {
  position: relative;
  z-index: 1;
  display: flex;
  overflow: hidden;
  align-items: center;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 12px;
  background-color: rgba(var(--v-theme-surface));
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    position: absolute;
    z-index: -1;
    background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.08) 0%, rgba(var(--v-theme-primary), 0) 60%);
    content: '';
    inset: 0;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    border-color: rgba(var(--v-theme-primary), 0.15);
    transform: translateY(-4px);

    &::before {
      opacity: 1;
    }

    .shortcut-icon-wrapper {
      background-color: rgba(var(--v-theme-primary), 0.12);
      transform: scale(1.1);

      .v-icon {
        transform: scale(1.2);
      }
    }
  }

  &:active {
    box-shadow: 0 3px 10px rgba(var(--v-theme-on-surface), 0.08);
    transform: translateY(0);
  }
}

.shortcut-text {
  flex: 1;
}

.shortcut-title {
  color: rgba(var(--v-theme-on-surface), 0.95);
  font-size: 1rem;
  font-weight: 600;
  margin-block-end: 4px;
}

.shortcut-subtitle {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.8rem;
}
</style>
