/** Lite 手动下载请求的可选参数。 */
export interface LiteDownloadPayloadOptions {
  downloader?: string | null
  resultHandle: string
  savePath?: string | null
}

/** 构建不包含站点凭据、URL 或媒体字段的 Lite 下载请求。 */
export function buildLiteDownloadPayload(options: LiteDownloadPayloadOptions) {
  const payload: Record<string, string> = { result_handle: options.resultHandle }
  if (options.downloader) payload.downloader = options.downloader
  if (options.savePath) payload.save_path = options.savePath
  return payload
}
