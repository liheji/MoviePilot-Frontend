import { createStore } from 'vuex'
import createPersistedState from 'vuex-persistedstate'
import authModule from './auth'
import menuModule from './menu'

const store = createStore({
  modules: {
    // 用户认证store
    auth: authModule,
    // 本地菜单store
    menu: menuModule,
  },
  plugins: [
    createPersistedState({
      // 配置持久化存储的选项
      storage: window.localStorage, // 使用 localStorage 存储状态
      key: 'moviepilot', // 存储的键名
    }),
  ],
})

export default store
