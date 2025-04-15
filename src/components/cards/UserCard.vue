<script setup lang="ts">
import api from '@/api'
import { Subscribe, User } from '@/api/types'
import { useUserStore } from '@/stores'
import avatar1 from '@images/avatars/avatar-1.png'
import { useToast } from 'vue-toast-notification'
import { useConfirm } from 'vuetify-use-dialog'
import UserAddEditDialog from '@/components/dialog/UserAddEditDialog.vue'

// 扩展User类型以包含昵称字段
interface ExtendedUser extends User {
  nickname?: string
}

// 定义输入变量
const props = defineProps({
  // 用户信息
  user: {
    type: Object as PropType<ExtendedUser>,
    required: true,
  },
  // 所有用户
  users: {
    type: Array as PropType<User[]>,
    required: true,
  },
})

// 当前用户的ID
const currentLoginUserId = computed(() => useUserStore().userID)

// 当前用户是否是管理员
const currentUserIsSuperuser = computed(() => useUserStore().superUser)

// 定义触发的自定义事件
const emit = defineEmits(['remove', 'save'])

// 确认框
const createConfirm = useConfirm()

// 用户信息弹窗
const userEditDialog = ref(false)

// 提示框
const $toast = useToast()

// 用户电影订阅数量
const movieSubscriptions = ref(0)

// 用户电视剧订阅数量
const tvShowSubscriptions = ref(0)

// 是否显示更多操作菜单
const showMenu = ref(false)

// 鼠标悬停状态
const isHovered = ref(false)

// 是否为移动设备
const isMobile = ref(window.innerWidth < 600)

// 显示名称 - 如果有昵称则优先显示昵称
const displayName = computed(() => {
  const settingsNickname = props.user.settings?.nickname as string | undefined
  const nickname = props.user.nickname || settingsNickname
  return nickname || props.user.name
})

// 计算用户卡片状态类
const cardStatusClass = computed(() => {
  if (!props.user.is_active) return 'user-card-inactive'
  if (props.user.is_superuser) return 'user-card-admin'
  return ''
})

// 按用户查询订阅数量
async function fetchSubscriptions() {
  try {
    const result: Subscribe[] = await api.get(`subscribe/user/${props.user.name}`)
    if (result) {
      movieSubscriptions.value = result.filter(item => item.type === '电影').length
      tvShowSubscriptions.value = result.filter(item => item.type === '电视剧').length
    }
  } catch (error) {
    console.log(error)
  }
}

// 删除用户
async function removeUser() {
  if (props.user.id === currentLoginUserId.value) {
    $toast.error('不能删除当前登录用户！')
    return
  }
  try {
    const isConfirmed = await createConfirm({
      title: '注意',
      content: `删除用户 ${props.user?.name} 的所有数据，是否确认？`,
    })
    if (!isConfirmed) return
    const result: { [key: string]: any } = await api.delete(`user/id/${props.user.id}`)
    if (result.success) {
      $toast.success('用户删除成功')
      emit('remove')
    } else {
      $toast.error('用户删除失败！')
    }
  } catch (error) {
    console.log(error)
  }
}

// 编辑用户
function editUser() {
  userEditDialog.value = true
}

// 用户更新完成时
function onUserUpdate() {
  userEditDialog.value = false
  emit('save')
}

// 更新窗口大小监听
function handleResize() {
  isMobile.value = window.innerWidth < 600
}

