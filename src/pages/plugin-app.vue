<script setup lang="ts">
import type { Component } from 'vue'
import api from '@/api'
import type { Plugin } from '@/api/types'
import { loadRemoteAppPageComponent } from '@/utils/federationLoader'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores'
import { createPluginHost, isPluginRemoteAvailable } from '@/utils/pluginLite'

const route = useRoute()

const pluginId = computed(() => route.params.pluginId as string)
const navKey = computed(() => (route.params.navKey as string) || 'main')

const RemoteView = shallowRef<Component | null>(null)
const loadError = ref(false)
const activePlugin = ref<Plugin | null>(null)
const userStore = useUserStore()
const pluginHost = computed(() =>
  activePlugin.value
    ? createPluginHost(activePlugin.value, {
        isAdmin: userStore.superUser,
        navKey: navKey.value,
        surface: 'app-page',
      })
    : null,
)

// 侧栏联邦页面复用主应用 Toast 实例。
const $toast = useToast()
provide('moviepilot:toast', $toast)

watch(
  [pluginId, navKey],
  async ([pid, nk]) => {
    loadError.value = false
    activePlugin.value = null
    if (!pid) {
      RemoteView.value = null
      return
    }
    try {
      const installedPlugins = (await api.get('plugin/', {
        params: { state: 'installed' },
      })) as Plugin[]
      const plugin = installedPlugins.find(item => item.id === pid)
      if (!plugin || !isPluginRemoteAvailable(plugin)) {
        RemoteView.value = null
        loadError.value = true
        return
      }
      activePlugin.value = plugin
      RemoteView.value = (await loadRemoteAppPageComponent(pid, nk)) as Component
    } catch (e) {
      console.error(e)
      RemoteView.value = null
      loadError.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="plugin-app-page" data-glass-optical-mode="static-material">
    <VAlert v-if="loadError" type="error" class="ma-4" title="组件加载错误"> 无法加载插件全页组件。 </VAlert>
    <VSkeletonLoader v-else-if="!RemoteView" class="ma-4" type="article, article, article" />
    <component
      v-else
      :is="RemoteView"
      :key="`${pluginId}-${navKey}`"
      :api="pluginHost?.api"
      :host-capabilities="pluginHost?.hostCapabilities"
      :nav-key="navKey"
      :plugin-id="pluginId"
      @action="() => {}"
    />
  </div>
</template>
