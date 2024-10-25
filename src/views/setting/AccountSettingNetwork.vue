<script lang="ts" setup>
import {useToast} from 'vue-toast-notification'
import {VRow} from 'vuetify/lib/components/index.mjs'
import api from '@/api'
import debounce from 'lodash/debounce'

// 系统设置项
const SystemSettings = ref({
  DOH_ENABLE: false,
  GITHUB_PROXY: '',
  GITHUB_TOKEN: '',
  PIP_PROXY: '',

  DOH_SERVER: '',
  DOH_DOMAINS: '',
  OCR_HOST: '',
})

// 高级设置项
const AdvancedSettings = ref({
  DOH_SERVER: '',
  DOH_DOMAINS: '',
  OCR_HOST: '',
})

// 防抖时间
const debounceTime = 500

// 高级设置弹窗
const isAdvanced = ref(false)

// 是否发送请求的总开关
const isRequest = ref(true)

// 提示框
const $toast = useToast()

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

// 加载系统设置
async function loadSystemSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/env')
    if (result.success) {
      const {
        // 需要查询的变量
        DOH_ENABLE,
        GITHUB_PROXY,
        GITHUB_TOKEN,
        PIP_PROXY,

        DOH_SERVER,
        DOH_DOMAINS,
        OCR_HOST,
      } = result.data
      SystemSettings.value = {
        DOH_ENABLE: DOH_ENABLE || false,
        GITHUB_PROXY: GITHUB_PROXY || null,
        GITHUB_TOKEN: GITHUB_TOKEN || null,
        PIP_PROXY: PIP_PROXY || null,

        DOH_SERVER: DOH_SERVER || null,
        DOH_DOMAINS: DOH_DOMAINS || null,
        OCR_HOST: OCR_HOST || null,
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
    if (result.success) {
      $toast.success('保存设置成功')
      await reloadSystem()
    } else $toast.error('保存设置失败！')
  } catch (error) {
    console.log(error)
  }
}, debounceTime)

// 预设部分Github加速站
const githubMirrorsItems = [
  'https://mirror.ghproxy.com/',  // GitHub Proxy
  'https://ghp.ci/',  // GitHub Proxy 子站
]

// 预设部分PIP镜像站
const pipMirrorsItems = [
  'https://pypi.tuna.tsinghua.edu.cn/simple',  // 清华大学
  'https://pypi.mirrors.ustc.edu.cn/simple',  // 中国科技大学
  'https://mirrors.pku.edu.cn/pypi/web/simple',  // 北京大学
  'https://mirrors.aliyun.com/pypi/simple',  // 阿里云
  'https://mirrors.cloud.tencent.com/pypi/simple',  // 腾讯云
  'https://mirrors.163.com/pypi/simple',  // 网易云
  'https://pypi.doubanio.com/simple',  // 豆瓣
  'https://mirrors.hust.edu.cn/pypi/web/simple',  // 华中理工大学
  'https://mirrors.bfsu.edu.cn/pypi/web/simple', // 北京外国语大学
]

// 打开高级设置弹窗
const openAdvancedSettings = () => {
  for (const key in SystemSettings.value) {
    AdvancedSettings.value[key] = SystemSettings.value[key]
  }
  isAdvanced.value = true
}

// 直接关闭高级设置弹窗
const closeAdvancedSettings = () => {
  isAdvanced.value = false
  for (const key in SystemSettings.value) {
    AdvancedSettings.value[key] = SystemSettings.value[key]
  }
}

// 保存高级设置
const saveAdvancedSettings = debounce(async () => {
  $toast.info('高级设置确定成功，待保存后生效')
  for (const key in AdvancedSettings.value) {
    SystemSettings.value[key] = AdvancedSettings.value[key]
  }
  isAdvanced.value = false
}, debounceTime)

// 恢复高级设置默认值，直接赋值
const loadAdvancedSettings = () => {
  AdvancedSettings.value = {
    DOH_SERVER: "1.0.0.1,1.1.1.1,9.9.9.9,149.112.112.112",
    DOH_DOMAINS: "api.themoviedb.org,api.tmdb.org,webservice.fanart.tv,api.github.com,github.com,raw.githubusercontent.com,api.telegram.org",
    OCR_HOST: "https://movie-pilot.org",
  }
}

