import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/api'
import { copyToClipboard } from '@/@core/utils/navigator'
import { User } from '@/api/types'

export interface WizardData {
  basic: {
    appDomain: string
    apiToken: string
    username: string
    password: string
    confirmPassword: string
    ocrHost: string
    proxyHost: string
    githubToken: string
  }
  siteAuth: {
    auxiliaryAuthEnable: boolean
    site: string
    params: Record<string, string | number>
  }
  downloader: {
    type: string
    name: string
    config: any
  }
  notification: {
    type: string
    name: string
    enabled: boolean
    config: any
    switchs: any[]
  }
}

export interface ConnectivityTestState {
  isTesting: boolean
  testMessage: string
  testProgress: number
  testResult: 'success' | 'error' | null
  showResult: boolean
}

export interface ValidationErrorState {
  siteAuth: {
    site: boolean
    [key: string]: boolean
  }
  downloader: {
    name: boolean
    host: boolean
    apikey: boolean
    username: boolean
    password: boolean
  }
  notification: {
    name: boolean
    [key: string]: boolean
  }
}

// 全局状态，所有组件共享
const currentStep = ref(1)
const totalSteps = 4

// 加载状态
const isLoading = ref(false)


// 可认证站点列表
const authSites = ref<{
  [key: string]: {
    name: string
    icon: string
    params: {
      [key: string]: {
        name: string
        type: string
        placeholder?: string
        tooltip?: string
      }
    }
  }
}>({})

// 向导数据
const wizardData = ref<WizardData>({
  basic: {
    appDomain: '',
    apiToken: '',
    username: '',
    password: '',
    confirmPassword: '',
    ocrHost: '',
    proxyHost: '',
    githubToken: '',
  },
  siteAuth: {
    auxiliaryAuthEnable: false,
    site: '',
    params: {},
  },
  downloader: {
    type: '',
    name: '',
    config: {},
  },
  notification: {
    type: '',
    name: '',
    enabled: false,
    config: {},
    switchs: [],
  },
})

// 连通性测试状态
const connectivityTest = ref<ConnectivityTestState>({
  isTesting: false,
  testMessage: '',
  testProgress: 0,
  testResult: null,
  showResult: false,
})

// 验证错误状态
const validationErrors = ref<ValidationErrorState>({
  siteAuth: {
    site: false,
  },
  downloader: {
    name: false,
    host: false,
    apikey: false,
    username: false,
    password: false,
  },
  notification: {
    name: false,
  },
})

