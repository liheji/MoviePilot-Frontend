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
  nickname?: string;
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
  const settingsNickname = props.user.settings?.nickname as string | undefined;
  const nickname = props.user.nickname || settingsNickname;
  return nickname || props.user.name;
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
    :class="[
      {'user-card-hover': isHovered}, 
      cardStatusClass,
      {'mobile-card': isMobile}
    ]"
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
    <div class="user-card-header" :class="{'admin-header': user.is_superuser}">
      <div class="user-avatar-container">
        <VAvatar :size="isMobile ? 50 : 74" rounded="lg" class="user-avatar"
                :class="{'admin-avatar': user.is_superuser, 'inactive-avatar': !user.is_active}">
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
            <h3 class="user-name" :class="{'admin-name': user.is_superuser, 'inactive-name': !user.is_active}">
              {{ displayName }}
              <VIcon v-if="user.nickname || user.settings?.nickname" icon="mdi-format-quote-close" size="x-small" color="info" class="nickname-icon" />
            </h3>
            <div class="user-badges">
              <VChip
                v-if="user.is_superuser"
                size="x-small"
                color="error"
                class="user-badge admin-badge"
              >管理员</VChip>
              <VChip
                v-else
                size="x-small"
                color="default"
                class="user-badge"
              >普通用户</VChip>
              <VChip
                size="x-small"
                :color="user.is_active ? 'success' : 'grey'"
                variant="tonal"
                class="user-badge"
              >
                {{ user.is_active ? '激活' : '已停用' }}
              </VChip>
              <VChip
                v-if="user.is_otp"
                size="x-small"
                color="info"
                variant="tonal"
                class="user-badge"
              >
                2FA
              </VChip>
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
          <VTooltip v-if="!isMobile" activator="parent" location="bottom">编辑用户</VTooltip>
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
          <VTooltip v-if="!isMobile" activator="parent" location="bottom">删除用户</VTooltip>
        </VBtn>
      </div>
    </div>
    
    <!-- 独立的邮箱显示 -->
    <div class="email-container" :class="{'admin-email': user.is_superuser, 'inactive-email': !user.is_active}">
      <VIcon icon="mdi-email-outline" size="small" color="primary" class="email-icon" />
      <span class="email-text">{{ user.email || '未设置邮箱' }}</span>
    </div>
    
    <!-- PC端显示订阅统计信息 -->
    <div v-if="!isMobile" class="user-card-body">
      <div class="user-stats-container">
        <div class="stat-item">
          <div class="stat-icon-container" :class="{'admin-stat': user.is_superuser}">
            <VIcon :color="user.is_superuser ? 'warning' : 'primary'" icon="mdi-movie-outline" size="20" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ movieSubscriptions }}</div>
            <div class="stat-label">电影订阅</div>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon-container" :class="{'admin-stat': user.is_superuser}">
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
  border-radius: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
}

.user-card-hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(var(--v-theme-on-surface), 0.15);
}

.user-card-admin {
  border: 2px solid transparent;
  background-image: linear-gradient(rgb(var(--v-theme-surface)), rgb(var(--v-theme-surface))), 
                    linear-gradient(120deg, rgba(var(--v-theme-warning), 0.5), rgba(var(--v-theme-error), 0.5));
  background-origin: border-box;
  background-clip: content-box, border-box;
}

.user-card-inactive {
  background-color: rgba(var(--v-theme-surface), 0.95);
  opacity: 0.85;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  position: relative;
}

.user-card-inactive::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: grayscale(30%);
  z-index: 1;
  pointer-events: none;
}

.admin-decoration {
  position: absolute;
  display: flex;
  align-items: center;
  top: 0;
  left: 0;
  right: 0;
  padding: 4px 12px;
  z-index: 1;
}

.decoration-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(var(--v-theme-warning), 0.1), rgba(var(--v-theme-warning), 0.7));
}

.decoration-line:last-child {
  background: linear-gradient(90deg, rgba(var(--v-theme-warning), 0.7), rgba(var(--v-theme-warning), 0.1));
}

.decoration-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(var(--v-theme-warning), 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 8px;
  background: rgb(var(--v-theme-surface));
}

.user-card-header {
  padding: 20px 16px 12px;
  display: flex;
  position: relative;
  z-index: 2;
}

.admin-header {
  background: linear-gradient(to bottom, rgba(var(--v-theme-warning), 0.05), transparent);
}

