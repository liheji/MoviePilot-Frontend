interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export function usePWAInstall() {
  const isInstallable = ref(false)
  const isInstalled = ref(false)
  const installPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const installOutcome = ref<'accepted' | 'dismissed' | null>(null)

  // 检查是否已安装（通过检查display-mode）
  const checkIfInstalled = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches
    const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches
    const isWindowControlsOverlay = window.matchMedia('(display-mode: window-controls-overlay)').matches
    
    // iOS Safari特殊检查
    const isIOSStandalone = (window.navigator as any).standalone === true
    
    return isStandalone || isFullscreen || isMinimalUI || isWindowControlsOverlay || isIOSStandalone
  }

  // 显示安装提示
  const showInstallPrompt = async () => {
    if (!installPrompt.value) {
      console.warn('No install prompt available')
      return false
    }

    try {
      // 显示浏览器的安装提示
      await installPrompt.value.prompt()
      
      // 等待用户响应
      const { outcome } = await installPrompt.value.userChoice
      installOutcome.value = outcome
      
      // 如果用户接受安装，清除安装提示
      if (outcome === 'accepted') {
        isInstallable.value = false
        installPrompt.value = null
        isInstalled.value = true
      }
      
      return outcome === 'accepted'
    } catch (error) {
      console.error('Failed to show install prompt:', error)
      return false
    }
  }

  // 处理安装事件
  const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
    // 阻止默认行为
    e.preventDefault()
    
    // 保存安装提示
    installPrompt.value = e
    isInstallable.value = true
  }

  // 处理应用安装成功事件
  const handleAppInstalled = () => {
    isInstalled.value = true
    isInstallable.value = false
    installPrompt.value = null
  }

  // 检查是否支持 PWA 安装
  // 使用 "onbeforeinstallprompt" 事件的存在性来判断，而不是检查
  // BeforeInstallPromptEvent 构造函数（在运行时并不存在）。
  // 对于不触发 beforeinstallprompt 的 iOS Safari，同样允许通过
  // "添加到主屏幕" 的方式安装，因此这里也认为是支持的。
  const isPWASupported = computed(() => {
    const hasServiceWorker = 'serviceWorker' in navigator
    const supportsInstallPromptEvent = 'onbeforeinstallprompt' in window
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

    return hasServiceWorker && (supportsInstallPromptEvent || isIOS)
  })

  // 获取安装指南（针对不同平台）
  const getInstallInstructions = () => {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isAndroid = /Android/.test(ua)
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
    const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua)
    const isEdge = /Edg/.test(ua)
    const isFirefox = /Firefox/.test(ua)

    if (isIOS && isSafari) {
      return {
        platform: 'iOS Safari',
        steps: [
          '点击浏览器底部的分享按钮',
          '向下滑动并点击"添加到主屏幕"',
          '点击右上角的"添加"',
        ],
      }
    } else if (isAndroid && isChrome) {
      return {
        platform: 'Android Chrome',
        steps: [
          '点击浏览器右上角的菜单按钮（三个点）',
          '选择"添加到主屏幕"',
          '点击"添加"确认',
        ],
      }
    } else if (isEdge) {
      return {
        platform: 'Microsoft Edge',
        steps: [
          '点击地址栏右侧的安装按钮',
          '或点击菜单中的"应用" > "安装此站点"',
          '点击"安装"确认',
        ],
      }
    } else if (isFirefox && isAndroid) {
      return {
        platform: 'Firefox Android',
        steps: [
          '点击浏览器右上角的菜单按钮',
          '选择"安装"',
          '点击"添加到主屏幕"',
        ],
      }
    } else {
      return {
        platform: '您的浏览器',
        steps: [
          '查看浏览器的菜单或设置',
          '寻找"安装应用"或"添加到主屏幕"选项',
          '按照提示完成安装',
        ],
      }
    }
  }

  onMounted(() => {
    // 检查是否已安装
    isInstalled.value = checkIfInstalled()
    
    // 监听安装提示事件
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // 监听安装成功事件
    window.addEventListener('appinstalled', handleAppInstalled)
    
    // 监听display-mode变化
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', (e) => {
      isInstalled.value = e.matches
    })
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return {
    isInstallable,
    isInstalled,
    isPWASupported,
    installOutcome,
    showInstallPrompt,
    getInstallInstructions,
  }
}