onMounted(() => {
  fetchSubscriptions()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
<template>
  <VCard
    class="user-card"
    :class="[{ 'user-card-hover': isHovered }, cardStatusClass, { 'mobile-card': isMobile }]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 管理员卡片装饰 -->
    <div v-if="user.is_superuser" class="admin-decoration">
      <div class="decoration-line"></div>
      <div class="decoration-circle"><VIcon icon="mdi-shield-star" size="x-small" color="warning" /></div>
      <div class="decoration-line"></div>
    </div>

    <!-- 用户头像和基本信息 -->
    <div class="user-card-header" :class="{ 'admin-header': user.is_superuser }">
      <div class="user-avatar-container">
        <VAvatar
          :size="isMobile ? 50 : 74"
          rounded="lg"
          class="user-avatar"
          :class="{ 'admin-avatar': user.is_superuser, 'inactive-avatar': !user.is_active }"
        >
          <VImg :src="user.avatar || avatar1" :alt="user.name" />
          <div v-if="!user.is_active" class="avatar-overlay">
            <VIcon icon="mdi-account-lock" color="white" size="small" />
          </div>
        </VAvatar>
        <div v-if="user.is_superuser" class="admin-crown">
          <VIcon icon="mdi-crown" color="warning" size="small" />
        </div>
      </div>

      <div class="user-info">
        <div class="user-name-section">
          <div class="name-and-badges">
            <h3 class="user-name" :class="{ 'admin-name': user.is_superuser, 'inactive-name': !user.is_active }">
              {{ displayName }}
              <VIcon
                v-if="user.nickname || user.settings?.nickname"
                icon="mdi-format-quote-close"
                size="x-small"
                color="info"
                class="nickname-icon"
              />
            </h3>
            <div class="user-badges">
              <VChip v-if="user.is_superuser" size="x-small" color="error" class="user-badge admin-badge">管理员</VChip>
              <VChip v-else size="x-small" color="default" class="user-badge">普通用户</VChip>
              <VChip size="x-small" :color="user.is_active ? 'success' : 'grey'" variant="tonal" class="user-badge">
                {{ user.is_active ? '激活' : '已停用' }}
              </VChip>
              <VChip v-if="user.is_otp" size="x-small" color="info" variant="tonal" class="user-badge"> 2FA </VChip>
            </div>
          </div>
        </div>

        <!-- 移动端订阅数据信息 -->
        <div v-if="isMobile" class="mobile-stats">
          <div class="mobile-stat-item">
            <VIcon size="x-small" icon="mdi-movie-outline" color="primary" />
            <span>{{ movieSubscriptions }}</span>
          </div>
          <div class="mobile-stat-item">
            <VIcon size="x-small" icon="mdi-television-classic" color="primary" />
            <span>{{ tvShowSubscriptions }}</span>
          </div>
        </div>
      </div>

      <!-- 头部操作按钮 -->
      <div class="user-actions" :class="{ 'mobile-actions': isMobile }">
        <VBtn
          icon
          size="small"
          :color="user.is_superuser ? 'warning' : 'primary'"
          variant="text"
          @click="editUser"
          class="action-btn"
        >
          <VIcon icon="mdi-pencil" />
        </VBtn>

        <VBtn
          v-if="props.user.id != currentLoginUserId && currentUserIsSuperuser"
          icon
          size="small"
          color="error"
          variant="text"
          @click="removeUser"
          class="action-btn"
        >
          <VIcon icon="mdi-delete" />
        </VBtn>
      </div>
    </div>

    <!-- 独立的邮箱显示 -->
    <div class="email-container" :class="{ 'admin-email': user.is_superuser, 'inactive-email': !user.is_active }">
      <VIcon icon="mdi-email-outline" size="small" color="primary" class="email-icon" />
      <span class="email-text">{{ user.email || '未设置邮箱' }}</span>
    </div>

    <!-- PC端显示订阅统计信息 -->
    <div v-if="!isMobile" class="user-card-body">
      <div class="user-stats-container">
        <div class="stat-item">
          <div class="stat-icon-container" :class="{ 'admin-stat': user.is_superuser }">
            <VIcon :color="user.is_superuser ? 'warning' : 'primary'" icon="mdi-movie-outline" size="20" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ movieSubscriptions }}</div>
            <div class="stat-label">电影订阅</div>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon-container" :class="{ 'admin-stat': user.is_superuser }">
            <VIcon :color="user.is_superuser ? 'warning' : 'primary'" icon="mdi-television-classic" size="20" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ tvShowSubscriptions }}</div>
            <div class="stat-label">剧集订阅</div>
          </div>
        </div>
      </div>
    </div>
  </VCard>

  <!-- 用户编辑弹窗 -->
  <UserAddEditDialog
    v-if="userEditDialog"
    v-model="userEditDialog"
    :username="props.user?.name"
    :usernames="props.users.map(item => item.name)"
    oper="edit"
    @save="onUserUpdate"
    @close="userEditDialog = false"
  />
