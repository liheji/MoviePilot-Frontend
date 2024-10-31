<!-- eslint-disable sonarjs/no-duplicate-string -->
<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import { VRow } from 'vuetify/lib/components/index.mjs'
import draggable from 'vuedraggable'
import api from '@/api'
import { DownloaderConf, MediaServerConf } from '@/api/types'
import DownloaderCard from '@/components/cards/DownloaderCard.vue'
import MediaServerCard from '@/components/cards/MediaServerCard.vue'
import debounce from 'lodash/debounce'

// 防抖时间
const debounceTime = 500

// 系统设置项
const SystemSettings = ref<any>({
  MEDIASERVER_SYNC_INTERVAL: 6,
})

// 是否发送请求的总开关
const isRequest = ref(true)

// 选中的媒体服务器
const mediaServers = ref<MediaServerConf[]>([])

// 下载器
const downloaders = ref<DownloaderConf[]>([])

// 提示框
const $toast = useToast()

// 调用API查询下载器设置
async function loadDownloaderSetting() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/Downloaders')
    downloaders.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 重载系统生效配置
async function reloadSystem() {
  try {
    const result: { [key: string]: any } = await api.get('system/reload')
    if (result.success) $toast.success('系统配置已生效')
    else $toast.error('重载系统失败！')
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存下载器设置
const saveDownloaderSetting = debounce(async () => {
  try {
    // 提取启用的下载器
    const enabledDownloaders = downloaders.value.filter(item => item.enabled);
    // 有启动的下载器时
    if (enabledDownloaders.length > 0) {
      downloaders.value = handleDefaultDownloaders(enabledDownloaders, downloaders.value);
    }
    const result: { [key: string]: any } = await api.post('system/setting/Downloaders', downloaders.value)
    if (result.success) $toast.success('下载器设置保存成功')
    else $toast.error('下载器设置保存失败！')

    await loadDownloaderSetting()
    await reloadSystem()
  } catch (error) {
    console.log(error)
  }
}, debounceTime)

// 处理默认下载器状态
function handleDefaultDownloaders(enabledDownloaders: any[], downloaders: any[]) {
  const enabledDefaultDownloader = enabledDownloaders.find(item => item.default);
  if (enabledDownloaders.length > 0 && !enabledDefaultDownloader) {
    downloaders = downloaders.map(item => {
      if (item === enabledDownloaders[0]) {
        $toast.info(`未设置默认下载器，已将【${item.name}】作为默认下载器`);
        return {...item, default: true };
      }
      // 清除其他下载器的默认下载器状态
      return {...item, default: false };
    });
  }
  return downloaders;
}

// 调用API查询媒体服务器设置
async function loadMediaServerSetting() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/MediaServers')
    mediaServers.value = result.data?.value ?? []
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存媒体服务器设置
const saveMediaServerSetting = debounce(async () => {
  try {
    const result: { [key: string]: any } = await api.post('system/setting/MediaServers', mediaServers.value)
    if (result.success) $toast.success('媒体服务器设置保存成功')
    else $toast.error('媒体服务器设置保存失败！')

    await loadMediaServerSetting()
    await reloadSystem()
  } catch (error) {
    console.log(error)
  }
}, debounceTime)

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      const {
        MEDIASERVER_SYNC_INTERVAL,
      } = result.data
      SystemSettings.value = {
        MEDIASERVER_SYNC_INTERVAL,
      }
    }
  } catch (error) {
    console.log(error)
  }
}

// 调用API保存系统设置
const saveSystemSetting = debounce(async () => {
  try {
    const result: { [key: string]: any } = await api.post('system/env', SystemSettings.value)

    if (result.success) $toast.success('保存设置成功')
    else $toast.error('保存设置失败！')
  } catch (error) {
    console.log(error)
  }
}, debounceTime)

// 添加下载器
function addDownloader(downloader: string) {
  let name = `下载器${downloaders.value.length + 1}`;
  while (downloaders.value.some(item => item.name === name)) {
    name = `下载器${parseInt(name.split('下载器')[1]) + 1}`;
  }
  downloaders.value.push({
    name: name,
    type: downloader,
    default: false,
    enabled: false,
    config: {},
  })
}

// 删除下载器
const removeDownloader = debounce((ele: DownloaderConf) => {
  const index = downloaders.value.indexOf(ele)
  downloaders.value.splice(index, 1)
}, debounceTime)

