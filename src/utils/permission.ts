// 权限类型定义
export interface UserPermissions {
  discovery: boolean // 发现权限
  search: boolean // 搜索权限
  subscribe: boolean // 订阅权限
  manage: boolean // 管理权限
}

// 默认权限配置
export const DEFAULT_PERMISSIONS: UserPermissions = {
  discovery: true,
  search: true,
  subscribe: true,
  manage: false,
}

// 管理员权限配置
export const ADMIN_PERMISSIONS: UserPermissions = {
  discovery: true,
  search: true,
  subscribe: true,
  manage: true,
}

// 权限检查函数
export function hasPermission(userPermissions: any, permission: keyof UserPermissions): boolean {
  // 如果用户是超级用户，拥有所有权限
  if (userPermissions?.is_superuser === true) {
    return true
  }

  // 检查具体权限
  const permissions = userPermissions || {}
  return permissions[permission] === true
}

// 批量权限检查
export function hasAnyPermission(userPermissions: any, permissionList: (keyof UserPermissions)[]): boolean {
  return permissionList.some(permission => hasPermission(userPermissions, permission))
}

// 检查是否有所有权限
export function hasAllPermissions(userPermissions: any, permissionList: (keyof UserPermissions)[]): boolean {
  return permissionList.every(permission => hasPermission(userPermissions, permission))
}

// 根据权限过滤菜单项
export function filterMenusByPermission(menus: any[], userPermissions: any): any[] {
  return menus.filter(menu => {
    // 如果是超级用户，拥有所有权限
    if (userPermissions?.is_superuser) {
      return true
    }

    // 如果菜单没有权限要求，默认显示
    if (!menu.permission) {
      return true
    }

    // 检查用户是否拥有所需权限
    return hasPermission(userPermissions, menu.permission)
  })
}
