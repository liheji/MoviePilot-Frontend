<script setup lang="ts">
import { ref } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import type { ThemeSwitcherTheme } from '@layouts/types'
import api from '@/api'
import { checkPrefersColorSchemeIsDark } from '@/@core/utils'
import { useToast } from 'vue-toast-notification'
import { saveLocalTheme } from '../utils/theme'

// 显示器宽度
const display = useDisplay()

const props = defineProps<{
  themes: ThemeSwitcherTheme[]
}>()

const { name: themeName, global: globalTheme } = useTheme()

const savedTheme = ref(localStorage.getItem('theme') ?? themeName)

const currentThemeName = ref(savedTheme.value)
const getNextThemeName = () => {
  const currentIndex = props.themes.findIndex(t => t.name === currentThemeName.value)
  const nextIndex = (currentIndex + 1) % props.themes.length
  return props.themes[nextIndex].name
}

const $toast = useToast()

// 自定义CSS弹窗
const cssDialog = ref(false)

// 自定义 CSS
const customCSS = ref('')

// 编辑器主题
const editorTheme = computed(() => (currentThemeName.value === 'light' ? 'github' : 'monokai'))

// 主题切换动画
function themeTransition() {
  const x = performance.now()
  for (let i = 0; i++ < 1e7; (i << 9) & ((9 % 9) * 9 + 9));
  const cost = performance.now() - x
  if (cost > 10) return

  const el: HTMLElement = document.querySelector('[data-v-app]')!
  const children = el.querySelectorAll('*') as NodeListOf<HTMLElement>

  children.forEach(el => {
    if (hasScrollbar(el)) {
      el.dataset.scrollX = String(el.scrollLeft)
      el.dataset.scrollY = String(el.scrollTop)
    }
  })

  const copy = el.cloneNode(true) as HTMLElement
  copy.classList.add('app-copy')
  const rect = el.getBoundingClientRect()
  copy.style.top = `${rect.top}px`
  copy.style.left = `${rect.left}px`
  copy.style.width = `${rect.width}px`
  copy.style.height = `${rect.height}px`

  const targetEl = document.activeElement as HTMLElement
  const targetRect = targetEl.getBoundingClientRect()
  const left = targetRect.left + targetRect.width / 2 + window.scrollX
  const top = targetRect.top + targetRect.height / 2 + window.scrollY
  el.style.setProperty('--clip-pos', `${left}px ${top}px`)
  el.style.removeProperty('--clip-size')

  nextTick(() => {
    el.classList.add('app-transition')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.setProperty('--clip-size', `${Math.hypot(window.innerWidth, window.innerHeight)}px`)
      })
    })
  })

  document.body.append(copy)
  ;(copy.querySelectorAll('[data-scroll-x], [data-scroll-y]') as NodeListOf<HTMLElement>).forEach(el => {
    el.scrollLeft = +el.dataset.scrollX!
    el.scrollTop = +el.dataset.scrollY!
  })

  function onTransitionend(e: TransitionEvent) {
    if (e.target === e.currentTarget) {
      copy.remove()
      el.removeEventListener('transitionend', onTransitionend)
      el.removeEventListener('transitioncancel', onTransitionend)
      el.classList.remove('app-transition')
      el.style.removeProperty('--clip-size')
      el.style.removeProperty('--clip-pos')
    }
  }
  el.addEventListener('transitionend', onTransitionend)
  el.addEventListener('transitioncancel', onTransitionend)
}

// 更新主题
function updateTheme() {
  const autoTheme = checkPrefersColorSchemeIsDark() ? 'dark' : 'light'
  const theme = currentThemeName.value === 'auto' ? autoTheme : currentThemeName.value
  globalTheme.name.value = theme
  savedTheme.value = theme
  themeTransition()
  // 保存主题到本地
  saveLocalTheme(theme, globalTheme)
}

// 切换主题
function changeTheme(theme: string) {
  let nextTheme = theme
  if (!theme) nextTheme = getNextThemeName()
  currentThemeName.value = nextTheme
  // 保存主题到服务端
  try {
    api.post('/user/config/Layout', {
      theme: nextTheme,
    })
  } catch (e) {
    console.error('保存主题到服务端失败')
  }
}

// 是否有滚动条
function hasScrollbar(el?: Element | null) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false

  const style = window.getComputedStyle(el)
  return style.overflowY === 'scroll' || (style.overflowY === 'auto' && el.scrollHeight > el.clientHeight)
}

// 监听系统主题变化
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme)
} catch (e) {
  console.error('当前设备不支持监听系统主题变化')
}

