<script setup lang="ts">
import { NavMenu } from '@/@layouts/types'
import { SystemNavMenus } from '@/router/menu'
import { useUserStore } from '@/stores'

// 从 Store 中获取superuser信息
const superUser = useUserStore().superUser

// 应用分组（以header分组）
const appGroups = ref<Record<string, NavMenu[]>>({})

// 根据header属性对应用进行分类
function categorizeApps() {
  // 获取可见的菜单项
  const menus = SystemNavMenus.filter((item: NavMenu) => (!item.admin || superUser) && !item.footer)

  // 按header属性分组
  const groupedMenus: Record<string, NavMenu[]> = {}

  menus.forEach(menu => {
    const header = menu.header || '其他'
    if (!groupedMenus[header]) {
      groupedMenus[header] = []
    }
    groupedMenus[header].push(menu)
  })

  // 将分组结果赋值给响应式变量
  appGroups.value = groupedMenus
}

// 页面加载时对应用进行分类
onMounted(() => {
  categorizeApps()
})
</script>
<template>
  <div class="app-settings-container">
    <VContainer>
      <!-- 遍历所有分组 -->
      <div v-for="(apps, header) in appGroups" :key="header" class="mb-3">
        <VListSubheader class="ps-1">
          {{ header }}
        </VListSubheader>
        <!-- 分组内容 - 使用卡片包装 -->
        <VCard variant="flat" class="settings-section-card">
          <VList lines="one" class="settings-list">
            <VListItem
              v-for="(app, appIndex) in apps"
              :key="appIndex"
              :to="app.to || ''"
              color="primary"
              class="settings-list-item"
              rounded="0"
            >
              <template #prepend>
                <VAvatar size="42" color="primary" variant="text" class="me-3">
                  <VIcon :icon="app.icon as string" size="24"></VIcon>
                </VAvatar>
              </template>

              <VListItemTitle class="font-weight-medium">
                {{ app.full_title || app.title }}
              </VListItemTitle>

              <VListItemSubtitle v-if="app.description">
                {{ app.description }}
              </VListItemSubtitle>

              <template #append>
                <VIcon icon="mdi-chevron-right"></VIcon>
              </template>
            </VListItem>
          </VList>
        </VCard>
      </div>
    </VContainer>
  </div>
</template>

<style lang="scss" scoped>
.app-settings-container {
  max-width: 960px;
  margin: 0 auto;
}

.settings-section-card {
  overflow: hidden;
  background-color: rgb(var(--v-theme-surface));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.settings-list {
  padding: 0;
}

.settings-list-item {
  padding: 8px 12px;
  transition: background-color 0.2s;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  }

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.05);
  }
}
</style>
