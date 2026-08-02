import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'

const sourcePath = resolve(cwd(), 'src/components/misc/LitePluginDashboardElement.vue')

describe('Lite plugin dashboard element', () => {
  it('passes remote dashboards the scoped plugin host instead of the raw API client', () => {
    const source = readFileSync(sourcePath, 'utf-8')

    expect(source).toContain("import { createPluginHost } from '@/utils/pluginLite'")
    expect(source).toContain("surface: 'dashboard'")
    expect(source).toContain(':api="pluginHost.api"')
    expect(source).toContain(':host-capabilities="pluginHost.hostCapabilities"')
    expect(source).not.toContain(':api="api"')
  })
})
