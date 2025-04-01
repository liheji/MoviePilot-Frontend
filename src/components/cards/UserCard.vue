<script setup lang="ts">
import api from '@/api'
import { Subscribe, User } from '@/api/types'
import { useUserStore } from '@/stores'
import avatar1 from '@images/avatars/avatar-1.png'
import { useToast } from 'vue-toast-notification'
import { useConfirm } from 'vuetify-use-dialog'
import UserAddEditDialog from '@/components/dialog/UserAddEditDialog.vue'

// 定义输入变量
const props = defineProps({
  // 用户信息
  user: {
    type: Object as PropType<User>,
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

// 新增：用户状态背景颜色计算
const statusClass = computed(() => ({
  'bg-error-lighten-4': !props.user.is_active, // 假设用户状态使用 is_active 字段
  'border-error': !props.user.is_active, // 非活跃用户添加红色边框
}))

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

// 用户重新完成时
function onUserUpdate() {
  userEditDialog.value = false
  emit('save')
}

onMounted(() => {
  fetchSubscriptions()
})
</script>
<template>
  <VHover v-slot="hover">
    <VCard
      v-bind="hover.props"
      class="w-full h-full"
      :class="{ 'transition transform-cpu duration-300 -translate-y-1': hover.isHovering, ...statusClass }"
      @click.stop="editUser"
    >
      <!-- 用户头像 -->
      <VImg height="12rem" :src="user.avatar ?? avatar1" cover>
        <div v-if="!user.is_active" class="img-overlay" />
      </VImg>
      <div class="flex flex-col">
        <!-- 用户基本信息 -->
        <VCardTitle class="pt-2">{{ user.name }}</VCardTitle>
        <VCardSubtitle v-if="user.email" class="text-wrap">
          <VIcon size="16">mdi-email</VIcon>
          {{ user.email }}
        </VCardSubtitle>
        <!-- 订阅信息 -->
        <VCardActions>
          <div class="mt-3 flex gap-3" dense>
            <VChip v-if="user.is_otp" size="small" color="error">
              <VIcon>mdi-lock</VIcon>
            </VChip>
            <VChip size="small" color="info">
              <VIcon left class="me-2">mdi-movie</VIcon>
              {{ movieSubscriptions }}
            </VChip>
            <VChip size="small" color="warning">
              <VIcon left class="me-2">mdi-television</VIcon>
              {{ tvShowSubscriptions }}
            </VChip>
          </div>
        </VCardActions>
      </div>
      <!-- 管理员标签 -->
      <VChip
        variant="elevated"
        size="small"
        class="absolute right-2 top-2"
        :color="user.is_superuser ? 'primary' : 'secondary'"
      >
        {{ user.is_superuser ? '管理员' : '普通用户' }}
      </VChip>
      <!-- 删除按钮 -->
      <div class="absolute bottom-2 w-full flex items-center justify-center">
        <VBtn
          v-show="hover.isHovering && currentUserIsSuperuser"
          @click.stop="removeUser"
          icon="mdi-delete"
          color="error"
          size="small"
          class="shadow-xl"
        />
      </div>
    </VCard>
  </VHover>

  <!-- 用户编辑弹窗 -->
  <UserAddEditDialog
    v-if="userEditDialog"
    v-model="userEditDialog"
    :username="user?.name"
    :usernames="users.map(item => item.name)"
    oper="edit"
    @save="onUserUpdate"
    @close="userEditDialog = false"
  />
</template>

<style scoped>
.img-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  z-index: 1;
}
</style>