// 下载器变化
function onDownloaderChange(downloader: DownloaderConf, name: string) {
  const index = downloaders.value.findIndex(item => item.name === name)
  if (index !== -1) downloaders.value[index] = downloader
}

// 添加媒体服务器
const addMediaServer = debounce( (mediaserver: string) => {
  let name = `服务器${mediaServers.value.length + 1}`;
  while (mediaServers.value.some(item => item.name === name)) {
    name = `服务器${parseInt(name.split('服务器')[1]) + 1}`;
  }
  mediaServers.value.push({
    name: name,
    type: mediaserver,
    enabled: false,
    config: {},
  })
}, debounceTime)

// 删除媒体服务器
const removeMediaServer = debounce((ele: MediaServerConf) => {
  const index = mediaServers.value.indexOf(ele)
  if (index !== -1) mediaServers.value.splice(index, 1)
}, debounceTime)

// 变更媒体服务器
function onMediaServerChange(mediaserver: MediaServerConf, name: string) {
  const index = mediaServers.value.findIndex(item => item.name === name)
  if (index !== -1) mediaServers.value[index] = mediaserver
}

// 加载数据
onMounted(() => {
  loadDownloaderSetting()
  loadMediaServerSetting()
  loadSystemSettings()
})

onActivated(async () => {
  isRequest.value = true
})

onDeactivated(() => {
  isRequest.value = false
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>基础设置</VCardTitle>
          <VCardSubtitle>设置服务器的全局功能。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.MEDIASERVER_SYNC_INTERVAL"
                  label="媒体服务器同步间隔"
                  hint="不宜设置间隔过短的时间，这会导致服务器性能占用增高。"
                  persistent-hint
                  clearable
                  suffix="小时"
                  type="number"
                  min="1"
                  style="width: fit-content"
                  :rules="[
                    v => !!v || '必选项，请勿留空',
                    v => !isNaN(v) || '仅支持输入数字，请勿输入其他字符',
                    v => v >= 1 || '间隔不能小于1个小时',
                  ]"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSystemSetting"> 保存 </VBtn>
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
          <VCardTitle>下载器</VCardTitle>
          <VCardSubtitle>只有默认下载器才会被默认使用。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <draggable
            v-model="downloaders"
            handle=".cursor-move"
            item-key="name"
            tag="div"
            :component-data="{ 'class': 'grid gap-3 grid-app-card' }"
          >
            <template #item="{ element }">
              <DownloaderCard
                :downloader="element"
                :downloaders="downloaders"
                @close="removeDownloader(element)"
                @change="onDownloaderChange"
                :allow-refresh="isRequest"
              />
            </template>
          </draggable>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveDownloaderSetting"> 保存 </VBtn>
              <VBtn color="success" variant="tonal">
                <VIcon icon="mdi-plus" />
                <VMenu activator="parent" close-on-content-click>
                  <VList>
                    <VListItem variant="plain" @click="addDownloader('qbittorrent')">
                      <VListItemTitle>Qbittorrent</VListItemTitle>
                    </VListItem>
                    <VListItem variant="plain" @click="addDownloader('transmission')">
                      <VListItemTitle>Transmission</VListItemTitle>
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
          <VCardTitle>媒体服务器</VCardTitle>
          <VCardSubtitle>所有启用的媒体服务器都会被使用。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <draggable
            v-model="mediaServers"
            handle=".cursor-move"
            item-key="name"
            tag="div"
            :component-data="{ 'class': 'grid gap-3 grid-app-card' }"
          >
            <template #item="{ element }">
              <MediaServerCard
                :mediaserver="element"
                :mediaservers="mediaServers"
                @close="removeMediaServer(element)"
                @change="onMediaServerChange"
              />
            </template>
          </draggable>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveMediaServerSetting"> 保存 </VBtn>
              <VBtn color="success" variant="tonal">
                <VIcon icon="mdi-plus" />
                <VMenu activator="parent" close-on-content-click>
                  <VList>
                    <VListItem variant="plain" @click="addMediaServer('emby')">
                      <VListItemTitle>Emby</VListItemTitle>
                    </VListItem>
                    <VListItem variant="plain" @click="addMediaServer('jellyfin')">
                      <VListItemTitle>Jellyfin</VListItemTitle>
                    </VListItem>
                    <VListItem variant="plain" @click="addMediaServer('plex')">
                      <VListItemTitle>Plex</VListItemTitle>
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
</template>
