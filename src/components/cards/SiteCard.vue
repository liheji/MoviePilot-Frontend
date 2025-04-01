<script lang="ts" setup>
import type { PropType } from 'vue'
import { useToast } from 'vue-toast-notification'
import SiteAddEditDialog from '../dialog/SiteAddEditDialog.vue'
import SiteUserDataDialog from '../dialog/SiteUserDataDialog.vue'
import SiteResourceDialog from '../dialog/SiteResourceDialog.vue'
import SiteCookieUpdateDialog from '../dialog/SiteCookieUpdateDialog.vue'
import api from '@/api'
import type { Site, SiteStatistic, SiteUserData } from '@/api/types'
import { isNullOrEmptyObject } from '@/@core/utils'
import { formatFileSize } from '@/@core/utils/formatters'

// 输入参数
const cardProps = defineProps({
  site: Object as PropType<Site>,
  data: Object as PropType<SiteUserData>,
})

// 定义触发的自定义事件
const emit = defineEmits(['update', 'remove'])

// 图标
const siteIcon = ref<string>('')

// 提示框
const $toast = useToast()

// 测试按钮文字
const testButtonText = ref('测试连通性')

// 测试按钮可用性
const testButtonDisable = ref(false)

// 更新站点Cookie UA弹窗
const siteCookieDialog = ref(false)

// 站点编辑弹窗
const siteEditDialog = ref(false)

// 资源浏览弹窗
const resourceDialog = ref(false)

// 用户数据弹窗
const siteUserDataDialog = ref(false)

// 站点使用统计
const siteStats = ref<SiteStatistic>({})

// 查询站点图标
async function getSiteIcon() {
  try {
    siteIcon.value = (await api.get(`site/icon/${cardProps.site?.id}`)).data.icon
  } catch (error) {
    console.error(error)
  }
}

// 测试站点连通性
async function testSite() {
  try {
    testButtonText.value = '测试中 ...'
    testButtonDisable.value = true

    const result: { [key: string]: any } = await api.get(`site/test/${cardProps.site?.id}`)
    if (result.success) $toast.success(`${cardProps.site?.name} 连通性测试成功，可正常使用！`)
    else $toast.error(`${cardProps.site?.name} 连通性测试失败：${result.message}`)

    testButtonText.value = '测试连通性'
    testButtonDisable.value = false

    getSiteStats()
  } catch (error) {
    console.error(error)
  }
}

// 查询站点使用统计
async function getSiteStats() {
  try {
    siteStats.value = await api.get(`site/statistic/${cardProps.site?.domain}`)
  } catch (error) {
    console.error(error)
  }
}

// 打开更新站点Cookie UA弹窗
async function handleSiteUpdate() {
  siteCookieDialog.value = true
}

// 打开资源浏览弹窗
async function handleResourceBrowse() {
  resourceDialog.value = true
}

// 打开站点用户数据弹窗
async function handleSiteUserData() {
  siteUserDataDialog.value = true
}

// 打开站点页面
function openSitePage() {
  window.open(cardProps.site?.url, '_blank')
}

// 根据站点状态显示不同的状态图标
const statColor = computed(() => {
  if (isNullOrEmptyObject(siteStats.value)) {
    return 'secondary'
  }
  if (siteStats.value?.lst_state == 1) {
    return 'error'
  } else if (siteStats.value?.lst_state == 0) {
    if (!siteStats.value?.seconds) return 'secondary'
    if (siteStats.value?.seconds >= 5) return 'warning'
    return 'success'
  }
})

// 数据百分比计算
const getMaxDataValue = computed(() => {
  // 获取站点数据中的最大值作为基准
  const upload = cardProps.data?.upload || 0
  const download = cardProps.data?.download || 0

  // 避免两者都为0的情况
  if (upload === 0 && download === 0) return 1

  return Math.max(upload, download)
})

// 上传百分比
const getUploadPercent = computed(() => {
  const upload = cardProps.data?.upload || 0
  return Math.min(100, Math.max(3, (upload / getMaxDataValue.value) * 100))
})

// 下载百分比
const getDownloadPercent = computed(() => {
  const download = cardProps.data?.download || 0
  return Math.min(100, Math.max(3, (download / getMaxDataValue.value) * 100))
})

