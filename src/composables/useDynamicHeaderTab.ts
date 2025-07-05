// 动态标签页相关类型
interface DynamicHeaderTabButton {
  icon: string
  color?: string | ComputedRef<string>
  variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain'
  size?: string
  class?: string
  action?: () => void
  show?: boolean | ComputedRef<boolean>
  dataAttr?: string // 用于VMenu定位的data属性
}

interface DynamicHeaderTabItem {
  title: string
  icon?: string
  tab: string
}

interface DynamicHeaderTabConfig {
  items: DynamicHeaderTabItem[]
  modelValue: string
  appendButtons?: DynamicHeaderTabButton[]
  routePath?: string
  onUpdateModelValue?: (value: string) => void
}

export function useDynamicHeaderTab() {
  const route = useRoute()

  // 尝试从inject获取
  const registerDynamicHeaderTab = inject<(tab: DynamicHeaderTabConfig) => void>('registerDynamicHeaderTab')
  const unregisterDynamicHeaderTab = inject<() => void>('unregisterDynamicHeaderTab')

  // 注册动态标签页
  const registerHeaderTab = (config: {
    items: DynamicHeaderTabItem[]
    modelValue: Ref<string>
    appendButtons?: DynamicHeaderTabButton[]
  }) => {
    const tabConfig: DynamicHeaderTabConfig = {
      items: config.items,
      modelValue: config.modelValue.value,
      appendButtons: config.appendButtons,
      routePath: route.path,
      onUpdateModelValue: (value: string) => {
        config.modelValue.value = value
      },
    }

    // 监听modelValue变化并更新配置
    watch(config.modelValue, newValue => {
      tabConfig.modelValue = newValue
      // 重新注册以更新值
      if (registerDynamicHeaderTab) {
        registerDynamicHeaderTab(tabConfig)
      } else if (typeof window !== 'undefined') {
        // 使用全局方法作为备用
        const globalRegister = (window as any).__VUE_INJECT_DYNAMIC_HEADER_TAB__
        if (globalRegister) {
          globalRegister(tabConfig)
        }
      }
    })

    // 在组件卸载时取消注册
    onUnmounted(() => {
      if (unregisterDynamicHeaderTab) {
        unregisterDynamicHeaderTab()
      }
    })

    // 初始注册
    if (registerDynamicHeaderTab) {
      registerDynamicHeaderTab(tabConfig)
    } else if (typeof window !== 'undefined') {
      // 使用全局方法作为备用
      const globalRegister = (window as any).__VUE_INJECT_DYNAMIC_HEADER_TAB__
      if (globalRegister) {
        globalRegister(tabConfig)
      }
    }
  }

  // 取消注册
  const unregisterHeaderTab = () => {
    if (unregisterDynamicHeaderTab) {
      unregisterDynamicHeaderTab()
    }
  }

  return {
    registerHeaderTab,
    unregisterHeaderTab,
  }
}

// 导出类型以供其他地方使用
export type { DynamicHeaderTabButton, DynamicHeaderTabItem, DynamicHeaderTabConfig }
