// 将中文标签转换为当前语言的标签
export function getMeidaTypeText(label: string | undefined) {
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
