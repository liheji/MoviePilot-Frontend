import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const menuPath = resolve(process.cwd(), 'src/router/i18n-menu.ts')
const layoutPath = resolve(process.cwd(), 'src/layouts/default/components/DefaultLayout.vue')
const siteCardPath = resolve(process.cwd(), 'src/components/cards/SiteCard.vue')
const viteConfigPath = resolve(process.cwd(), 'vite.config.ts')

describe('Lite 前端表面', () => {
  it('只展示 Lite 导航分组和保留的任务入口', () => {
    const menu = readFileSync(menuPath, 'utf8')
    const layout = readFileSync(layoutPath, 'utf8')

    expect(menu).toContain("title: t('navItems.torrentSearch')")
    expect(menu).toContain("title: t('navItems.downloadTasks')")
    expect(menu).toContain("header: t('menu.management')")
    expect(menu).toContain("header: t('menu.settings')")
    expect(menu).not.toContain("header: t('menu.organize')")
    expect(menu).not.toContain("header: t('menu.system')")
    expect(layout).toContain('managementMenus')
    expect(layout).toContain('settingsMenus')
    expect(layout).not.toContain('organizeMenus')
    expect(layout).not.toContain('systemMenus')
  })

  it('不再把推荐和探索写入 Lite PWA 或覆盖范围', () => {
    const viteConfig = readFileSync(viteConfigPath, 'utf8')

    expect(viteConfig).not.toContain("'url': './recommend'")
    expect(viteConfig).not.toContain("'url': './discover'")
    expect(viteConfig).not.toContain("'src/pages/recommend.vue'")
    expect(viteConfig).not.toContain("'src/pages/discover.vue'")
    expect(viteConfig).not.toContain("'src/pages/subscribe.vue'")
  })

  it('保留站点卡不再加载媒体资源浏览弹窗', () => {
    const siteCard = readFileSync(siteCardPath, 'utf8')

    expect(siteCard).not.toContain('SiteResourceDialog')
    expect(siteCard).not.toContain('handleResourceBrowse')
  })
})
