<script lang="ts" setup>
import { useToast } from 'vue-toast-notification'
import type { User } from '@/api/types'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import api from '@/api'
import { useDisplay } from 'vuetify'
import avatar1 from '@images/avatars/avatar-1.png'
import { useUserStore } from '@/stores'
import { useI18n } from 'vue-i18n'

// 多语言支持
const { t } = useI18n()

// 显示器宽度
const display = useDisplay()

const refInputEl = ref<HTMLElement>()
const isNewPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')

// 输入参数
const props = defineProps({
  username: String,
  usernames: Array,
  oper: String,
})

// 用户 Store
const userStore = useUserStore()

// 当前登录用户名称
const currentLoginUser = userStore.userName

// 用户名
const userName = ref('')

// 当前头像缓存
const currentAvatar = ref(avatar1)

// 用户名缓存
const currentUserName = ref('')

// 注册事件
const emit = defineEmits(['save', 'close'])

// 创建新用户按钮运行状态
const isAdding = ref(false)

// 更新用户消息按钮运行状态
const isUpdating = ref(false)

// 提示框
const $toast = useToast()

// 状态下拉项
const statusItems = [
  { title: t('dialog.userAddEdit.active'), value: 1 },
  { title: t('dialog.userAddEdit.inactive'), value: 0 },
]

// 扩展User类型以包含note字段
interface ExtendedUser extends User {
  nickname?: string
}

// 权限类型定义
interface UserPermissions {
  discovery: boolean // 发现权限
  search: boolean // 搜索权限
  subscribe: boolean // 订阅权限
  manage: boolean // 管理权限
}

// 用户编辑表单数据
const userForm = ref<ExtendedUser>({
  id: 0,
  name: props.username ?? '',
  password: '',
  email: '',
  is_active: true,
  is_superuser: false,
  avatar: avatar1,
  is_otp: false,
  permissions: {
    discovery: true,
    search: true,
    subscribe: true,
    manage: false,
  },
  settings: {
    wechat_userid: null,
    telegram_userid: null,
    slack_userid: null,
    vocechat_userid: null,
    synologychat_userid: null,
  },
  nickname: '', // 昵称字段
})

// 权限选项
const permissionOptions = [
  {
    key: 'discovery',
    title: t('dialog.userAddEdit.permissions.discovery'),
    description: t('dialog.userAddEdit.permissions.discoveryDesc'),
    icon: 'mdi-star-outline',
  },
  {
    key: 'search',
    title: t('dialog.userAddEdit.permissions.search'),
    description: t('dialog.userAddEdit.permissions.searchDesc'),
    icon: 'mdi-magnify',
  },
  {
    key: 'subscribe',
    title: t('dialog.userAddEdit.permissions.subscribe'),
    description: t('dialog.userAddEdit.permissions.subscribeDesc'),
    icon: 'mdi-rss',
  },
  {
    key: 'manage',
    title: t('dialog.userAddEdit.permissions.manage'),
    description: t('dialog.userAddEdit.permissions.manageDesc'),
    icon: 'mdi-cog-outline',
  },
]

// 权限状态计算属性
const userPermissions = computed({
  get: () => {
    const permissions = userForm.value.permissions as UserPermissions
    return {
      discovery: permissions?.discovery ?? true,
      search: permissions?.search ?? true,
      subscribe: permissions?.subscribe ?? true,
      manage: permissions?.manage ?? false,
    }
  },
  set: (value: UserPermissions) => {
    userForm.value.permissions = value
  },
})

// 切换权限状态
function togglePermission(key: keyof UserPermissions) {
  const currentPermissions = userPermissions.value
  userPermissions.value = {
    ...currentPermissions,
    [key]: !currentPermissions[key],
  }
}

// 更新头像
function changeAvatar(file: Event) {
  const fileReader = new FileReader()
  const { files } = file.target as HTMLInputElement
  if (files && files.length > 0) {
    const selectedFile = files[0]
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 800 * 1024
    // 检查文件是否为图片
    if (!allowedTypes.includes(selectedFile.type)) {
      $toast.error(t('dialog.userAddEdit.invalidFile'))
      return
    }
    // 检查文件大小
    if (selectedFile.size > maxSize) {
      $toast.error(t('dialog.userAddEdit.fileSizeLimit'))
      return
    }
    fileReader.readAsDataURL(selectedFile)
    fileReader.onload = () => {
      if (typeof fileReader.result === 'string') {
        currentAvatar.value = fileReader.result
        $toast.success(t('dialog.userAddEdit.avatarUploadSuccess'))
      }
    }
  }
}

// 重置默认头像
function resetDefaultAvatar() {
  currentAvatar.value = avatar1
  $toast.success(t('dialog.userAddEdit.resetAvatarSuccess'))
}

