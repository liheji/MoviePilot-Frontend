import i18n from '@/plugins/i18n'

export const storageAttributes = [
  {
    type: 'local',
    icon: 'mdi-folder-multiple-outline',
    remote: false,
  },
]

export const downloaderOptions = [
  {
    value: 'qbittorrent',
    title: i18n.global.t('setting.system.qbittorrent'),
  },
  {
    value: 'transmission',
    title: i18n.global.t('setting.system.transmission'),
  },
  {
    value: 'rtorrent',
    title: i18n.global.t('setting.system.rtorrent'),
  },
]

export const downloaderDict = downloaderOptions.reduce((dict, item) => {
  dict[item.value] = item.title
  return dict
}, {} as Record<string, string>)

// 通知开关选项
export const notificationSwitchOptions = [
  {
    title: i18n.global.t('notificationSwitch.resourceDownload'),
    value: '资源下载',
  },
  {
    title: i18n.global.t('notificationSwitch.site'),
    value: '站点',
  },
  {
    title: i18n.global.t('notificationSwitch.manual'),
    value: '手动处理',
  },
  {
    title: i18n.global.t('notificationSwitch.plugin'),
    value: '插件',
  },
  {
    title: i18n.global.t('notificationSwitch.other'),
    value: '其它',
  },
]

// 通知开关字典
export const notificationSwitchDict = notificationSwitchOptions.reduce((dict, item) => {
  dict[item.value] = item.title
  return dict
}, {} as Record<string, string>)
