<script setup lang="ts">
import { NotificationConf } from '@/api/types'
import wechat_image from '@images/logos/wechat.png'
import telegram_image from '@images/logos/telegram.webp'
import vocechat_image from '@images/logos/vocechat.png'
import synologychat_image from '@images/logos/synologychat.png'
import slack_image from '@images/logos/slack.webp'
import chrome_image from '@images/logos/chrome.png'
import custom_image from '@images/logos/notification.png'
import { useToast } from 'vue-toast-notification'
import { cloneDeep } from 'lodash-es'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 定义输入
const props = defineProps({
  // 单个通知
  notification: {
    type: Object as PropType<NotificationConf>,
    required: true,
  },
  // 所有通知
  notifications: {
    type: Array as PropType<NotificationConf[]>,
    required: true,
  },
})

// 定义触发的自定义事件
const emit = defineEmits(['close', 'change', 'done'])

// 提示框
const $toast = useToast()

// 通知详情弹窗
const notificationInfoDialog = ref(false)

// 通知详情
const notificationInfo = ref<NotificationConf>({
  name: '',
  type: '',
  enabled: false,
  config: {},
})

// 各通知类型的名称字典
const notificationTypeNames: { [key: string]: string } = {
  wechat: t('notification.wechat.name'),
  telegram: t('notification.telegram.name'),
  vocechat: t('notification.vocechat.name'),
  synologychat: t('notification.synologychat.name'),
  slack: t('notification.slack.name'),
  webpush: t('notification.webpush.name'),
  custom: t('setting.notification.custom'),
}

// 消息类型下拉字典
const notificationTypes = [
  { value: '资源下载', title: t('notificationSwitch.resourceDownload') },
  { value: '整理入库', title: t('notificationSwitch.organize') },
  { value: '订阅', title: t('notificationSwitch.subscribe') },
  { value: '站点', title: t('notificationSwitch.site') },
  { value: '媒体服务器', title: t('notificationSwitch.mediaServer') },
  { value: '手动处理', title: t('notificationSwitch.manual') },
  { value: '插件', title: t('notificationSwitch.plugin') },
  { value: '其它', title: t('notificationSwitch.other') },
]

// 打开详情弹窗
function openNotificationInfoDialog() {
  // 替换成深复制，避免修改时影响原数据
  notificationInfo.value = cloneDeep(props.notification)
  notificationInfoDialog.value = true
}

// 保存详情数据
function saveNotificationInfo() {
  // 为空不保存，跳出警告框
  if (!notificationInfo.value.name) {
    $toast.error(t('notification.name') + t('common.required'))
    return
  }
  // 重名判断
  if (props.notifications.some(item => item.name === notificationInfo.value.name && item !== props.notification)) {
    $toast.error(t('notification.channel') + `【${notificationInfo.value.name}】` + t('common.exists'))
    return
  }
  notificationInfoDialog.value = false
  emit('change', notificationInfo.value, props.notification.name)
  emit('done')
}

// 根据存储类型选择图标
const getIcon = computed(() => {
  switch (props.notification.type) {
    case 'wechat':
      return wechat_image
    case 'telegram':
      return telegram_image
    case 'vocechat':
      return vocechat_image
    case 'synologychat':
      return synologychat_image
    case 'slack':
      return slack_image
    case 'webpush':
      return chrome_image
    default:
      return custom_image
  }
})