// 加载数据
onMounted(() => {
  loadSystemSettings()
})

// 当isAdvanced变化时，且为true时，重新从SystemSettings赋值到AdvancedSettings
watch(isAdvanced, (value) => {
  if (value) openAdvancedSettings()
})
</script>

<template>
  <VRow>
    <!-- DOH -->
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>基础设置</VCardTitle>
          <VCardSubtitle>设置DNS over HTTPS服务器，对特定域名使用DOH解析以避免DNS污染。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6" class="flex align-center">
                <div>
                  <VSwitch
                    v-model="SystemSettings.DOH_ENABLE"
                    label="启用 DNS over HTTPS"
                    hint="启用后，系统将使用DOH服务器解析域名"
                    persistent-hint
                  />
                </div>
                <div class="ml-10">
                  <VAlert
                    type="info"
                    variant="tonal"
                    class="whitespace-pre-line"
                    style="width: fit-content"
                    text="如果已经配置了 PROXY_HOST 则建议关闭 DOH 功能。"
                  />
                </div>
              </VCol>
              <VCol cols="12" md="6" class="flex align-center">
                <div>
                  <VSwitch
                    v-model="isAdvanced"
                    label="高级设置"
                    hint="进入高级设置弹窗页面"
                    persistent-hint
                  />
                </div>
                <div class="ml-10">
                  <VAlert
                    type="info"
                    variant="tonal"
                    class="whitespace-pre-line mr-3"
                    style="width: fit-content"
                    text="该页面包含一些高级设置，不建议修改，除非它们的使用方法！"
                  />
                </div>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn mtype="submit" @click="saveSystemSetting"> 保存</VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 加速 -->
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>Github 与 PIP</VCardTitle>
          <VCardSubtitle>设置PIP加速站、Github加速站、Github Token增加连接的限流阈值，保证连通性。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6">
                <VCombobox
                  v-model="SystemSettings.GITHUB_PROXY"
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
                  v-model="SystemSettings.GITHUB_TOKEN"
                  label="Github Token"
                  placeholder="ghp_**** 或 github_pat_****"
                  hint="用于提高Github API访问限流阈值"
                  persistent-hint
                  clearable
                  active
                >
                </VTextField>
              </VCol>
              <VCol cols="12" md="6">
                <VCombobox
                  v-model="SystemSettings.PIP_PROXY"
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
              <VBtn mtype="submit" @click="saveSystemSetting"> 保存</VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 高级设置弹窗 -->
    <VDialog v-model="isAdvanced" scrollable max-width="40rem" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle>网络高级设置</VCardTitle>
          <VCardSubtitle>修改前，请先了解清除这些设置的作用。</VCardSubtitle>
        </VCardItem>
        <DialogCloseBtn @click="closeAdvancedSettings"/>
        <VDivider/>
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12">
                <VTextField
                  v-model="AdvancedSettings.OCR_HOST"
                  label="验证码识别服务器"
                  hint="用于识别验证码"
                  persistent-hint
                  clearable
                  active
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="AdvancedSettings.DOH_SERVER"
                  label="DOH 服务器"
                  placeholder="格式：https://dns.google/dns-query,1.1.1.1"
                  hint="多个服务器使用逗号分隔"
                  persistent-hint
                  clearable
                  active
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="AdvancedSettings.DOH_DOMAINS"
                  label="DOH 域名"
                  placeholder="格式：example.com,example2.com"
                  hint="多个域名使用逗号分隔"
                  persistent-hint
                  clearable
                  active
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="pt-3">
          <VBtn
            color="info"
            variant="elevated"
            prepend-icon="mdi-reload"
            @click="loadAdvancedSettings"
            class="px-5"
          >
            默认值
          </VBtn>
          <VBtn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-content-save"
            @click="saveAdvancedSettings"
            class="px-5"
          >
            确定
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VRow>
</template>
