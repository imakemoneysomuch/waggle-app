/* 와글와글 서비스워커 — 설치형 앱(PWA)용.
 * 원칙: 화면은 항상 최신을 먼저 (배포가 바로 반영되게), 캐시는
 * 이름에 해시가 든 파일과 오프라인 대비용으로만 쓴다. */
const CACHE = 'waggle-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) =>
  e.waitUntil(
    (async () => {
      // 이름이 다른 옛 캐시 통은 지운다 — 남겨 두면 옛 화면이 되살아난다
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  ),
)

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return

  if (url.pathname.includes('/assets/')) {
    // 해시 파일 — 내용이 바뀌면 이름도 바뀌니 캐시 우선이 안전
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
    // 그 외(index.html 등) — 네트워크 우선, 오프라인일 때만 캐시.
    // ?v= · ?upd= 가 붙은 요청(업데이트 확인·강제 갱신)은 캐시에 남기지 않는다.
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then((res) => {
          if (res.ok && !url.search) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {})
          }
          return res
        })
        .catch(async () => (await caches.match(e.request)) || (await caches.match('./')) || Response.error()),
    )
  }
})
