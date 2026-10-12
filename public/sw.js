// TeleCloud service worker: offline app shell + streaming previews.
// Requests to ./stream/<id>/<name> are answered with byte ranges fetched (and decrypted) by the open page,
// so videos and music can play instantly without downloading or caching the whole file.
const SHELL = 'tc-shell-v4'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== SHELL) await caches.delete(k)
  await self.clients.claim()
})()))

const CHUNK = 1024 * 1024
async function askPage(clientId, msg) {
  let client = clientId && (await self.clients.get(clientId))
  if (!client) client = (await self.clients.matchAll({ type: 'window' }))[0]
  if (!client) throw new Error('no page')
  return new Promise((res, rej) => {
    const ch = new MessageChannel()
    ch.port1.onmessage = (e) => (e.data && e.data.error ? rej(new Error(e.data.error)) : res(e.data))
    client.postMessage(msg, [ch.port2])
    setTimeout(() => rej(new Error('timeout')), 60000)
  })
}
async function stream(req, clientId, id) {
  const range = req.headers.get('range')
  let start = 0, end = -1
  const m = /bytes=(\d*)-(\d*)/.exec(range || '')
  if (m) { start = m[1] ? +m[1] : 0; end = m[2] ? +m[2] : -1 }
  const info = await askPage(clientId, { type: 'tc-info', id })
  const size = info.size
  if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
  if (end < 0 || end >= size) end = size - 1
  end = Math.min(end, start + CHUNK - 1)
  const r = await askPage(clientId, { type: 'tc-range', id, start, end })
  return new Response(r.buf, { status: 206, headers: {
    'Content-Type': info.mime || 'application/octet-stream', 'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${start}-${start + r.buf.byteLength - 1}/${size}`, 'Content-Length': String(r.buf.byteLength), 'Cache-Control': 'no-store',
  } })
}
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.origin !== location.origin) return
  const scope = new URL(self.registration.scope).pathname
  const rel = url.pathname.slice(scope.length)
  if (rel.startsWith('stream/')) {
    const id = rel.split('/')[1]
    e.respondWith(stream(e.request, e.clientId || e.resultingClientId, id).catch((err) => new Response(String(err), { status: 500 })))
    return
  }
  if (e.request.method !== 'GET') return
  // app shell: hashed assets cache-first, pages network-first (works offline after first visit)
  if (rel.startsWith('assets/')) {
    e.respondWith(caches.open(SHELL).then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r })))
  } else if (e.request.mode === 'navigate' || /\.(png|svg|webmanifest)$/.test(rel)) {
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(SHELL).then((c) => c.put(e.request, cl)) } return r }).catch(() => caches.match(e.request)))
  }
})