</template>

<style scoped>
.user-card {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.user-card-hover {
  transform: translateY(-5px);
}

.user-card-admin {
  border: 1px solid transparent;
  background-clip: content-box, border-box;
  background-image: linear-gradient(rgb(var(--v-theme-surface)), rgb(var(--v-theme-surface))),
    linear-gradient(120deg, rgba(var(--v-theme-warning), 0.5), rgba(var(--v-theme-error), 0.5));
  background-origin: border-box;
}

.user-card-inactive {
  position: relative;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background-color: rgba(var(--v-theme-surface), 0.95);
  opacity: 0.85;
}

.user-card-inactive::before {
  position: absolute;
  z-index: 1;
  backdrop-filter: grayscale(30%);
  content: '';
  inset: 0;
  pointer-events: none;
}

.admin-decoration {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  inset-block-start: 0;
  inset-inline: 0;
  padding-block: 8px;
  padding-inline: 12px;
}

.decoration-line {
  flex: 1;
  background: linear-gradient(90deg, rgba(var(--v-theme-warning), 0.1), rgba(var(--v-theme-warning), 0.7));
  block-size: 1px;
}

.decoration-line:last-child {
  background: linear-gradient(90deg, rgba(var(--v-theme-warning), 0.7), rgba(var(--v-theme-warning), 0.1));
}

.decoration-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--v-theme-warning), 0.5);
  border-radius: 50%;
  block-size: 18px;
  inline-size: 18px;
  margin-block: 0;
  margin-inline: 8px;
}

.user-card-header {
  position: relative;
  z-index: 2;
  display: flex;
  padding-block: 20px 12px;
  padding-inline: 16px;
}

.admin-header {
  background: linear-gradient(to bottom, rgba(var(--v-theme-warning), 0.05), transparent);
}

.user-avatar-container {
  position: relative;
  margin-inline-end: 16px;
}

.user-avatar {
  border: 4px solid rgb(var(--v-theme-surface));
  box-shadow: 0 4px 8px rgba(var(--v-theme-on-surface), 0.1);
  transition: all 0.3s ease;
}

.admin-avatar {
  border: 4px solid rgba(var(--v-theme-warning), 0.1);
  box-shadow: 0 5px 15px rgba(var(--v-theme-warning), 0.2);
}

.admin-avatar::after {
  position: absolute;
  border: 1px solid rgba(var(--v-theme-warning), 0.3);
  border-radius: 12px;
  animation: pulse 2.5s infinite;
  content: '';
  inset: -5px;
  pointer-events: none;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: scale(0.95);
  }

  70% {
    opacity: 0.2;
    transform: scale(1.05);
  }

  100% {
    opacity: 0.6;
    transform: scale(0.95);
  }
}

.inactive-avatar {
  border-color: rgba(var(--v-theme-on-surface), 0.1);
  filter: grayscale(50%);
  opacity: 0.9;
}

.avatar-overlay {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  backdrop-filter: blur(1px);
  background: rgba(var(--v-theme-on-surface), 0.2);
  inset: 0;
}

.otp-badge {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: glow 2s infinite alternate;
  inset-block-end: 0;
  inset-inline-end: 0;
}

.otp-badge .v-icon {
  color: #4caf50 !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 40%));
  font-size: 18px;
}

@keyframes glow {
  from {
    opacity: 0.9;
    transform: scale(1);
  }

  to {
    opacity: 1;
    transform: scale(1.15);
  }
}

.mobile-otp {
  inset-block-end: 0 !important;
  inset-inline-end: 0 !important;
}

.mobile-otp .v-icon {
  font-size: 16px;
}

.admin-crown {
  position: absolute;
  z-index: 5;
  animation: float 3s ease-in-out infinite;
  background: transparent;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 40%));
  inset-block-start: -10px;
  inset-inline-start: -6px;
  transform: rotate(-25deg);
}

.admin-crown .v-icon {
  color: #ffc107 !important;
  font-size: 24px;
}

@keyframes float {
  0% {
    transform: rotate(-25deg) translateY(0);
  }

  50% {
    transform: rotate(-25deg) translateY(-3px);
  }

  100% {
    transform: rotate(-25deg) translateY(0);
  }
}

