<script lang="ts" setup>
import api from '@/api'
import type { User } from '@/api/types'
import { useDisplay } from 'vuetify'
import NoDataFound from '@/components/NoDataFound.vue'
import UserCard from '@/components/cards/UserCard.vue'
import UserAddEditDialog from '@/components/dialog/UserAddEditDialog.vue'

// APP
const display = useDisplay()
const appMode = inject('pwaMode') && display.mdAndDown.value
const isMobile = computed(() => display.mobile.value)

// 是否刷新过
const isRefreshed = ref(false)

// 是否加载中
const loading = ref(false)

// 新增用户窗口
const addUserDialog = ref(false)

// 要编辑的用户
const userToEdit = ref<User | null>(null)

// 所有用户信息
const allUsers = ref<User[]>([])

// 调用API，查询所有用户
async function loadAllUsers() {
  try {
    loading.value = true
    const result: User[] = await api.get('/user/')
    allUsers.value = result
    loading.value = false
    isRefreshed.value = true
  } catch (error) {
    console.log(error)
  }
}

// 用户新增完成
const onUserAdd = () => {
  addUserDialog.value = false
  loadAllUsers()
}

// 打开添加用户对话框
const openAddUserDialog = () => {
  addUserDialog.value = true
}

// 加载当前用户数据
onMounted(() => {
  loadAllUsers()
})

onActivated(() => {
  if (!loading.value) {
    loadAllUsers()
  }
})
</script>

<template>
  <div class="user-list-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-title">
        <VIcon icon="mdi-account-group" size="large" color="primary" class="title-icon" />
        <h1 class="title-text">用户管理</h1>
      </div>
    </div>
    
    <!-- 加载中提示 -->
    <LoadingBanner v-if="!isRefreshed" class="mt-12" />
    
    <!-- 用户卡片网格 -->
    <div v-if="allUsers.length > 0 && isRefreshed" class="users-grid">
      <!-- 普通用户卡片 -->
      <UserCard
        v-for="user in allUsers"
        :key="user.id"
        :user="user"
        :users="allUsers"
        @remove="loadAllUsers"
        @save="loadAllUsers"
      />
      
      <!-- 添加用户卡片 -->
      <div class="add-user-card" @click="openAddUserDialog">
        <div class="add-user-content">
          <VIcon icon="mdi-account-plus" size="large" color="primary" />
          <span class="add-user-text">添加用户</span>
        </div>
      </div>
    </div>
    
    <!-- 无数据提示 -->
    <div v-if="allUsers.length === 0 && isRefreshed">
      <NoDataFound
        error-code="404"
        error-title="没有用户"
        error-description="点击添加用户卡片添加用户"
      />
    </div>
    
    <!-- 用户添加弹窗 -->
    <UserAddEditDialog
      v-if="addUserDialog"
      v-model="addUserDialog"
      oper="add"
      max-width="50rem"
      persistent
      z-index="1010"
      @save="onUserAdd"
      @close="addUserDialog = false"
    />
  </div>
</template>

<style scoped>
.user-list-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  display: flex;
  align-items: center;
}

.title-icon {
  margin-right: 12px;
}

.title-text {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.87);
  margin: 0;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.add-user-card {
  border-radius: 16px;
  height: 100%;
  min-height: 160px;
  background-color: rgba(var(--v-theme-surface), 1);
  border: 1.5px dashed rgba(var(--v-theme-primary), 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(var(--v-theme-on-surface), 0.05);
}

.add-user-card:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(var(--v-theme-on-surface), 0.1);
}

.add-user-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.add-user-text {
  font-size: 1.05rem;
  color: rgba(var(--v-theme-primary), 0.8);
  font-weight: 500;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .user-list-container {
    padding: 12px;
  }
  
  .users-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (min-width: 601px) and (max-width: 960px) {
  .users-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
}

@media (min-width: 961px) {
  .users-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
  }
}
</style>
