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
export function filterMenusByPermission(menus: any[], userPermissions: any, t?: any): any[] {
  return menus.filter(menu => {
    // 如果是超级用户且菜单需要管理员权限，允许访问
    if (menu.admin && userPermissions?.is_superuser) {
      return true
    }

    // 如果菜单不需要管理员权限，检查具体权限
    if (!menu.admin) {
      // 根据菜单的header判断需要的权限
      const header = menu.header

      // 使用国际化键名进行匹配
      if (header === 'menu.discovery' || (t && header === t('menu.discovery'))) {
        return hasPermission(userPermissions, 'discovery')
      }
      if (header === 'menu.start' || (t && header === t('menu.start'))) {
        return hasPermission(userPermissions, 'search')
      }
      if (header === 'menu.subscribe' || (t && header === t('menu.subscribe'))) {
        return hasPermission(userPermissions, 'subscribe')
      }
      if (
        header === 'menu.system' ||
        header === 'menu.organize' ||
        (t && (header === t('menu.system') || header === t('menu.organize')))
      ) {
        return hasPermission(userPermissions, 'manage')
      }

      // 兼容中文菜单头
      switch (header) {
        case '发现':
          return hasPermission(userPermissions, 'discovery')
        case '开始':
          return hasPermission(userPermissions, 'search')
        case '订阅':
          return hasPermission(userPermissions, 'subscribe')
        case '系统':
        case '整理':
          return hasPermission(userPermissions, 'manage')
        default:
          return true
      }
    }

    // 需要管理员权限但用户不是超级用户
    return false
  })
}
