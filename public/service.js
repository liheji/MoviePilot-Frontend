const path = require('node:path')
const express = require('express')
const proxy = require('express-http-proxy')

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
    },
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers = proxyReqOpts.headers || {};
      
      // 检测是否为SSE请求
      const isSSE = srcReq.headers.accept && srcReq.headers.accept.includes('text/event-stream');
      
      // 动态设置超时时间：SSE无超时，普通请求600秒超时
      proxyReqOpts.timeout = isSSE ? 0 : 600000;
      
      if (isSSE) {
        // SSE请求的特殊头部设置
        proxyReqOpts.headers['Cache-Control'] = 'no-cache';
        proxyReqOpts.headers['Connection'] = 'keep-alive';
        proxyReqOpts.headers['Accept'] = 'text/event-stream';
      }
      
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      // 检测响应是否为SSE类型
      const isSSEResponse = proxyRes.headers['content-type'] && 
                           proxyRes.headers['content-type'].includes('text/event-stream');
      
      if (isSSEResponse) {
        // SSE响应：设置流式传输头部并禁用缓冲
        userRes.writeHead(proxyRes.statusCode, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });
        return false; // 禁用默认响应处理，让数据直接流向客户端
      } else {
        // 普通响应：正常处理
        return proxyResData;
      }
    },
    // 统一错误处理
    proxyErrorHandler: (err, res, next) => {
      // 客户端断开连接的正常情况（常见于SSE）
      if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
        console.log('Client disconnected:', err.code);
        res.end(); // 优雅结束响应
        return;
      }
      
      // 其他错误正常处理
      console.error('Proxy error:', err);
      next(err);
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
