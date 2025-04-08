<script lang="ts" setup>
import SlideViewTitle from '@/components/slide/SlideViewTitle.vue'
import { useDisplay } from 'vuetify'

// 显示器宽度
const display = useDisplay()

// 元素
const slideview_content = ref()
const sliderContainer = ref()
// 分页切换状态: 0-左边不可用 1-两边可用 2-右边不可用 3-两边都不可用
const disabled = ref(0)
// 记录滚动值
const slideview_scrollLeft = ref(0)
// 所有卡片数量
let slide_card_length: number
// 卡片间距
let slide_gap_px: number
// 卡片宽度
let card_width: number
// 容器最多显示N张卡片
let card_max: number
// 当前定位
let card_current: number
// 是否鼠标悬停在容器上
const isHovering = ref(false)
// 获取传入的链接地址
const props: any = inject('rankingPropsKey', { linkurl: '', title: '' })

// 分页切换
function slideNext(next: boolean) {
  let run_to_left_px
  if (next) {
    const card_index = card_current + card_max
    run_to_left_px = card_index * card_width
    if (run_to_left_px >= slideview_content.value.scrollWidth - slideview_content.value.clientWidth)
      run_to_left_px = slideview_content.value.scrollWidth - slideview_content.value.clientWidth
  } else {
    const card_index = card_current - card_max
    run_to_left_px = card_index * card_width
    if (run_to_left_px <= 0) run_to_left_px = 0
  }
  slideview_content.value.scrollTo({
    top: 0,
    left: run_to_left_px,
    behavior: 'smooth',
  })
}

// 计算最大显示数量
function countMaxNumber() {
  if (!slideview_content.value || !slideview_content.value.firstElementChild) return
  slide_card_length = slideview_content.value.children.length
  card_width = slideview_content.value.firstElementChild.getBoundingClientRect().width
  slide_gap_px = slideview_content.value.scrollWidth / slide_card_length - card_width
  card_width += slide_gap_px
  card_max = Math.trunc(slideview_content.value.clientWidth / card_width)
  countDisabled()
}

// 修改分页切换按钮状态
function countDisabled() {
  slideview_scrollLeft.value = slideview_content.value.scrollLeft
  card_current =
    slideview_content.value.scrollLeft === 0
      ? 0
      : Math.trunc((slideview_content.value.scrollLeft + card_width / 2) / card_width)
  if (slide_card_length * card_width <= slideview_content.value.clientWidth) disabled.value = 3
  else if (slideview_content.value.scrollLeft === 0) disabled.value = 0
  else if (
    slideview_content.value.scrollLeft >=
    slideview_content.value.scrollWidth - slideview_content.value.clientWidth - 2
  )
    disabled.value = 2
  else disabled.value = 1
}

// 处理鼠标进入
function handleMouseEnter() {
  isHovering.value = true
}

// 处理鼠标离开
function handleMouseLeave() {
  isHovering.value = false
}

// 检测是否有足够内容可显示
const hasEnoughContent = computed(() => {
  return slide_card_length > card_max
})

// 组件加载完成
onMounted(() => {
  // 初次获取元素参数
  countMaxNumber()
  // 窗口大小发生改变时
  window.addEventListener('resize', countMaxNumber)
})

onUnmounted(() => {
  // 卸载事件
  window.removeEventListener('resize', countMaxNumber)
})

onActivated(() => {
  if (slideview_scrollLeft.value !== 0) {
    slideview_content.value.scrollLeft = slideview_scrollLeft.value
  }
})
</script>

<template>
  <div 
    ref="sliderContainer"
    class="slider-container"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="slider-header">
      <slot name="title">
        <SlideViewTitle />
      </slot>
      
      <!-- 查看全部按钮 -->
      <RouterLink
        v-if="props.linkurl"
        :to="props.linkurl"
        class="view-all-button"
      >
        <span>全部</span>
        <svg width="16" height="16" viewBox="0 0 24 24" class="arrow-svg">
          <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
        </svg>
      </RouterLink>
    </div>
    
    <div class="slider-content-wrapper">
      <div class="slider-content-container">
        <div
          ref="slideview_content"
          class="slider-content"
          tabindex="0"
          @scroll="countDisabled"
        >
          <slot name="content" />
        </div>
      </div>
      
      <!-- 左侧导航按钮 -->
      <button 
        class="nav-button nav-button-left"
        @click.stop="slideNext(false)"
        v-show="isHovering && disabled !== 0 && disabled !== 3"
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />
        </svg>
      </button>
      
      <!-- 右侧导航按钮 -->
      <button 
        class="nav-button nav-button-right"
        @click.stop="slideNext(true)"
        v-show="isHovering && disabled !== 2 && disabled !== 3"
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.slider-container {
  position: relative;
  margin-bottom: 24px;
  // 移除padding，按钮放置在外部
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 8px;
  gap: 16px;
  
  & > :first-child {
    flex-grow: 1;
    min-width: 0;
  }
}

.view-all-button {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.1);
  padding: 4px 10px;
  border-radius: 16px;
  transition: all 0.25s ease;
  flex-shrink: 0;
  
  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.15);
    box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.1);
    transform: translateY(-1px);
    
    .arrow-svg {
      transform: translateX(2px);
    }
  }
  
  span {
    margin-right: 4px;
  }
  
  .arrow-svg {
    transition: transform 0.3s ease;
    fill: currentColor;
  }
}

.slider-content-wrapper {
  position: relative;
  width: 100%;
}

.slider-content-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-surface), 0.9);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), background-color 0.3s ease, box-shadow 0.3s ease;
  padding: 0;
  opacity: 0;
  pointer-events: none;
  
  svg {
    fill: rgb(var(--v-theme-on-surface));
    opacity: 0.8;
    transition: all 0.3s ease;
    width: 22px;
    height: 22px;
  }
  
  &:hover {
    transform: translateY(-50%) scale(1.1);
    background-color: rgba(var(--v-theme-surface), 1);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
    border-color: rgba(var(--v-theme-on-surface), 0.15);
    
    svg {
      opacity: 1;
    }
  }
}

.nav-button-left {
  left: -19px; // 半径
}

.nav-button-right {
  right: -19px; // 半径
}

.slider-content {
  display: grid;
  grid-template-rows: 1fr;
  grid-auto-flow: column;
  justify-content: start;
  gap: 16px;
  padding: 8px 12px;
  overflow: scroll hidden !important;
  -ms-overflow-style: none !important;
  overscroll-behavior-x: contain !important;
  scrollbar-width: none !important;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.slider-container:hover .nav-button[style*="display: none;"] ~ .nav-button,
.slider-container:hover .nav-button {
  opacity: 1;
  pointer-events: auto;
}

.nav-button[style*="display: none;"] {
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
