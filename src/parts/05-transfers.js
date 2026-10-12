
/* ---------- thumbnails ---------- */
let thumbQ = [], thumbBusy = 0
function loadThumbs() {
  const imgs = $$('img[data-th]')
  if (!('IntersectionObserver' in window)) return
  const io = loadThumbs.io || (loadThumbs.io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { loadThumbs.io.unobserve(e.target); queueThumb(+e.target.dataset.th) } }), { root: $('#scroller'), rootMargin: '400px' }))
  imgs.forEach((i) => io.observe(i))
}
function queueThumb(id) { if (S.thumbs.has(id)) return setThumb(id, S.thumbs.get(id)); if (thumbQ.includes(id)) return; thumbQ.push(id); pumpThumbs() }
function setThumb(id, u) { $$(`img[data-th="${id}"]`).forEach((im) => { im.onload = () => im.classList.remove('ld'); im.src = u; im.removeAttribute('data-th') }) }
async function pumpThumbs() {
  while (thumbBusy < 4 && thumbQ.length) {
    const id = thumbQ.shift(); thumbBusy++
    ;(async () => {
      try {
        let blob = await cache.getThumb(id)
        if (!blob) { const it = findItem(id); if (it && !it.locked) { blob = await tg.downloadThumb(it); if (blob) cache.putThumb(id, blob) } }
        if (blob) { const u = URL.createObjectURL(blob); S.thumbs.set(id, u); setThumb(id, u) }
      } catch {} finally { thumbBusy--; pumpThumbs() }
    })()
  }
}
async function makeThumb(file) {
  try {
    if (/^image\/(jpeg|png|webp|gif|bmp|avif)/.test(file.type)) { const bmp = await createImageBitmap(file); return { thumb: await toJpeg(bmp, bmp.width, bmp.height) } }
    if (/^video\//.test(file.type)) {
      const url = URL.createObjectURL(file); const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.src = url
      await new Promise((r, j) => { v.onloadedmetadata = r; v.onerror = j; setTimeout(j, 8000) })
      const info = { duration: v.duration || 0, w: v.videoWidth, h: v.videoHeight }
      v.currentTime = Math.min(1, (v.duration || 2) / 3)
      await new Promise((r) => { v.onseeked = r; setTimeout(r, 4000) })
      const thumb = await toJpeg(v, v.videoWidth, v.videoHeight).catch(() => null); URL.revokeObjectURL(url)
      return { thumb, video: info }
    }
  } catch {}
  return {}
}
function toJpeg(src, w, h) {
  const k = Math.min(1, 320 / Math.max(w, h)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k))
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height)
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82))
}

/* ---------- fly animation (file → transfers) ---------- */
function fly(from, html, target) {
  if (RM() || !from) return
  const to = target || $('#transfers .tr-pill') || $('#transfers .trh'); if (!to) return
  const g = document.createElement('div'); g.className = 'flyer'; g.innerHTML = html; document.body.append(g)
  const a = to.getBoundingClientRect()
  const sx = from.x, sy = from.y, ex = a.left + a.width / 2, ey = a.top + a.height / 2
  const cx = (sx + ex) / 2 + (ex > sx ? -60 : 60), cy = Math.min(sy, ey) - 180
  const kf = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex, y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey
    kf.push({ transform: `translate(${x - 28}px, ${y - 28}px) scale(${1.15 - 0.85 * t}) rotate(${(t * 18).toFixed(1)}deg)`, opacity: t > 0.88 ? (1 - t) / 0.12 : 1, offset: t })
  }
  g.animate(kf, { duration: 820, easing: 'cubic-bezier(.5,0,.2,1)' }).onfinish = () => { g.remove(); to.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.3,1.6,.5,1)' }) }
}
const centerOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }

