<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import api from '@/api'
import { copyToClipboard } from '@/@core/utils/navigator'
import debounce from 'lodash/debounce'
import AdvancedNetworkSettingsDialog from '@/components/dialog/AdvancedNetworkSettingsDialog.vue'
import AdvancedSystemSettingsDialog from '@/components/dialog/AdvancedSystemSettingsDialog.vue'

// 系统设置默认值
const SystemSettings = ref<any>({
  // 系统设置
  Basis: {
    // 基础设置
    AUXILIARY_AUTH_ENABLE: false,
    GLOBAL_IMAGE_CACHE: false,
    APP_DOMAIN: '',
    API_TOKEN: '',
    WALLPAPER: 'tmdb',
  },
  // 高级系统设置
  Advanced: {
    DEV: false,
    DEBUG: false,
    PLUGIN_AUTO_RELOAD: false,
    REPO_GITHUB_TOKEN: '',
  },
  // 网络设置
  Network: {
    // 基础网络设置
    TMDB_API_DOMAIN: '',
    TMDB_IMAGE_DOMAIN: '',
    DOH_ENABLE: true,
    GITHUB_PROXY: '',
    GITHUB_TOKEN: null,
    PIP_PROXY: null,
    // 隐藏设置，不在页面显示
    PROXY_HOST: '',
  },
  // 高级网络设置
  AdvancedNetwork: {
    DOH_RESOLVERS: '',
    DOH_DOMAINS: '',
    OCR_HOST: '',
  },
})

// 高级设置弹窗
const isAdvancedSystemSettingsDialogOpen = ref(false)
const isAdvancedNetworkSettingsDialogOpen = ref(false)

// 提示框
const $toast = useToast()

// 重载系统生效配置
async function reloadSystem() {
  try {
    const result: { [key: string]: any } = await api.get('system/reload')
    if (result.success) {
      $toast.success('系统配置已生效')
      await loadSystemSettings()
    } else $toast.error('重载系统失败！')
  } catch (error) {
    console.log(error)
  }
}

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      // 将API返回的值赋值给SystemSettings
      for (const sectionKey of Object.keys(SystemSettings.value) as Array<keyof typeof SystemSettings.value>) {
        Object.keys(SystemSettings.value[sectionKey]).forEach((key: string) => {
          let v: any
          if (result.data.hasOwnProperty(key)) {
            v = result.data[key]
            // 空字符串转为null，避免空字符串导致前端显示问题
            if (v === '') {
              v = null
            }
            ;(SystemSettings.value[sectionKey] as any)[key] = v
          }
        })
      }
    }
  } catch (error) {
    console.log(error)
    $toast.error('系统设置加载失败')
  }
}

// 调用API保存设置
async function saveSystemSetting(value: { [key: string]: any }) {
  try {
    const result: { [key: string]: any } = await api.post('system/env', value)

    if (result.success) {
      $toast.success('保存设置成功')
      await reloadSystem()
      await loadSystemSettings()
    }
  } catch (error) {
    console.log(error)
    $toast.error('保存设置失败！')
  }
}

// 保存系统设置
async function saveSystemSettings() {
  const Settings = { ...SystemSettings.value.Basis, ...SystemSettings.value.Advanced }
  await saveSystemSetting(Settings)
}

// 保存网络设置
async function saveNetworkSettings() {
  const Settings = { ...SystemSettings.value.Network, ...SystemSettings.value.AdvancedNetwork }
  // 查找PROXY_HOST，并删除，避免意外覆盖
  if (Settings.PROXY_HOST) delete Settings.PROXY_HOST
  await saveSystemSetting(Settings)
}

// 高级设置变化，等待保存
function saveAdvancedSettings(Settings: any, key: string) {
  if (!Settings) return
  if (!key) return
  // 检查Settings中的键是否在SystemSettings的[key]中存在，有则使用Settings的值替换SystemSettings中的值
  for (const settingKey in Settings) {
    if (SystemSettings.value[key].hasOwnProperty(settingKey)) {
      ;(SystemSettings.value[key] as any)[settingKey] = Settings[settingKey]
    }
  }
  $toast.info('高级设置已更改，待保存后生效')
}

// 快捷复制到剪贴板
function copyValue(value: string) {
  try {
    copyToClipboard(value)
    $toast.success('已复制到剪贴板')
  } catch (error) {
    $toast.error('复制失败！')
    console.log(error)
  }
}

