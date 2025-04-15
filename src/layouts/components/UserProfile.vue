<script setup lang="ts">
import { useConfirm } from 'vuetify-use-dialog'
import { useToast } from 'vue-toast-notification'
import router from '@/router'
import avatar1 from '@images/avatars/avatar-1.png'
import api from '@/api'
import ProgressDialog from '@/components/dialog/ProgressDialog.vue'
import UserAuthDialog from '@/components/dialog/UserAuthDialog.vue'
import { useAuthStore, useUserStore } from '@/stores'

// 认证 Store
const authStore = useAuthStore()
// 用户 Store
const userStore = useUserStore()

// 确认框
const createConfirm = useConfirm()

// 提示框
const $toast = useToast()

// 进度框
const progressDialog = ref(false)

// 站点认证对话框
const siteAuthDialog = ref(false)

// 重启确认对话框
const restartDialog = ref(false)

// 执行注销操作
function logout() {
  // 清除登录状态信息
  authStore.logout()
  // 重定向到登录页面或其他适当的页面
  router.push('/login')
}

// 执行重启操作
async function restart() {
  restartDialog.value = false
  // 调用API重启
  try {
    // 显示等待框
    progressDialog.value = true
    const result: { [key: string]: any } = await api.get('system/restart')
    if (!result?.success) {
      // 隐藏等待框
      progressDialog.value = false
      // 重启不成功
      $toast.error(result.message)
      return
    }
  } catch (error) {
    console.error(error)
  }
  // 注销
  logout()
}

// 显示重启确认对话框
async function showRestartDialog() {
  restartDialog.value = true
}

// 显示站点认证对话框
function showSiteAuthDialog() {
  siteAuthDialog.value = true
}

// 用户站点认证成功
function siteAuthDone() {
  siteAuthDialog.value = false
  logout()
}

// 从用户 Store中获取信息
const superUser = computed(() => userStore.superUser)
const userName = computed(() => userStore.userName)
const avatar = computed(() => userStore.avatar || avatar1)
const userLevel = computed(() => userStore.level)
</script>

<template>
  <VAvatar class="cursor-pointer ms-3" color="primary" variant="tonal">
    <VImg :src="avatar" />

    <VMenu activator="parent" width="230" location="bottom end" offset="14px" class="user-menu" scrim>
      <VList class="overflow-hidden pt-0">
        <!-- 👉 User Avatar & Name -->
        <div class="user-profile-header px-2 py-4 mb-2">
          <div class="d-flex align-center">
            <VAvatar size="60" class="user-avatar" color="primary" rounded="sm">
              <VImg :src="avatar" />
            </VAvatar>
            <div class="ms-4">
              <div class="user-role">
                {{ superUser ? '管理员' : '普通用户' }}
              </div>
              <div class="user-name">
                {{ userName }}
              </div>
            </div>
          </div>
        </div>
        <div class="px-2">
          <!-- 👉 Profile -->
          <VListItem link @click="router.push('/profile')" class="user-menu-item mb-1">
            <template #prepend>
              <div class="user-menu-icon">
                <VIcon icon="mdi-account-outline" />
              </div>
            </template>
            <VListItemTitle>个人信息</VListItemTitle>
          </VListItem>

          <VListItem link @click="router.push('/apps')" class="user-menu-item mb-1">
            <template #prepend>
              <div class="user-menu-icon">
                <VIcon icon="mdi-view-grid-outline" />
              </div>
            </template>
            <VListItemTitle>功能视图</VListItemTitle>
          </VListItem>

          <!-- 👉 Site Auth -->
          <VListItem v-if="userLevel < 2 && superUser" link @click="showSiteAuthDialog" class="user-menu-item mb-1">
            <template #prepend>
              <div class="user-menu-icon">
                <VIcon icon="mdi-lock-check-outline" />
              </div>
            </template>
            <VListItemTitle>用户认证</VListItemTitle>
          </VListItem>

          <!-- 👉 FAQ -->
          <VListItem href="https://wiki.movie-pilot.org" target="_blank" class="user-menu-item mb-1">
            <template #prepend>
              <div class="user-menu-icon">
                <VIcon icon="mdi-help-circle-outline" />
              </div>
            </template>
            <VListItemTitle>帮助文档</VListItemTitle>
          </VListItem>

          <!-- Divider -->
          <VDivider v-if="superUser" class="my-3" />

          <!-- 👉 restart -->
          <VListItem v-if="superUser" @click="showRestartDialog" class="user-menu-item mb-1">
            <template #prepend>
              <div class="user-menu-icon restart-icon">
                <VIcon icon="mdi-restart" />
              </div>
            </template>
            <VListItemTitle>重启</VListItemTitle>
          </VListItem>
        </div>
        <!-- 👉 Logout -->
        <div class="px-2 mt-3 mb-2">
          <VBtn color="error" block class="logout-btn" @click="logout">
            <template #prepend> <VIcon icon="mdi-logout" /> </template>
            退出登录
          </VBtn>
        </div>
      </VList>
    </VMenu>
    <!-- !SECTION -->
  </VAvatar>
  <!-- 重启进度框 -->
  <ProgressDialog v-if="progressDialog" v-model="progressDialog" text="正在重启 ..." />
  <!-- 用户认证对话框 -->
  <UserAuthDialog v-if="siteAuthDialog" v-model="siteAuthDialog" @done="siteAuthDone" @close="siteAuthDialog = false" />
  <!-- 重启确认对话框 -->
  <VDialog v-if="restartDialog" v-model="restartDialog" max-width="25rem">
    <VCard>
      <VCardItem>
        <div class="flex items-center justify-center mt-3">
          <VAvatar color="warning" variant="text" size="x-large">
            <VIcon size="x-large" icon="mdi-alert" />
          </VAvatar>
          <div class="ms-3">
            <p class="font-bold text-xl text-high-emphasis">确认重启系统吗？</p>
            <p>重启后，您将被注销并需要重新登录。</p>
          </div>
        </div>
      </VCardItem>
      <VCardActions class="mx-auto">
        <VBtn variant="elevated" color="error" @click="restart" prepend-icon="mdi-restart" class="px-5"> 确定 </VBtn>
        <VBtn variant="tonal" color="secondary" class="px-5" @click="restartDialog = false">取消</VBtn>
      </VCardActions>
      <VDialogCloseBtn @click="restartDialog = false" />
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.user-profile-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05), rgba(var(--v-theme-primary), 0.02));
}

.user-role {
  color: rgba(var(--v-theme-primary), 0.9);
  font-size: 0.875rem;
  font-weight: 500;
  margin-block-end: 4px;
}

.user-name {
  color: rgba(var(--v-theme-on-surface), 0.9);
  font-size: 1.125rem;
  font-weight: 600;
}

.user-avatar {
  border: 2px solid rgba(var(--v-theme-on-surface), 0.1);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.2);
}

.user-menu-item {
  border-radius: 8px;
  margin-block: 4px;
  margin-inline: 0;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.06);
    transform: translateX(4px);
  }
}

.user-menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-primary), 0.08);
  block-size: 36px;
  inline-size: 36px;
  margin-inline-end: 12px;
  transition: all 0.2s ease;

  .v-icon {
    color: rgba(var(--v-theme-primary), 0.9);
  }
}

.restart-icon {
  background-color: rgba(var(--v-theme-error), 0.1);

  .v-icon {
    color: rgba(var(--v-theme-error), 0.9);
  }
}

.logout-btn {
  padding: 12px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(var(--v-theme-error), 0.2);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.user-menu .v-overlay__content {
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(var(--v-theme-on-surface), 0.08) !important;
}
</style>
