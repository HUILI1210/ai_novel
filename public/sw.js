const CACHE_NAME = 'ai-novel-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112778.mp3',
  'https://cdn.pixabay.com/download/audio/2024/09/16/audio_4123547f6d.mp3?filename=happy-day-240507.mp3',
  'https://cdn.pixabay.com/download/audio/2021/11/24/audio_8233772213.mp3?filename=sad-piano-111555.mp3',
  'https://cdn.pixabay.com/download/audio/2022/03/10/audio_51cc6c8104.mp3?filename=suspense-108253.mp3',
  'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc8c857701.mp3?filename=romantic-piano-110753.mp3',
  'https://cdn.pixabay.com/download/audio/2022/10/25/audio_5d2b378051.mp3?filename=mystery-124317.mp3'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
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

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests for AI APIs and dynamic image URLs
  if (event.request.url.includes('/dashscope-api') || 
      event.request.url.includes('generativelanguage.googleapis.com') ||
      event.request.url.includes('dashscope-result-bj.oss-cn-beijing.aliyuncs.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache audio files and static assets
          if (event.request.url.includes('.mp3') || 
              event.request.url.includes('.css') || 
              event.request.url.includes('.js')) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        }).catch(() => {
          // Return cached version for failed requests
          return caches.match(event.request);
        });
      })
  );
});