// 查询当前主题的图标
const getThemeIcon = computed(() => {
  const theme = props.themes.find(t => t.name === currentThemeName.value)
  return theme?.icon ?? 'mdi-circle'
})

// 监听设置主题变化
watch(
  () => currentThemeName.value,
  () => updateTheme(),
)

// 获取自定义 CSS
async function getCustomCSS() {
  try {
    const result: { [key: string]: any } = await api.get('system/setting/UserCustomCSS')
    if (result && result.success && result.data?.value) {
      customCSS.value = result.data?.value ?? ''
      if (customCSS.value) {
        const style = document.createElement('style')
        style.innerHTML = result.data?.value ?? ''
        document.head.appendChild(style)
      }
    }
  } catch (error) {
    console.error(error)
  }
}

// 保存自定义 CSS
async function saveCustomCSS() {
  cssDialog.value = false
  try {
    const result: { [key: string]: any } = await api.post('system/setting/UserCustomCSS', customCSS.value, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })

    if (result.success) $toast.success('自定义CSS保存成功，请刷新页面生效！')
  } catch (e) {
    console.error('保存自定义 CSS 到服务端失败')
  }
}

onMounted(() => {
  getCustomCSS()
})
</script>

<template>
  <VMenu v-if="props.themes" class="theme-menu">
    <template v-slot:activator="{ props }">
      <IconBtn v-bind="props">
        <VIcon :icon="getThemeIcon" />
      </IconBtn>
    </template>
    <VList elevation="0" class="theme-switcher-list">
      <div class="theme-switcher-header px-3 py-3 mb-2">
        <div class="text-primary text-h6 font-weight-medium">主题选择</div>
      </div>
      
      <div class="theme-switcher-options px-2">
        <VListItem 
          v-for="theme in props.themes" 
          :key="theme.name" 
          @click="changeTheme(theme.name)"
          class="theme-option"
          :class="{ 'theme-option-active': currentThemeName === theme.name }"
        >
          <template #prepend>
            <div class="theme-icon-wrapper">
              <VIcon :icon="theme.icon" />
            </div>
          </template>
          <VListItemTitle>{{ theme.title }}</VListItemTitle>
          <template #append v-if="currentThemeName === theme.name">
            <VIcon icon="mdi-check" color="primary" size="small" />
          </template>
        </VListItem>
        
        <VDivider class="my-2" />
        
        <VListItem @click="cssDialog = true" class="theme-option custom-theme-option">
          <template #prepend>
            <div class="theme-icon-wrapper custom-theme-icon">
              <VIcon icon="mdi-palette" />
            </div>
          </template>
          <VListItemTitle>自定义主题</VListItemTitle>
        </VListItem>
      </div>
    </VList>
  </VMenu>
  <!-- 自定义 CSS -- -->
  <VDialog v-if="cssDialog" v-model="cssDialog" max-width="50rem" scrollable :fullscreen="!display.mdAndUp.value">
    <VCard title="自定义主题风格">
      <DialogCloseBtn @click="cssDialog = false" />
      <VDivider />
      <VAceEditor
        v-model:value="customCSS"
        lang="css"
        :theme="editorTheme"
        style="block-size: 100%; min-block-size: 30rem"
      />
      <VDivider />
      <VCardText class="text-center">
        <VBtn @click="saveCustomCSS" class="w-1/2">
          <template #prepend>
            <VIcon icon="mdi-content-save" />
          </template>
          保存
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss">
.theme-switcher-header {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.theme-switcher-options {
  max-height: 300px;
  overflow-y: auto;
}

.theme-option {
  border-radius: 8px;
  margin: 4px 0;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.04);
    transform: translateX(4px);
  }
  
  &.theme-option-active {
    background-color: rgba(var(--v-theme-primary), 0.08);
  }
}

.theme-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-primary), 0.08);
  margin-right: 12px;
  transition: all 0.2s ease;
  
  .v-icon {
    color: rgba(var(--v-theme-primary), 0.9);
  }
}

.custom-theme-icon {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.15), rgba(var(--v-theme-info), 0.15));
  
  .v-icon {
    color: rgba(var(--v-theme-primary), 0.9);
  }
}

// Theme transition
.app-copy {
  position: fixed !important;
  z-index: -1 !important;
  pointer-events: none !important;
  contain: size style !important;
  overflow: clip !important;
}

.app-transition {
  --clip-size: 0;
  --clip-pos: 0 0;
  clip-path: circle(var(--clip-size) at var(--clip-pos));
  transition: clip-path .35s ease-out;
}
</style>
