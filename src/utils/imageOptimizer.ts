let isNavigating = false
const MAX_CONCURRENT_IMAGES = 10 // 并发数
let currentLoadingCount = 0
const imageQueue: { img: HTMLImageElement; src: string }[] = []

// 监听路由状态
export function setNavigatingState(navigating: boolean) {
  isNavigating = navigating

  if (navigating) {
    // 路由切换时只是标记状态，不强制中断图片加载
    console.log('Navigation started - pausing new image loads')
  } else {
    // 路由切换完成后，处理队列中的图片
    setTimeout(() => {
      console.log('Navigation ended - resuming image loads')
      processImageQueue()
    }, 100)
  }
}

// 处理图片队列
function processImageQueue() {
  while (imageQueue.length > 0 && currentLoadingCount < MAX_CONCURRENT_IMAGES && !isNavigating) {
    const { img, src } = imageQueue.shift()!
    startImageLoad(img, src)
  }
}

// 开始加载图片
function startImageLoad(img: HTMLImageElement, src: string) {
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

// 初始化图片优化器
export function initializeImageOptimizer() {
  // 只对新创建的img元素进行温和的优化
  const originalCreateElement = document.createElement
  document.createElement = function (tagName: string, options?: ElementCreationOptions) {
    const element = originalCreateElement.call(this, tagName, options)

    if (tagName.toLowerCase() === 'img') {
      const img = element as HTMLImageElement

      // 只拦截src的设置，使用更温和的方式
      const originalSetAttribute = img.setAttribute
      img.setAttribute = function (name: string, value: string) {
        if (name === 'src' && value) {
          // 使用智能加载
          smartImageLoad(this, value)
          return
        }
        return originalSetAttribute.call(this, name, value)
      }
    }

    return element
  }

  // 为现有图片添加懒加载属性
  document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('img:not([loading])')
    images.forEach(img => {
      img.setAttribute('loading', 'lazy')
    })
  })

  // 监听新添加的图片
  const observer = new MutationObserver(mutations => {
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
}