// 保存站点
function saveSite() {
  siteEditDialog.value = false
  emit('update')
}

// 更新站点Cookie UA后的回调
function onSiteCookieUpdated() {
  siteCookieDialog.value = false
  getSiteStats()
}

// 资源浏览弹窗关闭后的回调
function onSiteResourceDone() {
  resourceDialog.value = false
  getSiteStats()
}

// 装载时查询站点图标
onMounted(() => {
  getSiteIcon()
  getSiteStats()
})
</script>

<template>
  <div>
    <VCard
      class="site-card relative h-full flex flex-col overflow-hidden group"
      :class="[
        cardProps.site?.is_active ? '' : 'inactive',
        {
          'status-error': statColor === 'error',
          'status-warning': statColor === 'warning',
          'status-success': statColor === 'success',
        },
      ]"
      :ripple="false"
      @click="handleResourceBrowse"
    >
      <!-- 装饰性状态指示器 -->
      <div v-if="cardProps.site?.is_active" class="site-status-indicator" :class="statColor"></div>

      <!-- 主体部分 -->
      <div class="site-card-content relative flex-1 flex flex-col">
        <!-- 顶部：图标和站点名称 -->
        <div class="flex items-center mb-1">
          <!-- 站点图标 -->
          <div class="site-icon-container mr-2.5" @click.stop="siteEditDialog = true">
            <img :src="siteIcon" class="site-icon" :alt="cardProps.site?.name" />
            <div class="site-icon-edit-overlay">
              <VIcon icon="mdi-pencil" color="white" size="16" />
            </div>
          </div>

          <!-- 拖动图标 -->
          <VIcon icon="mdi-drag" size="20" class="drag-handle cursor-move opacity-40 mr-1.5 z-10" />

          <!-- 站点名称和特性图标 -->
          <div class="flex-1 min-w-0 flex items-center">
            <h3 class="site-title truncate">{{ cardProps.site?.name }}</h3>

            <!-- 站点特性图标 -->
            <div class="site-features flex items-center gap-1 ml-auto">
              <VTooltip>
                <template #activator="{ props }">
                  <div v-if="cardProps.site?.limit_interval" v-bind="props" class="feature-icon-wrapper">
                    <VIcon icon="mdi-speedometer" size="16" class="site-feature-icon" />
                  </div>
                </template>
                <span>流控</span>
              </VTooltip>

              <VTooltip>
                <template #activator="{ props }">
                  <div v-if="cardProps.site?.proxy === 1" v-bind="props" class="feature-icon-wrapper">
                    <VIcon icon="mdi-network-outline" size="16" class="site-feature-icon" />
                  </div>
                </template>
                <span>代理</span>
              </VTooltip>

              <VTooltip>
                <template #activator="{ props }">
                  <div v-if="cardProps.site?.render === 1" v-bind="props" class="feature-icon-wrapper">
                    <VIcon icon="mdi-apple-safari" size="16" class="site-feature-icon" />
                  </div>
                </template>
                <span>仿真</span>
              </VTooltip>

              <VTooltip>
                <template #activator="{ props }">
                  <div v-if="cardProps.site?.filter" v-bind="props" class="feature-icon-wrapper">
                    <VIcon icon="mdi-filter-cog-outline" size="16" class="site-feature-icon" />
                  </div>
                </template>
                <span>过滤</span>
              </VTooltip>
            </div>
          </div>
        </div>

        <!-- 中间部分：网址 -->
        <div class="site-meta mb-1.5">
          <div class="site-url truncate" @click.stop="openSitePage">
            {{ cardProps.site?.url }}
          </div>
        </div>

        <!-- 底部：数据统计 -->
        <div class="site-stats flex-1 flex flex-col justify-end">
          <!-- 更直观的上传下载数据条 -->
          <div class="data-transfer-stats">
            <!-- 上传数据 -->
            <div class="data-row upload-row">
              <div class="data-label">
                <VIcon icon="mdi-arrow-up" size="14" color="info" class="mr-1" />
                <span>{{ formatFileSize(cardProps.data?.upload || 0) }}</span>
              </div>
              <div class="data-progress-bar">
                <div class="progress-filled upload-filled" :style="`width: ${getUploadPercent}%`">
                  <div class="progress-glow"></div>
                </div>
              </div>
            </div>

            <!-- 下载数据 -->
            <div class="data-row download-row">
              <div class="data-label">
                <VIcon icon="mdi-arrow-down" size="14" color="success" class="mr-1" />
                <span>{{ formatFileSize(cardProps.data?.download || 0) }}</span>
              </div>
              <div class="data-progress-bar">
                <div class="progress-filled download-filled" :style="`width: ${getDownloadPercent}%`">
                  <div class="progress-glow"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧操作按钮区 -->
      <div class="site-card-actions">
        <VTooltip>
          <template #activator="{ props }">
            <button
              v-bind="props"
              class="site-action-btn test-btn"
              @click.stop="testSite"
              :class="{ 'testing': testButtonDisable }"
            >
              <div class="test-btn-content">
                <div class="pulse-dot" :class="statColor"></div>
              </div>
              <div v-if="testButtonDisable" class="loading-overlay">
                <div class="loading-spinner">
                  <div class="spinner-circle"></div>
                  <div class="spinner-circle-dot"></div>
                </div>
                <span class="loading-text">测试中</span>
              </div>
            </button>
          </template>
          <span>测试站点连通性</span>
        </VTooltip>

        <VTooltip>
          <template #activator="{ props }">
            <button v-bind="props" class="site-action-btn" @click.stop="handleSiteUserData">
              <VIcon icon="mdi-chart-bell-curve" size="18" />
            </button>
          </template>
          <span>查看站点数据</span>
        </VTooltip>

        <VTooltip v-if="!cardProps.site?.public">
          <template #activator="{ props }">
            <button v-bind="props" class="site-action-btn" @click.stop="handleSiteUpdate">
              <VIcon icon="mdi-refresh" size="18" />
            </button>
          </template>
          <span>更新Cookie/UA</span>
        </VTooltip>

        <VTooltip>
          <template #activator="{ props }">
            <button v-bind="props" class="site-action-btn more-btn">
              <VIcon icon="mdi-dots-vertical" size="18" />
              <VMenu activator="parent" close-on-content-click location="left">
                <VList density="compact" nav class="dropdown-menu">
                  <VListItem variant="plain" @click.stop="siteEditDialog = true" base-color="info">
                    <template #prepend>
                      <VIcon icon="mdi-file-edit-outline" size="small" />
                    </template>
                    <VListItemTitle>编辑站点</VListItemTitle>
                  </VListItem>
                  <VListItem variant="plain" @click.stop="emit('remove')">
                    <template #prepend>
                      <VIcon icon="mdi-delete-outline" size="small" color="error" />
                    </template>
                    <VListItemTitle class="text-error">删除站点</VListItemTitle>
                  </VListItem>
                </VList>
              </VMenu>
            </button>
          </template>
          <span>更多操作</span>
        </VTooltip>
      </div>
    </VCard>

    <!-- 对话框组件 -->
    <SiteCookieUpdateDialog
      v-if="siteCookieDialog"
      v-model="siteCookieDialog"
      :site="cardProps.site"
      @close="siteCookieDialog = false"
      @done="onSiteCookieUpdated"
    />
    <SiteAddEditDialog
      v-if="siteEditDialog"
      v-model="siteEditDialog"
      :siteid="cardProps.site?.id"
      @save="saveSite"
      @remove="emit('remove')"
      @close="siteEditDialog = false"
    />
    <SiteUserDataDialog
      v-if="siteUserDataDialog"
      v-model="siteUserDataDialog"
      :site="cardProps.site"
      @close="siteUserDataDialog = false"
    />
    <SiteResourceDialog
      v-if="resourceDialog"
      v-model="resourceDialog"
      :site="cardProps.site"
      @close="onSiteResourceDone"
    />
  </div>