export function useSetupWizard() {
  const { t } = useI18n()
  const router = useRouter()
  const $toast = useToast()

  // 类型到模块ID的映射关系
  const typeToModuleMapping = {
    // 下载器映射
    downloader: {
      'qbittorrent': 'QbittorrentModule',
      'transmission': 'TransmissionModule',
      'rtorrent': 'RtorrentModule',
    },
    // 通知映射
    notification: {
      'feishu': 'FeishuModule',
      'telegram': 'TelegramModule',
      'wechat': 'WechatModule',
      'wechatclawbot': 'WechatClawBotModule',
      'slack': 'SlackModule',
      'synologychat': 'SynologyChatModule',
      'qqbot': 'QQBotModule',
      'vocechat': 'VoceChatModule',
      'webpush': 'WebPushModule',
    },
  }

  // 步骤标题
  const stepTitles = computed(() => [
    t('setupWizard.basic.title'),
    t('setupWizard.siteAuth.title'),
    t('setupWizard.downloader.title'),
    t('setupWizard.notification.title'),
  ])

  // 步骤描述
  const stepDescriptions = computed(() => [
    t('setupWizard.basic.description'),
    t('setupWizard.siteAuth.description'),
    t('setupWizard.downloader.description'),
    t('setupWizard.notification.description'),
  ])

  // 创建随机API Token
  function createRandomString() {
    const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    wizardData.value.basic.apiToken = Array.from(array, byte => charset[byte % charset.length]).join('')
  }

  // 复制到剪贴板
  async function copyValue(value: string) {
    try {
      const success = copyToClipboard(value)
      if (await success) {
        $toast.success(t('setting.system.copySuccess'))
      } else {
        $toast.error(t('setting.system.copyFailed'))
      }
    } catch (error) {
      $toast.error(t('setting.system.copyError'))
      console.error(error)
    }
  }

  // 选择下载器
  function selectDownloader(type: string) {
    if (wizardData.value.downloader.type === type) {
      // 重复点击已选中的类型，取消选择
      wizardData.value.downloader.type = ''
    } else {
      wizardData.value.downloader.type = type
      // 如果名称为空或为默认名称，则设置默认名称
      if (!wizardData.value.downloader.name || wizardData.value.downloader.name.includes('下载器')) {
        wizardData.value.downloader.name = `${type} 下载器`
      }
      // 不清空config，保留用户已输入的值
    }
  }

  // 选择通知
  function selectNotification(type: string) {
    if (wizardData.value.notification.type === type) {
      // 重复点击已选中的类型，取消选择
      wizardData.value.notification.type = ''
    } else {
      wizardData.value.notification.type = type
      // 如果名称为空或为默认名称，则设置默认名称
      if (!wizardData.value.notification.name || wizardData.value.notification.name.includes('通知')) {
        const displayNameMap: Record<string, string> = {
          wechat: '企业微信',
          feishu: '飞书',
          wechatclawbot: '微信 ClawBot',
          telegram: 'Telegram',
          slack: 'Slack',
          synologychat: 'SynologyChat',
          qqbot: 'QQ',
          vocechat: 'VoceChat',
          webpush: 'WebPush',
        }
        wizardData.value.notification.name = `${displayNameMap[type] || type} 通知`
      }
      wizardData.value.notification.enabled = true
      // 不清空config和switchs，保留用户已输入的值
    }
  }

  // 清除验证错误状态
  function clearValidationErrors() {
    validationErrors.value.siteAuth = {
      site: false,
    }
    validationErrors.value.downloader = {
      name: false,
      host: false,
      apikey: false,
      username: false,
      password: false,
    }
    validationErrors.value.notification = {
      name: false,
    }
  }

  // 验证用户站点认证字段
  function validateSiteAuthFields(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    clearValidationErrors()

    if (!wizardData.value.siteAuth.site) {
      return {
        isValid: true,
        errors,
      }
    }

    const selectedSite = authSites.value[wizardData.value.siteAuth.site]
    if (!selectedSite) {
      errors.push(t('setupWizard.siteAuth.siteConfigNotExist'))
      validationErrors.value.siteAuth.site = true
      return {
        isValid: false,
        errors,
      }
    }

    const fields = Object.keys(selectedSite.params || {}).filter(key => {
      return selectedSite.params[key]?.name && selectedSite.params[key]?.type
    })

    fields.forEach(key => {
      const fieldKey = `${wizardData.value.siteAuth.site.toUpperCase()}_${key.toUpperCase()}`
      const value = wizardData.value.siteAuth.params[fieldKey]
      if (value === undefined || value === null || value === '') {
        errors.push(t('setupWizard.siteAuth.fieldRequired', { name: selectedSite.params[key].name }))
        validationErrors.value.siteAuth[fieldKey] = true
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // 验证下载器字段
  function validateDownloaderFields(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    clearValidationErrors()

    // 名称必输
    if (!wizardData.value.downloader.name?.trim()) {
      errors.push(t('downloader.nameRequired'))
      validationErrors.value.downloader.name = true
    }

    // 主机地址必输
    if (!wizardData.value.downloader.config?.host?.trim()) {
      errors.push(t('downloader.hostRequired'))
      validationErrors.value.downloader.host = true
    }

    // 根据下载器类型验证其他必输项
    if (wizardData.value.downloader.type === 'qbittorrent') {
      const hasApiKey = !!wizardData.value.downloader.config?.apikey?.trim()
      if (!hasApiKey && !wizardData.value.downloader.config?.username?.trim()) {
        errors.push(t('downloader.usernameRequired'))
        validationErrors.value.downloader.username = true
      }
      if (!hasApiKey && !wizardData.value.downloader.config?.password?.trim()) {
        errors.push(t('downloader.passwordRequired'))
        validationErrors.value.downloader.password = true
      }
    } else if (wizardData.value.downloader.type === 'transmission' || wizardData.value.downloader.type === 'rtorrent') {
      if (!wizardData.value.downloader.config?.username?.trim()) {
        errors.push(t('downloader.usernameRequired'))
        validationErrors.value.downloader.username = true
      }
      if (!wizardData.value.downloader.config?.password?.trim()) {
        errors.push(t('downloader.passwordRequired'))
        validationErrors.value.downloader.password = true
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // 验证通知字段
  function validateNotificationFields(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    clearValidationErrors()

    // 名称必输
    if (!wizardData.value.notification.name?.trim()) {
      errors.push(t('notification.nameRequired'))
      validationErrors.value.notification.name = true
    }

    // 根据通知类型验证必输项
    const config = wizardData.value.notification.config || {}
    switch (wizardData.value.notification.type) {
      case 'wechat':
        if (!config.WECHAT_CORPID?.trim()) {
          errors.push(t('notification.wechat.corpIdRequired'))
          validationErrors.value.notification.WECHAT_CORPID = true
        }
        if (!config.WECHAT_APP_ID?.trim()) {
          errors.push(t('notification.wechat.appIdRequired'))
          validationErrors.value.notification.WECHAT_APP_ID = true
        }
        if (!config.WECHAT_APP_SECRET?.trim()) {
          errors.push(t('notification.wechat.appSecretRequired'))
          validationErrors.value.notification.WECHAT_APP_SECRET = true
        }
        break
      case 'wechatclawbot':
        break
      case 'feishu':
        if (!config.FEISHU_APP_ID?.trim()) {
          errors.push(t('notification.feishu.appIdRequired'))
          validationErrors.value.notification.FEISHU_APP_ID = true
        }
        if (!config.FEISHU_APP_SECRET?.trim()) {
          errors.push(t('notification.feishu.appSecretRequired'))
          validationErrors.value.notification.FEISHU_APP_SECRET = true
        }
        break
      case 'telegram':
        if (!config.TELEGRAM_TOKEN?.trim()) {
          errors.push(t('notification.telegram.tokenRequired'))
          validationErrors.value.notification.TELEGRAM_TOKEN = true
        }
        if (!config.TELEGRAM_CHAT_ID?.trim()) {
          errors.push(t('notification.telegram.chatIdRequired'))
          validationErrors.value.notification.TELEGRAM_CHAT_ID = true
        }
        break
      case 'slack':
        if (!config.SLACK_OAUTH_TOKEN?.trim()) {
          errors.push(t('notification.slack.oauthTokenRequired'))
          validationErrors.value.notification.SLACK_OAUTH_TOKEN = true
        }
        if (!config.SLACK_CHANNEL?.trim()) {
          errors.push(t('notification.slack.channelRequired'))
          validationErrors.value.notification.SLACK_CHANNEL = true
        }
        break
      case 'synologychat':
        if (!config.SYNOLOGYCHAT_WEBHOOK?.trim()) {
          errors.push(t('notification.synologychat.webhookRequired'))
          validationErrors.value.notification.SYNOLOGYCHAT_WEBHOOK = true
        }
        break
      case 'vocechat':
        if (!config.VOCECHAT_HOST?.trim()) {
          errors.push(t('notification.vocechat.hostRequired'))
          validationErrors.value.notification.VOCECHAT_HOST = true
        }
        if (!config.VOCECHAT_API_KEY?.trim()) {
          errors.push(t('notification.vocechat.apiKeyRequired'))
          validationErrors.value.notification.VOCECHAT_API_KEY = true
        }
        break
      case 'webpush':
        if (!config.WEBPUSH_USERNAME?.trim()) {
          errors.push(t('notification.webpush.usernameRequired'))
          validationErrors.value.notification.WEBPUSH_USERNAME = true
        }
        break
      case 'qqbot':
        if (!config.QQ_APP_ID?.trim()) {
          errors.push(t('notification.qqbot.appIdRequired'))
          validationErrors.value.notification.QQ_APP_ID = true
        }
        if (!config.QQ_APP_SECRET?.trim()) {
          errors.push(t('notification.qqbot.appSecretRequired'))
          validationErrors.value.notification.QQ_APP_SECRET = true
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // 验证当前步骤的必输项
  function validateCurrentStep(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    switch (currentStep.value) {
      case 1: // 基础设置
        if (!wizardData.value.basic.username) {
          errors.push(t('dialog.userAddEdit.usernameRequired'))
        }
        // 密码是可选的，但如果输入了密码则需要验证
        if (wizardData.value.basic.password) {
          if (wizardData.value.basic.password.length < 6) {
            errors.push(t('dialog.userAddEdit.passwordMinLength'))
          }
          if (!wizardData.value.basic.confirmPassword) {
            errors.push(t('dialog.userAddEdit.confirmPasswordRequired'))
          } else if (wizardData.value.basic.password !== wizardData.value.basic.confirmPassword) {
            errors.push(t('dialog.userAddEdit.passwordMismatch'))
          }
        }
        if (!wizardData.value.basic.apiToken) {
          errors.push(t('setupWizard.basic.apiTokenRequired'))
        }
        break

      case 2: // 存储设置
        if (wizardData.value.siteAuth.site) {
          const validation = validateSiteAuthFields()
          errors.push(...validation.errors)
        }
        break

      case 3: // 下载器设置
        if (wizardData.value.downloader.type) {
          // 如果选择了下载器，则验证必输项
          const validation = validateDownloaderFields()
          errors.push(...validation.errors)
        }
        break

      case 4: // 通知设置
        if (wizardData.value.notification.type) {
          // 如果选择了通知，则验证必输项
          const validation = validateNotificationFields()
          errors.push(...validation.errors)
        }
        break

      case 5: // 偏好设置
        // 偏好设置有默认值，不需要验证
        break
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // 检查是否需要进行测试
  function shouldPerformTest(step: number): boolean {
    switch (step) {
      case 2: // 站点认证不需要测试
        return false
      case 3: // 下载器测试 - 只有选择了下载器才测试
        return !!wizardData.value.downloader.type
      case 4: // 消息通知测试 - 只有选择了通知才测试
        return !!wizardData.value.notification.type && wizardData.value.notification.type !== 'wechatclawbot'
      default:
        return false
    }
  }

  // 连通性测试函数
  async function testConnectivity(step: number) {
    connectivityTest.value.isTesting = true
    connectivityTest.value.testMessage = ''
    connectivityTest.value.testProgress = 0
    connectivityTest.value.testResult = null
    connectivityTest.value.showResult = false

    try {
      let testResult: { success: boolean; message: string | null } = { success: false, message: null }

      switch (step) {
        case 3: // 下载器测试
          testResult = await testDownloaderConnectivity()
          break
        case 4: // 消息通知测试
          testResult = await testNotificationConnectivity()
          break
      }

      // 设置测试结果
      connectivityTest.value.isTesting = false
      connectivityTest.value.testResult = testResult.success ? 'success' : 'error'
      connectivityTest.value.showResult = true

      // 根据结果显示不同的消息
      if (testResult.success) {
        connectivityTest.value.testMessage = t('setupWizard.connectivityTestSuccess')
      } else {
        // 显示API返回的具体错误原因
        connectivityTest.value.testMessage = testResult.message || t('setupWizard.connectivityTestFailed')
      }

      // 成功时2秒后隐藏结果，失败时保持显示直到用户操作
      if (testResult.success) {
        connectivityTest.value.showResult = false
        connectivityTest.value.testResult = null
      }

      return testResult.success
    } catch (error) {
      console.error('Connectivity test failed:', error)
      connectivityTest.value.isTesting = false
      connectivityTest.value.testResult = 'error'
      connectivityTest.value.showResult = true
      connectivityTest.value.testMessage = (error as Error).message || t('setupWizard.connectivityTestFailed')
      return false
    }
  }

  // 下载器连通性测试
  async function testDownloaderConnectivity() {
    try {
      connectivityTest.value.testProgress = 30
      connectivityTest.value.testMessage = t('setupWizard.testingDownloader')

      // 等待设置生效
      await new Promise(resolve => setTimeout(resolve, 2000))

      connectivityTest.value.testProgress = 60
      connectivityTest.value.testMessage = t('setupWizard.checkingDownloader')

      // 获取正确的模块ID
      const downloaderType = wizardData.value.downloader.type
      if (!downloaderType) {
        return { success: false, message: t('setupWizard.downloaderNotSelected') }
      }

      const moduleid = typeToModuleMapping.downloader[downloaderType as keyof typeof typeToModuleMapping.downloader]
      if (!moduleid) {
        return { success: false, message: t('setupWizard.unsupportedDownloaderType', { type: downloaderType }) }
      }

      const result: { [key: string]: any } = await api.get(`system/moduletest/${moduleid}`)
      connectivityTest.value.testProgress = 100

      if (result.success) {
        return { success: true, message: null }
      } else {
        return { success: false, message: result.message || t('setupWizard.downloaderTestFailed') }
      }
    } catch (error) {
      console.error('Downloader test failed:', error)
      return { success: false, message: (error as Error).message || t('setupWizard.downloaderTestFailed') }
    }
  }

  // 消息通知连通性测试
  async function testNotificationConnectivity() {
    try {
      connectivityTest.value.testProgress = 30
      connectivityTest.value.testMessage = t('setupWizard.testingNotification')

      // 等待设置生效
      await new Promise(resolve => setTimeout(resolve, 2000))

      connectivityTest.value.testProgress = 60
      connectivityTest.value.testMessage = t('setupWizard.checkingNotification')

      // 获取正确的模块ID
      const notificationType = wizardData.value.notification.type
      if (!notificationType) {
        return { success: false, message: t('setupWizard.notificationNotSelected') }
      }

      const moduleid =
        typeToModuleMapping.notification[notificationType as keyof typeof typeToModuleMapping.notification]
      if (!moduleid) {
        return { success: false, message: t('setupWizard.unsupportedNotificationType', { type: notificationType }) }
      }

      const result: { [key: string]: any } = await api.get(`system/moduletest/${moduleid}`)
      connectivityTest.value.testProgress = 100

      if (result.success) {
        return { success: true, message: null }
      } else {
        return { success: false, message: result.message || t('setupWizard.notificationTestFailed') }
      }
    } catch (error) {
      console.error('Notification test failed:', error)
      return { success: false, message: (error as Error).message || t('setupWizard.notificationTestFailed') }
    }
  }

  // 下一步
  async function nextStep() {
    // 验证当前步骤的必输项
    const validation = validateCurrentStep()
    if (!validation.isValid) {
      // 显示验证错误
      validation.errors.forEach(error => {
        $toast.error(error)
      })
      return false
    }

    // 保存当前步骤的设置
    const saved = await saveCurrentStepSettings()
    if (!saved) {
      return false
    }

    // 检查是否需要进行测试
    const needsTest = shouldPerformTest(currentStep.value)
    if (needsTest) {
      const testResult = await testConnectivity(currentStep.value)
      if (!testResult) {
        return false
      }
    }

    // 如果不是最后一步，则前进到下一步
    if (currentStep.value < totalSteps) {
      currentStep.value++
      connectivityTest.value.showResult = false
    }

    return true
  }

  // 上一步
  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--
    }
    connectivityTest.value.showResult = false
  }

  // 保存当前步骤的设置
  async function saveCurrentStepSettings() {
    try {
      switch (currentStep.value) {
        case 1:
          return await saveBasicSettings()
        case 2:
          return await saveSiteAuthSettings()
        case 3:
          return await saveDownloaderSettings()
        case 4:
          return await saveNotificationSettings()
      }
    } catch (error) {
      console.error('Save current step settings failed:', error)
      $toast.error(t('setupWizard.saveStepFailed'))
      return false
    }
    return true
  }

  // 完成向导
  async function completeWizard() {
    try {
      // 先处理下一步（保存当前步骤设置）
      const saved = await nextStep()
      if (!saved) {
        return
      }
      // 保存设置向导完成状态
      await saveSetupWizardState()

      $toast.success(t('setupWizard.completed'))
      router.push('/')
    } catch (error) {
      console.error('Setup wizard failed:', error)
      $toast.error(t('setupWizard.failed'))
    }
  }

  // 更新用户密码
  async function updateUserPassword() {
    if (wizardData.value.basic.username && wizardData.value.basic.password) {
      try {
        // 获取当前用户信息
        const currentUser: User = await api.get('user/current')

        if (currentUser) {
          // 更新现有用户的密码
          const userData = {
            name: wizardData.value.basic.username,
            password: wizardData.value.basic.password,
            is_active: currentUser.is_active,
            is_superuser: currentUser.is_superuser,
          }

          await api.put('user/', { ...userData, id: currentUser.id })
        } else {
          // 如果用户不存在，创建新用户（通常不会发生）
          const userData = {
            name: wizardData.value.basic.username,
            password: wizardData.value.basic.password,
            is_active: true,
            is_superuser: true,
          }

          await api.post('user/', userData)
        }
      } catch (error) {
        console.error('Update user password failed:', error)
        throw error
      }
    }
  }

  // 保存基础设置
  async function saveBasicSettings() {
    try {
      const basicSettings = {
        APP_DOMAIN: wizardData.value.basic.appDomain,
        API_TOKEN: wizardData.value.basic.apiToken,
        OCR_HOST: wizardData.value.basic.ocrHost,
        PROXY_HOST: wizardData.value.basic.proxyHost,
        GITHUB_TOKEN: wizardData.value.basic.githubToken,
      }

      // 保存基础设置
      const response: { [key: string]: any } = await api.post('system/env', basicSettings)
      if (!response.success) {
        return false
      }

      // 如果输入了密码，验证密码一致性
      if (wizardData.value.basic.password) {
        if (wizardData.value.basic.password !== wizardData.value.basic.confirmPassword) {
          $toast.error(t('dialog.userAddEdit.passwordMismatch'))
          return false
        }
        // 更新用户密码
        await updateUserPassword()
      }
      return true
    } catch (error) {
      console.error('Save basic settings failed:', error)
      $toast.error(t('setupWizard.saveBasicSettingsFailed'))
      return false
    }
  }

  // 保存用户站点认证设置
  async function saveSiteAuthSettings() {
    try {
      const envResponse: { [key: string]: any } = await api.post('system/env', {
        AUXILIARY_AUTH_ENABLE: wizardData.value.siteAuth.auxiliaryAuthEnable,
      })

      if (!envResponse.success) {
        return false
      }

      if (!wizardData.value.siteAuth.site) {
        return true
      }

      const response: { [key: string]: any } = await api.post('site/auth', {
        site: wizardData.value.siteAuth.site,
        params: wizardData.value.siteAuth.params,
      })

      if (!response.success) {
        $toast.error(t('setupWizard.saveSiteAuthSettingsFailed', { message: response.message }))
        return false
      }

      return true
    } catch (error) {
      console.error('Save site auth settings failed:', error)
      $toast.error(t('setupWizard.saveSiteAuthSettingsFailed', { message: (error as Error).message || '' }))
      return false
    }
  }

  // 保存下载器配置
  async function saveDownloaderSettings() {
    if (wizardData.value.downloader.type) {
      try {
        // 只保存当前选中类型的配置
        const config = { ...wizardData.value.downloader.config }

        const downloader = {
          name: wizardData.value.downloader.name,
          type: wizardData.value.downloader.type,
          default: true,
          enabled: true,
          config: config,
        }

        await api.post('system/setting/Downloaders', [downloader])
        return true
      } catch (error) {
        console.error('Save downloader settings failed:', error)
        $toast.error(t('setupWizard.saveDownloaderSettingsFailed'))
        return false
      }
    } else {
      // 没有选择下载器时，清空现有配置
      console.log('No downloader selected, skipping save')
      return true
    }
  }

  // 保存通知配置
  async function saveNotificationSettings() {
    if (wizardData.value.notification.type) {
      try {
        // 只保存当前选中类型的配置
        const config = { ...wizardData.value.notification.config }
        const switchs = [...(wizardData.value.notification.switchs || [])]

        const notification = {
          name: wizardData.value.notification.name,
          type: wizardData.value.notification.type,
          enabled: wizardData.value.notification.enabled,
          config: config,
          switchs: switchs,
        }

        await api.post('system/setting/Notifications', [notification])
        return true
      } catch (error) {
        console.error('Save notification settings failed:', error)
        $toast.error(t('setupWizard.saveNotificationSettingsFailed'))
        return false
      }
    } else {
      // 没有选择通知时，清空现有配置
      console.log('No notification selected, skipping save')
      return true
    }
  }

  // 保存设置向导完成状态
  async function saveSetupWizardState() {
    try {
      const response: { [key: string]: any } = await api.post('system/setting/SetupWizardState', '1')
      if (response.success) {
        console.log('Setup wizard state saved successfully')
      }
    } catch (error) {
      console.error('Save setup wizard state failed:', error)
      // 这里不显示错误提示，因为向导状态保存失败不应该阻止用户完成向导
    }
  }

  // 加载系统设置
  async function loadSystemSettings() {
    try {
      const result: { [key: string]: any } = await api.get('system/env')
      if (result.success) {
        // 加载基础设置
        if (result.data.APP_DOMAIN) {
          wizardData.value.basic.appDomain = result.data.APP_DOMAIN
        }
        if (result.data.API_TOKEN) {
          wizardData.value.basic.apiToken = result.data.API_TOKEN
        }
        if (result.data.PROXY_HOST) {
          wizardData.value.basic.proxyHost = result.data.PROXY_HOST
        }
        if (result.data.OCR_HOST) {
          wizardData.value.basic.ocrHost = result.data.OCR_HOST
        }
        if (result.data.GITHUB_TOKEN) {
          wizardData.value.basic.githubToken = result.data.GITHUB_TOKEN
        }
        wizardData.value.siteAuth.auxiliaryAuthEnable = Boolean(result.data.AUXILIARY_AUTH_ENABLE)
        if (result.data.SUPERUSER) {
          wizardData.value.basic.username = result.data.SUPERUSER
        }
        // 如果没有API Token，则创建一个随机的
        if (!wizardData.value.basic.apiToken) {
          createRandomString()
        }
      }
    } catch (error) {
      console.log('Load system settings failed:', error)
    }
  }

  // 加载用户站点认证列表
  async function loadAuthSites() {
    try {
      authSites.value = (await api.get('site/auth')) || {}
    } catch (error) {
      console.log('Load auth sites failed:', error)
    }
  }

  // 加载用户站点认证设置
  async function loadSiteAuthSettings() {
    try {
      const result: { [key: string]: any } = await api.get('system/setting/UserSiteAuthParams')
      if (result.success && result.data?.value) {
        wizardData.value.siteAuth.site = result.data.value.site || ''
        wizardData.value.siteAuth.params = result.data.value.params || {}
      }
    } catch (error) {
      console.log('Load site auth settings failed:', error)
    }
  }

  // 加载下载器设置
  async function loadDownloaderSettings() {
    try {
      const result: { [key: string]: any } = await api.get('system/setting/Downloaders')
      if (result.success && result.data?.value && result.data.value.length > 0) {
        const downloader = result.data.value[0]
        wizardData.value.downloader.type = downloader.type
        wizardData.value.downloader.name = downloader.name
        wizardData.value.downloader.config = downloader.config || {}
      }
    } catch (error) {
      console.log('Load downloader settings failed:', error)
    }
  }

  // 加载通知设置
  async function loadNotificationSettings() {
    try {
      const result: { [key: string]: any } = await api.get('system/setting/Notifications')
      if (result.success && result.data?.value && result.data.value.length > 0) {
        const notification = result.data.value[0]
        wizardData.value.notification.type = notification.type
        wizardData.value.notification.name = notification.name
        wizardData.value.notification.enabled = notification.enabled
        wizardData.value.notification.config = notification.config || {}
        wizardData.value.notification.switchs = notification.switchs || []
      }
    } catch (error) {
      console.log('Load notification settings failed:', error)
    }
  }

  // 初始化
  async function initialize() {
    isLoading.value = true
    try {
      await loadSystemSettings()
      await loadAuthSites()
      await loadSiteAuthSettings()
      await loadDownloaderSettings()
      await loadNotificationSettings()
    } finally {
      isLoading.value = false
    }
  }

  return {
    // 状态
    currentStep,
    totalSteps,
    stepTitles,
    stepDescriptions,
    wizardData,
    authSites,
    connectivityTest,
    validationErrors,
    isLoading,

    // 方法
    createRandomString,
    copyValue,
    selectDownloader,
    selectNotification,
    validateCurrentStep,
    validateSiteAuthFields,
    validateDownloaderFields,
    validateNotificationFields,
    clearValidationErrors,
    testConnectivity,
    nextStep,
    prevStep,
    completeWizard,
    initialize,
  }
}
