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
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 显示器宽度
const display = useDisplay()

// App捷径
const appsMenu = ref(false)

// 菜单最大宽度
const menuMaxWidth = ref(420)

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

// 定义捷径列表
const shortcuts = [
  {
    title: t('shortcut.recognition.title'),
    subtitle: t('shortcut.recognition.subtitle'),
    icon: 'mdi-text-recognition',
    dialog: 'nameTest',
    dialogRef: nameTestDialog,
  },
  {
    title: t('shortcut.rule.title'),
    subtitle: t('shortcut.rule.subtitle'),
    icon: 'mdi-filter-cog',
    dialog: 'ruleTest',
    dialogRef: ruleTestDialog,
  },
  {
    title: t('shortcut.log.title'),
    subtitle: t('shortcut.log.subtitle'),
    icon: 'mdi-file-document',
    dialog: 'logging',
    dialogRef: loggingDialog,
  },
  {
    title: t('shortcut.network.title'),
    subtitle: t('shortcut.network.subtitle'),
    icon: 'mdi-network',
    dialog: 'netTest',
    dialogRef: netTestDialog,
  },
  {
    title: t('shortcut.system.title'),
    subtitle: t('shortcut.system.subtitle'),
    icon: 'mdi-cog',
    dialog: 'systemTest',
    dialogRef: systemTestDialog,
  },
  {
    title: t('shortcut.message.title'),
    subtitle: t('shortcut.message.subtitle'),
    icon: 'mdi-message',
    dialog: 'message',
    dialogRef: messageDialog,
  },
]

// 打开对话框
function openDialog(dialogRef: any) {
  dialogRef.value = true
}

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
    const found = shortcuts.find(item => item.dialog === shortcut)
    if (found) {
      found.dialogRef.value = true
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
    close-on-content-click
    close-on-back
    scrim
  >
    <!-- Menu Activator -->
    <template #activator="{ props }">
      <IconBtn class="ms-2" v-bind="props">
        <VIcon icon="mdi-apps" />
      </IconBtn>
    </template>
    <!-- Menu Content -->
    <VCard class="overflow-hidden">
      <VCardItem class="py-3">
        <VCardTitle>{{ t('shortcut.title') }}</VCardTitle>
        <template #append>
          <IconBtn @click="appsMenu = false">
            <VIcon icon="mdi-close" />
          </IconBtn>
        </template>
      </VCardItem>
      <VDivider />
      <div class="pa-3">
        <div class="grid grid-cols-2 gap-3">
          <!-- 循环渲染快捷方式 -->
          <div v-for="(item, index) in shortcuts" :key="index">
            <VCard
              flat
              variant="tonal"
              class="pa-2 d-flex align-center rounded-lg cursor-pointer transition-transform duration-300 hover:-translate-y-1 border"
              hover
              @click="openDialog(item.dialogRef)"
            >
              <VAvatar variant="text" size="48" rounded="lg">
                <VIcon color="primary" :icon="item.icon" size="24" />
              </VAvatar>
              <div>
                <div class="text-body-1 text-high-emphasis font-weight-medium">{{ item.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.subtitle }}</div>
              </div>
            </VCard>
          </div>
        </div>
      </div>
    </VCard>
  </VMenu>
  <!-- 名称测试弹窗 -->
  <VDialog v-if="nameTestDialog" v-model="nameTestDialog" max-width="35rem" scrollable>
    <VCard>
      <VCardItem>
        <VCardTitle>
          <VIcon icon="mdi-text-recognition" class="me-2" />
          {{ t('shortcut.recognition.title') }}
        </VCardTitle>
        <VDialogCloseBtn @click="nameTestDialog = false" />
      </VCardItem>
      <VDivider />
      <VCardText>
        <NameTestView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 网络测试弹窗 -->
  <VDialog v-if="netTestDialog" v-model="netTestDialog" max-width="35rem" max-height="85vh" scrollable>
    <VCard>
      <VCardItem>
        <VCardTitle>
          <VIcon icon="mdi-network" class="me-2" />
          {{ t('shortcut.network.subtitle') }}
        </VCardTitle>
        <VDialogCloseBtn @click="netTestDialog = false" />
      </VCardItem>
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
      <VDialogCloseBtn @click="loggingDialog = false" />
      <VCardItem>
        <VCardTitle class="d-inline-flex">
          <VIcon icon="mdi-file-document" class="me-2" />
          {{ t('shortcut.log.subtitle') }}
          <a class="mx-2 d-inline-flex align-center" :href="allLoggingUrl()" target="_blank">
            <VChip color="grey-darken-1" size="small" class="ml-2">
              <VIcon icon="mdi-open-in-new" size="small" start />
              {{ t('common.openInNewWindow') }}
            </VChip>
          </a>
        </VCardTitle>
      </VCardItem>
      <VDivider />
      <VCardText>
        <LoggingView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 过滤规则弹窗 -->
  <VDialog v-if="ruleTestDialog" v-model="ruleTestDialog" max-width="35rem" scrollable>
    <VCard>
      <VCardItem>
        <VCardTitle>
          <VIcon icon="mdi-filter-cog" class="me-2" />
          {{ t('shortcut.rule.subtitle') }}
        </VCardTitle>
        <VDialogCloseBtn @click="ruleTestDialog = false" />
      </VCardItem>
      <VDivider />
      <VCardText>
        <RuleTestView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 系统健康检查弹窗 -->
  <VDialog v-if="systemTestDialog" v-model="systemTestDialog" max-width="35rem" scrollable>
    <VCard>
      <VCardItem>
        <VCardTitle>
          <VIcon icon="mdi-cog" class="me-2" />
          {{ t('shortcut.system.subtitle') }}
        </VCardTitle>
        <VDialogCloseBtn @click="systemTestDialog = false" />
      </VCardItem>
      <VDivider />
      <VCardText>
        <ModuleTestView />
      </VCardText>
    </VCard>
  </VDialog>
  <!-- 消息中心弹窗 -->
  <VDialog v-if="messageDialog" v-model="messageDialog" max-width="35rem" scrollable>
    <VCard>
      <VCardItem>
        <VCardTitle>
          <VIcon icon="mdi-message" class="me-2" />
          {{ t('shortcut.message.subtitle') }}
        </VCardTitle>
        <VDialogCloseBtn @click="messageDialog = false" />
      </VCardItem>
      <VDivider />
      <VCardText>
        <MessageView ref="chatContainer" />
      </VCardText>
      <VDivider />
      <VCardActions class="pa-4">
        <div class="d-flex w-100 gap-2">
          <VTextField
            v-model="user_message"
            variant="outlined"
            hide-details
            density="compact"
            :placeholder="t('common.inputMessage')"
            @keyup.enter="sendMessage"
          />
          <VBtn
            :disabled="sendButtonDisabled"
            @click="sendMessage"
            :loading="sendButtonDisabled"
            color="primary"
            min-width="auto"
            width="46"
            height="38"
            >{{ t('common.send') }}</VBtn
          >
        </div>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