</template>

<style scoped>
.site-card {
  background: rgba(var(--v-theme-surface), 0.95);
  border-radius: 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.site-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 3px 12px -6px rgba(0, 0, 0, 0.1);
}

.inactive {
  opacity: 0.7;
}

.site-card-content {
  z-index: 1;
  padding: 10px 12px 10px;
}

/* 站点状态指示器 - 更精致的渐变指示 */
.site-status-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  opacity: 0.5;
  z-index: 1;
  transition: height 0.3s ease, opacity 0.3s ease;
}

.site-status-indicator.error {
  background: linear-gradient(90deg, transparent, rgba(var(--v-theme-error), 0.7), transparent);
  box-shadow: 0 0 8px rgba(var(--v-theme-error), 0.3);
}

.site-status-indicator.warning {
  background: linear-gradient(90deg, transparent, rgba(var(--v-theme-warning), 0.7), transparent);
  box-shadow: 0 0 8px rgba(var(--v-theme-warning), 0.3);
}

.site-status-indicator.success {
  background: linear-gradient(90deg, transparent, rgba(var(--v-theme-success), 0.7), transparent);
  box-shadow: 0 0 8px rgba(var(--v-theme-success), 0.3);
}

.site-status-indicator.secondary {
  background: linear-gradient(90deg, transparent, rgba(var(--v-theme-secondary), 0.7), transparent);
  box-shadow: 0 0 8px rgba(var(--v-theme-secondary), 0.3);
}

