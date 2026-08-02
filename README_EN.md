# MoviePilot Lite Frontend

*[中文](README.md) | English*

The Vue 3 frontend for MoviePilot Lite. It is focused on site-resource search and manual downloads: enter a keyword, inspect the original torrent results returned by sites, choose a downloader and destination, then submit the task.

## Lite scope

- Retained: keyword site search, original torrent results and filtering, manual downloader submission, download tasks, sites, notifications, users, and system management.
- The dashboard shows only the keyword search entry, site status, downloader status, and compatible plugin status. It does not restore media statistics, recommendations, history, or media-server data.
- The complete plugin core remains available. Plugins that require `anthropic`, `browser`, `media`, `mcp`, `subscribe`, `transfer`, `storage`, `mediaserver`, `workflow`, `agent`, `openai`, `rss`, `servarr`, or `subtitle` host capabilities may be installed, but are marked **incompatible with Lite** and cannot be enabled.
- Lite does not include media search or recognition, season or episode matching, subscriptions, subtitle downloads, media organization, media servers, workflows, AI Agents, LLM/MCP, PostgreSQL, Redis, or browser emulation.

The backend repository's [Lite guide](https://github.com/liheji/MoviePilot/blob/lite/docs/lite.md) is the source of truth for the Lite boundary.

## Development

Use Node.js `20.19` or later. Node.js `24` and Yarn `1.22` are recommended.

```sh
yarn install --frozen-lockfile
yarn dev --host 127.0.0.1 --port 5173
```

The development server proxies `/api/v1` to `http://localhost:3001`. See the backend repository's [development setup](https://github.com/liheji/MoviePilot/blob/lite/docs/development-setup.md) for backend startup, initialization, and the local full-service workflow.

### Validation and build

```sh
yarn test:run
yarn typecheck
yarn lint
yarn build
```

See [unit-test architecture](docs/testing.md) for test organization, HTTP mocks, and coverage gates, and [frontend quality tooling](docs/code-quality.md) for formatting and quality boundaries. Tests must not contact a real backend or the public network.

## Environment and runtime

| Variable | Used by | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Build time | Frontend API root. Development and tests use `/api/v1/`; production keeps the relative `api/v1/` path for a same-origin reverse proxy. |
| `VITE_PUBLIC_VAPID_KEY` | Build time | Public VAPID key for WebPush. Lite retains notifications; without this key, or on browsers without Push support, the UI still works but does not register WebPush. |
| `NGINX_PORT` | `dist/service.js` runtime | Port for the bundled static server, default `3000`. The name is retained for compatibility. |
| `PORT` | `dist/service.js` runtime | Backend port used by the bundled static-server proxy, default `3001`. |

There are no frontend variables for PostgreSQL, Redis, browser emulation, media recognition, subscriptions, media organization, media servers, workflows, or Agents. The PWA only caches frontend assets and notification state; it neither downloads nor runs a browser engine. A development Service Worker is registered only by `yarn dev:pwa`.

Build output is written to `dist/`. Use `public/nginx.conf` as a same-origin reverse-proxy reference, or run the bundled static server directly:

```sh
node dist/service.js
```

Release artifacts always use the `v<package-version>` tag (the current Lite line is `9.9.9`). Backend installation, Docker builds, and self-updates consume this Lite tag only, never a legacy full-version `v1.*`/`v2.*` frontend package.

This repository has no Dockerfile or Compose configuration. Production Docker images are assembled by the backend repository from prebuilt frontend assets; do not add browser-engine downloads to frontend images or build scripts.

## Plugin remote components

Lite continues to support Module Federation remote components for plugin details, configuration, dashboard widgets, and sidebar pages. Remote components must use only the published Lite host capabilities and must not call removed domain APIs; incompatible plugins are rejected by the host.

- [Module Federation development guide](docs/module-federation-guide.md)
- [Module Federation troubleshooting](docs/federation-troubleshooting.md)
- [Plugin remote-component example](examples/plugin-component/)