// 还原当前头像
function restoreCurrentAvatar() {
  currentAvatar.value = userForm.value.avatar
  $toast.success(t('dialog.userAddEdit.restoreAvatarSuccess'))
}

// 查询用户信息
async function fetchUserInfo() {
  try {
    userForm.value = await api.get(`user/${props.username}`)
    if (userForm.value) {
      userForm.value.avatar = userForm.value.avatar || avatar1
      currentAvatar.value = userForm.value.avatar
      currentUserName.value = userForm.value.name
      userName.value = userForm.value.name
    }
  } catch (error) {
    console.error(error)
  }
}

// 调用API 新增用户
async function addUser() {
  if (isAdding.value) {
    $toast.error(t('dialog.userAddEdit.creatingUser', { name: userForm.value.name }))
    return
  }
  if (!currentUserName.value) {
    $toast.error(t('dialog.userAddEdit.usernameRequired'))
    return
  } else userForm.value.name = currentUserName.value
  // 重名检查
  if (props.usernames && props.usernames.includes(userForm.value.name)) {
    $toast.error(t('dialog.userAddEdit.usernameExists'))
    return
  }
  if (!userForm.value?.name || !newPassword.value) return
  if (newPassword.value || confirmPassword.value) {
    if (newPassword.value !== confirmPassword.value) {
      $toast.error(t('dialog.userAddEdit.passwordMismatch'))
      return
    }
    userForm.value.password = newPassword.value
  }

  // 设置权限数据
  userForm.value.permissions = userPermissions.value

  isAdding.value = true
  startNProgress()
  try {
    const result: { [key: string]: string } = await api.post('user/', userForm.value)
    if (result.success) {
      $toast.success(t('dialog.userAddEdit.userCreated', { name: userForm.value.name }))
      emit('save')
    } else {
      $toast.error(t('dialog.userAddEdit.userCreateFailed', { message: result.message }))
      // 清除用户名
      userForm.value.name = ''
    }
  } catch (error) {
    console.error(error)
  }
  doneNProgress()
  isAdding.value = false
}

// 调用API更新用户信息
async function updateUser() {
  if (isUpdating.value) {
    $toast.error(t('dialog.userAddEdit.updatingUser', { name: userForm.value.name }))
    return
  }
  if (!currentUserName.value) {
    $toast.error(t('dialog.userAddEdit.usernameRequired'))
    return
  }
  if (newPassword.value || confirmPassword.value) {
    if (newPassword.value !== confirmPassword.value) {
      $toast.error(t('dialog.userAddEdit.passwordMismatch'))
      return
    }
    userForm.value.password = newPassword.value
  }

  // 将nickname保存到settings中，后端可以直接处理JSON对象
  if (userForm.value.nickname) {
    if (!userForm.value.settings) {
      userForm.value.settings = {}
    }
    userForm.value.settings.nickname = userForm.value.nickname
  }

  const oldUserName = userForm.value.name
  userForm.value.name = currentUserName.value
  const oldAvatar = userForm.value.avatar
  userForm.value.avatar = currentAvatar.value
  isUpdating.value = true
  startNProgress()
  try {
    // 确保昵称和权限保存，使用一个临时变量存储完整数据
    const userData = { ...userForm.value }
    // 确保权限数据正确传递
    userData.permissions = userPermissions.value

    const result: { [key: string]: any } = await api.put('user/', userData)

    if (result.success) {
      if (oldUserName !== currentUserName.value) {
        $toast.success(t('dialog.userAddEdit.userUpdateSuccess', { name: `${oldUserName} → ${currentUserName.value}` }))
        // 如果是当前登录用户，更新当前用户名称显示
        if (isCurrentUser.value) {
          userStore.setUserName(currentUserName.value)
        }
      } else {
        $toast.success(t('dialog.userAddEdit.userUpdateSuccess', { name: userForm.value?.name }))
      }
      // 更新本地头像显示
      if (oldAvatar !== currentAvatar.value && isCurrentUser.value) {
        userStore.setAvatar(currentAvatar.value)
      }
      // 如果是当前登录用户，更新权限信息
      if (isCurrentUser.value) {
        userStore.setPermissions(userPermissions.value)
      }
      emit('save')
    } else {
      if (oldUserName !== currentUserName.value) {
        $toast.error(t('dialog.userAddEdit.userUpdateFailed', { message: result.message }))
        currentUserName.value = oldUserName
      } else {
        $toast.error(t('dialog.userAddEdit.userUpdateFailed', { message: result.message }))
      }
    }
    //失败缓存值还原
    currentUserName.value = userForm.value.name
    userForm.value.name = oldUserName
    currentAvatar.value = userForm.value.avatar
    userForm.value.avatar = oldAvatar
    userForm.value.password = ''
  } catch (error) {
    $toast.error(t('dialog.userAddEdit.userUpdateFailed', { message: '' }))
    console.error('更新失败:', error)
  }
  doneNProgress()
  isUpdating.value = false
}

