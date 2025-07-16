<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import type { SubscribeShareStatistics } from '@/api/types'
import { useI18n } from 'vue-i18n'
import { useDisplay, useTheme } from 'vuetify'

// 国际化
const { t } = useI18n()

// 显示器宽度
const display = useDisplay()

// 主题
const theme = useTheme()

// 定义事件
const emit = defineEmits(['close'])

// 统计数据
const statistics = ref<SubscribeShareStatistics[]>([])

// 是否加载中
const loading = ref(false)

// 获取统计数据
async function fetchStatistics() {
  try {
    loading.value = true
    const data: SubscribeShareStatistics[] = await api.get('subscribe/share/statistics')
    statistics.value = data
  } catch (error) {
    console.error('获取分享统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 计算排名
const rankedStatistics = computed(() => {
  return statistics.value
    .sort((a, b) => (b.total_reuse_count || 0) - (a.total_reuse_count || 0))
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }))
})

// 获取排名样式
function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
      color: '#fff',
      fontWeight: 'bold',
    }
  } else if (rank === 2) {
    return {
      background: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)',
      color: '#fff',
      fontWeight: 'bold',
    }
  } else if (rank === 3) {
    return {
      background: 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)',
      color: '#fff',
      fontWeight: 'bold',
    }
  }
  return {}
}

// 获取前三名文字颜色
function getPodiumTextColor() {
  return theme.global.current.value.dark ? '#fff' : '#000'
}

// 获取前三名统计背景样式
function getPodiumStatStyle() {
  const isDark = theme.global.current.value.dark
  return {
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  }
}

// 获取排名图标
function getRankIcon(rank: number) {
  if (rank === 1) return 'mdi-trophy'
  if (rank === 2) return 'mdi-medal-outline'
  if (rank === 3) return 'mdi-medal'
  return ''
}

// 组件挂载时获取数据
onMounted(() => {
  fetchStatistics()
})
</script>

