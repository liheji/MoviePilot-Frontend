/**
 * 媒体服务器深度链接工具
 * 支持Plex、Jellyfin、Emby的APP跳转和网页跳转
 *
 * 深度链接格式参考：
 * - Plex: https://forums.plex.tv/t/plex-mobile-app-deep-linking/123456
 * - Emby: https://emby.media/support/articles/Deep-Linking.html
 * - Jellyfin: https://jellyfin.org/docs/general/administration/deep-linking
 */

import { isMobileDevice, isIOSDevice, isAndroidDevice } from '@/@core/utils'

// 媒体服务器类型
export type MediaServerType = 'plex' | 'jellyfin' | 'emby'

// 深度链接配置
interface DeepLinkConfig {
  appScheme: string
  webUrl: string
  timeout: number
}

// 各媒体服务器的深度链接配置
const DEEP_LINK_CONFIGS: Record<MediaServerType, DeepLinkConfig> = {
  plex: {
    appScheme: 'plex://',
    webUrl: 'https://app.plex.tv',
    timeout: 2000,
  },
  jellyfin: {
    appScheme: 'jellyfin://',
    webUrl: 'https://jellyfin.org',
    timeout: 2000,
  },
  emby: {
    appScheme: 'emby://',
    webUrl: 'https://emby.media',
    timeout: 2000,
  },
}

/**
 * 尝试跳转到APP，如果失败则跳转到网页
 * @param serverType 媒体服务器类型
 * @param playUrl 播放链接
 * @param fallbackUrl 备用网页链接
 */
export async function openMediaServerApp(
  serverType: MediaServerType,
  playUrl: string,
  fallbackUrl?: string,
): Promise<void> {
  // 如果不是移动设备，直接使用网页链接
  if (!isMobileDevice()) {
    window.open(fallbackUrl || playUrl, '_blank')
    return
  }

  const config = DEEP_LINK_CONFIGS[serverType]
  if (!config) {
    console.warn(`不支持的媒体服务器类型: ${serverType}`)
    window.open(fallbackUrl || playUrl, '_blank')
    return
  }

  // 构建APP深度链接
  const appUrl = buildDeepLinkUrl(serverType, playUrl)

  console.log(`构建${serverType}深度链接:`, {
    originalUrl: playUrl,
    deepLinkUrl: appUrl,
  })

  // 尝试跳转到APP
  try {
    await attemptAppLaunch(appUrl, config.timeout)
  } catch (error) {
    console.log(`APP跳转失败，使用网页链接: ${error}`)
    // APP跳转失败，使用网页链接
    window.open(fallbackUrl || playUrl, '_blank')
  }
}

/**
 * 构建深度链接URL
 * @param serverType 媒体服务器类型
 * @param playUrl 播放链接
 */
function buildDeepLinkUrl(serverType: MediaServerType, playUrl: string): string {
  switch (serverType) {
    case 'plex':
      return buildPlexDeepLink(playUrl)

    case 'jellyfin':
      return buildJellyfinDeepLink(playUrl)

    case 'emby':
      return buildEmbyDeepLink(playUrl)

    default:
      return playUrl
  }
}

/**
 * 构建Plex深度链接
 * 参考: https://forums.plex.tv/t/plex-mobile-app-deep-linking/123456
 * @param playUrl 播放链接
 */
function buildPlexDeepLink(playUrl: string): string {
  try {
    const url = new URL(playUrl)

    // 提取媒体ID和机器标识符
    let mediaId: string | null = null
    let machineIdentifier: string | null = null
    let libraryKey: string | null = null

    // 格式1: web/index.html#!/media/{machineIdentifier}/com.plexapp.plugins.library?source={library.key}
    const mediaLibraryMatch = playUrl.match(/\/media\/([^\/]+)\/com\.plexapp\.plugins\.library\?source=([^&]+)/)
    if (mediaLibraryMatch) {
      machineIdentifier = mediaLibraryMatch[1]
      libraryKey = mediaLibraryMatch[2]
      // 对于库链接，我们使用库的key作为媒体ID
      mediaId = libraryKey
    }

    // 格式2: web/index.html#!/server/{machineIdentifier}/details?key={item_id}
    const serverDetailsMatch = playUrl.match(/\/server\/([^\/]+)\/details\?key=([^&]+)/)
    if (serverDetailsMatch) {
      machineIdentifier = serverDetailsMatch[1]
      mediaId = serverDetailsMatch[2]
    }

    // 格式3: plex.tv/tv/xxx 或 plex.tv/movie/xxx (传统格式)
    if (!mediaId) {
      const plexMatch = playUrl.match(/plex\.tv\/(tv|movie)\/([^\/\?]+)/)
      if (plexMatch) {
        mediaId = plexMatch[2]
      }
    }

    // 格式4: /media/plex.tv/tv/xxx (传统格式)
    if (!mediaId) {
      const mediaMatch = playUrl.match(/\/media\/plex\.tv\/(tv|movie)\/([^\/\?]+)/)
      if (mediaMatch) {
        mediaId = mediaMatch[2]
      }
    }

    // 如果还没有提取到机器标识符，尝试从其他路径中提取
    if (!machineIdentifier) {
      const mediaPathMatch = playUrl.match(/\/media\/([^\/]+)/)
      if (mediaPathMatch) {
        machineIdentifier = mediaPathMatch[1]
      }
    }

    if (mediaId) {
      // Plex深度链接格式: plex://{媒体ID}
      const deepLink = `plex://${mediaId}`
      console.log('Plex深度链接构建成功:', {
        originalUrl: playUrl,
        machineIdentifier,
        libraryKey,
        mediaId,
        deepLink,
      })
      return deepLink
    }

    // 如果无法提取媒体ID，尝试使用机器标识符
    if (machineIdentifier) {
      const fallbackLink = `plex://${machineIdentifier}`
      console.log('Plex深度链接构建失败，使用机器标识符:', {
        originalUrl: playUrl,
        machineIdentifier,
        fallbackLink,
      })
      return fallbackLink
    }

    // 最后的降级方案
    console.log('Plex深度链接构建失败，使用原始URL:', {
      originalUrl: playUrl,
    })
    return `plex://${playUrl}`
  } catch (error) {
    console.warn('构建Plex深度链接失败:', error)
    return `plex://${playUrl}`
  }
}

