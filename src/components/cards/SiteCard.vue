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
import { useConfirm } from 'vuetify-use-dialog'

// 输入参数
const cardProps = defineProps({
  site: Object as PropType<Site>,
  data: Object as PropType<SiteUserData>,
})

// 定义触发的自定义事件
const emit = defineEmits(['update', 'remove'])

// 确认框
const createConfirm = useConfirm()

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

// 调用API删除站点信息
async function deleteSiteInfo() {
  const isConfirmed = await createConfirm({
    title: '确认',
    content: `是否确认删除站点？`,
  })

  if (!isConfirmed) return

  try {
    const result: { [key: string]: any } = await api.delete(`site/${cardProps.site?.id}`)
    if (result.success) emit('remove')
    else $toast.error(`${cardProps.site?.name} 删除失败：${result.message}`)
  } catch (error) {
    $toast.error(`${cardProps.site?.name} 删除失败！`)
    console.error(error)
  }
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
            <IconBtn
              v-bind="props"
              elevation="0"
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
            </IconBtn>
          </template>
          <span>测试站点连通性</span>
        </VTooltip>
        <VTooltip>
          <template #activator="{ props }">
            <IconBtn v-bind="props" elevation="0" class="site-action-btn" @click.stop="handleSiteUserData">
              <VIcon icon="mdi-chart-bell-curve" size="18" />
            </IconBtn>
          </template>
          <span>查看站点数据</span>
        </VTooltip>
        <VTooltip v-if="!cardProps.site?.public">
          <template #activator="{ props }">
            <IconBtn v-bind="props" elevation="0" class="site-action-btn" @click.stop="handleSiteUpdate">
              <VIcon icon="mdi-refresh" size="18" />
            </IconBtn>
          </template>
          <span>更新Cookie/UA</span>
        </VTooltip>
        <VTooltip>
          <template #activator="{ props }">
            <IconBtn v-bind="props" elevation="0" class="site-action-btn more-btn">
              <VIcon icon="mdi-dots-vertical" size="18" />
              <VMenu activator="parent" close-on-content-click location="left">
                <VList density="compact" nav class="dropdown-menu">
                  <VListItem variant="plain" @click="siteEditDialog = true" base-color="info">
                    <template #prepend>
                      <VIcon icon="mdi-file-edit-outline" size="small" />
                    </template>
                    <VListItemTitle>编辑站点</VListItemTitle>
                  </VListItem>
                  <VListItem variant="plain" @click="deleteSiteInfo">
                    <template #prepend>
                      <VIcon icon="mdi-delete-outline" size="small" color="error" />
                    </template>
                    <VListItemTitle class="text-error">删除站点</VListItemTitle>
                  </VListItem>
                </VList>
              </VMenu>
            </IconBtn>
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
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 10px;
  background: rgba(var(--v-theme-surface), 0.95);
  cursor: pointer;
  transition: all 0.3s ease;
}

.site-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 3px 12px -6px rgba(0, 0, 0, 10%);
  transform: translateY(-4px);
}

.inactive {
  opacity: 0.7;
}

.site-card-content {
  z-index: 1;
  padding-block: 10px;
  padding-inline: 12px;
}

/* 站点状态指示器 - 更精致的渐变指示 */
.site-status-indicator {
  position: absolute;
  z-index: 1;
  block-size: 2px;
  inset-block-start: 0;
  inset-inline: 0;
  opacity: 0.5;
  transition: block-size 0.3s ease, opacity 0.3s ease;
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
  block-size: 2px;
  opacity: 0.8;
}

/* 拖动手柄 */
.drag-handle {
  position: relative;
  z-index: 10;
}

/* 数据显示相关样式 */
.data-transfer-stats {
  border-block-start: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  margin-block-start: 6px;
  padding-block-start: 6px;
}

.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 6px;
}

.data-row:last-child {
  margin-block-end: 0;
}

.data-label {
  display: flex;
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 0.8rem;
  min-inline-size: 70px;
}

.data-progress-bar {
  position: relative;
  overflow: hidden;
  flex-grow: 1;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  block-size: 4px;
}

.progress-filled {
  position: absolute;
  overflow: hidden;
  border-radius: 4px;
  block-size: 100%;
  inset-block-start: 0;
  inset-inline-start: 0;
  min-inline-size: 3px;
  transition: inline-size 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-filled {
  animation: pulse-width 2s infinite;
  background: linear-gradient(90deg, #4d79ff, #07f);
  box-shadow: 0 0 4px rgba(0, 119, 255, 50%);
}

.download-filled {
  animation: pulse-width 2s infinite;
  background: linear-gradient(90deg, #42d392, #00b77e);
  box-shadow: 0 0 4px rgba(0, 183, 126, 50%);
}

.progress-glow {
  position: absolute;
  animation: shimmer 1.5s linear infinite;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 50%), transparent);
  background-size: 200% 100%;
  inset: 0;
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
  animation: none !important;
  inline-size: 5% !important;
  opacity: 0.5;
}

.speed-low {
  animation-duration: 6s !important;
  inline-size: 30% !important;
}

.speed-medium {
  animation-duration: 4s !important;
  inline-size: 50% !important;
}

.speed-high {
  animation-duration: 2s !important;
  inline-size: 70% !important;
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
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  block-size: 38px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 6%);
  cursor: pointer;
  inline-size: 38px;
  transition: transform 0.2s ease;
}

