<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import api from '@/api'
import draggable from 'vuedraggable'
import type { NotificationConf, NotificationSwitchConf } from '@/api/types'
import NotificationChannelCard from '@/components/cards/NotificationChannelCard.vue'
import ProgressDialog from '@/components/dialog/ProgressDialog.vue'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 所有消息渠道
const notifications = ref<NotificationConf[]>([])

// 提示框
const $toast = useToast()

// 进度框
const progressDialog = ref(false)

// 消息类型开关
const notificationSwitchs = ref<NotificationSwitchConf[]>([
  {
    type: t('setting.notification.resourceDownload'),
    action: 'all',
  },
  {
    type: t('setting.notification.mediaImport'),
    action: 'all',
  },
  {
    type: t('setting.notification.subscription'),
    action: 'all',
  },
  {
    type: t('setting.notification.site'),
    action: 'admin',
  },
  {
    type: t('setting.notification.mediaServer'),
    action: 'admin',
  },
  {
    type: t('setting.notification.manualProcess'),
    action: 'admin',
  },
  {
    type: t('setting.notification.plugin'),
    action: 'admin',
  },
  {
    type: t('setting.notification.other'),
    action: 'admin',
  },
])

// 通知发送时间
const notificationTime = ref({
  start: '00:00',
  end: '23:59',
})

// 重载系统生效配置
async function reloadSystem() {
  progressDialog.value = true
  try {
    const result: { [key: string]: any } = await api.get('system/reload')
    if (result.success) $toast.success(t('setting.system.reloadSuccess'))
    else $toast.error(t('setting.system.reloadFailed'))
  } catch (error) {
    console.log(error)
  }
  progressDialog.value = false
}

// 添加通知渠道
function addNotification(notification: string) {
  let name = `${t('setting.notification.channel')}${notifications.value.length + 1}`
  while (notifications.value.some(item => item.name === name)) {
    name = `${t('setting.notification.channel')}${parseInt(name.split(t('setting.notification.channel'))[1]) + 1}`
  }
  notifications.value.push({
    name: name,
    type: notification,
    enabled: false,
    config: {},
  })
}

// 移除通知渠道
function removeNotification(notification: NotificationConf) {
  const index = notifications.value.indexOf(notification)
  if (index > -1) notifications.value.splice(index, 1)
}

// 调用API查询通知渠道设置
async function loadNotificationSetting() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/Notifications')
    notifications.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 调用API查询通知发送时间设置
async function loadNotificationTime() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/NotificationSendTime')
    notificationTime.value = result.data?.value ?? { start: '00:00', end: '23:59' }
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存通知设置
async function saveNotificationSetting() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/Notifications', notifications.value)
    if (result.success) {
      $toast.success(t('setting.notification.saveSuccess'))
      await reloadSystem()
    } else $toast.error(t('setting.notification.saveFailed'))
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存通知发送时间设置
async function saveNotificationTime() {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/NotificationSendTime', notificationTime.value)
    if (result.success) {
      $toast.success(t('setting.notification.timeSaveSuccess'))
      await reloadSystem()
    } else $toast.error(t('setting.notification.timeSaveFailed'))
  } catch (error) {
    console.log(error)
  }
}

// 通知渠道设置变化时赋值
function changNotificationSetting(notification: NotificationConf, name: string) {
  const index = notifications.value.findIndex(item => item.name === name)
  if (index !== -1) notifications.value[index] = notification
}

// 加载消息类型开关
async function loadNotificationSwitchs() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/NotificationSwitchs')
    if (result.data?.value && result.data?.value.length > 0) notificationSwitchs.value = result.data?.value
  } catch (error) {
    console.log(error)
  }
}

// 保存消息类型开关
async function saveNotificationSwitchs() {
  try {
    const result: { [key: string]: any } = await api.post(
      'system/setting/NotificationSwitchs',
      notificationSwitchs.value,
    )
    if (result.success) $toast.success(t('setting.notification.switchSaveSuccess'))
    else $toast.error(t('setting.notification.switchSaveFailed'))
  } catch (error) {
    console.log(error)
  }
}

// 加载数据
onMounted(() => {
  loadNotificationSetting()
  loadNotificationSwitchs()
  loadNotificationTime()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.notification.channels') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.notification.channelsDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <draggable
            v-model="notifications"
            handle=".cursor-move"
            item-key="name"
            tag="div"
            :component-data="{ 'class': 'grid gap-3 grid-app-card' }"
          >
            <template #item="{ element }">
              <NotificationChannelCard
                :notification="element"
                :notifications="notifications"
                @change="changNotificationSetting"
                @close="removeNotification(element)"
              />
            </template>
          </draggable>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn mtype="submit" @click="saveNotificationSetting"> {{ t('common.save') }} </VBtn>
              <VBtn color="success" variant="tonal">
                <VIcon icon="mdi-plus" />
                <VMenu activator="parent" close-on-content-click>
                  <VList>
                    <VListItem @click="addNotification('wechat')">
                      <VListItemTitle>{{ t('setting.notification.wechat') }}</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addNotification('telegram')">
                      <VListItemTitle>Telegram</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addNotification('slack')">
                      <VListItemTitle>Slack</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addNotification('synologychat')">
                      <VListItemTitle>SynologyChat</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addNotification('vocechat')">
                      <VListItemTitle>VoceChat</VListItemTitle>
                    </VListItem>
                    <VListItem @click="addNotification('webpush')">
                      <VListItemTitle>WebPush</VListItemTitle>
                    </VListItem>
                  </VList>
                </VMenu>
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.notification.scope') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.notification.scopeDesc') }}</VCardSubtitle>
        </VCardItem>
        <VTable class="text-no-wrap">
          <thead>
            <tr>
              <th scope="col">{{ t('setting.notification.messageType') }}</th>
              <th scope="col">{{ t('setting.notification.scopeRange') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in notificationSwitchs" :key="index">
              <td>
                {{ item.type }}
              </td>
              <td>
                <VRadioGroup v-model="item.action" inline>
                  <VRadio value="user" :label="t('setting.notification.operationUserOnly')" />
                  <VRadio value="admin" :label="t('setting.notification.adminOnly')" />
                  <VRadio value="user,admin" :label="t('setting.notification.userAndAdmin')" />
                  <VRadio value="all" :label="t('setting.notification.allUsers')" />
                </VRadioGroup>
              </td>
            </tr>
          </tbody>
        </VTable>
        <VDivider />
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveNotificationSwitchs"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>{{ t('setting.notification.sendTime') }}</VCardTitle>
          <VCardSubtitle>{{ t('setting.notification.sendTimeDesc') }}</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VRow>
            <VCol cols="6">
              <VTextField v-model="notificationTime.start" :label="t('setting.notification.startTime')" type="time" />
            </VCol>
            <VCol cols="6">
              <VTextField v-model="notificationTime.end" :label="t('setting.notification.endTime')" type="time" />
            </VCol>
          </VRow>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveNotificationTime"> {{ t('common.save') }} </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
  <!-- 进度框 -->
  <ProgressDialog
    v-if="progressDialog"
    v-model="progressDialog"
    :text="t('setting.system.reloading')"
    :indeterminate="true"
  />
</template>
