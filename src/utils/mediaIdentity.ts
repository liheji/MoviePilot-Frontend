import type { MediaInfo } from '@/api/types'

/** 根据媒体来源生成稳定的媒体标识。 */
export function getMediaId(media?: MediaInfo): string {
  if (!media) return ''

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
    return `${source === 'themoviedb' ? 'tmdb' : source}:${mediaId}`
  }
  return ''
}
