import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// 添加请求拦截器
api.interceptors.request.use(config => {
  // 认证 Store
  const authStore = useAuthStore()
  // 在请求头中添加token
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// 添加响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (!error.response) {
      // 请求超时
      return Promise.reject(new Error(error))
    } else if (error.response.status === 403) {
      // 认证 Store
      const authStore = useAuthStore()
      // 清除登录状态信息
      authStore.logout()
      // token验证失败，跳转到登录页面
      router.push('/login')
    }

    return Promise.reject(error)
  },
)

export default api

export async function fetchGlobalSettings() {
  try {
    const result: { [key: string]: any } = await api.get('system/global', {
      params: {
        token: 'moviepilot',
      },
    })
    return result.data || {}
  } catch (error) {
    console.error('Failed to fetch global settings', error)
    throw error
  }
}
