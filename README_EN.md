# MoviePilot-Frontend

*[中文](README.md) | English*

Frontend project for [MoviePilot](https://github.com/jxxghp/MoviePilot), NodeJS version: >= `v20.12.1`.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar) (disable Vetur).

## Vite Configuration

Please refer to [Vite Configuration Reference](https://vitejs.dev/config/).

## Installation

```sh
yarn
```

### Development

```sh
yarn dev
```

### Build

```sh
yarn build
```

### Production Deployment

1. Use `nginx` or other web servers to host the `dist` static files. See `public/nginx.conf` for nginx configuration reference.

2. Use `node` command to run `service.js` directly. It listens on port `3000` by default. Set the environment variable `NGINX_PORT` to adjust the port.

```shell
node dist/service.js
``` 
