// 1. 配置与兼容性
import './ace-config'
import '@/@core/utils/compatibility'
import '@/@iconify/icons-bundle'
import '@/plugins/webfontloader'

// 2. 核心插件和 UI 框架
import { createApp } from 'vue'
import vuetify from '@/plugins/vuetify'
import router from '@/router'
import pinia from '@/stores/index'
import i18n from '@/plugins/i18n'

// 3. 全局组件
import App from '@/App.vue'
import { VAceEditor } from 'vue3-ace-editor'
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar'
import { CronVuetify } from '@vue-js-cron/vuetify'

// 4. 工具函数和其他辅助模块
import { loadRemoteComponents } from './utils/federationLoader'

// 5. 其他插件和功能模块
import Toast from 'vue-toastification'
import ConfirmDialog from '@/composables/useConfirm'
import VueApexCharts from 'vue3-apexcharts'

// 6. 注册自定义组件
import DialogCloseBtn from '@/@core/components/DialogCloseBtn.vue'
import ScrollToTopBtn from '@/@core/components/ScrollToTopBtn.vue'
import PageContentTitle from './@core/components/PageContentTitle.vue'
import MediaCard from './components/cards/MediaCard.vue'
import PosterCard from './components/cards/PosterCard.vue'
import BackdropCard from './components/cards/BackdropCard.vue'
import PersonCard from './components/cards/PersonCard.vue'
import MediaInfoCard from './components/cards/MediaInfoCard.vue'
import TorrentCard from './components/cards/TorrentCard.vue'
import MediaIdSelector from './components/misc/MediaIdSelector.vue'
import CronField from './components/field/CronField.vue'
import PathField from './components/field/PathField.vue'
import HeaderTab from './layouts/components/HeaderTab.vue'

// 7. 样式文件 - 合并为单一导入
import '@/styles/main.scss'

// 8. PWA状态管理
import { PWAStateController } from '@/utils/pwaStateManager'
import { checkPWAStatus } from '@/@core/utils/navigator'

// PWA状态管理器初始化函数
const initializePWABeforeMount = async () => {
  // 使用统一的PWA检测方法
  const pwaStatus = await checkPWAStatus()

  if (pwaStatus.isPWAEnvironment) {
    const pwaStateController = new PWAStateController()

    // 等待状态恢复完成
    await pwaStateController.waitForStateRestore()

    // 将状态管理器绑定到全局对象
    ;(window as any).pwaStateController = pwaStateController

    return pwaStateController
  }

  return null
}

// 在创建Vue应用前初始化PWA状态管理器
const pwaStateController = await initializePWABeforeMount()

// 创建Vue实例
const app = createApp(App)

// 注册pinia
app.use(pinia)

// 异步加载远程组件（不阻塞启动）
loadRemoteComponents().catch(error => {
  console.error('Failed to load remote components', error)
})

// 1. 注册 UI 框架
app.use(vuetify)

// 2. 注册路由
app.use(router)

// 3. 注册全局组件
app
  .component('VAceEditor', VAceEditor)
  .component('VApexChart', VueApexCharts)
  .component('VCronVuetify', CronVuetify)
  .component('VDialogCloseBtn', DialogCloseBtn)
  .component('VScrollToTopBtn', ScrollToTopBtn)
  .component('VMediaCard', MediaCard)
  .component('VPosterCard', PosterCard)
  .component('VBackdropCard', BackdropCard)
  .component('VPersonCard', PersonCard)
  .component('VMediaInfoCard', MediaInfoCard)
  .component('VTorrentCard', TorrentCard)
  .component('VMediaIdSelector', MediaIdSelector)
  .component('VCronField', CronField)
  .component('VPathField', PathField)
  .component('VHeaderTab', HeaderTab)
  .component('VPageContentTitle', PageContentTitle)

// 4. 注册其他插件
app
  .use(PerfectScrollbarPlugin)
  .use(Toast, {
    position: 'bottom-right',
    hideProgressBar: true,
  })
  .use(ConfirmDialog)
  .use(i18n)
  .mount('#app')

// 5. 添加状态恢复事件监听器
if (pwaStateController) {
  // 监听状态恢复事件
  window.addEventListener('pwaStateRestored', (event: Event) => {
    const customEvent = event as CustomEvent

    // 可以在这里添加状态恢复后的处理逻辑
    // 例如：通知Vue组件状态已恢复
    app.config.globalProperties.$pwaStateRestored = true
  })

  // 监听应用即将卸载事件，保存状态
  window.addEventListener('beforeunload', () => {
    if (pwaStateController) {
      pwaStateController.saveCurrentState()
    }
  })
}

// 导出状态管理器供其他模块使用
export { pwaStateController }
