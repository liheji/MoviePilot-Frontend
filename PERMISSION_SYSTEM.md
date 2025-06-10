# MoviePilot 用户权限控制系统

## 概述

本系统实现了精细化的用户权限控制，将用户权限分为四个主要类别：发现、搜索、订阅、管理。用户登录后根据权限显示不同的菜单范围。

## 权限类型

### 1. 发现权限 (discovery)
- **功能**: 访问推荐和探索功能
- **对应菜单**: 推荐、探索
- **默认状态**: 启用

### 2. 搜索权限 (search)  
- **功能**: 使用搜索功能和查看搜索结果
- **对应菜单**: 搜索结果页面
- **对应组件**: 顶部搜索栏
- **默认状态**: 启用

### 3. 订阅权限 (subscribe)
- **功能**: 管理电影和电视剧订阅
- **对应菜单**: 电影订阅、电视剧订阅、工作流、日历
- **默认状态**: 启用

### 4. 管理权限 (manage)
- **功能**: 访问系统管理和设置功能
- **对应菜单**: 系统设置、用户管理、站点管理、插件管理、文件管理、媒体整理、下载管理
- **默认状态**: 禁用

## 实现细节

### 权限存储
- 权限数据存储在 `userStore.permissions` 中，格式为 JSON 对象
- 后端接口支持 `permissions` 字段的存储和读取

### 权限检查
- 超级用户拥有所有权限，无视权限设置
- 普通用户根据具体权限配置进行访问控制
- 使用 `hasPermission()` 函数进行权限检查

### 菜单过滤
- 使用 `filterMenusByPermission()` 函数根据用户权限过滤菜单项
- 支持国际化菜单标题匹配
- 自动隐藏无权限访问的菜单项

### 组件权限控制
- 搜索栏根据搜索权限控制显示/隐藏
- 各页面根据对应权限进行访问控制

## 使用方法

### 1. 新增用户时设置权限
在用户编辑对话框中：
- 提供权限设置界面
- 支持快速预设（普通用户/管理员）
- 可单独切换每个权限

### 2. 编辑现有用户权限
- 管理员可以修改其他用户的权限
- 用户无法修改自己的权限（防止权限提升）
- 权限变更立即生效

### 3. 权限预设
- **普通用户**: 发现✓ 搜索✓ 订阅✓ 管理✗
- **管理员**: 发现✓ 搜索✓ 订阅✓ 管理✓

## 文件修改清单

### 新增文件
- `src/utils/permission.ts` - 权限管理工具函数

### 修改文件
- `src/components/dialog/UserAddEditDialog.vue` - 添加权限设置界面
- `src/stores/user.ts` - 添加权限默认值处理
- `src/layouts/components/DefaultLayout.vue` - 根据权限过滤菜单
- `src/layouts/components/SearchBar.vue` - 根据搜索权限控制显示
- `src/layouts/components/Footer.vue` - 底部菜单权限过滤
- `src/pages/appcenter.vue` - 应用中心权限过滤
- `src/components/cards/UserCard.vue` - 显示用户权限信息
- `src/locales/zh-CN.ts` - 添加权限相关国际化文本

## 权限检查示例

```typescript
import { hasPermission } from '@/utils/permission'
import { useUserStore } from '@/stores'

const userStore = useUserStore()

// 检查是否有搜索权限
const hasSearchPermission = hasPermission({
  is_superuser: userStore.superUser,
  ...userStore.permissions
}, 'search')

// 检查是否有管理权限
const hasManagePermission = hasPermission({
  is_superuser: userStore.superUser,
  ...userStore.permissions
}, 'manage')
```

## 注意事项

1. 超级用户始终拥有所有权限
2. 权限变更需要重新登录或刷新页面生效
3. 权限数据以 JSON 格式存储在后端
4. 前端权限检查仅用于界面控制，后端仍需进行权限验证
5. 默认权限配置确保新用户有基本的使用权限 
