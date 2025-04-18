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
      <VList class="pt-0">
        <!-- 👉 User Avatar & Name -->
        <VListItem class="py-4" bg-color="primary" bg-opacity="0.05">
          <template #prepend>
            <VAvatar size="60" color="primary" rounded="sm" class="border-2 border-opacity-10">
              <VImg :src="avatar" />
            </VAvatar>
          </template>
          <div>
            <span class="text-primary text-sm font-medium d-block">
              {{ superUser ? '管理员' : '普通用户' }}
            </span>
            <span class="text-high-emphasis text-lg font-weight-bold">
              {{ userName }}
            </span>
          </div>
        </VListItem>
        <VDivider class="mb-2" />
        <div class="px-2">
          <!-- 👉 Profile -->
          <VListItem link @click="router.push('/profile')" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-account-outline" />
            </template>
            <VListItemTitle>个人信息</VListItemTitle>
          </VListItem>

          <VListItem link @click="router.push('/apps')" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-view-grid-outline" />
            </template>
            <VListItemTitle>功能视图</VListItemTitle>
          </VListItem>

          <!-- 👉 Site Auth -->
          <VListItem v-if="userLevel < 2 && superUser" link @click="showSiteAuthDialog" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-lock-check-outline" />
            </template>
            <VListItemTitle>用户认证</VListItemTitle>
          </VListItem>

          <!-- 👉 FAQ -->
          <VListItem href="https://wiki.movie-pilot.org" target="_blank" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-help-circle-outline" />
            </template>
            <VListItemTitle>帮助文档</VListItemTitle>
          </VListItem>

          <!-- Divider -->
          <VDivider v-if="superUser" class="my-3" />

          <!-- 👉 restart -->
          <VListItem v-if="superUser" @click="showRestartDialog" class="mb-1 rounded-lg" hover>
            <template #prepend>
              <VIcon icon="mdi-restart" />
            </template>
            <VListItemTitle>重启</VListItemTitle>
          </VListItem>
        </div>
        <!-- 👉 Logout -->
        <div class="px-2 mt-3 mb-2">
          <VBtn color="error" block class="py-3" elevation="2" @click="logout">
            <template #prepend>
              <VIcon icon="mdi-logout" />
            </template>
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
        <div class="d-flex align-center justify-center mt-3">
          <VAvatar color="warning" variant="text" size="x-large">
            <VIcon size="x-large" icon="mdi-alert" />
          </VAvatar>
          <div class="ms-3">
            <p class="font-weight-bold text-xl text-high-emphasis">确认重启系统吗？</p>
            <p>重启后，您将被注销并需要重新登录。</p>
          </div>
        </div>
      </VCardItem>
      <VCardActions class="mx-auto">
        <VBtn variant="tonal" color="secondary" class="px-5" @click="restartDialog = false">取消</VBtn>
        <VBtn variant="elevated" color="error" @click="restart" prepend-icon="mdi-restart" class="px-5"> 确定 </VBtn>
      </VCardActions>
      <VDialogCloseBtn @click="restartDialog = false" />
    </VCard>
  </VDialog>
</template>
