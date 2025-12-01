const CACHE_VERSION = 'v2';
const STATIC_CACHE = `ai-novel-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `ai-novel-images-${CACHE_VERSION}`;
const AUDIO_CACHE = `ai-novel-audio-${CACHE_VERSION}`;

// 核心静态资源
const staticAssets = [
  '/',
  '/index.html',
  '/manifest.json',
];

// 音频资源（预缓存）
const audioAssets = [
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112778.mp3',
  'https://cdn.pixabay.com/download/audio/2024/09/16/audio_4123547f6d.mp3?filename=happy-day-240507.mp3',
  'https://cdn.pixabay.com/download/audio/2021/11/24/audio_8233772213.mp3?filename=sad-piano-111555.mp3',
  'https://cdn.pixabay.com/download/audio/2022/03/10/audio_51cc6c8104.mp3?filename=suspense-108253.mp3',
  'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc8c857701.mp3?filename=romantic-piano-110753.mp3',
  'https://cdn.pixabay.com/download/audio/2022/10/25/audio_5d2b378051.mp3?filename=mystery-124317.mp3'
];

// 图片缓存大小限制（100张）
const IMAGE_CACHE_LIMIT = 100;

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(staticAssets);
      }),
      // 缓存音频资源
      caches.open(AUDIO_CACHE).then((cache) => {
        console.log('Service Worker: Caching audio assets');
        return cache.addAll(audioAssets);
      }),
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  const currentCaches = [STATIC_CACHE, IMAGE_CACHE, AUDIO_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Service Worker: Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// 检查是否是图片请求
function isImageRequest(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url) || url.includes('/stories/');
}

// 检查是否是音频请求
function isAudioRequest(url) {
  return /\.mp3$/i.test(url) || url.includes('pixabay.com');
}

// 限制图片缓存大小
async function trimImageCache() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();
  
  if (keys.length > IMAGE_CACHE_LIMIT) {
    // 删除最旧的缓存
    const toDelete = keys.length - IMAGE_CACHE_LIMIT;
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Fetch event - 智能缓存策略
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // 跳过 AI API 请求
  if (url.includes('/dashscope-api') || 
      url.includes('generativelanguage.googleapis.com') ||
      url.includes('dashscope-result-bj.oss-cn-beijing.aliyuncs.com')) {
    return;
  }

  // 图片请求：Cache First + 后台更新
  if (isImageRequest(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        // 后台更新（Stale While Revalidate）
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
            trimImageCache(); // 限制缓存大小
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        // 优先返回缓存
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 音频请求：Cache First
  if (isAudioRequest(url)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 其他请求：Network First + 缓存回退
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 缓存成功的静态资源响应
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          
          if (url.includes('.css') || url.includes('.js') || url.includes('.html')) {
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }
        return response;
      })
      .catch(() => {
        // 网络失败时返回缓存
        return caches.match(event.request);
      })
  );
});