/**
 * 构建Jellyfin深度链接
 * 参考: https://jellyfin.org/docs/general/administration/deep-linking
 * @param playUrl 播放链接
 */
function buildJellyfinDeepLink(playUrl: string): string {
  try {
    const url = new URL(playUrl)
    const serverAddress = url.hostname + (url.port ? `:${url.port}` : '')

    // 提取媒体ID、库ID、serverId
    let mediaId: string | null = null
    let libraryId: string | null = null
    let serverId: string | null = null

    // 格式1: /details?id={item_id}&serverId={serverid}
    const detailsMatch = playUrl.match(/\/details\?id=([^&]+)&serverId=([^&]+)/)
    if (detailsMatch) {
      mediaId = detailsMatch[1]
      serverId = detailsMatch[2]
    }

    // 格式2: /movies.html?topParentId={libraryId}
    const moviesMatch = playUrl.match(/\/movies\.html\?topParentId=([^&]+)/)
    if (moviesMatch) {
      libraryId = moviesMatch[1]
    }
    // 格式3: /tv.html?topParentId={libraryId}
    const tvMatch = playUrl.match(/\/tv\.html\?topParentId=([^&]+)/)
    if (tvMatch) {
      libraryId = tvMatch[1]
    }
    // 格式4: /library.html?topParentId={libraryId}
    const libMatch = playUrl.match(/\/library\.html\?topParentId=([^&]+)/)
    if (libMatch) {
      libraryId = libMatch[1]
    }

    // 兼容原有格式：?id=xxx
    if (!mediaId) {
      const idMatch = playUrl.match(/[?&]id=([^&]+)/)
      if (idMatch) {
        mediaId = idMatch[1]
      }
    }

    // 兼容原有格式：/items/xxx
    if (!mediaId) {
      const itemsMatch = playUrl.match(/\/items\/([^\/\?]+)/)
      if (itemsMatch) {
        mediaId = itemsMatch[1]
      }
    }

    // 构建深度链接
    if (mediaId) {
      let deepLink = `jellyfin://${serverAddress}/item/${mediaId}`
      if (serverId) {
        deepLink += `?serverId=${serverId}`
      }
      console.log('Jellyfin深度链接构建成功:', {
        originalUrl: playUrl,
        serverAddress,
        mediaId,
        serverId,
        deepLink,
      })
      return deepLink
    }
    if (libraryId) {
      const deepLink = `jellyfin://${serverAddress}/library/${libraryId}`
      console.log('Jellyfin库深度链接构建成功:', {
        originalUrl: playUrl,
        serverAddress,
        libraryId,
        deepLink,
      })
      return deepLink
    }

    // 如果无法提取ID，尝试直接使用服务器地址
    const fallbackLink = `jellyfin://${serverAddress}`
    console.log('Jellyfin深度链接构建失败，使用服务器地址:', {
      originalUrl: playUrl,
      serverAddress,
      fallbackLink,
    })
    return fallbackLink
  } catch (error) {
    console.warn('构建Jellyfin深度链接失败:', error)
    return `jellyfin://${playUrl}`
  }
}

/**
 * 构建Emby深度链接
 * 参考: https://emby.media/support/articles/Deep-Linking.html
 * @param playUrl 播放链接
 */