/* ---------- transfers panel ---------- */
let trId = 0, upRunning = 0, trTimer, trSig = '', trOpen = true
const active = (t) => t.state === 'run' || t.state === 'wait' || t.state === 'paused'
function trRing(p, size = 30, sw = 3) { const R = (size - sw) / 2, C = 2 * Math.PI * R; return `<svg class="tring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle r="${R}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="var(--track)" stroke-width="${sw}"/><circle class="tr-arc" r="${R}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="var(--a)" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})" data-c="${C}"/></svg>` }
function overall() { const a = S.transfers.filter(active); const size = a.reduce((x, t) => x + t.size, 0), done = a.reduce((x, t) => x + (t.bytes || 0), 0); const speed = a.reduce((x, t) => x + (t.state === 'run' ? t.speed || 0 : 0), 0); return { a, p: size ? done / size : 0, eta: speed ? (size - done) / speed : Infinity, speed } }
function trStatus(t) {
  if (t.state === 'done') return t.kind === 'up' ? `Uploaded · ${fmtSize(t.size)}` : t.kind === 'pin' ? 'Saved on this device' : `Downloaded · ${fmtSize(t.size)}`
  if (t.state === 'fail') return esc(t.err || 'Failed')
  if (t.state === 'wait') return 'Waiting…'
  if (t.state === 'paused') return `Paused · ${fmtSize(t.bytes || 0)} of ${fmtSize(t.size)}`
  if (t.phase) return t.phase
  return `${fmtSize(t.bytes || 0)} of ${fmtSize(t.size)}${t.speed ? ` · ${fmtSize(t.speed)}/s` : ''}${t.speed ? ' · ' + fmtEta((t.size - (t.bytes || 0)) / t.speed) : ''}`
}
function renderTransfers() {
  const box = $('#transfers'); if (!box) return
  if (!S.transfers.length) { box.className = ''; box.innerHTML = ''; trSig = ''; return }
  const o = overall()
  const sig = S.transfers.map((t) => t.id + t.state).join(',') + trOpen
  const head = o.a.length ? `${S.transfers.some((t) => t.kind === 'up' && active(t)) ? 'Uploading' : 'Downloading'} ${o.a.length} item${o.a.length > 1 ? 's' : ''}` : 'All done'
  const sub = o.a.length ? `${Math.round(o.p * 100)}%${o.speed ? ' · ' + fmtSize(o.speed) + '/s' : ''}${isFinite(o.eta) ? ' · ' + fmtEta(o.eta) : ''}` : `${S.transfers.filter((t) => t.state === 'done').length} completed`
  if (sig !== trSig) {
    trSig = sig
    box.className = 'show ' + (trOpen ? 'open' : 'mini')
    box.innerHTML = `<button class="tr-pill glass" id="trp">${o.a.length ? trRing(o.p, 26, 3) : `<span class="ok">${I.checkc}</span>`}<span class="tp-t">${o.a.length ? Math.round(o.p * 100) + '%' : 'Done'}</span></button>
    <div class="tr-panel glass"><div class="trh">${o.a.length ? trRing(o.p, 34, 3.5) : `<span class="ok big">${I.checkc}</span>`}<div class="grow"><div class="th-t">${head}</div><div class="th-s">${sub}</div></div><button class="iconbtn" id="trmin" title="Minimize">${I.chevron}</button><button class="iconbtn" id="trx" title="Clear">${I.x}</button></div>
    <div class="trl">${S.transfers.slice(-40).reverse().map((t) => `<div class="tr ${t.state}" data-t="${t.id}"><div class="tr-ic">${t.thumb ? `<img src="${t.thumb}">` : fileIcon(t.name, 34)}${t.enc ? `<span class="bdg lk">${I.lock}</span>` : ''}<span class="tr-dir">${t.kind === 'up' ? I.upload : I.download}</span></div><div class="b"><div class="n">${esc(t.name)}</div>
      <div class="s">${trStatus(t)}</div>${active(t) ? `<div class="prog ${t.state === 'run' ? 'run' : ''}"><i style="width:${(t.p || 0) * 100}%"></i></div>` : ''}</div>
      ${active(t) ? `${t.kind !== 'pin' ? `<button class="iconbtn" data-pause="${t.id}" title="${t.state === 'paused' ? 'Resume' : 'Pause'}">${t.state === 'paused' ? I.play : I.pause}</button>` : ''}<button class="iconbtn" data-cancel="${t.id}" title="Cancel">${I.x}</button>` : t.state === 'done' ? `<span class="ok pop">${I.checkc}</span>` : ''}</div>`).join('')}</div></div>`
    return
  }
  // progress-only update (keeps buttons stable under the cursor)
  $$('.tring .tr-arc', box).forEach((c) => (c.style.strokeDashoffset = c.dataset.c * (1 - o.p)))
  const tp = $('.tp-t', box); if (tp && o.a.length) tp.textContent = Math.round(o.p * 100) + '%'
  const hs = $('.th-s', box); if (hs) hs.textContent = sub
  for (const t of S.transfers) { const row = box.querySelector(`[data-t="${t.id}"]`); if (!row) continue; const s = $('.s', row); if (s) s.innerHTML = trStatus(t); const i = $('.prog i', row); if (i) i.style.width = (t.p || 0) * 100 + '%' }
}
function bindTransfers() {
  $('#transfers').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return
    if (b.id === 'trp' || b.id === 'trmin') { trOpen = b.id === 'trp'; trSig = ''; renderTransfers(); return }
    if (b.id === 'trx') { S.transfers.forEach((t) => active(t) && (t.ctl.cancelled = true)); S.transfers = []; renderTransfers(); return }
    if (b.dataset.cancel) { const t = S.transfers.find((x) => x.id == b.dataset.cancel); if (t) { t.ctl.cancelled = true; t.state = 'fail'; t.err = 'Cancelled'; renderTransfers() } }
    if (b.dataset.pause) { const t = S.transfers.find((x) => x.id == b.dataset.pause); if (t) { t.ctl.paused = !t.ctl.paused; t.state = t.ctl.paused ? 'paused' : (t.started ? 'run' : 'wait'); t.speed = 0; renderTransfers() } }
  }
}
const trRender = () => { if (trTimer) return; trTimer = setTimeout(() => { trTimer = null; renderTransfers() }, 150) }
function track(t, frac, bytes) {
  const now = performance.now()
  if (!t.t0) { t.t0 = now; t.b0 = bytes }
  const dt = (now - t.t0) / 1000
  if (dt > 0.6) { const inst = (bytes - t.b0) / dt; t.speed = t.speed ? t.speed * 0.6 + inst * 0.4 : inst; t.t0 = now; t.b0 = bytes }
  t.p = frac; t.bytes = bytes; t.phase = ''; trRender()
}

