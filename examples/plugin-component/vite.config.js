import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'my_plugin',  // 插件名称，建议与实际插件ID保持一致
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