// 登录首页壁纸来源
const wallpaperItems = [
  { title: 'TheMovieDB电影海报', value: 'tmdb' },
  { title: 'Bing每日壁纸', value: 'bing' },
]

// 创建随机字符串
function createRandomString() {
  const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
  const array = new Uint8Array(16)
  window.crypto.getRandomValues(array)
  SystemSettings.value.Basis.API_TOKEN = Array.from(array, byte => charset[byte % charset.length]).join('')
}

// 预设部分Github加速站
const githubMirrorsItems = [
  'https://mirror.ghproxy.com/', // GitHub Proxy
  'https://ghp.ci/', // GitHub Proxy 子站
]

// 预设部分PIP镜像站
const pipMirrorsItems = [
  'https://pypi.tuna.tsinghua.edu.cn/simple', // 清华大学
  'https://pypi.mirrors.ustc.edu.cn/simple', // 中国科技大学
  'https://mirrors.pku.edu.cn/pypi/web/simple', // 北京大学
  'https://mirrors.aliyun.com/pypi/simple', // 阿里云
  'https://mirrors.cloud.tencent.com/pypi/simple', // 腾讯云
  'https://mirrors.163.com/pypi/simple', // 网易云
  'https://pypi.doubanio.com/simple', // 豆瓣
  'https://mirrors.hust.edu.cn/pypi/web/simple', // 华中理工大学
  'https://mirrors.bfsu.edu.cn/pypi/web/simple', // 北京外国语大学
]

// 加载数据
onMounted(() => {
  loadSystemSettings()
})
</script>

