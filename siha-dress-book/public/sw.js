/* 시하 스티커북 서비스 워커. 빌드가 버전·미리 캐시 목록을 넣는다.
   - 미리 캐시는 브라우저 HTTP 캐시를 건너뛰고(cache: 'reload') 서버에서 새로 받는다.
     (예전에는 배포 직후 HTTP 캐시에 남은 옛 manifest·아이콘이 새 버전 캐시에 그대로 들어가
      옛 앱 id·옛 아이콘이 다음 배포 때까지 계속 보였다.)
   - 페이지(index.html)와 manifest.webmanifest는 인터넷이 되면 항상 서버 것을 먼저 쓰고,
     안 될 때만 캐시를 쓴다. 그래서 설치 정보(id·scope·start_url·아이콘 목록)가 늘 최신이다.
   - 그 밖의 파일(그림·스크립트)은 지금처럼 캐시를 먼저 쓴다. */
const VERSION = '__SIHA_CACHE_VERSION__'
const PRECACHE = ['__SIHA_PRECACHE__']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION)
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
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

function isFreshFirst(req, url) {
  return req.mode === 'navigate' || url.pathname.endsWith('/manifest.webmanifest')
}

async function networkFirst(req) {
  const cache = await caches.open(VERSION)
  try {
    const res = await fetch(req, { cache: 'no-cache' })
    if (res && res.ok) await cache.put(req, res.clone())
    return res
  } catch (err) {
    const cached = (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && (await cache.match('./index.html')))
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  const res = await fetch(req)
  if (res && res.ok) {
    const cache = await caches.open(VERSION)
    await cache.put(req, res.clone())
  }
  return res
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(isFreshFirst(req, url) ? networkFirst(req) : cacheFirst(req))
})
