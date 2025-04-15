<script lang="ts" setup>
import api from '@/api'
import type { User } from '@/api/types'
import NoDataFound from '@/components/NoDataFound.vue'
import UserCard from '@/components/cards/UserCard.vue'
import UserAddEditDialog from '@/components/dialog/UserAddEditDialog.vue'

// 是否刷新过
const isRefreshed = ref(false)

// 是否加载中
const loading = ref(false)

// 新增用户窗口
const addUserDialog = ref(false)

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
  <!-- 页面标题 -->
  <VPageContentTitle title="用户管理" />
  <div class="card-list-container">
    <!-- 加载中提示 -->
    <LoadingBanner v-if="!isRefreshed" class="mt-12" />
    <!-- 用户卡片网格 -->
    <div v-if="allUsers.length > 0 && isRefreshed" class="grid gap- grid-user-card">
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
      <VCard class="add-user-card" @click="openAddUserDialog">
        <div class="add-user-content">
          <VIcon icon="mdi-account-plus" size="large" color="primary" />
          <span class="add-user-text">添加用户</span>
        </div>
      </VCard>
    </div>

    <!-- 无数据提示 -->
    <div v-if="allUsers.length === 0 && isRefreshed">
      <NoDataFound error-code="404" error-title="没有用户" error-description="点击添加用户卡片添加用户" />
    </div>

    <!-- 用户添加弹窗 -->
    <UserAddEditDialog
      v-if="addUserDialog"
      v-model="addUserDialog"
      oper="add"
      max-width="45rem"
      persistent
      z-index="1010"
      @save="onUserAdd"
      @close="addUserDialog = false"
    />
  </div>
</template>

<style scoped>
.add-user-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed rgba(var(--v-theme-primary), 0.4);
  background-color: rgba(var(--v-theme-surface), 1);
  block-size: 100%;
  cursor: pointer;
  min-block-size: 160px;
  transition: all 0.3s ease;
}

.add-user-card:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  transform: translateY(-4px);
}

.add-user-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.add-user-text {
  color: rgba(var(--v-theme-primary), 0.8);
  font-size: 1.05rem;
  font-weight: 500;
}
</style>
