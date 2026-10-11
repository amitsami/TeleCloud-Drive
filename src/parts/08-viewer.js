
/* ---------- streaming bridge (service worker asks, page reads from Telegram) ---------- */
const streamItems = new Map(), ahead = new Map()
let swReady = false
async function setupSW() {
  if (!('serviceWorker' in navigator) || !isSecureContext) return
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' })
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await Promise.race([new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })), sleep(3000)])
    swReady = !!navigator.serviceWorker.controller
  } catch {}
  navigator.serviceWorker.addEventListener('message', async (e) => {
    const d = e.data || {}, port = e.ports[0]; if (!port || !d.type || !d.type.startsWith('tc-')) return
    const it = streamItems.get(String(d.id)); if (!it) return port.postMessage({ error: 'gone' })
    try {
      if (d.type === 'tc-info') return port.postMessage({ size: it.size, mime: it.mime || (isVid(it) ? 'video/mp4' : 'audio/mpeg') })
      const k = `${it.id}:${d.start}`
      let buf = ahead.has(k) ? await ahead.get(k) : null; ahead.delete(k)
      if (!buf || buf.length < Math.min(d.end, it.size - 1) - d.start + 1) buf = await tg.readRange(it, d.start, d.end)
      const out = buf.slice(); port.postMessage({ buf: out.buffer }, [out.buffer])
      // read ahead the next megabyte so playback stays smooth
      const ns = d.start + buf.length
      if (ns < it.size && ahead.size < 4) { const p = tg.readRange(it, ns, Math.min(it.size - 1, ns + (d.end - d.start))); p.catch(() => {}); ahead.set(`${it.id}:${ns}`, p) }
    } catch (err) { port.postMessage({ error: errMsg(err) }) }
  })
}

