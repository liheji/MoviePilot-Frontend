import { resolveLiteErrorMessage } from '@/utils/liteErrors'
import { describe, expect, it } from 'vitest'

describe('Lite API error messages', () => {
  it.each([
    ['LITE_RESULT_NOT_FOUND', '搜索结果不存在，请重新搜索。'],
    ['LITE_RESULT_EXPIRED', '搜索结果已过期，请重新搜索。'],
    ['LITE_RESULT_CONSUMED', '该搜索结果已提交，请刷新搜索结果。'],
    ['LITE_RESULT_CONFLICT', '任务可能已提交，请刷新下载任务。'],
    ['LITE_SITE_UNAVAILABLE', '站点当前不可用，请检查站点配置。'],
    ['LITE_ORIGIN_REJECTED', '下载地址未通过安全校验。'],
    ['LITE_TICKET_EXCHANGE_FAILED', '下载地址换取失败，请稍后重试。'],
    ['LITE_DOWNLOAD_PATH_INVALID', '保存路径不可用，请重新选择。'],
    ['PLUGIN_LITE_INCOMPATIBLE', '插件与 MoviePilot Lite 不兼容。'],
    ['PLUGIN_LOAD_FAILED', '插件加载失败，请更新或重试。'],
  ])('prefers the stable %s mapping', (code, expected) => {
    expect(resolveLiteErrorMessage({ code, message: '后端临时文案' })).toBe(expected)
  })

  it('falls back to the response message for unknown or missing codes', () => {
    expect(resolveLiteErrorMessage({ code: 'UNKNOWN', message: '原始错误' })).toBe('原始错误')
    expect(resolveLiteErrorMessage({ message: '兼容错误' })).toBe('兼容错误')
    expect(resolveLiteErrorMessage({}, '默认错误')).toBe('默认错误')
  })
})