<template>
  <DialogWrapper scrollable max-width="40rem" :fullscreen="!display.mdAndUp.value">
    <VCard>
      <VCardItem>
        <template #prepend>
          <VIcon icon="mdi-chart-line" class="me-2" />
        </template>
        <VCardTitle>{{ t('subscribe.shareStatistics') }}</VCardTitle>
      </VCardItem>
      <VDialogCloseBtn @click="emit('close')" />
      <VDivider />
      <VCardText>
        <LoadingBanner v-if="loading" class="mt-4" />
        <div v-else-if="rankedStatistics.length === 0" class="text-center py-8">
          <VIcon icon="mdi-chart-line" size="64" color="grey" class="mb-4" />
          <div class="text-h6 text-grey">{{ t('subscribe.noStatisticsData') }}</div>
        </div>

        <div v-else class="mt-4">
          <!-- 前三名特殊展示 -->
          <div class="mb-6">
            <div class="text-h6 mb-4 text-center">{{ t('subscribe.ranking') }}</div>
            <div class="d-flex justify-center align-center gap-4 flex-wrap">
              <!-- 第二名 -->
              <div v-if="rankedStatistics[1]" class="text-center">
                <div class="rank-circle mb-2" :style="getRankStyle(2)">
                  <VIcon :icon="getRankIcon(2)" size="24" />
                </div>
                <div class="text-h6 font-weight-bold" :style="{ color: getPodiumTextColor() }">
                  {{ rankedStatistics[1].share_user || '未知' }}
                </div>
                <div class="d-flex align-center justify-center gap-2 mt-1">
                  <div class="d-flex align-center podium-stat" :style="getPodiumStatStyle()">
                    <VIcon icon="mdi-share-outline" size="14" :color="getPodiumTextColor()" class="mr-1" />
                    <span class="font-weight-bold" :style="{ color: getPodiumTextColor() }">{{
                      rankedStatistics[1].share_count || 0
                    }}</span>
                  </div>
                  <div class="d-flex align-center podium-stat" :style="getPodiumStatStyle()">
                    <VIcon icon="mdi-fire" size="14" :color="getPodiumTextColor()" class="mr-1" />
                    <span class="font-weight-bold" :style="{ color: getPodiumTextColor() }">{{
                      rankedStatistics[1].total_reuse_count || 0
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- 第一名 -->
              <div v-if="rankedStatistics[0]" class="text-center">
                <div class="rank-circle mb-2 first-place" :style="getRankStyle(1)">
                  <VIcon :icon="getRankIcon(1)" size="32" />
                </div>
                <div class="text-h5 font-weight-bold" :style="{ color: getPodiumTextColor() }">
                  {{ rankedStatistics[0].share_user || '未知' }}
                </div>
                <div class="d-flex align-center justify-center gap-3 mt-1">
                  <div class="d-flex align-center podium-stat" :style="getPodiumStatStyle()">
                    <VIcon icon="mdi-share-outline" size="14" :color="getPodiumTextColor()" class="mr-1" />
                    <span class="font-weight-bold" :style="{ color: getPodiumTextColor() }">{{
                      rankedStatistics[0].share_count || 0
                    }}</span>
                  </div>
                  <div class="d-flex align-center podium-stat" :style="getPodiumStatStyle()">
                    <VIcon icon="mdi-fire" size="14" :color="getPodiumTextColor()" class="mr-1" />
                    <span class="font-weight-bold" :style="{ color: getPodiumTextColor() }">{{
                      rankedStatistics[0].total_reuse_count || 0
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- 第三名 -->
              <div v-if="rankedStatistics[2]" class="text-center">
                <div class="rank-circle mb-2" :style="getRankStyle(3)">
                  <VIcon :icon="getRankIcon(3)" size="24" />
                </div>
                <div class="text-h6 font-weight-bold" :style="{ color: getPodiumTextColor() }">
                  {{ rankedStatistics[2].share_user || '未知' }}
                </div>
                <div class="d-flex align-center justify-center gap-2 mt-1">
                  <div class="d-flex align-center podium-stat" :style="getPodiumStatStyle()">
                    <VIcon icon="mdi-share-outline" size="14" :color="getPodiumTextColor()" class="mr-1" />
                    <span class="font-weight-bold" :style="{ color: getPodiumTextColor() }">{{
                      rankedStatistics[2].share_count || 0
                    }}</span>
                  </div>
                  <div class="d-flex align-center podium-stat" :style="getPodiumStatStyle()">
                    <VIcon icon="mdi-fire" size="14" :color="getPodiumTextColor()" class="mr-1" />
                    <span class="font-weight-bold" :style="{ color: getPodiumTextColor() }">{{
                      rankedStatistics[2].total_reuse_count || 0
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 完整排行榜 -->
          <VDivider class="mb-4" />
          <div class="text-h6 mb-4">{{ t('subscribe.ranking') }}</div>
          <VList class="bg-transparent">
            <VListItem
              v-for="item in rankedStatistics"
              :key="item.share_user"
              class="mb-2 rounded-lg"
              :class="item.rank <= 3 ? 'elevation-1 pb-3' : ''"
            >
              <template #prepend>
                <div class="rank-badge mr-3" :style="getRankStyle(item.rank)">
                  <VIcon :icon="getRankIcon(item.rank)" size="16" />
                </div>
              </template>

              <VListItemTitle class="font-weight-bold text-h6 mb-1">
                {{ item.share_user || '未知' }}
              </VListItemTitle>

              <VListItemSubtitle class="d-flex align-center gap-3 mt-1">
                <div class="stat-badge share-badge">
                  <VIcon icon="mdi-share-outline" size="14" color="primary" class="mr-1" />
                  <span class="text-primary font-weight-bold">{{ item.share_count || 0 }}</span>
                  <span class="text-grey text-caption ml-1">{{ t('subscribe.shareCount') }}</span>
                </div>
                <div class="stat-badge reuse-badge">
                  <VIcon icon="mdi-fire" size="14" color="warning" class="mr-1" />
                  <span class="text-warning font-weight-bold">{{ item.total_reuse_count || 0 }}</span>
                  <span class="text-grey text-caption ml-1">{{ t('subscribe.totalReuseCount') }}</span>
                </div>
              </VListItemSubtitle>

              <template #append>
                <div class="text-right">
                  <div
                    class="text-h6 font-weight-bold"
                    :style="{ color: item.rank <= 3 ? 'var(--v-primary-base)' : 'inherit' }"
                  >
                    #{{ item.rank }}
                  </div>
                </div>
              </template>
            </VListItem>
          </VList>
        </div>
      </VCardText>
    </VCard>
  </DialogWrapper>
</template>

<style scoped>
.rank-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  block-size: 60px;
  inline-size: 60px;
  margin-block: 0;
  margin-inline: auto;
}

.first-place {
  block-size: 80px;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 30%);
  inline-size: 80px;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  block-size: 32px;
  inline-size: 32px;
}

.stat-badge {
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 6px;
  background: rgba(var(--v-theme-surface), 0.8);
  padding-block: 4px;
  padding-inline: 8px;
  transition: all 0.2s ease;
}

.share-badge {
  border-inline-start: 3px solid rgb(var(--v-theme-primary));
}

.reuse-badge {
  border-inline-start: 3px solid rgb(var(--v-theme-warning));
}

.podium-stat {
  border-radius: 6px;
  backdrop-filter: blur(4px);
  padding-block: 4px;
  padding-inline: 8px;
  transition: all 0.2s ease;
}

.podium-stat:hover {
  transform: scale(1.05);
}
</style>
