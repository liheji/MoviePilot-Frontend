import { type Ref } from 'vue'
import type { MediaInfo } from '@/api/types'

export type SubscribeMode = 'normal' | 'best_version' | 'best_version_full'
export type SeasonSubscribeModes = Record<number, SubscribeMode>

interface UseMediaSubscribeOptions {
  media: () => MediaInfo | undefined
  canSubscribe: () => boolean
  isSubscribed?: Ref<boolean>
  isExists?: () => boolean
  seasonsSubscribed?: Ref<{ [key: number]: boolean }>
  subscribedSeasons?: Ref<number[]>
  subscribedSeasonModes?: Ref<SeasonSubscribeModes>
  primarySeason?: () => number | null
  getSubscribeStatusKey?: (season: number | null) => string
  onEditRemove?: () => void
}

export interface MediaSubscribeIdentity {
  mediaId: string
  mediaKey: string
  source: string
}

/** 按媒体主来源生成稳定身份，供仍在迁移中的媒体页面读取自身标识。 */
export function getMediaSubscribeIdentity(media?: MediaInfo): MediaSubscribeIdentity | undefined {
  if (!media) return undefined

  const sourceIds: Record<string, unknown> = {
    anilist: media.anilist_id,
    bangumi: media.bangumi_id,
    douban: media.douban_id,
    themoviedb: media.tmdb_id,
  }
  const normalizeSource = (value?: string) => {
    const source = (value || '').trim().toLowerCase()
    return source === 'tmdb' ? 'themoviedb' : source
  }
  const sources = [media.mediaid_prefix, media.source, 'themoviedb', 'douban', 'bangumi', 'anilist']
    .map(normalizeSource)
    .filter((source, index, values) => source && values.indexOf(source) === index)

  for (const source of sources) {
    const value = media.media_id ?? sourceIds[source]
    if (value === undefined || value === null || !String(value).trim()) continue
    const mediaId = String(value).trim()
    return {
      mediaId,
      mediaKey: `${source === 'themoviedb' ? 'tmdb' : source}:${mediaId}`,
      source,
    }
  }
  return undefined
}

/** 返回媒体稳定标识，保留给现有非订阅展示逻辑使用。 */
export function getMediaSubscribeId(media?: MediaInfo): string {
  return getMediaSubscribeIdentity(media)?.mediaKey ?? ''
}

/** 解析历史订阅模式值，供保留页面安全显示旧数据。 */
export function getSubscribeMode(value: { best_version?: unknown; best_version_full?: unknown }): SubscribeMode {
  const enabled = (flag: unknown) => flag === true || flag === 1 || flag === '1'
  if (!enabled(value.best_version)) return 'normal'
  return enabled(value.best_version_full) ? 'best_version_full' : 'best_version'
}

/**
 * 为尚未删除的历史媒体组件提供只读兼容壳。
 *
 * Lite 不执行订阅查询、写入或弹窗交互；后续媒体页面删除前，这些回调始终保持无副作用。
 */
export function useMediaSubscribe(options: UseMediaSubscribeOptions) {
  const clearStatus = (season: number | null) => {
    if (season === null || options.media()?.type === '电影') {
      if (options.isSubscribed) options.isSubscribed.value = false
      return
    }
    if (options.seasonsSubscribed) options.seasonsSubscribed.value[season] = false
    if (options.subscribedSeasons) {
      options.subscribedSeasons.value = options.subscribedSeasons.value.filter(value => value !== season)
    }
  }

  return {
    async checkSubscribe(season?: number | null): Promise<boolean> {
      void season
      return false
    },
    handleSubscribe(season?: number | null, episodeGroup?: string): void {
      void season
      void episodeGroup
    },
    async removeSubscribe(season: number | null = options.primarySeason?.() ?? null): Promise<void> {
      clearStatus(season)
    },
    openSubscribeSeasonDialog(): void {},
    subscribeSeasons(): void {},
  }
}
