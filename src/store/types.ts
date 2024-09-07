import { NavMenu } from '@layouts/types'

// 定义系统菜单
export interface MenuState {
  system: NavMenu[]
}

// 定义认证状态类型
export interface AuthState {
  token: string | null
  remember: boolean
  superUser: boolean
  userName: string
  avatar: string
  originalPath: string | null
  level: number
}

// 定义根状态类型
export interface RootState {
  auth: AuthState
  menu: MenuState
}
