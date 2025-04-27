import zhCN from '@/locales/zh-CN'

// 导出类型和常量，而不是作为语言消息文件
export type MessageSchema = typeof zhCN
export type LocaleKey = keyof typeof zhCN

export interface LocaleInfo {
  name: string
  title: string
  flag?: string
}

export const SUPPORTED_LOCALES: Record<string, LocaleInfo> = {
  'zh-CN': {
    name: 'zh-CN',
    title: '简体中文',
    flag: '🇨🇳',
  },
  'en-US': {
    name: 'en-US',
    title: 'English',
    flag: '🇺🇸',
  },
}

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES
