import { describe, expect, it } from 'vitest'
import {
  ADMIN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  PERMISSION_FEATURE,
  buildDefaultFeaturePermissions,
  hasFeaturePermission,
  hasPermission,
  normalizeUserPermissions,
} from '@/utils/permission'

describe('Lite permission utilities', () => {
  it('only exposes search and management feature permissions', () => {
    expect(Object.values(PERMISSION_FEATURE)).toEqual([
      'search.resource',
      'manage.downloading',
      'manage.site',
    ])
    expect(buildDefaultFeaturePermissions()).toEqual(ADMIN_PERMISSIONS.features)
  })

  it('ignores deleted discovery permissions from legacy users', () => {
    const permissions = normalizeUserPermissions({ search: false, manage: true } as never)

    expect(permissions).toEqual({ ...DEFAULT_PERMISSIONS, search: false, manage: true })
    expect(hasPermission(permissions, 'search')).toBe(false)
    expect(hasFeaturePermission(permissions, PERMISSION_FEATURE.MANAGE_SITE, 'manage')).toBe(true)
  })
})
