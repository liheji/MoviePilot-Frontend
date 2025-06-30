let isNavigating = false
const MAX_CONCURRENT_IMAGES = 8 // 降低并发数，避免阻塞
let currentLoadingCount = 0
const imageQueue: { img: HTMLImageElement; src: string; controller?: AbortController }[] = []

// 存储所有正在加载的图片请求控制器
const activeImageRequests = new Set<AbortController>()

// 监听路由状态
export function setNavigatingState(navigating: boolean) {
  isNavigating = navigating

  if (navigating) {
    console.log('Navigation started - canceling all image loads')
    // 路由切换时，立即取消所有正在加载的图片
    cancelAllImageLoads()
    // 清空队列
    imageQueue.length = 0
  } else {
    // 路由切换完成后，恢复图片加载
    setTimeout(() => {
      console.log('Navigation ended - resuming image loads')
      processImageQueue()
    }, 300)
  }
}

// 取消所有正在加载的图片
function cancelAllImageLoads() {
  // 取消所有fetch请求
  for (const controller of activeImageRequests) {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }
  activeImageRequests.clear()

  // 重置计数器
  currentLoadingCount = 0
}

// 处理图片队列
function processImageQueue() {
  while (imageQueue.length > 0 && currentLoadingCount < MAX_CONCURRENT_IMAGES && !isNavigating) {
    const item = imageQueue.shift()!
    startImageLoad(item.img, item.src)
  }
}

// 开始加载图片
function startImageLoad(img: HTMLImageElement, src: string) {
  if (isNavigating) {
    return // 如果正在导航，不加载新图片
  }

  currentLoadingCount++

  const originalOnLoad = img.onload
  const originalOnError = img.onerror

  img.onload = function (event) {
    currentLoadingCount--
    processImageQueue() // 加载完成后处理队列
    if (originalOnLoad) originalOnLoad.call(this, event)
  }

  img.onerror = function (event) {
    currentLoadingCount--
    processImageQueue() // 出错时也要处理队列
    if (originalOnError) originalOnError.call(this, event)
  }

  img.src = src
}

// 智能图片加载函数
function smartImageLoad(img: HTMLImageElement, src: string) {
  if (isNavigating) {
    // 路由切换时，加入队列等待
    imageQueue.push({ img, src })
    return
  }

  if (currentLoadingCount < MAX_CONCURRENT_IMAGES) {
    // 直接加载
    startImageLoad(img, src)
  } else {
    // 加入队列
    imageQueue.push({ img, src })
  }
}

// 优化的fetch图片加载函数
async function fetchImageWithCancel(url: string): Promise<string> {
  if (isNavigating) {
    throw new Error('Navigation in progress')
  }

  const controller = new AbortController()
  activeImageRequests.add(controller)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // 添加缓存控制
      cache: 'force-cache',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    return objectUrl
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Image fetch was cancelled')
    }
    throw error
  } finally {
    activeImageRequests.delete(controller)
  }
}

// 检查元素是否为VImg组件
function isVImgElement(element: Element): boolean {
  if (!element.classList) return false

  // 检查是否包含v-img相关的类名
  const classList = Array.from(element.classList)
  return classList.some(className => className.startsWith('v-img') || className.includes('v-img'))
}

// 全局VImg组件拦截
function interceptVImgComponents() {
  // 使用MutationObserver监听DOM变化，拦截所有VImg组件
  const observer = new MutationObserver(mutations => {
    if (isNavigating) return

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element

          // 查找VImg组件（Vuetify的VImg会生成特定的DOM结构）
          const vImgElements = element.querySelectorAll('.v-img, [class*="v-img"]')
          vImgElements.forEach(vImgEl => {
            interceptVImgElement(vImgEl as HTMLElement)
          })

          // 如果当前元素本身就是VImg
          if (isVImgElement(element)) {
            interceptVImgElement(element as HTMLElement)
          }
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  return observer
}

// 拦截单个VImg元素
function interceptVImgElement(vImgElement: HTMLElement) {
  if (vImgElement.dataset.intercepted === 'true') {
    return // 已经拦截过了
  }

  vImgElement.dataset.intercepted = 'true'

  // 查找VImg内部的img元素
  const findAndInterceptImg = () => {
    const imgElements = vImgElement.querySelectorAll('img')
    imgElements.forEach(img => {
      if (img.dataset.intercepted !== 'true') {
        img.dataset.intercepted = 'true'

        // 保存原始的src设置方法
        const originalSetAttribute = img.setAttribute.bind(img)
        const originalSrcDescriptor =
          Object.getOwnPropertyDescriptor(img, 'src') ||
          Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')

        // 拦截setAttribute方法
        img.setAttribute = function (name: string, value: string) {
          if (name === 'src' && value && !isNavigating) {
            smartImageLoad(this, value)
            return
          } else if (name === 'src' && isNavigating) {
            // 导航时不设置src
            return
          }
          return originalSetAttribute(name, value)
        }

        // 拦截src属性直接赋值
        if (originalSrcDescriptor) {
          Object.defineProperty(img, 'src', {
            get: originalSrcDescriptor.get,
            set: function (value: string) {
              if (value && !isNavigating) {
                smartImageLoad(this, value)
              } else if (!isNavigating && originalSrcDescriptor.set) {
                originalSrcDescriptor.set.call(this, value)
              }
            },
            enumerable: true,
            configurable: true,
          })
        }
      }
    })
  }

  // 立即查找现有的img元素
  findAndInterceptImg()

  // 监听VImg内部的变化
  const imgObserver = new MutationObserver(() => {
    if (!isNavigating) {
      findAndInterceptImg()
    }
  })

  imgObserver.observe(vImgElement, {
    childList: true,
    subtree: true,
  })
}

// 初始化图片优化器
export function initializeImageOptimizer() {
  // 拦截原生img元素
  const originalCreateElement = document.createElement
  document.createElement = function (tagName: string, options?: ElementCreationOptions) {
    const element = originalCreateElement.call(this, tagName, options)

    if (tagName.toLowerCase() === 'img') {
      const img = element as HTMLImageElement

      const originalSetAttribute = img.setAttribute
      img.setAttribute = function (name: string, value: string) {
        if (name === 'src' && value) {
          smartImageLoad(this, value)
          return
        }
        return originalSetAttribute.call(this, name, value)
      }
    }

    return element
  }

  // 启动VImg组件拦截
  interceptVImgComponents()

  // 为现有图片添加懒加载属性
  document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('img:not([loading])')
    images.forEach(img => {
      img.setAttribute('loading', 'lazy')
    })
  })

  // 监听新添加的图片元素
  const observer = new MutationObserver(mutations => {
    if (isNavigating) return // 导航时跳过处理

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element

          // 为新添加的img标签设置懒加载
          if (element.tagName === 'IMG' && !element.getAttribute('loading')) {
            element.setAttribute('loading', 'lazy')
          }

          // 为子元素中的img设置懒加载
          const imgs = element.querySelectorAll('img:not([loading])')
          imgs.forEach(img => {
            img.setAttribute('loading', 'lazy')
          })
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // 监听页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // 页面隐藏时暂停图片加载
      setNavigatingState(true)
    } else {
      // 页面显示时恢复图片加载
      setTimeout(() => {
        setNavigatingState(false)
      }, 500)
    }
  })
}

// 导出fetch图片函数供组件使用
export { fetchImageWithCancel }

// 获取当前状态信息（调试用）
export function getImageLoadingStatus() {
  return {
    isNavigating,
    currentLoadingCount,
    queueLength: imageQueue.length,
    activeRequestsCount: activeImageRequests.size,
  }
}