/* 站点卡片悬停时状态指示器变化 */
.site-card:hover .site-status-indicator {
  height: 2px;
  opacity: 0.8;
}

/* 拖动手柄 */
.drag-handle {
  position: relative;
  z-index: 10;
}

/* 数据显示相关样式 */
.data-transfer-stats {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.data-row:last-child {
  margin-bottom: 0;
}

.data-label {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
  min-width: 70px;
}

.data-progress-bar {
  position: relative;
  height: 4px;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  flex-grow: 1;
}

.progress-filled {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  min-width: 3px;
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.upload-filled {
  background: linear-gradient(90deg, #4d79ff, #0077ff);
  box-shadow: 0 0 4px rgba(0, 119, 255, 0.5);
  animation: pulse-width 2s infinite;
}

.download-filled {
  background: linear-gradient(90deg, #42d392, #00b77e);
  box-shadow: 0 0 4px rgba(0, 183, 126, 0.5);
  animation: pulse-width 2s infinite;
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
}

@keyframes pulse-width {
  0%,
  100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

@keyframes shimmer {
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 100% 0;
  }
}

/* 速度等级样式 */
.speed-idle {
  width: 5% !important;
  opacity: 0.5;
  animation: none !important;
}

.speed-low {
  width: 30% !important;
  animation-duration: 6s !important;
}

.speed-medium {
  width: 50% !important;
  animation-duration: 4s !important;
}

.speed-high {
  width: 70% !important;
  animation-duration: 2s !important;
}

@keyframes pulse-width {
  0%,
  100% {
    transform: scaleX(0.95);
  }
  50% {
    transform: scaleX(1.05);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 站点图标 */
.site-icon-container {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  transition: transform 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.site-icon-container:hover {
  transform: scale(1.05);
}

.site-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.site-icon-edit-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.site-icon-container:hover .site-icon-edit-overlay {
  opacity: 1;
}

/* 站点标题 */
.site-title {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.2;
}

/* 站点网址 */
.site-url {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: color 0.2s ease;
  cursor: pointer;
}

.site-url:hover {
  color: rgba(var(--v-theme-primary), 0.9);
}

/* 站点特性图标 */
.site-feature-icon {
  opacity: 0.85;
  color: rgba(var(--v-theme-primary), 0.95);
  transition: all 0.2s ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05));
  margin: 0 1px;
}

.site-feature-icon:hover {
  opacity: 1;
  transform: translateY(-1px);
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1));
}

/* 特性标签 */
.site-features {
  margin-top: 0;
}

/* 数据统计 */
.site-stats {
  margin-top: auto;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  padding-top: 6px;
}

.site-data-values {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.site-data-bar {
  height: 3px;
  border-radius: 1.5px;
  overflow: hidden;
}

.site-data-bar-bg {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.site-data-bar-upload {
  background-color: rgba(var(--v-theme-info), 0.4);
}

.site-data-bar-download {
  background-color: rgba(var(--v-theme-success), 0.4);
}

/* 状态样式 */
.status-error {
  border-color: rgba(var(--v-theme-error), 0.2);
}

.status-warning {
  border-color: rgba(var(--v-theme-warning), 0.2);
}

.status-success {
  border-color: rgba(var(--v-theme-success), 0.2);
}

/* 操作按钮 */
.site-card-actions {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 4px;
  background: rgba(var(--v-theme-surface), 0.97);
  transform: translateX(100%);
  transition: transform 0.2s ease;
  z-index: 20;
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

/* 测试按钮特殊样式 */
.test-btn {
  width: 40px !important;
  min-width: 40px;
  height: 40px !important;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 50% !important;
  margin-bottom: 12px;
}

.test-btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-surface), 0.95);
  border-radius: 50%;
  z-index: 10;
  animation: fade-in 0.2s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  position: relative;
  width: 24px;
  height: 24px;
}

.spinner-circle {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
  border-top-color: rgba(var(--v-theme-primary), 1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-circle-dot {
  position: absolute;
  top: 0;
  left: 50%;
  width: 4px;
  height: 4px;
  margin-left: -2px;
  margin-top: -2px;
  background-color: rgba(var(--v-theme-primary), 1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite reverse;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
  color: rgba(var(--v-theme-primary), 1);
  position: absolute;
  bottom: -20px;
  white-space: nowrap;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.pulse-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  position: relative;
  background-color: transparent;
  box-shadow: inset 0 0 0 2px rgba(var(--v-theme-on-surface), 0.1);
}

.pulse-dot::before {
  content: '';
  position: absolute;
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
  border-radius: 50%;
  z-index: 1;
}

.pulse-dot::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border-radius: 50%;
  z-index: 2;
}

.pulse-dot.error::before {
  background-color: rgba(var(--v-theme-error), 1);
  box-shadow: 0 0 10px rgba(var(--v-theme-error), 0.8);
}

.pulse-dot.error::after {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-error), 0.3);
  animation: pulse-animation-error 2s infinite;
}

.pulse-dot.warning::before {
  background-color: rgba(var(--v-theme-warning), 1);
  box-shadow: 0 0 10px rgba(var(--v-theme-warning), 0.8);
}

.pulse-dot.warning::after {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-warning), 0.3);
  animation: pulse-animation-warning 2s infinite;
}

.pulse-dot.success::before {
  background-color: rgba(var(--v-theme-success), 1);
  box-shadow: 0 0 10px rgba(var(--v-theme-success), 0.8);
}

.pulse-dot.success::after {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-success), 0.3);
  animation: pulse-animation-success 2s infinite;
}

