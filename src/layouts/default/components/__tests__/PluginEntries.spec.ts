import { describe, expect, it } from 'vitest'
import { filterPluginSidebarNavEntries } from '@/utils/pluginSidebarNav'
import { filterPluginRemoteItems } from '@/utils/pluginLite'

const translate = (key: string) => key

describe('Lite plugin entries', () => {
  it('excludes unavailable plugins from remote sidebar and quick-access sources', () => {
    const entries = [
      {
        icon: 'mdi-puzzle',
        nav_key: 'compatible',
        plugin_id: 'Compatible',
        plugin_name: 'Compatible',
        order: 0,
        runtime_status: 'running' as const,
        section: 'management',
        title: '兼容入口',
      },
      {
        icon: 'mdi-puzzle',
        nav_key: 'incompatible',
        plugin_id: 'Incompatible',
        plugin_name: 'Incompatible',
        order: 1,
        runtime_status: 'lite_incompatible' as const,
        section: 'management',
        title: '不兼容入口',
      },
    ]

    expect(filterPluginSidebarNavEntries(entries, translate, {})).toHaveLength(1)
    expect(filterPluginRemoteItems(entries)).toEqual([entries[0]])
  })
})
