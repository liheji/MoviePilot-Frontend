import source from '../PluginCardListView.vue?raw'
import { describe, expect, it } from 'vitest'

describe('PluginCardListView Lite states', () => {
  it('keeps incompatible plugins visible to the installed and market management cards', () => {
    expect(source).toContain("dataList.value = await api.get('plugin/'")
    expect(source).toContain('<PluginAppCard :plugin="item"')
    expect(source).not.toContain('filterPluginRemoteItems(dataList.value)')
  })
})