.user-avatar-container {
  position: relative;
  margin-right: 16px;
}

.user-avatar {
  box-shadow: 0 4px 8px rgba(var(--v-theme-on-surface), 0.1);
  border: 4px solid rgb(var(--v-theme-surface));
  transition: all 0.3s ease;
}

.admin-avatar {
  border: 4px solid rgba(var(--v-theme-warning), 0.1);
  box-shadow: 0 5px 15px rgba(var(--v-theme-warning), 0.2);
}

.admin-avatar:after {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-warning), 0.3);
  pointer-events: none;
  animation: pulse 2.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    opacity: 0.6;
  }
  70% {
    transform: scale(1.05);
    opacity: 0.2;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.6;
  }
}

.inactive-avatar {
  filter: grayscale(50%);
  opacity: 0.9;
  border-color: rgba(var(--v-theme-on-surface), 0.1);
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--v-theme-on-surface), 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  backdrop-filter: blur(1px);
}

.otp-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: glow 2s infinite alternate;
}

.otp-badge .v-icon {
  color: #4CAF50 !important;
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
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
  bottom: 0 !important;
  right: 0 !important;
}

.mobile-otp .v-icon {
  font-size: 16px;
}

.admin-crown {
  position: absolute;
  top: -10px;
  left: -6px;
  background: transparent;
  z-index: 5;
  transform: rotate(-25deg);
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
}

.admin-crown .v-icon {
  color: #ffc107 !important;
  font-size: 24px;
}

@keyframes float {
  0% {
    transform: rotate(-25deg) translateY(0px);
  }
  50% {
    transform: rotate(-25deg) translateY(-3px);
  }
  100% {
    transform: rotate(-25deg) translateY(0px);
  }
}

.nickname-icon {
  margin-left: 4px;
  vertical-align: middle;
  animation: pulse-nickname 2s ease infinite;
  opacity: 0.9;
  filter: brightness(1.1);
}

@keyframes pulse-nickname {
  0%, 100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.drag-handle {
  cursor: move;
  margin-right: 6px;
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.user-card:hover .drag-handle {
  opacity: 0.8;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.user-name-section {
  margin-bottom: 8px;
}

.name-and-badges {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.user-name {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-name {
  color: rgb(var(--v-theme-warning));
  text-shadow: 0 1px 2px rgba(var(--v-theme-warning), 0.1);
  font-weight: 700;
}

.inactive-name {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.user-badges {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  margin-bottom: 4px;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.user-badges::-webkit-scrollbar {
  display: none;
}

.user-badge {
  font-size: 0.7rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.admin-badge {
  border: 1px solid rgba(var(--v-theme-error), 0.3);
}

.user-account, .user-email {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: 4px;
  position: absolute;
  left: 0;
  top: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-label {
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-right: 4px;
}

.account-value {
  font-weight: 500;
}

.info-icon {
  margin-right: 4px;
  opacity: 0.6;
}

.email-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-actions {
  display: flex;
  align-items: flex-start;
}

.mobile-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
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
  display: flex;
  justify-content: flex-start;
  gap: 20px;
  margin-top: 8px;
  z-index: 5;
  position: relative;
  padding: 4px 0;
}

.mobile-stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
}

.mobile-stat-item .v-icon {
  font-size: 18px !important;
}

.mobile-stat-item span {
  font-weight: 500;
}

.user-card-body {
  padding: 0 16px 16px;
}

.user-stats-container {
  display: flex;
  justify-content: space-around;
  margin-top: 8px;
  background-color: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 10px;
  padding: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-primary), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(var(--v-theme-on-surface), 0.05);
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
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.menu-item {
  font-size: 0.9rem;
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.email-container {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.05);
  background-color: transparent;
}

.admin-email {
  background-color: transparent;
}

.inactive-email {
  background-color: transparent;
  opacity: 0.9;
}

.email-container .email-icon {
  margin-right: 8px;
  flex-shrink: 0;
  opacity: 0.7;
}

.email-container .email-text {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-card .email-container {
  padding: 6px 12px;
}

.mobile-card .email-container .email-text {
  font-size: 0.8rem;
}

.mobile-card .user-avatar-container {
  position: relative;
}

.mobile-card .otp-badge {
  position: absolute;
  bottom: 0 !important;
  right: 0 !important;
  z-index: 10;
}
</style>
