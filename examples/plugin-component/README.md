# MoviePilot 插件远程组件示例

这是 MoviePilot 插件远程组件的示例项目，展示了如何正确配置和开发与主应用兼容的远程组件。本示例实现了三个标准组件：Page（详情页面）、Config（配置页面）和Dashboard（仪表板组件）。

## 1. 开发环境准备

### 安装依赖

```bash
npm install
# 或
yarn
```

### 开发模式运行

```bash
npm run dev
# 或
yarn dev
```

## 2. 项目结构

```
plugin-component/
├── src/
│   ├── components/
│   │   ├── Page.vue       # 插件详情页面组件
│   │   ├── Config.vue     # 插件配置页面组件
│   │   └── Dashboard.vue  # 插件仪表板组件
│   ├── App.vue            # 本地开发入口组件
│   └── main.js            # 本地开发入口文件
├── vite.config.js         # Vite和模块联邦配置
├── index.html             # 本地开发HTML入口
└── package.json           # 依赖配置
```

## 3. 配置说明

### vite.config.js

```js
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
  },
  server: {
    port: 5001,   // 使用不同于主应用的端口
    cors: true,   // 启用CORS
    origin: 'http://localhost:5001'
  }
})
```

## 4. 组件规范

### Page.vue（详情页面）

详情页面用于展示插件的数据和状态：

- 接收 `action` 事件用于通知主应用刷新数据
- 可以包含交互功能和数据展示

```vue
<script setup>
// 自定义事件，用于通知主应用刷新数据
const emit = defineEmits(['action'])

// 通知主应用刷新数据
function notifyRefresh() {
  emit('action')
}
</script>
```

### Config.vue（配置页面）

配置页面用于接收和保存插件配置：

- 接收 `initialConfig` 属性获取初始配置
- 发出 `save` 事件保存配置数据

```vue
<script setup>
// 接收初始配置
const props = defineProps({
  initialConfig: {
    type: Object,
    default: () => ({})
  }
})

// 自定义事件，用于保存配置
const emit = defineEmits(['save'])

// 保存配置
function saveConfig() {
  emit('save', configData)
}
</script>
```

### Dashboard.vue（仪表板组件）

仪表板组件用于在主页上显示插件数据：

- 接收 `config` 属性获取仪表板配置
- 接收 `allowRefresh` 属性控制是否允许自动刷新

```vue
<script setup>
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
</script>
```

## 5. 构建和部署

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

构建后在 `dist` 目录生成以下关键文件：

- `remoteEntry.js` - 模块联邦入口文件
- `Page.js` - 详情页面组件
- `Config.js` - 配置页面组件
- `Dashboard.js` - 仪表板组件

### 部署到插件后端

将构建后的文件部署到插件后端，确保可通过以下URL访问：

- `/api/plugin/component/{插件ID}/remoteEntry.js`
- `/api/plugin/component/{插件ID}/Page.js`
- `/api/plugin/component/{插件ID}/Config.js`
- `/api/plugin/component/{插件ID}/Dashboard.js`

## 6. 插件后端集成

在插件的后端代码中，实现以下方法来集成远程组件：

```python
def get_render_mode() -> str:
    """
    获取插件渲染模式
    :return: 渲染模式，支持：vue/vuetify，默认vuetify
    """
    return "vue"

def get_remote_urls() -> Dict[str, Any]:
    """
    获取远程组件地址
    :return: 远程组件信息，包含id和url
    """
    return {
        "id": "my_plugin",  # 插件ID
        "url": "/path/to/component"  # 可选，自定义组件路径
    }
```

## 7. 常见问题排查

### 模块加载问题

如果遇到模块加载问题，请检查：

1. 确保 `build.target` 设置为 `esnext`
2. 验证共享依赖配置是否正确
3. 检查网络请求是否成功
4. 查看浏览器控制台错误信息

### 代码调试

在开发阶段可以：

1. 使用浏览器开发者工具进行调试
2. 启用 Vite 的详细日志：`localStorage.setItem('debug', 'vite:*')`
3. 使用 `console.log` 输出调试信息

更多详细说明请参考 [模块联邦开发指南](../../docs/module-federation-guide.md) 和 [模块联邦问题排查指南](../../docs/federation-troubleshooting.md)。