// 按钮点击
function onClose() {
  emit('close')
}
</script>
<template>
  <div>
    <VCard variant="tonal" @click="openNotificationInfoDialog">
      <span class="absolute top-3 right-12">
        <IconBtn>
          <VIcon class="cursor-move" icon="mdi-drag" />
        </IconBtn>
      </span>
      <VDialogCloseBtn @click="onClose" />
      <VCardText class="flex justify-space-between align-center gap-3">
        <div class="align-self-start">
          <div class="flex items-center">
            <VBadge v-if="props.notification.enabled" dot inline color="success" class="me-1" />
            <span class="text-h6">{{ props.notification.name }}</span>
          </div>
          <div class="text-body-1 mb-3">{{ notificationTypeNames[notification.type] }}</div>
        </div>
        <VImg :src="getIcon" cover class="mt-7 me-1" max-width="3rem" />
      </VCardText>
    </VCard>
    <VDialog v-if="notificationInfoDialog" v-model="notificationInfoDialog" scrollable max-width="40rem">
      <VCard :title="`${props.notification.name} - ${t('notification.config')}`">
        <VDialogCloseBtn v-model="notificationInfoDialog" />
        <VDivider />
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6">
                <VSwitch v-model="notificationInfo.enabled" :label="t('notification.enabled')" />
              </VCol>
              <VCol cols="12">
                <VSelect
                  v-model="notificationInfo.switchs"
                  :items="notificationTypes"
                  :label="t('notification.type')"
                  :hint="t('notification.typeHint')"
                  multiple
                  clearable
                  chips
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow v-if="notificationInfo.type == 'wechat'">
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.name"
                  :label="t('notification.name')"
                  :placeholder="t('notification.name')"
                  :hint="t('notification.nameHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.WECHAT_CORPID"
                  :label="t('notification.wechat.corpId')"
                  :hint="t('notification.wechat.corpIdHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.WECHAT_APP_ID"
                  :label="t('notification.wechat.appId')"
                  :hint="t('notification.wechat.appIdHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.WECHAT_APP_SECRET"
                  :label="t('notification.wechat.appSecret')"
                  :hint="t('notification.wechat.appSecretHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.WECHAT_PROXY"
                  :label="t('notification.wechat.proxy')"
                  :hint="t('notification.wechat.proxyHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.WECHAT_TOKEN"
                  :label="t('notification.wechat.token')"
                  :hint="t('notification.wechat.tokenHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.WECHAT_ENCODING_AESKEY"
                  :label="t('notification.wechat.encodingAesKey')"
                  :hint="t('notification.wechat.encodingAesKeyHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.WECHAT_ADMINS"
                  :label="t('notification.wechat.admins')"
                  :placeholder="t('notification.wechat.adminsPlaceholder')"
                  :hint="t('notification.wechat.adminsHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow v-else-if="notificationInfo.type == 'telegram'">
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.name"
                  :label="t('notification.name')"
                  :placeholder="t('notification.name')"
                  :hint="t('notification.nameHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.TELEGRAM_TOKEN"
                  :label="t('notification.telegram.token')"
                  :hint="t('notification.telegram.tokenHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.TELEGRAM_CHAT_ID"
                  :label="t('notification.telegram.chatId')"
                  :hint="t('notification.telegram.chatIdHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.TELEGRAM_USERS"
                  :label="t('notification.telegram.users')"
                  :placeholder="t('notification.telegram.usersPlaceholder')"
                  :hint="t('notification.telegram.usersHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.TELEGRAM_ADMINS"
                  :label="t('notification.telegram.admins')"
                  :placeholder="t('notification.telegram.adminsPlaceholder')"
                  :hint="t('notification.telegram.adminsHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow v-else-if="notificationInfo.type == 'slack'">
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.name"
                  :label="t('notification.name')"
                  :placeholder="t('notification.name')"
                  :hint="t('notification.nameHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.SLACK_OAUTH_TOKEN"
                  :label="t('notification.slack.oauthToken')"
                  :placeholder="t('notification.slack.oauthTokenPlaceholder')"
                  :hint="t('notification.slack.oauthTokenHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.SLACK_APP_TOKEN"
                  :label="t('notification.slack.appToken')"
                  :placeholder="t('notification.slack.appTokenPlaceholder')"
                  :hint="t('notification.slack.appTokenHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.SLACK_CHANNEL"
                  :label="t('notification.slack.channel')"
                  :placeholder="t('notification.slack.channelPlaceholder')"
                  :hint="t('notification.slack.channelHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow v-else-if="notificationInfo.type == 'synologychat'">
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.name"
                  :label="t('notification.name')"
                  :placeholder="t('notification.name')"
                  :hint="t('notification.nameHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.SYNOLOGYCHAT_WEBHOOK"
                  :label="t('notification.synologychat.webhook')"
                  :hint="t('notification.synologychat.webhookHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.SYNOLOGYCHAT_TOKEN"
                  :label="t('notification.synologychat.token')"
                  :hint="t('notification.synologychat.tokenHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow v-else-if="notificationInfo.type == 'vocechat'">
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.name"
                  :label="t('notification.name')"
                  :placeholder="t('notification.name')"
                  :hint="t('notification.nameHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.VOCECHAT_HOST"
                  :label="t('notification.vocechat.host')"
                  :hint="t('notification.vocechat.hostHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.VOCECHAT_API_KEY"
                  :label="t('notification.vocechat.apiKey')"
                  :hint="t('notification.vocechat.apiKeyHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.VOCECHAT_CHANNEL_ID"
                  :label="t('notification.vocechat.channelId')"
                  :placeholder="t('notification.vocechat.channelIdPlaceholder')"
                  :hint="t('notification.vocechat.channelIdHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow v-else-if="notificationInfo.type == 'webpush'">
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.name"
                  :label="t('notification.name')"
                  :placeholder="t('notification.name')"
                  :hint="t('notification.nameHint')"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.config.WEBPUSH_USERNAME"
                  :label="t('notification.webpush.username')"
                  :hint="t('notification.webpush.usernameHint')"
                  persistent-hint
                />
              </VCol>
            </VRow>
            <VRow v-else>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.type"
                  :label="t('notification.type')"
                  :hint="t('notification.customTypeHint')"
                  persistent-hint
                  active
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="notificationInfo.name"
                  :label="t('notification.name')"
                  :hint="t('notification.nameRequired')"
                  persistent-hint
                  active
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="pt-3">
          <VBtn @click="saveNotificationInfo" variant="elevated" prepend-icon="mdi-content-save" class="px-5">
            {{ t('common.confirm') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
