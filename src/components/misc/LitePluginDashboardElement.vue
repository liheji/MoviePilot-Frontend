<script setup lang="ts">
import { isNullOrEmptyObject } from '@/@core/utils'
import type { DashboardItem } from '@/api/types'
import DashboardRender from '@/components/render/DashboardRender.vue'
import { loadRemoteComponent } from '@/utils/federationLoader'
import { useUserStore } from '@/stores'
import { createPluginHost } from '@/utils/pluginLite'

const { t } = useI18n()
const props = defineProps({
  config: {
    type: Object as PropType<DashboardItem>,
    required: true,
  },
  allowRefresh: {
    type: Boolean,
    default: false,
  },
})

const remoteComponent = shallowRef()
const remoteError = ref(false)
const userStore = useUserStore()

const renderMode = computed(() => props.config.render_mode || 'vuetify')
const pluginHost = computed(() => createPluginHost(props.config, {
  isAdmin: userStore.superUser,
  surface: 'dashboard',
}))

async function loadRemoteDashboard() {
  if (renderMode.value !== 'vue' || isNullOrEmptyObject(props.config)) return
  try {
    remoteError.value = false
    remoteComponent.value = await loadRemoteComponent(props.config.id, 'Dashboard')
  } catch {
    remoteError.value = true
  }
}

watch(() => [props.config.id, props.config.key, props.config.render_mode], () => void loadRemoteDashboard(), { immediate: true })
</script>

<template>
  <div v-if="renderMode === 'vue'" class="lite-plugin-dashboard">
    <VAlert v-if="remoteError" type="error" variant="tonal">{{ t('litePlugin.dashboardLoadFailed') }}</VAlert>
    <component
      :is="remoteComponent"
      v-else-if="remoteComponent"
      :config="props.config"
      :allow-refresh="props.allowRefresh"
      :api="pluginHost.api"
      :host-capabilities="pluginHost.hostCapabilities"
    />
    <VSkeletonLoader v-else type="card" />
  </div>
  <VCard v-else-if="!isNullOrEmptyObject(props.config)" class="lite-plugin-dashboard">
    <VCardItem v-if="props.config.attrs?.border !== false">
      <VCardTitle>{{ props.config.attrs?.title ?? props.config.name }}</VCardTitle>
      <VCardSubtitle v-if="props.config.attrs?.subtitle">{{ props.config.attrs.subtitle }}</VCardSubtitle>
    </VCardItem>
    <VCardText>
      <DashboardRender v-for="(item, index) in props.config.elements || []" :key="index" :config="item" />
    </VCardText>
  </VCard>
</template>