/* ---------- uploads ---------- */
async function enqueueUploads(entries, from) {
  const max = tg.MAX_SIZE()
  let encrypt = e2eAuto() && !S.space
  if (encrypt && !E.unlocked()) { if (!(await unlockFlow('Unlock to upload encrypted files'))) { toast('Upload cancelled — encryption is locked', 'red'); return } }
  let first = null
  const taken = new Map(); const tk = (p) => taken.get(p) || (taken.set(p, new Set([...live().filter((i) => i.kind === 'file' && i.path === p).map((i) => i.name.toLowerCase()), ...S.transfers.filter((x) => x.kind === 'up' && active(x) && x.path === p).map((x) => x.name.toLowerCase())])), taken.get(p))
  for (const { file, path } of entries) {
    if (file.size > max) { toast(`${file.name} is larger than ${fmtSize(max)} (Telegram limit)`, 'red'); continue }
    if (!file.size && !file.type && !/\.[a-z0-9]+$/i.test(file.name)) continue
    const t = { id: ++trId, src: S.space, kind: 'up', name: uniqueName(path, file.name, tk(path)), size: file.size, file, path, p: 0, bytes: 0, state: 'wait', ctl: {}, enc: encrypt }
    if (/^image\//.test(file.type) && file.size < 25e6) t.thumb = URL.createObjectURL(file)
    S.transfers.push(t); first = first || t
  }
  if (!first) return
  trOpen = true; trSig = ''; renderTransfers()
  if (from) await nextFrame(), fly(from, first.thumb ? `<img src="${first.thumb}">` : fileIcon(first.name, 56))
  pumpUploads()
}
async function pumpUploads() {
  while (upRunning < 2) {
    const t = S.transfers.find((x) => x.kind === 'up' && x.state === 'wait' && !x.ctl.paused); if (!t) return
    t.state = 'run'; t.started = 1; upRunning++; t.phase = t.enc ? 'Encrypting & preparing…' : 'Preparing…'; renderTransfers()
    ;(async () => {
      try {
        const { thumb, video } = await makeThumb(t.file)
        const it = await tg.uploadFile(t.file, t.path, { src: t.src || '', name: t.name, onProgress: (f, b) => track(t, f, b), ctl: t.ctl, thumb, video, encrypt: t.enc })
        if (it) { itemsOf(t.src).unshift(it); S.fresh.add(it.id); if (thumb) { const u = URL.createObjectURL(thumb); S.thumbs.set(it.id, u); cache.putThumb(it.id, thumb); it.hasThumb = true } }
        t.state = 'done'; t.p = 1; t.bytes = t.size; render()
      } catch (e) { if (t.state !== 'fail') { t.state = 'fail'; t.err = errMsg(e) } }
      finally { upRunning--; t.file = null; renderTransfers(); pumpUploads() }
    })()
  }
}

/* ---------- downloads & keep offline ---------- */
const blobUrls = new Map()
function dropBlobs(ids) { for (const [id, u] of [...blobUrls]) if (!ids || ids.includes(id)) { URL.revokeObjectURL(u); blobUrls.delete(id) } }
const cardOf = (it) => $(`#content [data-k="${CSS.escape(key(it))}"]`)
async function download(items, srcEl) {
  items = items.filter((i) => i.kind === 'file')
  if (items.some((i) => i.locked)) { if (!(await unlockFlow())) return }
  let flew = false
  for (const it of items) {
    const t = { id: ++trId, kind: 'down', name: it.name, size: it.size, p: 0, bytes: 0, state: 'run', started: 1, ctl: {}, enc: it.enc, thumb: S.thumbs.get(it.id) }
    S.transfers.push(t); trOpen = true; renderTransfers()
    if (!flew) { flew = true; const el = srcEl || cardOf(it); if (el) { await nextFrame(); fly(centerOf(el), t.thumb ? `<img src="${t.thumb}">` : fileIcon(it.name, 56)) } }
    try {
      let blob = await cache.getMedia(it.id)
      if (blob) { t.phase = 'From this device'; track(t, 1, it.size) }
      else if (window.showSaveFilePicker && it.size > 300 * 1024 * 1024 && !it.isPhoto) {
        const h = await window.showSaveFilePicker({ suggestedName: it.name }); const w = await h.createWritable(); let got = 0
        try { for await (const ch of tg.downloadChunks(it, t.ctl)) { await w.write(ch); got += ch.length; track(t, got / it.size, got) } await w.close() } catch (e) { await w.abort().catch(() => {}); throw e }
      } else {
        blob = await tg.downloadBlob(it, (f, b) => track(t, f, b), t.ctl)
        if (await cache.putMedia(it, blob)) S.cached.set(it.id, { id: it.id, size: blob.size })
      }
      if (blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = it.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000) }
      t.state = 'done'; t.p = 1; t.bytes = t.size; updateCacheLabel(); refreshBadges()
    } catch (e) { t.state = 'fail'; t.err = e.name === 'AbortError' || /Cancel/.test(errMsg(e)) ? 'Cancelled' : errMsg(e) }
    renderTransfers()
  }
}
async function pin(items, on) {
  items = items.filter((i) => i.kind === 'file')
  if (!on) { for (const it of items) { await cache.remove([it.id]); S.cached.delete(it.id) } dropBlobs(items.map((i) => i.id)); toast(`Removed from this device · still safe in your cloud`); refreshBadges(); updateCacheLabel(); updateSel(); return }
  if (items.some((i) => i.locked)) { if (!(await unlockFlow())) return }
  let flew = false
  for (const it of items) {
    if (S.cached.has(it.id)) { await cache.setPin(it.id, true); S.cached.get(it.id).pin = true; continue }
    const t = { id: ++trId, kind: 'pin', name: it.name, size: it.size, p: 0, bytes: 0, state: 'run', started: 1, ctl: {}, enc: it.enc, thumb: S.thumbs.get(it.id) }
    S.transfers.push(t); trOpen = true; renderTransfers()
    if (!flew) { flew = true; const el = cardOf(it); if (el) { await nextFrame(); fly(centerOf(el), t.thumb ? `<img src="${t.thumb}">` : fileIcon(it.name, 56)) } }
    try { const blob = await tg.downloadBlob(it, (f, b) => track(t, f, b), t.ctl); await cache.putMedia(it, blob, { pin: true }); S.cached.set(it.id, { id: it.id, size: blob.size, pin: true }); t.state = 'done'; t.p = 1 }
    catch (e) { t.state = 'fail'; t.err = /Cancel/.test(errMsg(e)) ? 'Cancelled' : errMsg(e) }
    renderTransfers(); refreshBadges()
  }
  updateCacheLabel(); updateSel()
}
function refreshBadges() {
  for (const el of $$('#content [data-k]')) {
    const it = byKey(el.dataset.k); if (!it || it.kind !== 'file') continue
    const ic = $('.ic', el); if (!ic) continue
    const has = !!$('.bdg.dv', ic), want = S.cached.has(it.id)
    if (want && !has) ic.insertAdjacentHTML('beforeend', `<span class="bdg dv pop" title="On this device">${I.checkc}</span>`)
    if (!want && has) $('.bdg.dv', ic).remove()
  }
  const oc = live().filter((i) => i.kind === 'file' && S.cached.has(i.id)).length; const c = $('[data-c="offline"]'); if (c) c.textContent = oc || ''
}
