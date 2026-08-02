import type { Component } from 'vue'
import { openSharedDialog } from '@/composables/useSharedDialog'
import { useUserStore } from '@/stores'
import {
  buildUserPermissionContext,
  filterItemsByPermission,
  hasItemPermission,
  type PermissionProtectedItem,
} from '@/utils/permission'
import { useI18n } from 'vue-i18n'

const NetTestView = defineAsyncComponent(() => import('@/views/system/NetTestView.vue'))
const ModuleTestView = defineAsyncComponent(() => import('@/views/system/ModuleTestView.vue'))
const ShortcutLogDialog = defineAsyncComponent(() => import('@/components/dialog/ShortcutLogDialog.vue'))
const ShortcutToolDialog = defineAsyncComponent(() => import('@/components/dialog/ShortcutToolDialog.vue'))

export type ShortcutToolItem = PermissionProtectedItem & {
  bodyClass?: string
  cardClass?: string
  component?: Component
  customDialog?: Component
  dialog: string
  dialogSubtitle?: string
  icon: string
  maxWidth?: string
  subtitle: string
  title: string
  titleText?: string
}

/** 提供顶部捷径与仪表板共用的工具定义和打开逻辑。 */
export function useShortcutTools() {
  const { t } = useI18n()
  const userStore = useUserStore()
  const userPermissions = computed(() => buildUserPermissionContext(userStore.superUser, userStore.permissions))

  const shortcuts: ShortcutToolItem[] = [
    {
      title: t('shortcut.log.title'),
      subtitle: t('shortcut.log.subtitle'),
      icon: 'mdi-file-document',
      dialog: 'logging',
      customDialog: ShortcutLogDialog,
    },
    {
      title: t('shortcut.network.title'),
      subtitle: t('shortcut.network.subtitle'),
      icon: 'mdi-network',
      dialog: 'netTest',
      component: NetTestView,
      titleText: t('shortcut.network.subtitle'),
    },
    {
      title: t('shortcut.system.title'),
      subtitle: t('shortcut.system.subtitle'),
      icon: 'mdi-cog',
      dialog: 'systemTest',
      bodyClass: 'system-health-dialog-body pa-0',
      cardClass: 'system-health-dialog-card',
      component: ModuleTestView,
      titleText: t('shortcut.system.subtitle'),
    },
  ].map(item => ({ ...item, permission: 'admin' }))

  const visibleShortcuts = computed(() => filterItemsByPermission(shortcuts, userPermissions.value))

  /** 打开工具对应的共享弹窗。 */
  function openShortcutDialog(item: ShortcutToolItem) {
    if (!hasItemPermission(item, userPermissions.value)) return

    if (item.customDialog) {
      openSharedDialog(item.customDialog, {}, {}, { closeOn: ['close', 'update:modelValue'] })
      return
    }

    if (!item.component) return

    openSharedDialog(
      ShortcutToolDialog,
      {
        bodyClass: item.bodyClass,
        cardClass: item.cardClass,
        icon: item.icon,
        maxWidth: item.maxWidth ?? '35rem',
        subtitle: item.dialogSubtitle,
        title: item.titleText ?? item.title,
        view: item.component,
      },
      {},
      { closeOn: ['close', 'update:modelValue'] },
    )
  }

  return {
    openShortcutDialog,
    visibleShortcuts,
  }
}
