import type { Module } from 'vuex'
import { NavMenu } from '@layouts/types'
import { MenuTemplate } from '@/router/menu'

// 定义状态类型
interface SystemMenuState {
  systemMenu: NavMenu[]
}

// 定义根状态类型
interface RootState {
  menu: NavMenu
}

// 导出模块
const systemMenuModule: Module<SystemMenuState, RootState> = {
  namespaced: true,
  state: {
    systemMenu: MenuTemplate,
  },
  mutations: {
    updateSystemMenu(state, systemMenu: NavMenu[]) {
      state.systemMenu = systemMenu
    },
  },
  actions: {
    update({ commit }, { systemMenu }) {
      commit('updateSystemMenu', systemMenu)
    },
  },
  getters: {
    getSystemMenu: state => state.systemMenu,
  },
}

export default systemMenuModule