.pulse-dot.secondary::before {
  background-color: rgba(var(--v-theme-secondary), 1);
  box-shadow: 0 0 10px rgba(var(--v-theme-secondary), 0.8);
}

.pulse-dot.secondary::after {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-secondary), 0.3);
  animation: pulse-animation-secondary 2s infinite;
}

@keyframes pulse-animation-error {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-error), 0.6);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--v-theme-error), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-error), 0);
  }
}

@keyframes pulse-animation-warning {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-warning), 0.6);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--v-theme-warning), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-warning), 0);
  }
}

@keyframes pulse-animation-success {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0.6);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--v-theme-success), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0);
  }
}

@keyframes pulse-animation-secondary {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-secondary), 0.6);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--v-theme-secondary), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-secondary), 0);
  }
}

.site-card:hover .site-card-actions {
  transform: translateX(0);
}

.site-action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: rgba(var(--v-theme-surface), 1);
  color: rgba(var(--v-theme-on-surface), 0.8);
  border: none;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.site-action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(var(--v-theme-primary), 0.1), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.site-action-btn:hover {
  background-color: white;
  color: rgba(var(--v-theme-primary), 1);
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.site-action-btn:hover::before {
  opacity: 1;
}

.site-action-btn.animate-pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(var(--v-theme-primary), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0);
  }
}

.site-action-btn.more-btn {
  margin-bottom: 0;
  margin-top: auto;
}

.dropdown-menu {
  border-radius: 8px;
  overflow: hidden;
}

.feature-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.feature-icon-wrapper:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
