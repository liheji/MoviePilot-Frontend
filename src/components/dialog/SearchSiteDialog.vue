<script setup lang="ts">
import type { Site, Plugin, Subscribe } from '@/api/types'
import { popScopeId, PropType } from 'vue'

const props = defineProps({
  sites: {
    type: Array as PropType<Site[]>,
    required: true,
  },
  selected: Array as PropType<Number[]>,
  savebtn: {
    type: Boolean,
    default: false,
  },
})

// 定义事件
const emit = defineEmits(['close', 'search', 'reload', 'save'])

// 过滤词
const siteFilter = ref('')

// 已选择站点
const selectedSites = ref<any[]>(props.selected || [])

watchEffect(() => {
  if (!selectedSites.value && props.selected){
    selectedSites.value = props.selected
  }
})

// 全选/全不选按钮文字
const checkAllText = computed(() => {
  return selectedSites.value.length < props.sites?.length ? '选择全部' : '取消全选'
})

// 全选/全不选
const checkAllSitesorNot = () => {
  if (selectedSites.value.length < props.sites?.length) {
    selectedSites.value = props.sites?.map((item: Site) => item.id)
  } else {
    selectedSites.value = []
  }
}

// 根据筛选条件过滤站点
const filteredSites = computed(() => {
  if (!siteFilter.value) return props.sites
  const filter = siteFilter.value.toLowerCase()
  return props.sites?.filter((site: Site) => site.name.toLowerCase().includes(filter))
})
</script>
<template>
  <!-- 手动整理进度框 -->
  <VDialog max-width="40rem" persistent fullscreen-mobile>
    <VCard class="site-dialog">
      <VCardTitle class="d-flex align-center pa-4">
        <span class="text-h6 font-weight-medium">选择搜索站点</span>
        <VSpacer />
        <VTextField
          v-model="siteFilter"
          placeholder="过滤站点..."
          density="compact"
          variant="outlined"
          hide-details
          class="ml-4"
          style="max-width: 200px"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </VCardTitle>
      <VDivider class="search-divider" />

      <VCardText style="max-height: 420px" class="overflow-y-auto px-4 py-4">
        <!-- 站点列表 -->
        <div v-if="filteredSites.length > 0">
          <!-- 选择操作 -->
          <div class="d-flex align-center mb-4">
            <VBtn
              size="small"
              :color="selectedSites.length < sites.length ? 'primary' : 'error'"
              @click="checkAllSitesorNot"
              class="me-2"
              rounded="pill"
              variant="flat"
            >
              <VIcon start size="small">
                {{ selectedSites.length < sites.length ? 'mdi-check-all' : 'mdi-close-circle-outline' }}
              </VIcon>
              {{ checkAllText }}
            </VBtn>
            <div
              class="text-body-2 font-weight-medium"
              :class="selectedSites.length > 0 ? 'text-primary' : 'text-medium-emphasis'"
            >
              已选择 {{ selectedSites.length }}/{{ sites.length }} 个站点
            </div>
          </div>

          <!-- 站点选择器 -->
          <VRow dense>
            <VCol v-for="site in filteredSites" :key="site.id" cols="6" sm="6" md="4">
              <VHover v-slot="{ isHovering, props }">
                <div
                  v-bind="props"
                  :class="[
                    'site-checkbox-wrapper pa-2 pa-sm-3 rounded-lg d-flex align-center',
                    {
                      'site-selected': selectedSites.includes(site.id),
                      'site-hover': isHovering && !selectedSites.includes(site.id),
                    },
                  ]"
                  @click="
                    () => {
                      const index = selectedSites.indexOf(site.id)
                      if (index === -1) {
                        selectedSites.push(site.id)
                      } else {
                        selectedSites.splice(index, 1)
                      }
                    }
                  "
                >
                  <VIcon
                    :icon="selectedSites.includes(site.id) ? 'mdi-check-circle' : 'mdi-checkbox-blank-circle-outline'"
                    :color="selectedSites.includes(site.id) ? 'primary' : 'medium-emphasis'"
                    class="me-2"
                    size="small"
                  />
                  <span :class="['text-body-2 site-name', { 'font-weight-medium': selectedSites.includes(site.id) }]">
                    {{ site.name }}
                  </span>
                </div>
              </VHover>
            </VCol>
          </VRow>
        </div>
        <div v-else class="text-center py-8 empty-site-state">
          <div class="search-icon-wrapper mb-4 mx-auto warning">
            <VIcon icon="mdi-alert-circle-outline" size="large" color="warning" />
          </div>
          <div class="text-h6 font-weight-medium mb-2">没有找到匹配的站点</div>
          <div class="text-subtitle-1 text-medium-emphasis mb-4">
            {{ siteFilter ? '请尝试修改过滤条件' : '站点数据加载失败，请刷新页面重试' }}
          </div>
          <VBtn
            v-if="siteFilter"
            color="primary"
            variant="flat"
            class="mt-3"
            prepend-icon="mdi-refresh"
            @click="siteFilter = ''"
          >
            重置
          </VBtn>
          <VBtn v-else color="primary" variant="flat" class="mt-3" prepend-icon="mdi-refresh" @click="emit('reload')">
            重新加载站点
          </VBtn>
        </div>
      </VCardText>

      <VDivider class="search-divider" />

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          color="grey-darken-1"
          variant="text"
          @click="emit('close')"
          class="mr-2 d-flex align-center justify-center"
        >
          取消
        </VBtn>
        <VBtn
          v-if="savebtn"
          color="success"
          variant="flat"
          @click="emit('save', selectedSites)"
          class="mr-2 d-flex align-center justify-center"
          :disabled="selectedSites.length === 0"
        >
          确定
        </VBtn>
        <VBtn
          color="primary"
          variant="flat"
          :disabled="selectedSites.length === 0"
          @click="emit('search', selectedSites)"
          prepend-icon="mdi-magnify"
          class="d-flex align-center justify-center px-5"
        >
          搜索
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
<style scoped>
.site-checkbox-wrapper {
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.site-checkbox-wrapper:hover {
  transform: translateY(-2px);
}

.site-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-selected {
  background-color: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.site-hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>
