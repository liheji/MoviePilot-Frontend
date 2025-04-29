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

// actionStep
export function getActionStepText(label: string | undefined) {
  if (!label) return ''

  const { t } = useI18n()

  const stepMap: Record<string, string> = {
    '添加下载': 'actionStep.addDownload',
    '添加订阅': 'actionStep.addSubscribe',
    '获取下载任务': 'actionStep.fetchDownloads',
    '获取媒体数据': 'actionStep.fetchMedias',
    '获取RSS资源': 'actionStep.fetchRss',
    '搜索站点资源': 'actionStep.fetchTorrents',
    '过滤媒体数据': 'actionStep.filterMedias',
    '过滤资源': 'actionStep.filterTorrents',
    '扫描目录': 'actionStep.scanFile',
    '刮削文件': 'actionStep.scrapeFile',
    '发送事件': 'actionStep.sendEvent',
    '发送消息': 'actionStep.sendMessage',
    '整理文件': 'actionStep.transferFile',
  }
  if (label in stepMap) {
    return t(stepMap[label])
  }
}
