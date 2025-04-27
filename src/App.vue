<script lang="ts" setup>
import { useTheme } from 'vuetify'
import { checkPrefersColorSchemeIsDark } from '@/@core/utils'
import { ensureRenderComplete, removeEl } from './@core/utils/dom'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { getBrowserLocale, setI18nLanguage } from './plugins/i18n'
import { SupportedLocale } from './locales/types'

// 国际化
const { t } = useI18n()

// 生效主题
const { global: globalTheme } = useTheme()
let themeValue = localStorage.getItem('theme') || 'light'
const autoTheme = checkPrefersColorSchemeIsDark() ? 'dark' : 'light'
globalTheme.name.value = themeValue === 'auto' ? autoTheme : themeValue

// 生效语言
const localeValue = getBrowserLocale()
setI18nLanguage(localeValue as SupportedLocale)

// 从 provide 中获取全局设置
const globalSettings: any = inject('globalSettings')

// 显示状态
const show = ref(false)

// 检查是否登录
const authStore = useAuthStore()
const isLogin = computed(() => authStore.token)

// 背景图片
const backgroundImages = ref<string[]>([])
const activeImageIndex = ref(0)
const isTransparentTheme = computed(() => globalTheme.name.value === 'transparent')
let backgroundRotationTimer: NodeJS.Timeout | null = null

// ApexCharts 全局配置
declare global {
  interface Window {
    Apex: any
  }
}

if (window.Apex) {
  // 数据标签
  window.Apex.dataLabels = {
    formatter: function (_: number, { seriesIndex, w }: { seriesIndex: number; w: any }) {
      // 如果有小数点，保留两位小数，否则保留整数
      const data = w.config.series[seriesIndex]
      return data.toFixed(data % 1 === 0 ? 0 : 1)
    },
  }
  // 图例
  window.Apex.legend = {
    labels: {
      useSeriesColors: true,
    },
  }
  // 标题
  window.Apex.title = {
    style: {
      color: 'rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))',
    },
  }
}

// 更新data-theme属性以便CSS选择器能正确匹配
function updateHtmlThemeAttribute(themeName: string) {
  document.documentElement.setAttribute('data-theme', themeName)
  // 确保body元素也有相同的主题属性，以便更好地选择弹出窗口
  document.body.setAttribute('data-theme', themeName)
}

// 获取背景图片
async function fetchBackgroundImages() {
  try {
    backgroundImages.value = await api.get(`/login/${t('login.wallpapers')}`)
  } catch (e) {
    console.error(e)
  }
}

// 开始背景图片轮换
function startBackgroundRotation() {
  if (backgroundRotationTimer) clearInterval(backgroundRotationTimer)

  if (backgroundImages.value.length > 1) {
    backgroundRotationTimer = setInterval(() => {
      // 计算下一个图片索引
      const nextIndex = (activeImageIndex.value + 1) % backgroundImages.value.length
      // 预加载下一张图片
      preloadImage(backgroundImages.value[nextIndex]).then(success => {
        // 只有图片成功加载才切换
        if (success) {
          activeImageIndex.value = nextIndex
        }
      })
    }, 10000) // 每10秒切换一次
  }
}

// 预加载图片
function preloadImage(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image()
    const imageUrl = getImgUrl(url)

    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)

    // 设置超时，防止图片长时间加载
    const timeout = setTimeout(() => {
      img.src = ''
      resolve(false)
    }, 5000) // 5秒超时

    img.src = imageUrl

    // 如果图片已经缓存，onload可能不会触发
    if (img.complete) {
      clearTimeout(timeout)
      resolve(true)
    }
  })
}

// 计算图片地址
function getImgUrl(url: string) {
  // 使用图片缓存
  if (globalSettings.GLOBAL_IMAGE_CACHE)
    return `${import.meta.env.VITE_API_BASE_URL}system/cache/image?url=${encodeURIComponent(url)}`
  // 如果地址中包含douban则使用中转代理
  if (url.includes('doubanio.com'))
    return `${import.meta.env.VITE_API_BASE_URL}system/img/0?imgurl=${encodeURIComponent(url)}`
  return url
}

