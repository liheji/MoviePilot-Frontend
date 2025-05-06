# MoviePilot前端远程模块开发指南

## 1. 概述

MoviePilot前端采用模块联邦(Module Federation)技术实现插件的动态加载和集成。本文档详细说明如何开发符合要求的远程模块，以便在MoviePilot中作为插件使用。

## 2. 技术要求

- Node.js 16+
- Vue 3
- Vite 4+
- TypeScript 5+

## 3. 核心概念

每个插件需要提供三个标准组件：

| 组件名称 | 文件名 | 用途 |
|---------|-------|------|
| Page | Page.vue | 插件详情页面 |
| Config | Config.vue | 插件配置页面 |
| Dashboard | Dashboard.vue | 仪表板组件 |

## 4. 快速开始

### 创建项目

```bash
# 创建项目
npm create vite@latest my-plugin -- --template vue-ts

# 进入项目目录
cd my-plugin

# 安装依赖
npm install

# 安装模块联邦插件
npm install @originjs/vite-plugin-federation --save-dev

# 安装Vuetify(可选)
npm install vuetify
```

### 配置vite.config.ts

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'my_plugin',  // 插件名称，建议与插件ID保持一致
      filename: 'remoteEntry.js',
      exposes: {
        './Page': './src/components/Page.vue',
        './Config': './src/components/Config.vue',
        './Dashboard': './src/components/Dashboard.vue',
      },
      shared: {
        vue: { requiredVersion: false },
        vuetify: { requiredVersion: false }
      }
    })
  ],
  build: {
    target: 'esnext',   // 必须设置为esnext以支持顶层await
    minify: false,      // 开发阶段建议关闭混淆
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'esm',  // 必须使用ESM格式
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      }
    }
  }
})
```

## 5. 组件开发规范

### 5.1 Page组件（详情页面）

```vue
<script setup lang="ts">
// 自定义事件，用于通知主应用刷新数据
const emit = defineEmits(['action', 'switch'])

// 页面逻辑代码...

// 通知主应用刷新数据
function notifyRefresh() {
  emit('action')
}

// 通知主应用切换到配置页面
function notifySwitch() {
  emit('switch')
}
</script>

<template>
  <div class="plugin-page">
    <!-- 插件详情页面内容 -->
    <v-btn @click="notifyRefresh">刷新数据</v-btn>
    <v-btn @click="notifySwitch">配置插件</v-btn>
  </div>
</template>
```

### 5.2 Config组件（配置页面）

```vue
<script setup lang="ts">
// 接收初始配置
const props = defineProps({
  initialConfig: {
    type: Object,
    default: () => ({})
  }
})

// 配置数据
const config = ref({...props.initialConfig})

// 自定义事件，用于保存配置
const emit = defineEmits(['save'])

// 保存配置
function saveConfig() {
  emit('save', config.value)
}
</script>

<template>
  <div class="plugin-config">
    <!-- 配置表单 -->
    <v-text-field v-model="config.someField" label="配置项"></v-text-field>
    
    <!-- 保存按钮 -->
    <v-btn color="primary" @click="saveConfig">保存配置</v-btn>
  </div>
</template>
```

### 5.3 Dashboard组件（仪表板）

```vue
<script setup lang="ts">
// 接收配置和刷新控制
const props = defineProps({
  config: {
    type: Object,
    default: () => ({})
  },
  allowRefresh: {
    type: Boolean,
    default: true
  }
})

// 仪表板逻辑...
</script>

<template>
  <div class="dashboard-widget">
    <!-- 仪表板内容 -->
    <v-card>
      <v-card-title>{{ config.title || '仪表板组件' }}</v-card-title>
      <v-card-text>
        <!-- 组件内容 -->
      </v-card-text>
    </v-card>
  </div>
</template>
```

## 6. 构建和部署

### 构建项目

```bash
npm run build
```

将生成的dist文件夹上传到插件后端，并配置插件后端API路径。

## 7. 调试与排错

### 常见问题

1. **模块无法加载**
   - 检查网络请求是否成功（状态码200）
   - 确认文件路径是否正确
   - 检查CORS跨域设置

2. **模块加载但组件不显示**
   - 检查控制台错误信息
   - 确认组件是否正确导出
   - 验证共享依赖配置

3. **"Module name 'vue' does not resolve to a valid URL"**
   - 检查`shared`配置是否正确
   - 设置`requiredVersion: false`尝试解决

4. **"Top-level await is not available"**
   - 确保`build.target`设置为`esnext`

## 9. 高级配置

### 9.1 CSS隔离

为防止样式冲突，建议使用CSS Modules或scoped样式：

```vue
<style scoped>
/* 组件样式 */
</style>
```

### 9.2 共享更多依赖

如果您的插件需要共享更多依赖，可以扩展shared配置：

```js
shared: {
  vue: { requiredVersion: false },
  vuetify: { requiredVersion: false },
  '@vueuse/core': { requiredVersion: false },
  pinia: { requiredVersion: false }
}
```

### 9.3 开发环境测试

开发期间可以使用以下配置在本地测试：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5001,   // 使用不同于主应用的端口
    cors: true,   // 启用CORS
    origin: 'http://localhost:5001'
  }
})
```

## 10. 示例代码

完整的示例插件代码可在以下仓库获取：

[https://github.com/example/moviepilot-plugin-example](https://github.com/example/moviepilot-plugin-example) (示例链接，实际链接需替换)

## 11. 参考资料

- [Module Federation官方文档](https://webpack.js.org/concepts/module-federation/)
- [Vite Plugin Federation](https://github.com/originjs/vite-plugin-federation)
- [Vue 3官方文档](https://vuejs.org/)

---

如有问题，请提交Issue。 