/* ---------- quick preview ---------- */
function viewer(it, srcEl) {
  const list = (S._vis || []).filter((i) => i.kind === 'file' && !i.d && !i.locked)
  let idx = list.indexOf(it); if (idx < 0) { list.push(it); idx = list.length - 1 }
  srcEl = srcEl || cardOf(it)
  const el = document.createElement('div'); el.className = 'viewer'; document.body.append(el)
  el.innerHTML = `<div class="vbg"></div>
    <div class="vbar glass"><button class="iconbtn" id="vx" title="Close">${I.x}</button><div class="vt"><div class="vn" id="vn"></div><div class="vs" id="vsub"></div></div>
      <div class="vacts"><button class="iconbtn hidden" id="vplay" title="Slideshow">${I.slides}</button><button class="iconbtn" id="vfav" title="Favorite"></button><button class="iconbtn" id="vpin" title="Keep on this device">${I.offline}</button><button class="iconbtn hide-s" id="vsh" title="Send to Saved Messages">${I.send}</button><button class="iconbtn" id="vdl" title="Download">${I.download}</button><button class="iconbtn hide-s" id="vinfo" title="Info">${I.info}</button><button class="iconbtn hide-s red" id="vdel" title="Delete">${I.trash}</button></div></div>
    <div class="stage" id="vst"></div>
    <button class="vnav l glass" id="vl">${I.back}</button><button class="vnav r glass" id="vr">${I.fwd}</button>
    <div class="vcount glass" id="vc"></div>`
  let ctl = {}, urlNow = null, slide = null
  const stopSlide = () => { if (slide) { clearInterval(slide); slide = null; $('#vplay', el)?.classList.remove('on') } }
  const nextImg = () => { for (let i = idx + 1; i < list.length; i++) if (isImg(list[i])) return i; return -1 }
  const stage = $('#vst', el)
  const origin = () => { const r = srcEl && srcEl.isConnected ? srcEl.getBoundingClientRect() : null; return r ? `${r.left + r.width / 2}px ${r.top + r.height / 2}px` : '50% 50%' }
  stage.style.transformOrigin = origin()
  requestAnimationFrame(() => el.classList.add('in'))
  const close = () => {
    if (el._closing) return; el._closing = true; ctl.cancelled = true; stopSlide()
    const cur = list[idx]; const src = cardOf(cur); if (src) srcEl = src
    stage.style.transformOrigin = origin(); el.classList.remove('in'); el.classList.add('out')
    document.removeEventListener('keydown', onKey)
    setTimeout(() => { el.remove(); if (urlNow && urlNow.startsWith('blob:') && !blobUrls.has(cur.id)) URL.revokeObjectURL(urlNow); streamItems.clear(); ahead.clear() }, 380)
  }
  el._close = close
  const onKey = (e) => { if (document.querySelector('.modal-bg')) return; if (e.key === 'Escape' || (e.key === ' ' && !e.target.closest('video,audio'))) { e.preventDefault(); close() } if (e.key === 'ArrowRight') go2(1); if (e.key === 'ArrowLeft') go2(-1) }
  document.addEventListener('keydown', onKey)
  const go2 = (d) => { const n = idx + d; if (n < 0 || n >= list.length) return; idx = n; stage.dataset.dir = d > 0 ? 'r' : 'l'; show() }
  $('#vplay', el).onclick = () => { if (slide) { stopSlide(); toast('Slideshow stopped', '', 1400); return } $('#vplay', el).classList.add('on'); toast('Slideshow · tap again to stop', '', 1600); slide = setInterval(() => { const n = nextImg(); if (n < 0) return stopSlide(); stage.dataset.dir = 'r'; idx = n; show() }, 3500) }
  $('#vx', el).onclick = close; $('#vl', el).onclick = () => go2(-1); $('#vr', el).onclick = () => go2(1)
  $('.vbg', el).onclick = close
  $('#vdl', el).onclick = (e) => download([list[idx]], e.currentTarget)
  $('#vsh', el).onclick = () => share([list[idx]])
  $('#vinfo', el).onclick = () => info(list[idx])
  $('#vdel', el).onclick = () => { const f = list[idx]; close(); trash([f]) }
  $('#vfav', el).onclick = async () => { const f = list[idx]; await toggleFav([f]); paintBar() }
  $('#vpin', el).onclick = async () => { const f = list[idx]; const on = !S.cached.get(f.id)?.pin; await pin([f], on); paintBar() }
  const paintBar = () => {
    const f = list[idx]; const c = S.cached.get(f.id)
    $('#vn', el).textContent = f.name
    $('#vfav', el).innerHTML = f.fav ? I.starFill : I.star; $('#vfav', el).classList.toggle('gold', !!f.fav)
    $('#vpin', el).classList.toggle('on', !!c?.pin); $('#vpin', el).title = c?.pin ? 'Remove from this device' : 'Keep on this device'
    $('#vplay', el).classList.toggle('hidden', !(isImg(f) && list.filter(isImg).length > 1))
    $('#vl', el).classList.toggle('hidden', idx <= 0); $('#vr', el).classList.toggle('hidden', idx >= list.length - 1)
    $('#vc', el).textContent = list.length > 1 ? `${idx + 1} of ${list.length}` : ''; $('#vc', el).classList.toggle('hidden', list.length < 2)
  }
  const setSub = (mode) => {
    const f = list[idx]
    const tag = mode === 'device' ? `<span class="vtag g">${I.checkc} On this device</span>` : mode === 'stream' ? `<span class="vtag">${I.cloud} Streaming · nothing saved</span>` : mode === 'memory' ? `<span class="vtag">${I.eye} Preview · nothing saved</span>` : ''
    $('#vsub', el).innerHTML = `${fmtSize(f.size)} · ${fmtDate(f.date)}${f.enc ? ` <span class="vtag">${I.lock} Encrypted</span>` : ''} ${tag}`
  }
  const loading = (f) => {
    const th = S.thumbs.get(f.id)
    stage.innerHTML = `<div class="vload">${th ? `<img class="vblur" src="${th}">` : `<div class="vbig">${fileIcon(f.name, 120)}</div>`}<div class="vring">${trRing(0, 54, 4)}</div><div class="vpt" id="vpt">Loading preview…</div></div>`
  }
  const prog = (my, f) => (p, b) => { if (my.cancelled) return; const a = $('.tr-arc', stage); if (a) a.style.strokeDashoffset = a.dataset.c * (1 - p); const t = $('#vpt', stage); if (t) t.textContent = `${fmtSize(b)} of ${fmtSize(f.size)}` }
  async function memBlob(f, my) {
    const blob = await tg.downloadBlob(f, prog(my, f), my)
    if (cache.settings().prev) { if (await cache.putMedia(f, blob, { force: true })) S.cached.set(f.id, { id: f.id, size: blob.size }) }
    return blob
  }
  async function show() {
    ctl.cancelled = true; ctl = {}; const my = ctl
    const f = list[idx]; paintBar(); setSub('')
    if (urlNow && urlNow.startsWith('blob:') && ![...blobUrls.values()].includes(urlNow)) URL.revokeObjectURL(urlNow); urlNow = null
    stage.classList.remove('swap'); void stage.offsetWidth; stage.classList.add('swap')
    const typed = (blob) => (isPdf(f) ? new Blob([blob], { type: 'application/pdf' }) : f.mime && blob.type !== f.mime ? new Blob([blob], { type: f.mime }) : blob)
    try {
      // 1) already on this device?
      let url = blobUrls.get(f.id), mode = url ? 'device' : ''
      if (!url) { const cb = await cache.getMedia(f.id); if (my.cancelled) return; if (cb) { url = URL.createObjectURL(typed(cb)); blobUrls.set(f.id, url); mode = 'device' } }
      if (isImg(f)) {
        if (!url) {
          const th = S.thumbs.get(f.id)
          stage.innerHTML = `<div class="zoom"><img class="vimg ${th ? 'pre' : ''}" src="${th || ''}" draggable="false"></div>${th ? '' : `<div class="vring c">${trRing(0, 54, 4)}</div>`}`
          zoomable(stage)
          const blob = await memBlob(f, my); if (my.cancelled) return
          url = urlNow = URL.createObjectURL(typed(blob)); mode = S.cached.has(f.id) ? 'device' : 'memory'
          const im = $('.vimg', stage); const nim = new Image(); nim.onload = () => { if (my.cancelled) return; im.src = url; im.classList.remove('pre'); $('.vring', stage)?.remove() }; nim.src = url
        } else { stage.innerHTML = `<div class="zoom"><img class="vimg" src="${url}" draggable="false"></div>`; zoomable(stage) }
        setSub(mode); return
      }
      if (isVid(f) || isAud(f)) {
        if (!url && swReady && f.size > 0) { streamItems.set(String(f.id), f); url = `./stream/${f.id}/${encodeURIComponent(f.name)}`; mode = 'stream' }
        if (!url) { loading(f); const blob = await memBlob(f, my); if (my.cancelled) return; url = urlNow = URL.createObjectURL(typed(blob)); mode = 'memory' }
        const th = S.thumbs.get(f.id)
        stage.innerHTML = isVid(f) ? `<video src="${url}" controls autoplay playsinline ${th ? `poster="${th}"` : ''}></video>`
          : `<div class="aud glass">${th ? `<img src="${th}">` : `<div class="aud-art">${I.music}</div>`}<div class="aud-n">${esc(f.name)}</div><div class="aud-s">${fmtSize(f.size)}${f.duration ? ' · ' + fmtDur(f.duration) : ''}</div><audio src="${url}" controls autoplay></audio></div>`
        const media = $('video,audio', stage)
        media.onended = () => { if (!isAud(f)) return; for (let i = idx + 1; i < list.length; i++) if (isAud(list[i])) { idx = i; stage.dataset.dir = 'r'; show(); return } }
        media.onerror = () => { if (my.cancelled) return; stage.innerHTML = unsupported(f, "This format can't be played in the browser.") ; bindUns() }
        setSub(mode); return
      }
      if (isPdf(f) && f.size < 150 * 1024 * 1024) {
        if (!url) { loading(f); const blob = await memBlob(f, my); if (my.cancelled) return; url = urlNow = URL.createObjectURL(typed(blob)); mode = 'memory' }
        stage.innerHTML = `<iframe src="${url}" class="vdoc"></iframe>`; setSub(mode); return
      }
      if (isText(f)) {
        let txt
        if (url) txt = await (await fetch(url)).text()
        else { loading(f); const n = Math.min(f.size, 512 * 1024); const u8 = f.size ? await tg.readRange(f, 0, n - 1, my) : new Uint8Array(); if (my.cancelled) return; txt = new TextDecoder().decode(u8) + (f.size > n ? '\n\n… (preview shows the first 512 KB)' : ''); mode = 'memory' }
        const lines = txt.split('\n').slice(0, 20000)
        stage.innerHTML = `<div class="code glass">${f.size < 2097152 ? `<button class="btn glassbtn sm ed-btn" id="vedit">${I.note} Edit</button>` : ''}<pre>${lines.map((l) => `<code>${esc(l) || ' '}</code>`).join('')}</pre></div>`; setSub(mode)
        const eb = $('#vedit', stage); if (eb) eb.onclick = () => editText(f, (nu) => { list[idx] = nu; show() })
        return
      }
      stage.innerHTML = unsupported(f); bindUns(); setSub(mode)
    } catch (e) { if (!my.cancelled) { stage.innerHTML = unsupported(f, `Couldn't load preview: ${errMsg(e)}`); bindUns() } }
  }
  const unsupported = (f, msg) => `<div class="vinfo-card glass">${S.thumbs.get(f.id) ? `<img src="${S.thumbs.get(f.id)}">` : fileIcon(f.name, 110)}<div class="vi-n">${esc(f.name)}</div><div class="vi-s">${(ext(f.name) || 'File').toUpperCase()} · ${fmtSize(f.size)} · ${fmtDate(f.date)}</div>${msg ? `<div class="vi-m">${esc(msg)}</div>` : '<div class="vi-m">No preview available for this file type.</div>'}<div class="btns"><button class="btn primary" data-u="dl">${I.download} Download</button><button class="btn glassbtn" data-u="pin">${I.offline} Keep on This Device</button></div></div>`
  const bindUns = () => { const d = $('[data-u="dl"]', stage), p = $('[data-u="pin"]', stage); d && (d.onclick = (e) => download([list[idx]], e.currentTarget)); p && (p.onclick = () => pin([list[idx]], true).then(paintBar)) }
  // swipe: left/right = next/prev, down = close
  let sx = null, sy = 0, dx = 0, dy = 0
  stage.addEventListener('touchstart', (e) => { if (e.touches.length !== 1 || stage.dataset.zoomed === '1' || e.target.closest('video,audio,iframe,.code')) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = dy = 0; stage.style.transition = 'none' }, { passive: true })
  stage.addEventListener('touchmove', (e) => { if (sx == null) return; dx = e.touches[0].clientX - sx; dy = e.touches[0].clientY - sy; const down = Math.abs(dy) > Math.abs(dx) && dy > 0; stage.style.transform = down ? `translateY(${dy}px) scale(${1 - Math.min(dy, 400) / 1600})` : `translateX(${dx}px)`; if (down) $('.vbg', el).style.opacity = 1 - Math.min(dy, 400) / 500 }, { passive: true })
  stage.addEventListener('touchend', () => { if (sx == null) return; sx = null; stage.style.transition = ''; stage.style.transform = ''; $('.vbg', el).style.opacity = ''; if (dy > 120 && Math.abs(dy) > Math.abs(dx)) close(); else if (dx < -70) go2(1); else if (dx > 70) go2(-1) })
  show()
}
/* pinch / wheel / double-click zoom + drag to pan */
function zoomable(stage) {
  const box = $('.zoom', stage), img = $('.vimg', stage); if (!img) return
  let s = 1, x = 0, y = 0
  const apply = (anim) => { img.style.transition = anim ? 'transform .35s var(--spring)' : 'none'; img.style.transform = `translate(${x}px, ${y}px) scale(${s})`; stage.dataset.zoomed = s > 1.01 ? '1' : '0'; box.classList.toggle('zoomed', s > 1.01) }
  box.addEventListener('wheel', (e) => { e.preventDefault(); const k = Math.exp(-e.deltaY * 0.0022); const ns = Math.min(8, Math.max(1, s * k)); const r = img.getBoundingClientRect(); const cx = e.clientX - (r.left + r.width / 2), cy = e.clientY - (r.top + r.height / 2); x -= cx * (ns / s - 1); y -= cy * (ns / s - 1); s = ns; if (s === 1) x = y = 0; apply(false) }, { passive: false })
  box.addEventListener('dblclick', (e) => { if (s > 1) { s = 1; x = y = 0 } else { const r = img.getBoundingClientRect(); s = 2.5; x = -(e.clientX - (r.left + r.width / 2)) * 1.5; y = -(e.clientY - (r.top + r.height / 2)) * 1.5 } apply(true) })
  const pts = new Map(); let last = null, dist0 = 0, s0 = 1, tapT = 0
  box.addEventListener('pointerdown', (e) => { box.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; dist0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); s0 = s } last = e; if (e.pointerType === 'touch') { const now = Date.now(); if (now - tapT < 280) box.dispatchEvent(new MouseEvent('dblclick', { clientX: e.clientX, clientY: e.clientY })); tapT = now } })
  box.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; s = Math.min(8, Math.max(1, s0 * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / dist0)); apply(false) } else if (s > 1 && last) { x += e.clientX - last.clientX; y += e.clientY - last.clientY; apply(false) } last = e })
  const up = (e) => { pts.delete(e.pointerId); last = null; if (s <= 1.02) { s = 1; x = y = 0; apply(true) } }
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up)
}