.nickname-icon {
  animation: pulse-nickname 2s ease infinite;
  filter: brightness(1.1);
  margin-inline-start: 4px;
  opacity: 0.9;
  vertical-align: middle;
}

@keyframes pulse-nickname {
  0%,
  100% {
    opacity: 0.9;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.drag-handle {
  cursor: move;
  margin-inline-end: 6px;
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.user-card:hover .drag-handle {
  opacity: 0.8;
}

.user-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  min-inline-size: 0;
}

.user-name-section {
  margin-block-end: 8px;
}

.name-and-badges {
  display: flex;
  flex-direction: column;
  margin-block-end: 4px;
}

.user-name {
  display: flex;
  overflow: hidden;
  align-items: center;
  font-size: 1.2rem;
  font-weight: 600;
  margin-block: 0 4px;
  margin-inline: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-name {
  color: rgb(var(--v-theme-warning));
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(var(--v-theme-warning), 0.1);
}

.inactive-name {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.user-badges {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  margin-block-end: 4px;
  -ms-overflow-style: none;
  overflow-x: auto;
  scrollbar-width: none;
}

.user-badges::-webkit-scrollbar {
  display: none;
}

.user-badge {
  flex-shrink: 0;
  font-size: 0.7rem;
  white-space: nowrap;
}

.admin-badge {
  border: 1px solid rgba(var(--v-theme-error), 0.3);
}

.user-account,
.user-email {
  position: absolute;
  display: flex;
  overflow: hidden;
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.8rem;
  inline-size: 100%;
  inset-block-start: 100%;
  inset-inline-start: 0;
  margin-block-start: 4px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-label {
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-inline-end: 4px;
}

.account-value {
  font-weight: 500;
}

.info-icon {
  margin-inline-end: 4px;
  opacity: 0.6;
}

.email-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-actions {
  display: flex;
  align-items: flex-start;
}

.mobile-actions {
  position: absolute;
  display: flex;
  gap: 4px;
  inset-block-start: 10px;
  inset-inline-end: 10px;
}

.action-btn {
  opacity: 0.7;
  transition: all 0.3s ease;
}

.action-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.mobile-card {
  border-radius: 12px;
}

.mobile-stats {
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: flex-start;
  gap: 20px;
  margin-block-start: 8px;
  padding-block: 4px;
  padding-inline: 0;
}

.mobile-stat-item {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  gap: 6px;
}

.mobile-stat-item .v-icon {
  font-size: 18px !important;
}

.mobile-stat-item span {
  font-weight: 500;
}

.user-card-body {
  padding-block: 0 16px;
  padding-inline: 16px;
}

.user-stats-container {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  border-radius: 10px;
  background-color: rgba(var(--v-theme-on-surface), 0.02);
  margin-block-start: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-primary), 0.1);
  block-size: 40px;
  box-shadow: 0 2px 6px rgba(var(--v-theme-on-surface), 0.05);
  inline-size: 40px;
}

.admin-stat {
  background-color: rgba(var(--v-theme-warning), 0.1);
  box-shadow: 0 2px 6px rgba(var(--v-theme-warning), 0.2);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
}

.stat-label {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.75rem;
}

.menu-item {
  font-size: 0.9rem;
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.email-container {
  display: flex;
  overflow: hidden;
  align-items: center;
  background-color: transparent;
  border-block-start: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  padding-block: 8px;
  padding-inline: 16px;
  white-space: nowrap;
}

.admin-email {
  background-color: transparent;
}

.inactive-email {
  background-color: transparent;
  opacity: 0.9;
}

.email-container .email-icon {
  flex-shrink: 0;
  margin-inline-end: 8px;
  opacity: 0.7;
}

.email-container .email-text {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-card .email-container {
  padding-block: 6px;
  padding-inline: 12px;
}

.mobile-card .email-container .email-text {
  font-size: 0.8rem;
}

.mobile-card .user-avatar-container {
  position: relative;
}

.mobile-card .otp-badge {
  position: absolute;
  z-index: 10;
  inset-block-end: 0 !important;
  inset-inline-end: 0 !important;
}
</style>