.site-icon-container:hover {
  transform: scale(1.05);
}

.site-icon {
  block-size: 100%;
  inline-size: 100%;
  object-fit: cover;
}

.site-icon-edit-overlay {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 50%);
  inset: 0;
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
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.site-url:hover {
  color: rgba(var(--v-theme-primary), 0.9);
}

/* 站点特性图标 */
.site-feature-icon {
  color: rgba(var(--v-theme-primary), 0.95);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 5%));
  margin-block: 0;
  margin-inline: 1px;
  opacity: 0.85;
  transition: all 0.2s ease;
}

.site-feature-icon:hover {
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 10%));
  opacity: 1;
  transform: translateY(-1px);
}

/* 特性标签 */
.site-features {
  margin-block-start: 0;
}

/* 数据统计 */
.site-stats {
  margin-block-start: auto;
  padding-block-start: 1rem;
}

.site-data-values {
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 12px;
}

.site-data-bar {
  overflow: hidden;
  border-radius: 1.5px;
  block-size: 3px;
}

.site-data-bar-bg {
  position: absolute;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  inset: 0;
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
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: rgba(var(--v-theme-surface), 0.97);
  border-inline-start: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  inset-block: 0;
  inset-inline-end: 0;
  padding-block: 8px;
  padding-inline: 4px;
  transform: translateX(100%);
  transition: transform 0.2s ease;
}

/* 测试按钮特殊样式 */
.test-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 50% !important;
  block-size: 40px !important;
  inline-size: 40px !important;
  margin-block-end: 12px;
  min-inline-size: 40px;
}

.test-btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  block-size: 100%;
  inline-size: 100%;
}

.loading-overlay {
  position: absolute;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  animation: fade-in 0.2s ease;
  background: rgba(var(--v-theme-surface), 0.95);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 10%);
  inset: 0;
}

.loading-spinner {
  position: relative;
  block-size: 24px;
  inline-size: 24px;
}

.spinner-circle {
  position: absolute;
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  block-size: 100%;
  border-block-start-color: rgba(var(--v-theme-primary), 1);
  inline-size: 100%;
}

.spinner-circle-dot {
  position: absolute;
  border-radius: 50%;
  animation: spin 0.8s linear infinite reverse;
  background-color: rgba(var(--v-theme-primary), 1);
  block-size: 4px;
  inline-size: 4px;
  inset-block-start: 0;
  inset-inline-start: 50%;
  margin-block-start: -2px;
  margin-inline-start: -2px;
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
  position: absolute;
  color: rgba(var(--v-theme-primary), 1);
  font-size: 12px;
  font-weight: 500;
  inset-block-end: -20px;
  margin-block-start: 4px;
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
  position: relative;
  border-radius: 50%;
  background-color: transparent;
  block-size: 22px;
  box-shadow: inset 0 0 0 2px rgba(var(--v-theme-on-surface), 0.1);
  inline-size: 22px;
}

.pulse-dot::before {
  position: absolute;
  z-index: 1;
  border-radius: 50%;
  block-size: 70%;
  content: '';
  inline-size: 70%;
  inset-block-start: 15%;
  inset-inline-start: 15%;
}

.pulse-dot::after {
  position: absolute;
  z-index: 2;
  border-radius: 50%;
  block-size: 100%;
  content: '';
  inline-size: 100%;
  inset-block-start: 0;
  inset-inline-start: 0;
}

.pulse-dot.error::before {
  background-color: rgba(var(--v-theme-error), 1);
  box-shadow: 0 0 10px rgba(var(--v-theme-error), 0.8);
}

.pulse-dot.error::after {
  animation: pulse-animation-error 2s infinite;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-error), 0.3);
}

.pulse-dot.warning::before {
  background-color: rgba(var(--v-theme-warning), 1);
  box-shadow: 0 0 10px rgba(var(--v-theme-warning), 0.8);
}

.pulse-dot.warning::after {
  animation: pulse-animation-warning 2s infinite;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-warning), 0.3);
}

.pulse-dot.success::before {
  background-color: rgba(var(--v-theme-success), 1);
  box-shadow: 0 0 10px rgba(var(--v-theme-success), 0.8);
}

.pulse-dot.success::after {
  animation: pulse-animation-success 2s infinite;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-success), 0.3);
}

.pulse-dot.secondary::before {
  background-color: rgba(var(--v-theme-secondary), 1);
  box-shadow: 0 0 10px rgba(var(--v-theme-secondary), 0.8);
}

.pulse-dot.secondary::after {
  animation: pulse-animation-secondary 2s infinite;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-secondary), 0.3);
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
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface), 1);
  block-size: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 5%);
  color: rgba(var(--v-theme-on-surface), 0.8);
  cursor: pointer;
  inline-size: 36px;
  margin-block-end: 4px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.site-action-btn::before {
  position: absolute;
  background: radial-gradient(circle at center, rgba(var(--v-theme-primary), 0.1), transparent 70%);
  content: '';
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.site-action-btn:hover {
  background-color: white;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 10%);
  color: rgba(var(--v-theme-primary), 1);
  transform: translateY(-2px);
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
  margin-block: auto 0;
}

.dropdown-menu {
  overflow: hidden;
  border-radius: 8px;
}

.feature-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  block-size: 24px;
  inline-size: 24px;
  transition: background-color 0.2s ease;
}

.feature-icon-wrapper:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