// 处理页面可见性变化
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // 如果已有背景图片数据，直接重启轮换
    if (backgroundImages.value.length > 0) {
      startBackgroundRotation()
    }
    // 如果没有背景图片数据，重新获取
    else {
      fetchBackgroundImages().then(() => startBackgroundRotation())
    }
  }
}

// 添加logo动画效果并延迟移除加载界面
function animateAndRemoveLoader() {
  const loadingBg = document.querySelector('#loading-bg') as HTMLElement
  if (loadingBg) {
    // 先添加完成动画类
    loadingBg.classList.add('loading-complete')

    // 等待动画完成后再移除元素
    setTimeout(() => {
      removeEl('#loading-bg')
      // 将background属性从html的style中移除
      document.documentElement.style.removeProperty('background')
      // 显示页面
      show.value = true
    }, 500) // 与CSS动画持续时间匹配
  }
}

onMounted(() => {
  // 初始化data-theme属性
  updateHtmlThemeAttribute(globalTheme.name.value)

  // 加载背景图片并开始轮换
  fetchBackgroundImages().then(() => startBackgroundRotation())

  // 添加页面可见性变化监听
  document.addEventListener('visibilitychange', handleVisibilityChange)

  ensureRenderComplete(() => {
    nextTick(() => {
      setTimeout(() => {
        // 移除加载动画
        animateAndRemoveLoader()
      }, 1500)
    })
  })
})

onUnmounted(() => {
  // 移除页面可见性监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // 清除轮换定时器
  if (backgroundRotationTimer) {
    clearInterval(backgroundRotationTimer)
    backgroundRotationTimer = null
  }
})
</script>

<template>
  <div class="app-wrapper">
    <!-- 透明主题背景 -->
    <template v-if="backgroundImages.length > 0 && (isTransparentTheme || !isLogin)">
      <div class="background-container">
        <div
          v-for="(imageUrl, index) in backgroundImages"
          :key="index"
          class="background-image"
          :class="{ 'active': index === activeImageIndex }"
          :style="{ backgroundImage: `url(${getImgUrl(imageUrl)})` }"
        ></div>
        <!-- 全局磨砂层 -->
        <div v-if="isLogin" class="global-blur-layer"></div>
      </div>
    </template>

    <VApp v-show="show" :class="{ 'transparent-app': isTransparentTheme }">
      <RouterView />
    </VApp>
  </div>
</template>

<style lang="scss">
/* 全局样式 */
.app-wrapper {
  position: relative;
  inline-size: 100%;
  min-block-size: 100vh;
}

.background-container {
  position: fixed;
  z-index: 0;
  overflow: hidden;
  block-size: 100%;
  inline-size: 100%;
  inset-block-start: 0;
  inset-inline-start: 0;
}

.background-image {
  position: absolute;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  block-size: 100%;
  inline-size: 100%;
  inset-block-start: 0;
  inset-inline-start: 0;
  opacity: 0;
  transition: opacity 1.5s ease;

  &::after {
    position: absolute;
    background: linear-gradient(rgba(0, 0, 0, 30%) 0%, rgba(0, 0, 0, 60%) 100%);
    block-size: 100%;
    content: '';
    inline-size: 100%;
    inset-block-start: 0;
    inset-inline-start: 0;
  }

  &.active {
    opacity: 1;
  }
}

/* 全局磨砂层 */
.global-blur-layer {
  position: absolute;
  z-index: 1;
  backdrop-filter: blur(16px);
  background-color: rgba(128, 128, 128, 30%);
  block-size: 100%;
  inline-size: 100%;
  inset-block-start: 0;
  inset-inline-start: 0;
}
</style>
