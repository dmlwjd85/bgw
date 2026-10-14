/* 시하 스티커북 서비스 워커. 빌드가 버전·미리 캐시 목록을 넣는다. */
const VERSION = '__SIHA_CACHE_VERSION__'
const PRECACHE = ['__SIHA_PRECACHE__']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION)
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[siha sw] precache skip', url, err)
          }),
        ),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      const cached = await caches.match(req)
      if (cached) return cached
      try {
        const res = await fetch(req)
        if (res && res.ok) {
          const copy = res.clone()
          const cache = await caches.open(VERSION)
          await cache.put(req, copy)
        }
        return res
      } catch (err) {
        if (req.mode === 'navigate') {
          const fallback = await caches.match('./index.html')
          if (fallback) return fallback
        }
        throw err
      }
    })(),
  )
})
