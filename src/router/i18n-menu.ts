import type { NavMenu, NavMenuTabItem } from '@/@layouts/types'
import type { Composer } from 'vue-i18n'
import { PERMISSION_FEATURE } from '@/utils/permission'

/** 构建当前语言与全局模式对应的主导航菜单。 */
export function getNavMenus(t: Composer['t']): NavMenu[] {
  return [
    {
      title: t('navItems.dashboard'),
      icon: 'mdi-home-outline',
      iconColor: 'primary',
      to: '/dashboard',
      header: t('menu.start'),
      admin: false,
      footer: true,
      permission: 'admin',
    },
    {
      title: t('navItems.searchResult'),
      icon: 'mdi-magnify',
      iconColor: 'info',
      to: '/resource',
      header: t('menu.start'),
      admin: false,
      permission: 'search',
      feature: PERMISSION_FEATURE.SEARCH_RESOURCE,
    },
    {
      title: t('navItems.downloadManager'),
      icon: 'mdi-download-outline',
      iconColor: 'info',
      to: '/downloading',
      header: t('menu.organize'),
      admin: false,
      permission: 'manage',
      feature: PERMISSION_FEATURE.MANAGE_DOWNLOADING,
    },
    {
      title: t('navItems.pluginManager'),
      icon: 'mdi-puzzle-outline',
      iconColor: 'primary',
      to: '/plugins',
      header: t('menu.system'),
      admin: true,
      permission: 'admin',
      tabs: getPluginTabs(t),
    },
    {
      title: t('navItems.siteManager'),
      icon: 'mdi-web',
      iconColor: 'info',
      to: '/site',
      header: t('menu.system'),
      admin: true,
      permission: 'manage',
      feature: PERMISSION_FEATURE.MANAGE_SITE,
    },
    {
      title: t('navItems.userManager'),
      icon: 'mdi-account-group-outline',
      iconColor: 'success',
      to: '/user',
      header: t('menu.system'),
      admin: true,
      permission: 'admin',
    },
    {
      title: t('navItems.settings'),
      icon: 'mdi-cog-outline',
      iconColor: 'secondary',
      to: '/setting',
      header: t('menu.system'),
      admin: true,
      permission: 'admin',
      tabs: getSettingTabs(t),
    },
  ]
}

/** 返回系统设置页的配置标签。 */
export function getSettingTabs(t: Composer['t']): NavMenuTabItem[] {
  return [
    {
      title: t('settingTabs.system.title'),
      icon: 'mdi-server-network',
      tab: 'system',
      description: t('settingTabs.system.description'),
    },
    {
      title: t('settingTabs.site.title'),
      icon: 'mdi-web',
      tab: 'site',
      description: t('settingTabs.site.description'),
    },
    {
      title: t('settingTabs.rule.title'),
      icon: 'mdi-filter',
      tab: 'rule',
      description: t('settingTabs.rule.description'),
    },
    {
      title: t('settingTabs.search.title'),
      icon: 'mdi-magnify',
      tab: 'search',
      description: t('settingTabs.search.description'),
    },
    {
      title: t('settingTabs.notification.title'),
      icon: 'mdi-bell',
      tab: 'notification',
      description: t('settingTabs.notification.description'),
    },
  ]
}

/** 返回插件管理页的业务标签。 */
export function getPluginTabs(t: Composer['t']): NavMenuTabItem[] {
  return [
    {
      title: t('pluginTabs.installed'),
      tab: 'installed',
      icon: 'mdi-apps',
    },
    {
      title: t('pluginTabs.market'),
      tab: 'market',
      icon: 'mdi-shopping',
    },
  ]
}


/** 插件侧栏分组（与后端 get_sidebar_nav 的 section 一致） */
export type PluginSidebarSection = 'start' | 'organize' | 'system'

/**
 * 将插件声明的 section 映射为与 getNavMenus 一致的已翻译 header（用于 NavMenu.header）
 */
export function pluginSidebarSectionToHeaderKey(section: string, t: Composer['t']): string {
  const map: Record<string, string> = {
    start: 'menu.start',
    organize: 'menu.organize',
    system: 'menu.system',
  }
  return t(map[section] ?? 'menu.system')
}