<template>
  <VRow>
    <!-- 系统设置 -->
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>基础系统设置</VCardTitle>
          <VCardSubtitle>设置用户辅助认证、登录首页壁纸、访问域名、插件市场等基础化设置。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="3">
                <VSwitch
                  v-model="SystemSettings.Basis.AUXILIARY_AUTH_ENABLE"
                  label="用户辅助认证"
                  hint="允许通过外部服务，进行认证、单点登录以及自动创建用户"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="3">
                <VSwitch
                  v-model="SystemSettings.Basis.GLOBAL_IMAGE_CACHE"
                  label="全局图片缓存"
                  hint="将媒体图片缓存到本地，增强用户体验"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="3">
                <VSwitch
                  v-model="isAdvancedSystemSettingsDialogOpen"
                  label="高级系统设置"
                  hint="进入高级系统设置页面"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" md="3">
                <VSelect
                  v-model="SystemSettings.Basis.WALLPAPER"
                  label="登录首页壁纸"
                  hint="选择登陆页面背景来源"
                  persistent-hint
                  :items="wallpaperItems"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.Basis.APP_DOMAIN"
                  label="访问域名"
                  placeholder="格式：http(s)://domain:port"
                  hint="用于发送通知时，添加快捷跳转地址"
                  persistent-hint
                  clearable
                  :appendInnerIcon="SystemSettings.Basis.APP_DOMAIN ? 'mdi-content-copy' : ''"
                  @click:appendInner="SystemSettings.Basis.APP_DOMAIN && copyValue(SystemSettings.Basis.APP_DOMAIN)"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.Basis.API_TOKEN"
                  label="API Token"
                  hint="不得低于16位，用于Jellyseerr/Overseerr、媒体服务器Webhook等配置以及部分支持API_TOKEN的API请求"
                  persistent-hint
                  clearable
                  prependInnerIcon="mdi-reload"
                  :appendInnerIcon="SystemSettings.Basis.API_TOKEN ? 'mdi-content-copy' : ''"
                  @click:prependInner="createRandomString"
                  @click:appendInner="SystemSettings.Basis.API_TOKEN && copyValue(SystemSettings.Basis.API_TOKEN)"
                  :rules="[(v: string) => !!v || '必填项；请输入API Token', (v: string) => v.length >= 16 || 'API Token不得低于16位']"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSystemSettings"> 保存 </VBtn>
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
          <VCardTitle>基础网络设置</VCardTitle>
          <VCardSubtitle>设置DOH、PIP加速站、Github加速站、Github Token等，增加网络稳定性，保证连通性。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6" class="flex align-center">
                <div>
                  <VSwitch
                    v-model="SystemSettings.Network.DOH_ENABLE"
                    label="DNS over HTTPS解析"
                    hint="使用DOH服务器解析域名"
                    persistent-hint
                  />
                </div>
                <div class="ml-10">
                  <VAlert type="info" variant="tonal" class="whitespace-pre-line" style="inline-size: fit-content">
                    <span v-if="SystemSettings.Network.PROXY_HOST"
                      >当前已成功配置 PROXY_HOST ，建议关闭 DOH 功能。</span
                    >
                    <span v-else>暂未配置 PROXY_HOST，如出现网络连通性问题，可考虑开启 DOH 功能。 </span>
                  </VAlert>
                </div>
              </VCol>
              <VCol cols="12" md="6" class="flex align-center">
                <div>
                  <VSwitch
                    v-model="isAdvancedNetworkSettingsDialogOpen"
                    label="高级网络设置"
                    hint="进入高级网络设置页面"
                    persistent-hint
                  />
                </div>
                <div class="ml-10">
                  <VAlert
                    type="info"
                    variant="tonal"
                    class="whitespace-pre-line mr-3"
                    style="inline-size: fit-content"
                    text="不建议修改，除非你知道它们的使用方法！"
                  />
                </div>
              </VCol>
              <VCol cols="12" md="6">
                <VCombobox
                  v-model="SystemSettings.Network.TMDB_API_DOMAIN"
                  label="TMDB API域名"
                  placeholder="格式：api.themoviedb.org"
                  hint="可替换为自定义的API域名"
                  persistent-hint
                  clearable
                  active
                  :items="['api.themoviedb.org']"
                  :rules="[(v: string) => !!v || '必填项；请输入TMDB API域名']"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VCombobox
                  v-model="SystemSettings.Network.TMDB_IMAGE_DOMAIN"
                  label="TMDB 图片服务器"
                  placeholder="格式：image.tmdb.org"
                  hint="可替换为自定义的图片域名"
                  persistent-hint
                  clearable
                  active
                  :items="['image.tmdb.org', 'static-mdb.v.geilijiasu.com']"
                  :rules="[(v: string) => !!v || '必填项；请输入TMDB API域名']"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VCombobox
                  v-model="SystemSettings.Network.GITHUB_PROXY"
                  label="Github加速站"
                  placeholder="格式：https://mirror.ghproxy.com/"
                  hint="留空则不使用；预设部分可选站点，也可手动输入自建站点。格式：https://mirror.ghproxy.com/ 末尾需要带 /"
                  persistent-hint
                  clearable
                  :items="githubMirrorsItems"
                  active
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="SystemSettings.Network.GITHUB_TOKEN"
                  label="Github Token"
                  placeholder="ghp_**** 或 github_pat_****"
                  hint="用于提高Github API访问限流阈值"
                  persistent-hint
                  clearable
                  active
                  :appendInnerIcon="SystemSettings.Network.GITHUB_TOKEN ? 'mdi-content-copy' : ''"
                  @click:appendInner="
                    SystemSettings.Network.GITHUB_TOKEN && copyValue(SystemSettings.Network.GITHUB_TOKEN)
                  "
                >
                </VTextField>
              </VCol>
              <VCol cols="12" md="6">
                <VCombobox
                  v-model="SystemSettings.Network.PIP_PROXY"
                  label="PIP加速站"
                  placeholder="格式：https://pypi.tuna.tsinghua.edu.cn/simple"
                  hint="留空则不使用；预设部分可选站点，也可手动输入自建站点，格式: https://pypi.tuna.tsinghua.edu.cn/simple"
                  persistent-hint
                  clearable
                  :items="pipMirrorsItems"
                  active
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveNetworkSettings"> 保存 </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- 高级系统设置 -->
  <AdvancedSystemSettingsDialog
    v-if="isAdvancedSystemSettingsDialogOpen"
    v-model="isAdvancedSystemSettingsDialogOpen"
    max-width="60rem"
    persistent
    z-index="1010"
    :AdvancedSystemSettings="SystemSettings.Advanced"
    @close="isAdvancedSystemSettingsDialogOpen = false"
    @change="saveAdvancedSettings"
  />

  <!-- 高级网络设置 -->
  <AdvancedNetworkSettingsDialog
    v-if="isAdvancedNetworkSettingsDialogOpen"
    v-model="isAdvancedNetworkSettingsDialogOpen"
    max-width="60rem"
    persistent
    z-index="1010"
    :AdvancedNetworkSettings="SystemSettings.AdvancedNetwork"
    @close="isAdvancedNetworkSettingsDialogOpen = false"
    @change="saveAdvancedSettings"
  />
</template>