function buildEmbyDeepLink(playUrl: string): string {
  try {
    const url = new URL(playUrl)
    const serverAddress = url.hostname + (url.port ? `:${url.port}` : '')

    // 尝试多种格式提取媒体ID
    let mediaId: string | null = null
    let serverId: string | null = null

    // 格式1: /web/index.html#!/item?id=xxx&context=home&serverId=xxx (后台返回的格式)
    const itemHashMatch = playUrl.match(/\/item\?id=([^&]+)/)
    if (itemHashMatch) {
      mediaId = itemHashMatch[1]
      // 提取serverId
      const serverIdMatch = playUrl.match(/serverId=([^&]+)/)
      if (serverIdMatch) {
        serverId = serverIdMatch[1]
      }
    }

    // 格式2: /web/index.html#!/videos?serverId=xxx&parentId=xxx (后台返回的格式)
    const videosHashMatch = playUrl.match(/\/videos\?serverId=([^&]+)&parentId=([^&]+)/)
    if (videosHashMatch) {
      // 对于videos格式，我们使用parentId作为媒体ID
      mediaId = videosHashMatch[2]
      serverId = videosHashMatch[1]
    }

    // 格式3: ?id=xxx (通用格式)
    if (!mediaId) {
      const idMatch = playUrl.match(/[?&]id=([^&]+)/)
      if (idMatch) {
        mediaId = idMatch[1]
      }
    }

    // 格式4: /itemdetails.html?id=xxx
    if (!mediaId) {
      const itemMatch = playUrl.match(/\/itemdetails\.html\?id=([^&]+)/)
      if (itemMatch) {
        mediaId = itemMatch[1]
      }
    }

    // 格式5: /items/xxx
    if (!mediaId) {
      const itemsMatch = playUrl.match(/\/items\/([^\/\?]+)/)
      if (itemsMatch) {
        mediaId = itemsMatch[1]
      }
    }

    // 格式6: /item/xxx (路径格式)
    if (!mediaId) {
      const itemPathMatch = playUrl.match(/\/item\/([^\/\?]+)/)
      if (itemPathMatch) {
        mediaId = itemPathMatch[1]
      }
    }

    if (mediaId) {
      // Emby深度链接格式: emby://{服务器地址}/item/{媒体ID}
      // 如果有serverId，也包含进去
      let deepLink = `emby://${serverAddress}/item/${mediaId}`
      if (serverId) {
        deepLink += `?serverId=${serverId}`
      }

      console.log('Emby深度链接构建成功:', {
        originalUrl: playUrl,
        serverAddress,
        mediaId,
        serverId,
        deepLink,
      })
      return deepLink
    }

    // 如果无法提取媒体ID，尝试直接使用服务器地址
    // 这会打开Emby APP的主界面
    const fallbackLink = `emby://${serverAddress}`
    console.log('Emby深度链接构建失败，使用服务器地址:', {
      originalUrl: playUrl,
      serverAddress,
      fallbackLink,
    })
    return fallbackLink
  } catch (error) {
    console.warn('构建Emby深度链接失败:', error)
    return playUrl
  }
}

/**
 * 尝试启动APP
 * @param appUrl APP深度链接
 * @param timeout 超时时间
 */
async function attemptAppLaunch(appUrl: string, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // 创建一个隐藏的iframe来尝试启动APP
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = appUrl

    // 设置超时
    const timeoutId = setTimeout(() => {
      document.body.removeChild(iframe)
      reject(new Error('APP启动超时'))
    }, timeout)

    // 监听页面可见性变化，如果用户切换到APP，说明启动成功
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timeoutId)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        document.body.removeChild(iframe)
        resolve()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 添加到页面并尝试启动
    document.body.appendChild(iframe)

    // 对于iOS，还需要尝试window.location
    if (isIOSDevice()) {
      try {
        window.location.href = appUrl
      } catch (error) {
        console.log('iOS window.location跳转失败:', error)
      }
    }
  })
}

/**
 * 根据播放链接自动检测媒体服务器类型并跳转
 * @param playUrl 播放链接
 * @param fallbackUrl 备用网页链接
 */
export async function openMediaServerWithAutoDetect(playUrl: string, fallbackUrl?: string): Promise<void> {
  // 从URL中检测媒体服务器类型
  const url = playUrl.toLowerCase()

  let serverType: MediaServerType | null = null

  if (url.includes('plex') || url.includes('plex.tv')) {
    serverType = 'plex'
  } else if (url.includes('jellyfin')) {
    serverType = 'jellyfin'
  } else if (url.includes('emby')) {
    serverType = 'emby'
  }

  if (serverType) {
    await openMediaServerApp(serverType, playUrl, fallbackUrl)
  } else {
    // 无法检测到服务器类型，直接使用网页链接
    window.open(fallbackUrl || playUrl, '_blank')
  }
}

/**
 * 获取媒体服务器的APP下载链接
 * @param serverType 媒体服务器类型
 */
export function getAppDownloadUrl(serverType: MediaServerType): string {
  switch (serverType) {
    case 'plex':
      return 'https://www.plex.tv/apps/'
    case 'jellyfin':
      return 'https://jellyfin.org/downloads/'
    case 'emby':
      return 'https://emby.media/download.html'
    default:
      return ''
  }
}

/**
 * 检查是否安装了特定的媒体服务器APP
 * 注意：由于浏览器安全限制，无法直接检测APP是否安装
 * 这个方法主要用于提示用户
 */
export function checkAppInstalled(serverType: MediaServerType): boolean {
  // 由于浏览器安全限制，无法直接检测APP是否安装
  // 这里可以根据用户代理或其他信息进行推测
  // 目前返回false，让系统总是尝试跳转
  return false
}
