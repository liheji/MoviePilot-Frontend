# PWA 缓存优化指南

## 📊 当前应用的App Shell模型评估

### ✅ 符合App Shell模型的方面

1. **核心架构**
   - 拥有独立的HTML shell (`index.html`)
   - 实现了内容与框架的分离
   - 使用Vue Router进行路由懒加载
   - 具备完整的PWA manifest配置

2. **Service Worker实现**
   - 使用Workbox框架进行缓存管理
   - 实现了预缓存和运行时缓存
   - 支持离线检测和状态管理
   - 实现了推送通知功能

3. **用户体验优化**
   - 自定义加载界面
   - 离线页面支持
   - 网络状态实时检测
   - 背景图片预加载

## 🚀 已实施的优化

### 1. App Shell缓存策略优化
```javascript
// 为App Shell HTML使用CacheFirst策略
{
  urlPattern: /^\/$|\/index\.html$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'app-shell-cache',
    expiration: {
      maxEntries: 10,
      maxAgeSeconds: 7 * 24 * 60 * 60, // 7天
    },
  },
}
```

### 2. 关键资源预缓存
- 预缓存`loader.css`和`logo.png`
- 确保离线页面始终可用

### 3. 独立的离线页面
- 创建了包含内联CSS的独立离线页面
- 自动检测网络恢复并重新加载
- 优雅的UI设计，支持深色模式

## 📈 进一步优化建议

### 1. **关键CSS内联**
建议将关键CSS内联到`index.html`中：

```html
<style>
  /* 关键路径CSS */
  :root {
    --initial-loader-bg: #FFFFFF;
    --initial-loader-color: #9155FD;
  }
  
  #loading-bg {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    background: var(--initial-loader-bg);
  }
  
  /* 更多关键CSS... */
</style>
```

### 2. **资源优先级优化**
```html
<!-- 预连接到关键域名 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- 预加载关键字体 -->
<link rel="preload" href="/fonts/main-font.woff2" as="font" type="font/woff2" crossorigin>
```

### 3. **缓存版本控制**
实现缓存版本控制机制：

```javascript
// 在service-worker.ts中
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  appShell: `app-shell-${CACHE_VERSION}`,
  static: `static-resources-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`,
};
```

### 4. **智能预取策略**
基于用户行为预取资源：

```javascript
// 预取下一个可能访问的页面
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    const nextPageChunk = '/assets/dashboard-chunk.js';
    if ('link' in document.createElement('link')) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = nextPageChunk;
      document.head.appendChild(link);
    }
  });
}
```

### 5. **缓存清理策略**
定期清理过期缓存：

```javascript
// 清理超过30天的图片缓存
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = Object.values(CACHE_NAMES);
  
  await Promise.all(
    cacheNames.map(cacheName => {
      if (!currentCaches.includes(cacheName)) {
        return caches.delete(cacheName);
      }
    })
  );
}
```

## 🔧 性能监控建议

### 1. **缓存命中率监控**
```javascript
// 记录缓存命中率
let cacheHits = 0;
let totalRequests = 0;

self.addEventListener('fetch', event => {
  totalRequests++;
  
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        cacheHits++;
        // 发送统计数据
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_STATS',
              hitRate: (cacheHits / totalRequests * 100).toFixed(2)
            });
          });
        });
        return response;
      }
      return fetch(event.request);
    })
  );
});
```

### 2. **离线使用分析**
跟踪用户在离线状态下的行为，优化离线体验。

## 📱 移动端优化

### 1. **Add to Home Screen 提示**
```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // 在合适的时机显示安装提示
  showInstallButton();
});
```

### 2. **后台同步**
使用Background Sync API同步离线操作：

```javascript
// 注册后台同步
if ('sync' in self.registration) {
  self.registration.sync.register('sync-data');
}

// 处理同步事件
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});
```

## 🎯 最佳实践总结

1. **缓存策略选择**
   - App Shell: CacheFirst
   - API数据: NetworkFirst (带超时)
   - 静态资源: StaleWhileRevalidate
   - 图片资源: CacheFirst (带过期时间)

2. **缓存大小控制**
   - 设置合理的maxEntries
   - 定期清理过期缓存
   - 监控缓存使用情况

3. **用户体验**
   - 提供清晰的离线状态提示
   - 实现平滑的在线/离线切换
   - 预加载关键资源

4. **性能优化**
   - 使用导航预加载
   - 实施资源优先级策略
   - 优化Service Worker启动时间