const existsStatus = new Map<string, boolean>()

/** 读取或加载媒体库存在状态。 */
export async function getCachedMediaExistsStatus(key: string, loader: () => Promise<boolean>): Promise<boolean> {
  const cached = existsStatus.get(key)
  if (cached !== undefined) return cached
  const value = await loader()
  existsStatus.set(key, value)
  return value
}

/** 更新媒体库存在状态缓存。 */
export function setCachedMediaExistsStatus(key: string, value: boolean): void {
  existsStatus.set(key, value)
}

/** 清空媒体库存在状态缓存。 */
export function clearCachedMediaExistsStatuses(): void {
  existsStatus.clear()
}
