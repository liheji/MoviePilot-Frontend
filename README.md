# MoviePilot Lite Frontend

*中文 | [English](README_EN.md)*

MoviePilot Lite 的 Vue 3 前端。它面向站点资源检索和手动下载：输入关键词，查看站点返回的原始种子结果，选择下载器与下载目录后提交任务。

## Lite 范围

- 保留：关键词站点搜索、原始种子结果与过滤、手动提交下载器、下载任务、站点、消息通知、用户与系统管理。
- 仪表盘仅展示关键词搜索入口、站点状态、下载器状态和兼容插件状态，不恢复媒体统计、推荐、历史或媒体服务器信息。
- 保留完整插件核心。依赖 `anthropic`、`browser`、`media`、`mcp`、`subscribe`、`transfer`、`storage`、`mediaserver`、`workflow`、`agent`、`openai`、`rss`、`servarr` 或 `subtitle` 宿主能力的插件可安装，但会标记为“不兼容 Lite”且不能启用。
- 不包含媒体搜索或识别、季集匹配、订阅、字幕下载、整理入库、媒体服务器、工作流、AI Agent、LLM/MCP、PostgreSQL、Redis 或浏览器仿真。

Lite 功能边界以后端仓库的 [Lite 说明](https://github.com/liheji/MoviePilot/blob/lite/docs/lite.md) 为准。

## 开发

需要 Node.js `20.19` 或更高版本，推荐 Node.js `24` 与 Yarn `1.22`。

```sh
yarn install --frozen-lockfile
yarn dev --host 127.0.0.1 --port 5173
```

开发服务器将 `/api/v1` 代理到 `http://localhost:3001`。启动后端、初始化和本地完整服务的说明见后端仓库的 [开发环境设置](https://github.com/liheji/MoviePilot/blob/lite/docs/development-setup.md)。

### 验证与构建

```sh
yarn test:run
yarn typecheck
yarn lint
yarn build
```

测试组织、HTTP mock 和覆盖率门禁见 [单元测试架构](docs/testing.md)，质量工具链与格式化边界见 [前端代码质量工具链演进](docs/code-quality.md)。测试不得访问真实后端或外网。

## 环境变量与运行

| 变量 | 使用位置 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 构建期 | 前端 API 根路径。开发与测试使用 `/api/v1/`；生产部署保持相对的 `api/v1/`，由同源反向代理转发。 |
| `VITE_PUBLIC_VAPID_KEY` | 构建期 | WebPush 的公开 VAPID 密钥。Lite 保留消息通知；未配置或浏览器不支持 Push 时，页面仍可使用，只是不注册 WebPush。 |
| `NGINX_PORT` | `dist/service.js` 运行期 | 内置静态服务监听端口，默认 `3000`。名称为历史兼容名。 |
| `PORT` | `dist/service.js` 运行期 | 内置静态服务转发的后端端口，默认 `3001`。 |

没有用于 PostgreSQL、Redis、浏览器仿真、媒体识别、订阅、整理、媒体服务器、工作流或 Agent 的前端环境变量。PWA 只缓存前端静态资源和通知状态，不下载或运行浏览器内核；开发时仅 `yarn dev:pwa` 会注册开发 Service Worker。

构建结果位于 `dist/`。可使用 `public/nginx.conf` 作为同源反向代理参考，或直接运行内置静态服务：

```sh
node dist/service.js
```

发布产物的标签固定为 `v<package-version>`（当前 Lite 主线版本为 `9.9.9`）。后端的安装、Docker 构建与自更新只能下载该 Lite 发布标签，不能使用旧完整版本的 `v1.*` / `v2.*` 前端包。

本仓库不包含 Dockerfile 或 Compose 文件。正式 Docker 镜像由后端仓库消费已构建的前端产物；不要在前端镜像或构建脚本中预下载浏览器内核。

## 插件远程组件

Lite 仍支持模块联邦远程组件，用于插件详情、配置、仪表盘和侧栏页面。远程组件必须只使用 Lite 公布的宿主能力，不能通过 API 访问已删除的领域；违规插件会被宿主拒绝启用。

- [模块联邦开发指南](docs/module-federation-guide.md)
- [模块联邦问题排查指南](docs/federation-troubleshooting.md)
- [插件远程组件示例](examples/plugin-component/)
