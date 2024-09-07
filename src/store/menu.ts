import type { Module } from 'vuex'
import { NavMenu } from '@layouts/types'
import { SystemMenuTemplate } from '@/router/menu'
import { MenuState, RootState } from '@/store/types'

// 导出模块
const menuModule: Module<MenuState, RootState> = {
  namespaced: true,
  state: {
    system: SystemMenuTemplate,
  },
  mutations: {
    setSystem(state, system: NavMenu[]) {
      state.system = system
    },
  },
  actions: {
    update({ commit }, system) {
      commit('setSystem', system)
    },
  },
  getters: {
    getSystem: state => state.system,
  },
}

export default menuModule
