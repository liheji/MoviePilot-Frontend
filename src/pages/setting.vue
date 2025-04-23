<script lang="ts" setup>
import { useRoute } from 'vue-router'
import router from '@/router'
import AccountSettingNotification from '@/views/setting/AccountSettingNotification.vue'
import AccountSettingSite from '@/views/setting/AccountSettingSite.vue'
import AccountSettingWords from '@/views/setting/AccountSettingWords.vue'
import AccountSettingAbout from '@/views/setting/AccountSettingAbout.vue'
import AccountSettingSearch from '@/views/setting/AccountSettingSearch.vue'
import AccountSettingSubscribe from '@/views/setting/AccountSettingSubscribe.vue'
import AccountSettingSystem from '@/views/setting/AccountSettingSystem.vue'
import AccountSettingScheduler from '@/views/setting/AccountSettingScheduler.vue'
import AccountSettingDirectory from '@/views/setting/AccountSettingDirectory.vue'
import AccountSettingRule from '@/views/setting/AccountSettingRule.vue'
import { SettingTabs } from '@/router/menu'

const route = useRoute()

const activeTab = ref(route.query.tab)

function jumpTab(tab: string) {
  router.push('/setting?tab=' + tab)
}
</script>

<template>
  <div>
    <VHeaderTab :items="SettingTabs" v-model="activeTab" />
    <VWindow v-model="activeTab" class="mt-5 disable-tab-transition" :touch="false">
      <!-- 系统 -->
      <VWindowItem value="系统">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingSystem />
          </div>
        </transition>
      </VWindowItem>

      <!-- 目录 -->
      <VWindowItem value="存储 & 目录">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingDirectory />
          </div>
        </transition>
      </VWindowItem>

      <!-- 站点 -->
      <VWindowItem value="站点">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingSite />
          </div>
        </transition>
      </VWindowItem>

      <!-- 规则 -->
      <VWindowItem value="规则">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingRule />
          </div>
        </transition>
      </VWindowItem>

      <!-- 搜索 -->
      <VWindowItem value="搜索 & 下载">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingSearch />
          </div>
        </transition>
      </VWindowItem>

      <!-- 订阅 -->
      <VWindowItem value="订阅">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingSubscribe />
          </div>
        </transition>
      </VWindowItem>

      <!-- 服务 -->
      <VWindowItem value="服务">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingScheduler />
          </div>
        </transition>
      </VWindowItem>

      <!-- 通知 -->
      <VWindowItem value="通知">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingNotification />
          </div>
        </transition>
      </VWindowItem>

      <!-- 词表 -->
      <VWindowItem value="词表">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingWords />
          </div>
        </transition>
      </VWindowItem>

      <!-- 关于 -->
      <VWindowItem value="关于">
        <transition name="fade-slide" appear>
          <div>
            <AccountSettingAbout />
          </div>
        </transition>
      </VWindowItem>
    </VWindow>
  </div>
</template>
