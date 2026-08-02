import { createServer, get } from 'node:http'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const servicePath = resolve(process.cwd(), 'public/service.js')

/** 在 loopback 上分配一个临时端口，避免影响开发服务。 */
async function reserveLoopbackPort(): Promise<number> {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  await new Promise<void>(resolve => server.close(() => resolve()))

  if (!address || typeof address === 'string')
    throw new Error('无法为静态服务分配 loopback 端口')

  return address.port
}

/** 等待发布服务报告就绪，或将其启动错误作为测试失败返回。 */
async function waitForServiceReady(process: ChildProcessWithoutNullStreams): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => {
      reject(new Error(`静态服务未在限定时间内启动：${output}`))
    }, 5_000)
    const append = (chunk: Buffer) => {
      output += chunk.toString()
      if (output.includes('Server is running on port')) {
        clearTimeout(timeout)
        resolve()
      }
    }

    process.stdout.on('data', append)
    process.stderr.on('data', append)
    process.once('exit', code => {
      clearTimeout(timeout)
      reject(new Error(`静态服务启动失败（退出码 ${code}）：${output}`))
    })
  })
}

/** 请求发布服务中的一个静态资源。 */
async function requestStaticResource(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = get(`http://127.0.0.1:${port}/service.js`, response => {
      response.resume()
      resolve(response.statusCode ?? 0)
    })
    request.on('error', reject)
  })
}

describe('独立静态服务', () => {
  it('以 ESM 方式启动并在 loopback 提供静态资源', async () => {
    const port = await reserveLoopbackPort()
    const service = spawn(process.execPath, [servicePath], {
      env: { ...process.env, NGINX_PORT: String(port), PORT: '3001' },
      stdio: 'pipe',
    })

    try {
      await waitForServiceReady(service)
      expect(await requestStaticResource(port)).toBe(200)
    } finally {
      if (service.exitCode === null && !service.killed)
        service.kill('SIGTERM')
      if (service.exitCode === null)
        await once(service, 'exit')
    }
  })
})
