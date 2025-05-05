<template>
  <div class="plugin-component pa-4">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-progress-circular v-if="loading" indeterminate color="primary"></v-progress-circular>
        <div v-else>
          <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
          <v-simple-table v-if="data && data.stats">
            <template v-slot:default>
              <thead>
                <tr>
                  <th>类型</th>
                  <th>数量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(value, key) in data.stats" :key="key">
                  <td>{{ key }}</td>
                  <td>{{ value }}</td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
          <div v-if="data">
            <div><strong>状态:</strong> {{ data.status }}</div>
            <div><strong>最后更新:</strong> {{ data.last_updated }}</div>
          </div>
          <div v-else>无数据</div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="refreshData"> 刷新 </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 组件状态
const title = ref('插件数据示例')
const loading = ref(true)
const data = ref(null)
const error = ref(null)

// 向主应用发送事件
const emit = defineEmits(['action'])

// 获取和刷新数据
async function refreshData() {
  loading.value = true
  error.value = null

  try {
    // 模拟API调用 - 实际开发中应使用 fetch 调用真实API
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 模拟数据
    data.value = {
      status: 'running',
      stats: {
        '电影': Math.floor(Math.random() * 100) + 50,
        '电视剧': Math.floor(Math.random() * 100) + 30,
        '动漫': Math.floor(Math.random() * 100) + 20,
        '纪录片': Math.floor(Math.random() * 100) + 10,
        '综艺': Math.floor(Math.random() * 100) + 5,
      },
      last_updated: new Date().toLocaleString(),
    }
  } catch (err) {
    console.error('获取数据失败:', err)
    error.value = err.message || '获取数据失败'
  } finally {
    loading.value = false
    // 通知主应用组件已更新
    emit('action')
  }
}

// 组件挂载时加载数据
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.plugin-component {
  width: 100%;
}
</style>
