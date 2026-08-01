<script setup lang="ts">
import DashboardRender from '@/components/render/DashboardRender.vue'
import { isNullOrEmptyObject } from '@/@core/utils'
import { loadRemoteComponent } from '@/utils/federationLoader'
import { useUserStore } from '@/stores'
import { createPluginHost, isPluginRemoteAvailable } from '@/utils/pluginLite'

const props = defineProps({
  config: Object,
  refreshStatus: Boolean,
  allowRefresh: { type: Boolean, default: true },
})
const emit = defineEmits(['update:refreshStatus', 'loaded'])
const userStore = useUserStore()
const pluginHost = computed(() => props.config ? createPluginHost(props.config as any, { isAdmin: userStore.superUser, surface: 'dashboard' }) : null)
const pluginRenderMode = computed(() => (props.config as any)?.render_mode || 'vuetify')

const dynamicPluginComponent = defineAsyncComponent(() =>
  loadRemoteComponent((props.config as any).id, 'Dashboard'),
)

onMounted(() => emit('loaded'))
onUnmounted(() => emit('update:refreshStatus', false))
</script>

<template>
  <template v-if="!isNullOrEmptyObject(props.config) && isPluginRemoteAvailable(props.config as any)">
    <component
      v-if="pluginRenderMode === 'vue'"
      :is="dynamicPluginComponent"
      :config="props.config"
      :allow-refresh="props.allowRefresh"
      :api="pluginHost?.api"
      :host-capabilities="pluginHost?.hostCapabilities"
      :plugin-id="pluginHost?.pluginId"
    />
    <VCard v-else>
      <VCardText>
        <DashboardRender v-for="(item, index) in (props.config as any)?.elements" :key="index" :config="item" />
      </VCardText>
    </VCard>
  </template>
</template>
