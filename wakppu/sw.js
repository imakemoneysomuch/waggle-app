/* 왁뿌볼 부수기 서비스워커 — 오프라인에서도 열리게.
 * 화면(index.html)은 네트워크 우선(배포가 바로 반영), 아이콘 등은 캐시 우선. */
const CACHE = 'wakppu-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith('wakppu-')).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  if (!url.pathname.includes('/wakppu/')) return

  if (url.pathname.endsWith('.png')) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request)
        if (hit) return hit
        const res = await fetch(e.request)
        if (res.ok) c.put(e.request, res.clone())
        return res
      }),
    )
  } else {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {})
          }
          return res
        })
        .catch(async () => (await caches.match(e.request)) || (await caches.match('./index.html')) || Response.error()),
    )
  }
})
