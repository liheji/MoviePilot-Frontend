<script lang="ts" setup>
import {useToast} from 'vue-toast-notification'
import api from "@/api"
import debounce from 'lodash/debounce'

// 防抖时间
const debounceTime = 500

// 提示框
const $toast = useToast()

// 系统设置
const SystemSettings = ref<any>({
  Basis: {
    FANART_ENABLE: false,
    RECOGNIZE_SOURCE: 'themoviedb',
    SCRAP_SOURCE: 'themoviedb',
    META_CACHE_EXPIRE: 0,
    MOVIE_RENAME_FORMAT: '',
    TV_RENAME_FORMAT: '',
  },
})

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
            (SystemSettings.value[sectionKey] as any)[key] = v
          }
        })
      }
    } else $toast.error('加载设置失败！')
  } catch (error) {
    console.log(error)
  }
}

// 保存设置
const saveSystemSettings = debounce(async (value: any) => {
  try {
    const result: { [key: string]: any } = await api.post('system/env', value)
    if (result.success) {
      $toast.success('保存设置成功')
      await reloadSystem()
      await loadSystemSettings()
    } else $toast.error('保存设置失败！')
  } catch (error) {
    console.log(error)
  }
}, debounceTime)

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

// 恢复电影设置默认值
const loadDefaultMovieSetting = debounce(async () => {
  SystemSettings.value.Basis.MOVIE_RENAME_FORMAT = '{{title}}{% if year %} ({{year}}){% endif %}/{{title}}{% if year %} ({{year}}){% endif %}{% if part %}-{{part}}{% endif %}{% if videoFormat %} - {{videoFormat}}{% endif %}{{fileExt}}'
}, debounceTime)

// 恢复电视剧设置默认值
const loadDefaultTVSetting = debounce(async () => {
  SystemSettings.value.Basis.TV_RENAME_FORMAT = '{{title}}{% if year %} ({{year}}){% endif %}/Season {{season}}/{{title}} - {{season_episode}}{% if part %}-{{part}}{% endif %}{% if episode %} - 第 {{episode}} 集{% endif %}{{fileExt}}'
}, debounceTime)

// 数据源
const sourceItems = [
  { "title": "TheMovieDb", "value": "themoviedb"},
  { "title": "豆瓣", "value": "douban" }
]

// 加载数据
onMounted(() => {
  loadSystemSettings()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>基础设置</VCardTitle>
          <VCardSubtitle>设置通用的整理转移功能。</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VRow>
            <VCol cols="12" md="3">
              <VSwitch
                v-model="SystemSettings.Basis.FANART_ENABLE"
                label="Fanart图片数据源"
                hint="启用Fanart图片数据源"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="SystemSettings.Basis.RECOGNIZE_SOURCE"
                :items="sourceItems"
                label="媒体信息识别来源"
                hint="刮削时的媒体信息识别使用的数据源"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="SystemSettings.Basis.SCRAP_SOURCE"
                :items="sourceItems"
                label="媒体刮削数据源"
                hint="刮削元数据及图片使用的数据源"
                persistent-hint
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="SystemSettings.Basis.META_CACHE_EXPIRE"
                label="元数据缓存过期时间"
                hint="当缓存过期时间为 0 时，则使用内置默认值"
                persistent-hint
                min="0"
                type="number"
                suffix="小时"
                :rules="[
                   v => v === 0 || !!v || '请输入元数据缓存时间',
                   v => v >= 0 || '元数据缓存时间必须大于等于0'
                   ]"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="SystemSettings.Basis.MOVIE_RENAME_FORMAT"
                label="电影重命名格式"
                hint="使用Jinja2语法"
                persistent-hint
                clearable
                prependInnerIcon="mdi-reload"
                @click:prependInner="loadDefaultMovieSetting"
                active
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="SystemSettings.Basis.TV_RENAME_FORMAT"
                label="电视剧重命名格式"
                hint="使用Jinja2语法"
                persistent-hint
                clearable
                prependInnerIcon="mdi-reload"
                @click:prependInner="loadDefaultTVSetting"
                active
              />
            </VCol>
            <VCol cols="12">
              <VAlert type="info" variant="tonal" class="whitespace-pre-line" style="inline-size: fit-content">
                <span>Jinja2语法参考：</span>
                <a href="https://jinja.palletsprojects.com/en/3.0.x/templates" target="_blank">
                  <u>https://jinja.palletsprojects.com/en/3.0.x/templates</u>
                </a>
              </VAlert>
            </VCol>
          </VRow>
        </VCardText>
        <VCardText>
          <VForm @submit.prevent="() => {}">
            <div class="d-flex flex-wrap gap-4 mt-4">
              <VBtn type="submit" @click="saveSystemSettings(SystemSettings.Basis)"> 保存</VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