// 用户状态转换，true/false转换为1/0
const userStatus = computed({
  get: () => (userForm.value.is_active ? 1 : 0),
  set: (value: number) => {
    userForm.value.is_active = value === 1
  },
})

// 计算是否有用户管理权限
const canControl = computed(() => {
  // 新增用户时，有权限
  if (props.oper === 'add') {
    return true
  } else {
    // 调用isCurrentUser函数判断是否为当前用户
    return !isCurrentUser.value
  }
})

// 检查是否为当前用户
const isCurrentUser = computed(() => {
  return props.username === currentLoginUser
})

onMounted(() => {
  if (props.oper !== 'add') {
    fetchUserInfo()
  }
})
</script>

<template>
  <VDialog scrollable max-width="40rem" :fullscreen="!display.mdAndUp.value">
    <VCard>
      <VCardItem :class="props.oper === 'add' ? 'py-3' : 'py-2'">
        <template #prepend>
          <VIcon icon="mdi-account" class="me-2" />
        </template>
        <VCardTitle>{{ props.oper === 'add' ? t('dialog.userAddEdit.add') : t('dialog.userAddEdit.edit') }}</VCardTitle>
        <VCardSubtitle>{{ userName }}</VCardSubtitle>
      </VCardItem>
      <VDialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardItem>
        <!-- 👉 Avatar -->
        <div class="flex flex-row">
          <VAvatar rounded="lg" size="100" class="me-5" :image="currentAvatar" />
          <!-- 👉 Upload Photo -->
          <div class="flex flex-col justify-center gap-5">
            <div class="flex flex-wrap gap-2">
              <VBtn color="primary" @click="refInputEl?.click()">
                <VIcon icon="mdi-cloud-upload-outline" />
                <span v-if="display.mdAndUp.value" class="ms-2">{{ t('dialog.userAddEdit.uploadAvatar') }}</span>
              </VBtn>

              <input
                ref="refInputEl"
                type="file"
                name="file"
                accept=".jpeg,.png,.jpg,GIF"
                hidden
                @input="changeAvatar"
              />

              <VBtn type="reset" color="info" variant="tonal" @click="restoreCurrentAvatar" v-if="props.oper !== 'add'">
                <VIcon icon="mdi-refresh" />
                <span v-if="display.mdAndUp.value" class="ms-2">{{ t('common.cancel') }}</span>
              </VBtn>

              <VBtn
                type="reset"
                :color="props.oper === 'add' ? 'info' : 'error'"
                variant="tonal"
                @click="resetDefaultAvatar"
              >
                <VIcon icon="mdi-image-sync-outline" />
                <span v-if="display.mdAndUp.value" class="ms-2">{{ t('dialog.userAddEdit.resetDefaultAvatar') }}</span>
              </VBtn>
            </div>
            <p class="text-body-1 mb-0">{{ t('dialog.userAddEdit.fileSizeLimit') }}</p>
          </div>
        </div>
      </VCardItem>
      <VCardText>
        <VForm @submit.prevent="() => {}">
          <VDivider class="my-10">
            <span>{{ t('dialog.userAddEdit.saveUserInfo') }}</span>
          </VDivider>
          <VRow>
            <VCol md="6" cols="12">
              <VTextField
                v-model="currentUserName"
                density="comfortable"
                :readonly="props.oper !== 'add'"
                :label="t('dialog.userAddEdit.username')"
                prepend-inner-icon="mdi-account"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="userForm.email"
                density="comfortable"
                clearable
                :label="t('dialog.userAddEdit.email')"
                type="email"
                prepend-inner-icon="mdi-email"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="newPassword"
                density="comfortable"
                :type="isNewPasswordVisible ? 'text' : 'password'"
                :append-inner-icon="isNewPasswordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                clearable
                :label="t('dialog.userAddEdit.password')"
                autocomplete=""
                prepend-inner-icon="mdi-lock"
                @click:append-inner="isNewPasswordVisible = !isNewPasswordVisible"
              />
            </VCol>
            <VCol cols="12" md="6">
              <!-- 👉 confirm password -->
              <VTextField
                v-model="confirmPassword"
                density="comfortable"
                :type="isConfirmPasswordVisible ? 'text' : 'password'"
                :append-inner-icon="isConfirmPasswordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                clearable
                :label="t('dialog.userAddEdit.confirmPassword')"
                prepend-inner-icon="mdi-lock-check"
                @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="userForm.nickname"
                density="comfortable"
                clearable
                :label="t('dialog.userAddEdit.nickname')"
                placeholder="显示昵称，优先于用户名显示"
                prepend-inner-icon="mdi-card-account-details"
              />
            </VCol>
            <VCol cols="12" md="6" v-if="canControl">
              <VSelect
                v-model="userStatus"
                :items="statusItems"
                item-text="title"
                item-value="value"
                :label="t('dialog.userAddEdit.status')"
                dense
                prepend-inner-icon="mdi-toggle-switch"
              />
            </VCol>
          </VRow>
          <VDivider class="my-10">
            <span>{{ t('dialog.userAddEdit.notifications') }}</span>
          </VDivider>
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="userForm.settings.wechat_userid"
                density="comfortable"
                clearable
                :label="t('dialog.userAddEdit.wechat')"
                prepend-inner-icon="mdi-wechat"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="userForm.settings.telegram_userid"
                density="comfortable"
                clearable
                :label="t('dialog.userAddEdit.telegram')"
                prepend-inner-icon="mdi-send"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="userForm.settings.slack_userid"
                density="comfortable"
                clearable
                :label="t('dialog.userAddEdit.slack')"
                prepend-inner-icon="mdi-slack"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="userForm.settings.vocechat_userid"
                density="comfortable"
                clearable
                :label="t('dialog.userAddEdit.vocechat')"
                prepend-inner-icon="mdi-chat"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="userForm.settings.synologychat_userid"
                density="comfortable"
                clearable
                :label="t('dialog.userAddEdit.synologyChat')"
                prepend-inner-icon="mdi-message"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="userForm.settings.douban_userid"
                density="comfortable"
                clearable
                label="豆瓣用户"
                prepend-inner-icon="mdi-movie"
              />
            </VCol>
          </VRow>
          <VDivider class="my-10" v-if="canControl">
            <span>{{ t('dialog.userAddEdit.permissions.title') }}</span>
          </VDivider>
          <!-- 权限设置 -->
          <div v-if="canControl">
            <div class="mb-4">
              <VBtn
                variant="outlined"
                color="primary"
                size="small"
                @click="userPermissions = { discovery: true, search: true, subscribe: true, manage: false }"
                class="me-2"
              >
                {{ t('dialog.userAddEdit.permissions.presetNormal') }}
              </VBtn>
              <VBtn
                variant="outlined"
                color="warning"
                size="small"
                @click="userPermissions = { discovery: true, search: true, subscribe: true, manage: true }"
              >
                {{ t('dialog.userAddEdit.permissions.presetAdmin') }}
              </VBtn>
            </div>
            <VRow>
              <VCol v-for="option in permissionOptions" :key="option.key" cols="12" md="6">
                <VCard
                  :color="userPermissions[option.key as keyof UserPermissions] ? 'primary' : 'surface'"
                  :variant="userPermissions[option.key as keyof UserPermissions] ? 'tonal' : 'outlined'"
                  class="cursor-pointer transition-all"
                  @click="togglePermission(option.key as keyof UserPermissions)"
                  hover
                >
                  <VCardText class="d-flex align-center pa-4">
                    <VAvatar
                      :color="userPermissions[option.key as keyof UserPermissions] ? 'primary' : 'surface-variant'"
                      size="40"
                      class="me-3"
                    >
                      <VIcon :icon="option.icon" />
                    </VAvatar>
                    <div class="flex-grow-1">
                      <div class="text-subtitle-1 font-weight-medium d-flex align-center">
                        {{ option.title }}
                        <VIcon
                          v-if="userPermissions[option.key as keyof UserPermissions]"
                          icon="mdi-check-circle"
                          color="primary"
                          size="small"
                          class="ms-2"
                        />
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ option.description }}
                      </div>
                    </div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
          </div>
        </VForm>
      </VCardText>
      <VCardActions class="pt-3">
        <VSpacer />
        <VBtn
          v-if="props.oper === 'add'"
          :disabled="isAdding"
          color="primary"
          @click="addUser"
          prepend-icon="mdi-plus"
          class="px-5"
        >
          <span v-if="isAdding">{{ t('common.loading') }}</span>
          <span v-else>{{ t('common.add') }}</span>
        </VBtn>
        <VBtn
          v-else
          :disabled="isUpdating"
          color="primary"
          @click="updateUser"
          prepend-icon="mdi-content-save"
          class="px-5"
        >
          <span v-if="isUpdating">{{ t('common.loading') }}</span>
          <span v-else>{{ t('common.save') }}</span>
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
