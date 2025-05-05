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
