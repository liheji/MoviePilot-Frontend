// MediaType
export function getMediaTypeText(label: string | undefined) {
  if (!label) return ''

  const { t } = useI18n()

  // 常见的媒体类型及其映射
  const typeMap: Record<string, string> = {
    '电影': 'mediaType.movie',
    '电视剧': 'mediaType.tv',
    '动漫': 'mediaType.anime',
    '合集': 'mediaType.collection',
    '未知': 'mediaType.unknown',
  }

  // 如果是已知类型，使用i18n翻译
  if (label in typeMap) {
    return t(typeMap[label])
  }

  // 对于未知的类型，直接返回原始标签
  return label
}

// notificationSwitch
export function getNotificationSwitchText(label: string | undefined) {
  if (!label) return ''

  const { t } = useI18n()

  const switchMap: Record<string, string> = {
    '资源下载': 'notificationSwitch.resourceDownload',
    '整理入库': 'notificationSwitch.organize',
    '订阅': 'notificationSwitch.subscribe',
    '站点': 'notificationSwitch.site',
    '媒体服务器': 'notificationSwitch.mediaServer',
    '手动处理': 'notificationSwitch.manual',
    '插件': 'notificationSwitch.plugin',
    '其它': 'notificationSwitch.other',
  }
  if (label in switchMap) {
    return t(switchMap[label])
  }
}
