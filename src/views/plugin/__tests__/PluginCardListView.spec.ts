import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(__dirname, '..', 'PluginCardListView.vue'), 'utf8')

describe('PluginCardListView Lite states', () => {
  it('keeps incompatible plugins visible to the installed and market management cards', () => {
    expect(source).toContain("dataList.value = await api.get('plugin/'")
    expect(source).toContain('<PluginAppCard :plugin="item"')
    expect(source).not.toContain('filterPluginRemoteItems(dataList.value)')
  })
})
