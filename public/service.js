import { fileURLToPath } from 'node:url'
import path from 'node:path'
import express from 'express'
import proxy from 'express-http-proxy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const port = process.env.NGINX_PORT || 3000

// 后端 API 地址
const proxyConfig = {
  URL: '127.0.0.1',
  PORT: process.env.PORT || 3001
}

// 静态文件服务目录
app.use(express.static(__dirname))

// 配置代理中间件将请求转发给后端API
app.use(
  '/api',
  proxy(`${proxyConfig.URL}:${proxyConfig.PORT}`, {
    // 路径加上 /api 前缀
    proxyReqPathResolver: (req) => {
      return `/api${req.url}`
    }
  })
);

// 配置代理中间件将CookieCloud请求转发给后端API
app.use(
  '/cookiecloud',
  proxy(`${proxyConfig.URL}:${proxyConfig.PORT}`, {
    // 路径加上 /cookiecloud 前缀
    proxyReqPathResolver: (req) => {
      return `/cookiecloud${req.url}`
    }
  })
);

// 处理根路径的请求
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

// 处理所有其他请求，重定向到前端入口文件
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
