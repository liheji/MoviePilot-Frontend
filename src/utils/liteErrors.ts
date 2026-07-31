export const LITE_ERROR_MESSAGES = Object.freeze({
  LITE_DOWNLOAD_PATH_INVALID: '保存路径不可用，请重新选择。',
  LITE_ORIGIN_REJECTED: '下载地址未通过安全校验。',
  LITE_RESULT_CONFLICT: '任务可能已提交，请刷新下载任务。',
  LITE_RESULT_CONSUMED: '该搜索结果已提交，请刷新搜索结果。',
  LITE_RESULT_EXPIRED: '搜索结果已过期，请重新搜索。',
  LITE_RESULT_NOT_FOUND: '搜索结果不存在，请重新搜索。',
  LITE_SITE_UNAVAILABLE: '站点当前不可用，请检查站点配置。',
  LITE_TICKET_EXCHANGE_FAILED: '下载地址换取失败，请稍后重试。',
  PLUGIN_LITE_INCOMPATIBLE: '插件与 MoviePilot Lite 不兼容。',
  PLUGIN_LOAD_FAILED: '插件加载失败，请更新或重试。',
})

export type LiteErrorCode = keyof typeof LITE_ERROR_MESSAGES

export interface LiteErrorResponse {
  code?: string | null
  message?: string
}

export function resolveLiteErrorMessage(response: LiteErrorResponse, fallback = '操作失败'): string {
  const code = response.code as LiteErrorCode | undefined
  return (code && LITE_ERROR_MESSAGES[code]) || response.message || fallback
}
