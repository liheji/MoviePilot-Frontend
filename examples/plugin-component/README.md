# MoviePilot 插件远程组件示例

这是 MoviePilot 插件远程组件的示例项目，展示了如何正确配置和开发与主应用兼容的远程组件。

## 开发环境准备

1. 安装依赖：
```bash
npm install
# 或
yarn
```

2. 开发模式运行：
```bash
npm run dev
# 或
yarn dev
```

## 配置说明

### vite.config.js

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      exposes: {
        './PluginComponent': './src/App.vue', // 暴露组件
      },
      shared: {
        vue: {
          singleton: true,
          requiredVersion: false
        }
      }
    })
  ],
  build: {
    target: 'esnext', // 支持顶层await
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        minifyInternalExports: false
      }
    }
  }
})
```

### 组件开发

主组件 (src/App.vue) 需要遵循以下规则：
- 使用 Vue 3 组合式 API
- 注册 `action` 事件用于与主应用通信
- 避免直接使用 Vue Router 等全局依赖

示例组件结构：

```vue
<template>
  <div class="plugin-component">
    <h2>{{ title }}</h2>
    <div v-if="loading">加载中...</div>
    <div v-else>
      <!-- 组件内容 -->
      <pre>{{ data }}</pre>
      <button @click="refreshData">刷新</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 组件状态
const title = ref('插件示例')
const loading = ref(true)
const data = ref(null)

// 向主应用发送事件
const emit = defineEmits(['action'])

// 刷新数据
async function refreshData() {
  loading.value = true
  // API 调用...
  loading.value = false
  // 通知主应用
  emit('action')
}

// 初始化
onMounted(() => {
  refreshData()
})
</script>
```

## 构建生产版本

```bash
npm run build
# 或
yarn build
```

构建后的 `dist/remoteEntry.js` 是远程组件的入口文件，需要配置到后端让 MoviePilot 能够访问。

## 插件后端配置

在插件的后端代码中，需要实现以下方法来提供组件信息：

```python
def get_render_mode() -> str:
    """
    获取插件渲染模式
    :return: 渲染模式，支持：vue/vuetify，默认vuetify
    """
    return "vue"

def get_form_file() -> Tuple[str, Dict[str, Any]]:
    """
    获取插件配置页面JS代码源文件（与get_from二选一使用）
    :return: 1、编译后的JS代码插件目录下相对路径；2、默认数据结构
    """
    return "/dist/page.js", {}

def get_page_file() -> Optional[str]:
    """
    获取插件数据页面JS代码源文件（与get_page二选一使用）
    :return: 编译后的JS代码插件目录下相对路径
    """
    return "/dist/config.js", {}
```

## 排查常见问题

### 顶层 await 报错

确保在 `vite.config.js` 中设置 `build.target` 为 `'esnext'`。

### 共享依赖加载失败

确保正确配置共享依赖：
```js
shared: {
  vue: {
    singleton: true,
    requiredVersion: false // 关闭版本检查
  }
}
```

### 组件无法加载

1. 检查网络请求是否成功
2. 确认 JS 文件可以被正确访问
3. 查看浏览器控制台是否有详细错误信息 
