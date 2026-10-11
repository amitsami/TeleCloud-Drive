import './style.css'
import QRCode from 'qrcode'
import * as tg from './tg.js'
import { I, logo, folderIcon, fileIcon, ext } from './icons.js'

const $ = (s, r = document) => r.querySelector(s)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmtSize = (b) => { if (!b) return '0 B'; const u = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.min(4, Math.floor(Math.log(b) / Math.log(1024))); return (b / 1024 ** i).toFixed(i > 1 ? 1 : 0) + ' ' + u[i] }
const fmtDate = (t) => { const d = new Date(t * 1000), n = new Date(); const same = d.toDateString() === n.toDateString(); return same ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' }) }
const fmtDur = (s) => { s = Math.round(s || 0); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0') }
const isImg = (it) => it.isPhoto || /^image\/(jpeg|png|gif|webp|bmp|svg\+xml|avif)/.test(it.mime) || /^(jpe?g|png|gif|webp|bmp|avif)$/.test(ext(it.name))
const isVid = (it) => /^video\//.test(it.mime) || /^(mp4|webm|mov|m4v|mkv)$/.test(ext(it.name))
const isAud = (it) => /^audio\//.test(it.mime)
const isPdf = (it) => it.mime === 'application/pdf' || ext(it.name) === 'pdf'
const isText = (it) => /^text\//.test(it.mime) || /^(txt|md|json|js|ts|py|css|html|xml|csv|log|sh|yml|yaml|ini|c|cpp|java|go|rs|sql)$/.test(ext(it.name))
const parentOf = (p) => p === '/' ? '/' : '/' + p.split('/').filter(Boolean).slice(0, -1).join('/')
const baseName = (p) => p.split('/').filter(Boolean).pop() || 'Drive'
const join = (a, b) => tg.normPath(a + '/' + b)
const under = (p, root) => p === root || p.startsWith(root === '/' ? '/' : root + '/')

function toast(msg, red) { const t = document.createElement('div'); t.className = 'toast' + (red ? ' red' : ''); t.textContent = msg; $('#toasts').append(t); setTimeout(() => t.remove(), 3200) }
const errMsg = (e) => (e && (e.errorMessage || e.message)) || String(e)

/* ---------- tiny IndexedDB cache for thumbnails ---------- */
const idb = (() => {
  let dbp
  const db = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('telecloud', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) }))
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', mode); const r = fn(t.objectStore('kv')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error) }) }
  return { get: (k) => tx('readonly', (s) => s.get(k)), set: (k, v) => tx('readwrite', (s) => s.put(v, k)) }
})()

/* ---------- state ---------- */
const S = {
  items: [], view: 'drive', path: '/', sel: new Set(), layout: localStorage.getItem('tc.layout') || 'grid',
  sort: localStorage.getItem('tc.sort') || 'name', q: '', loading: true, transfers: [], thumbs: new Map(),
}
const live = () => S.items.filter((i) => !i.d)
function allFolders() {
  const set = new Map()
  for (const it of live()) {
    if (it.kind === 'folder') set.set(it.path, it)
    let p = it.kind === 'folder' ? parentOf(it.path) : it.path
    while (p !== '/') { if (!set.has(p)) set.set(p, null); p = parentOf(p) }
  }
  set.delete('/')
  return set
}
function folderEntries(path) {
  const out = []
  for (const [p, msg] of allFolders()) if (parentOf(p) === path) out.push({ kind: 'folder', path: p, name: baseName(p), id: msg ? msg.id : 'v:' + p, virtual: !msg, date: msg ? msg.date : 0 })
  return out
}
function folderStats(p) { let n = 0, size = 0; for (const it of live()) if (it.kind === 'file' && under(it.path, p)) { n++; size += it.size } return { n, size } }
function sortItems(arr) {
  const k = S.sort
  return arr.sort((a, b) => (a.kind !== b.kind ? (a.kind === 'folder' ? -1 : 1) :
    k === 'date' ? (b.date - a.date) : k === 'size' ? ((b.size || 0) - (a.size || 0)) : a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })))
}
function visible() {
  const q = S.q.trim().toLowerCase()
  if (q) return sortItems([...live().filter((i) => i.kind === 'file' && i.name.toLowerCase().includes(q)), ...[...allFolders().keys()].filter((p) => baseName(p).toLowerCase().includes(q)).map((p) => ({ kind: 'folder', path: p, name: baseName(p), id: 'v:' + p, virtual: true, date: 0 }))])
  if (S.view === 'drive') return sortItems([...folderEntries(S.path), ...live().filter((i) => i.kind === 'file' && i.path === S.path)])
  if (S.view === 'recents') return live().filter((i) => i.kind === 'file').sort((a, b) => b.msg.date - a.msg.date).slice(0, 60)
  if (S.view === 'favorites') return sortItems(live().filter((i) => i.kind === 'file' && i.fav))
  if (S.view === 'trash') return S.items.filter((i) => i.d).sort((a, b) => b.d - a.d)
  if (S.view === 'photos') return live().filter((i) => i.kind === 'file' && (isImg(i) || isVid(i))).sort((a, b) => b.date - a.date)
  return []
}
const byKey = (k) => S._vis.find((i) => key(i) === k)
const key = (i) => String(i.id)

/* ---------- auth screen ---------- */
function authScreen() {
  document.body.innerHTML = `<div id="auth"><div class="auth-card">
    <div style="display:flex;justify-content:center">${logo(64)}</div>
    <h1>TeleCloud</h1><p class="sub">Your private, unlimited cloud — powered by Telegram.</p>
    <div class="seg"><button data-m="qr" class="on">${I.qr} QR code</button><button data-m="phone">${I.phone} Phone number</button></div>
    <div id="am"></div><div class="err" id="aerr"></div>
    <div class="note">Files are stored in a private channel in your own Telegram account. Your login stays only in this browser.</div>
  </div></div><div id="toasts"></div>`
  let cancelQr = false
  const err = (e) => { $('#aerr').textContent = e ? errMsg(e).replace(/_/g, ' ') : '' }
  const done = () => { cancelQr = true; start() }
  const askPassword = async () => {
    cancelQr = true
    const hint = await tg.passwordHint().catch(() => '')
    $('.seg').classList.add('hidden')
    $('#am').innerHTML = `<p class="sub" style="margin:0 0 14px">Two-step verification is on. Enter your cloud password.</p>
      <input class="field" id="pw" type="password" placeholder="Password${hint ? ' (hint: ' + esc(hint) + ')' : ''}" autocomplete="current-password" autofocus>
      <button class="btn primary lg" id="go">Continue</button>`
    const go = async () => { err(); $('#go').disabled = true; try { await tg.checkPassword($('#pw').value); done() } catch (e) { err(e); $('#go').disabled = false } }
    $('#go').onclick = go; $('#pw').onkeydown = (e) => e.key === 'Enter' && go(); $('#pw').focus()
  }
  const qr = async () => {
    cancelQr = false
    $('#am').innerHTML = `<div class="qrbox"><canvas id="qc"></canvas><div class="ql">${I.telegram}</div></div>
      <ol class="steps"><li>Open <b>Telegram</b> on your phone</li><li>Go to <b>Settings → Devices</b></li><li>Tap <b>Link Desktop Device</b> and scan</li></ol>`
    const c = $('#qc')
    try {
      const r = await tg.qrLogin((url) => { if (c.isConnected) QRCode.toCanvas(c, url, { width: 212, margin: 0, errorCorrectionLevel: 'H' }) }, () => cancelQr)
      if (r === 'ok') done(); else if (r === 'password') askPassword()
    } catch (e) { if (!cancelQr) err(e) }
  }
  const phone = () => {
    cancelQr = true
    $('#am').innerHTML = `<input class="field" id="ph" type="tel" placeholder="+880 1XXX XXXXXX" autocomplete="tel" autofocus>
      <button class="btn primary lg" id="go">Send code</button>`
    const send = async () => {
      err(); const num = $('#ph').value.replace(/[^\d+]/g, ''); if (num.length < 8) return err({ message: 'Enter your phone number with country code' })
      $('#go').disabled = true
      try {
        const { phoneCodeHash, isCodeViaApp } = await tg.sendCode(num)
        $('#am').innerHTML = `<p class="sub" style="margin:0 0 14px">We sent a code ${isCodeViaApp ? 'to your <b>Telegram app</b>' : 'by SMS'} for ${esc(num)}.</p>
          <input class="field" id="cd" inputmode="numeric" autocomplete="one-time-code" placeholder="Code" style="text-align:center;letter-spacing:.3em;font-size:20px" autofocus>
          <button class="btn primary lg" id="go">Sign in</button>`
        const signin = async () => {
          err(); $('#go').disabled = true
          try { const r = await tg.signIn(num, phoneCodeHash, $('#cd').value.trim()); r === 'ok' ? done() : askPassword() } catch (e) { err(e); $('#go').disabled = false }
        }
        $('#go').onclick = signin; $('#cd').oninput = (e) => e.target.value.trim().length >= 5 && signin(); $('#cd').focus()
      } catch (e) { err(e); $('#go').disabled = false }
    }
    $('#go').onclick = send; $('#ph').onkeydown = (e) => e.key === 'Enter' && send(); $('#ph').focus()
  }
  document.querySelectorAll('.seg button').forEach((b) => b.onclick = () => {
    document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); err()
    b.dataset.m === 'qr' ? qr() : phone()
  })
  qr()
}

/* ---------- app shell ---------- */
const NAV = [['recents', 'Recents', I.clock], ['drive', 'TeleCloud Drive', I.drive], ['photos', 'Photos', I.photo], ['favorites', 'Favorites', I.star], ['trash', 'Recently Deleted', I.trash]]
function shell() {
  const name = [tg.me.firstName, tg.me.lastName].filter(Boolean).join(' ') || tg.me.username || 'You'
  document.body.innerHTML = `<div id="app">
    <aside class="sidebar" id="side">
      <div class="brand">${logo(30)} TeleCloud</div>
      <nav class="nav" id="nav">${NAV.map(([k, l, ic]) => `<button data-v="${k}">${ic}<span>${l}</span><span class="count" data-c="${k}"></span></button>`).join('')}</nav>
      <div class="side-foot">
        <div class="meta-s"><b id="used" style="color:var(--t)">0 B</b> used · Unlimited</div>
        <div class="meter"><i id="meter" style="width:3%"></i></div>
        <div class="meta-s" id="cnt"></div>
        <div class="acct"><div class="avatar">${esc((name[0] || 'T').toUpperCase())}</div><div style="min-width:0;flex:1"><div class="nm">${esc(name)}</div><div class="meta-s">${tg.me.username ? '@' + esc(tg.me.username) : 'Telegram'}</div></div>
        <button class="iconbtn" id="logout" title="Sign out">${I.logout}</button></div>
      </div>
    </aside>
    <main>
      <header class="topbar">
        <button class="iconbtn menu-btn" id="menu">${I.menu}</button>
        <div class="crumbs" id="crumbs"></div>
        <label class="search">${I.search}<input id="q" placeholder="Search" autocomplete="off"></label>
        <div class="tools" id="tools">
          <button class="iconbtn hide-m" id="nf" title="New folder">${I.folderPlus}</button>
          <button class="iconbtn" id="sortb" title="Sort">${I.sort}</button>
          <button class="iconbtn hide-m" id="lay" title="Change view"></button>
          <button class="btn primary hide-m" id="up">${I.upload}<span>Upload</span></button>
        </div>
      </header>
      <div class="selbar hidden" id="selbar"></div>
      <section id="content" tabindex="0"></section>
    </main>
  </div>
  <nav class="tabbar">${NAV.filter((n) => n[0] !== 'trash').map(([k, l, ic]) => `<button data-v="${k}">${ic}<span>${l.replace('TeleCloud ', '')}</span></button>`).join('')}<button data-v="trash">${I.trash}<span>Deleted</span></button></nav>
  <button class="fab" id="fab">${I.upload}</button>
  <div id="drop" class="hidden"><div><div class="big">${I.upload}</div><div id="dropt">Drop to upload</div></div></div>
  <div id="transfers" class="hidden"></div><div id="toasts"></div>
  <input type="file" id="fp" multiple class="hidden"><input type="file" id="fdp" webkitdirectory multiple class="hidden">`
  bind()
}

function render() {
  const vis = S._vis = visible()
  document.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', !S.q && b.dataset.v === S.view))
  const tot = live().filter((i) => i.kind === 'file')
  const used = tot.reduce((a, b) => a + b.size, 0)
  $('#used').textContent = fmtSize(used)
  $('#meter').style.width = Math.min(100, 3 + Math.log10(1 + used / 1e6) * 18) + '%'
  $('#cnt').textContent = `${tot.length} item${tot.length === 1 ? '' : 's'}`
  const tc = S.items.filter((i) => i.d).length; $('[data-c="trash"]').textContent = tc || ''
  $('#lay').innerHTML = S.layout === 'grid' ? I.list : I.grid
  // crumbs
  let cr = ''
  if (S.q) cr = `<button class="cur">Results for “${esc(S.q)}”</button>`
  else if (S.view === 'drive') {
    const parts = S.path.split('/').filter(Boolean); let acc = ''
    cr = `<button class="${parts.length ? 'up' : 'cur'}" data-p="/">TeleCloud Drive</button>` + parts.map((p, i) => { acc += '/' + p; return `<span class="sep">${I.chevron}</span><button class="${i === parts.length - 1 ? 'cur' : 'up'}" data-p="${esc(acc)}">${esc(p)}</button>` }).join('')
  } else cr = `<button class="cur">${NAV.find((n) => n[0] === S.view)[1]}</button>`
  $('#crumbs').innerHTML = cr
  $('#nf').classList.toggle('hidden', S.view !== 'drive' || !!S.q)
  // selection bar
  const sel = [...S.sel].map(byKey).filter(Boolean); S.sel = new Set(sel.map(key))
  const sb = $('#selbar')
  if (sel.length) {
    sb.classList.remove('hidden')
    const files = sel.filter((i) => i.kind === 'file')
    sb.innerHTML = S.view === 'trash'
      ? `<span class="grow">${sel.length} selected</span><button class="btn" data-a="restore">${I.restore}<span>Restore</span></button><button class="btn" data-a="purge" style="color:var(--r)">${I.trash}<span>Delete forever</span></button><button class="iconbtn" data-a="clear">${I.x}</button>`
      : `<span class="grow">${sel.length} selected</span>${files.length ? `<button class="btn" data-a="download">${I.download}<span>Download</span></button>` : ''}<button class="btn" data-a="move">${I.move}<span>Move</span></button>${sel.length === 1 ? `<button class="btn" data-a="rename">${I.edit}<span>Rename</span></button>` : ''}${files.length ? `<button class="btn" data-a="fav">${I.star}<span>Favorite</span></button>` : ''}<button class="btn" data-a="delete" style="color:var(--r)">${I.trash}<span>Delete</span></button><button class="iconbtn" data-a="clear">${I.x}</button>`
  } else sb.classList.add('hidden')
  // content
  const c = $('#content'); c.className = S.layout
  if (S.loading && !S.items.length) { c.innerHTML = `<div class="loading"><div style="text-align:center"><div class="spin"></div><div style="margin-top:12px" id="lt">Loading your drive…</div></div></div>`; return }
  if (!vis.length) { c.innerHTML = emptyState(); return }
  if (S.view === 'photos' && !S.q) { c.innerHTML = photosView(vis); loadThumbs(); return }
  if (S.view === 'trash' && !S.q) c.innerHTML = `<div class="section-t" style="display:flex;align-items:center;gap:10px">Items are deleted forever after 30 days.<span style="flex:1"></span><button class="btn ghost" data-a="empty" style="height:30px;color:var(--r)">Empty</button></div>` + list(vis)
  else c.innerHTML = list(vis)
  loadThumbs()
}
function emptyState() {
  const m = {
    drive: [S.path === '/' ? 'Your drive is empty' : 'This folder is empty', 'Drag files here, or use Upload.'],
    recents: ['No recent files', 'Files you upload show up here.'], photos: ['No photos or videos', 'Upload photos and videos to see them here.'],
    favorites: ['No favorites yet', 'Star files to find them quickly.'], trash: ['Nothing in Recently Deleted', 'Deleted items stay here for 30 days.'],
  }[S.q ? 'x' : S.view] || ['No results', 'Try a different search.']
  return `<div class="empty"><div><div style="opacity:.9">${S.view === 'trash' ? `<div style="color:var(--t2)">${I.trash.replace(/18/g, '56')}</div>` : folderIcon(88)}</div><h3>${m[0]}</h3><div>${m[1]}</div>
    ${S.view === 'drive' && !S.q ? `<div class="btns"><button class="btn primary" data-a="upload">${I.upload} Upload files</button><button class="btn ghost" data-a="upfolder">Upload folder</button><button class="btn ghost" data-a="newfolder">${I.folderPlus} New folder</button></div>` : ''}</div></div>`
}
const thumbHTML = (it, cls) => S.thumbs.get(it.id) ? `<img class="${cls}" src="${S.thumbs.get(it.id)}" alt="">` : (it.hasThumb ? `<img class="${cls}" data-th="${it.id}" alt="" style="opacity:0">` : '')
function list(vis) {
  const sub = (it) => it.kind === 'folder' ? (() => { const s = folderStats(it.path); return `${s.n} item${s.n === 1 ? '' : 's'}` })() : fmtSize(it.size)
  const where = (it) => (S.view !== 'drive' || S.q) ? (it.kind === 'file' ? (it.path === '/' ? 'Drive' : baseName(it.path)) : baseName(parentOf(it.path))) : ''
  if (S.layout === 'grid') return `<div class="items">${vis.map((it) => {
    const sel = S.sel.has(key(it)) ? ' sel' : ''
    const th = it.kind === 'file' ? thumbHTML(it, 'th') : ''
    return `<div class="card${sel}" data-k="${esc(key(it))}">${it.fav ? `<span class="fav">${I.starFill}</span>` : ''}
      <div class="ic">${it.kind === 'folder' ? folderIcon(76) : th || fileIcon(it.name, 70)}</div>
      ${it.kind === 'file' && isVid(it) && it.duration ? `<span class="vbadge">${fmtDur(it.duration)}</span>` : ''}
      <div class="nm" title="${esc(it.name)}">${esc(it.name)}</div><div class="sz">${where(it) ? esc(where(it)) + ' · ' : ''}${sub(it)}</div>
      <button class="iconbtn dots" data-menu="${esc(key(it))}">${I.more}</button></div>`
  }).join('')}</div>`
  return `<div class="lhead"><div>Name</div><div>Size</div><div>${S.view === 'trash' ? 'Deleted' : 'Date'}</div><div></div></div><div class="items">${vis.map((it) => {
    const sel = S.sel.has(key(it)) ? ' sel' : ''
    const th = it.kind === 'file' ? thumbHTML(it, '') : ''
    return `<div class="row${sel}" data-k="${esc(key(it))}"><div class="n">${it.kind === 'folder' ? folderIcon(32) : th || fileIcon(it.name, 32)}<span title="${esc(it.name)}">${esc(it.name)}</span>${it.fav ? `<span style="color:#F5B400;display:flex">${I.starFill}</span>` : ''}</div>
      <div class="c">${sub(it)}</div><div class="c">${it.d ? fmtDate(it.d) : it.date ? fmtDate(it.date) : '—'}${where(it) ? ' · ' + esc(where(it)) : ''}</div><button class="iconbtn" data-menu="${esc(key(it))}">${I.more}</button></div>`
  }).join('')}</div>`
}
function photosView(vis) {
  const groups = new Map()
  for (const it of vis) { const d = new Date(it.date * 1000); const k = d.toLocaleDateString([], { month: 'long', year: 'numeric' }); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it) }
  return [...groups].map(([k, arr]) => `<div class="section-t">${k} · ${arr.length}</div><div class="photos">${arr.map((it) => `<div class="ph" data-k="${it.id}">${S.thumbs.get(it.id) ? `<img src="${S.thumbs.get(it.id)}">` : it.hasThumb ? `<img data-th="${it.id}" style="opacity:0">` : `<div style="display:grid;place-items:center;height:100%">${fileIcon(it.name, 48)}</div>`}${isVid(it) ? `<span class="vbadge">${it.duration ? fmtDur(it.duration) : 'VIDEO'}</span>` : ''}</div>`).join('')}</div>`).join('')
}

/* ---------- thumbnails ---------- */
let thumbQ = [], thumbBusy = 0
function loadThumbs() {
  const imgs = document.querySelectorAll('img[data-th]')
  if (!('IntersectionObserver' in window)) return
  const io = loadThumbs.io || (loadThumbs.io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { loadThumbs.io.unobserve(e.target); queueThumb(+e.target.dataset.th) } }), { root: $('#content'), rootMargin: '300px' }))
  imgs.forEach((i) => io.observe(i))
}
function queueThumb(id) { if (S.thumbs.has(id) || thumbQ.includes(id)) return; thumbQ.push(id); pumpThumbs() }
async function pumpThumbs() {
  while (thumbBusy < 4 && thumbQ.length) {
    const id = thumbQ.shift(); thumbBusy++
    ;(async () => {
      try {
        let blob = await idb.get('th:' + id).catch(() => null)
        if (!blob) { const it = S.items.find((i) => i.id === id); if (it) { blob = await tg.downloadThumb(it); if (blob) idb.set('th:' + id, blob).catch(() => {}) } }
        if (blob) { const u = URL.createObjectURL(blob); S.thumbs.set(id, u); document.querySelectorAll(`img[data-th="${id}"]`).forEach((im) => { im.src = u; im.style.opacity = 1; im.style.transition = 'opacity .2s'; im.removeAttribute('data-th') }) }
      } catch {} finally { thumbBusy--; pumpThumbs() }
    })()
  }
}
async function makeThumb(file) {
  try {
    if (/^image\/(jpeg|png|webp|gif|bmp|avif)/.test(file.type)) {
      const bmp = await createImageBitmap(file); return { thumb: await toJpeg(bmp, bmp.width, bmp.height) }
    }
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

/* ---------- transfers ---------- */
function renderTransfers() {
  const box = $('#transfers'); if (!box) return
  if (!S.transfers.length) { box.classList.add('hidden'); return }
  box.classList.remove('hidden')
  const act = S.transfers.filter((t) => t.state === 'run' || t.state === 'wait')
  box.innerHTML = `<div class="th">${act.length ? `<div class="spin" style="width:16px;height:16px;border-width:2px"></div><span class="grow">${S.transfers.some((t) => t.kind === 'up' && t.state !== 'done') ? 'Uploading' : 'Downloading'} ${act.length} item${act.length > 1 ? 's' : ''}</span>` : `<span style="color:var(--g);display:flex">${I.check}</span><span class="grow">All done</span>`}<button class="iconbtn" id="trx">${I.x}</button></div>
  <div class="tl">${S.transfers.slice(-40).reverse().map((t) => `<div class="tr ${t.state}"><div style="width:30px">${fileIcon(t.name, 30)}</div><div class="b"><div class="n">${esc(t.name)}</div>
    <div class="s">${t.state === 'done' ? (t.kind === 'up' ? 'Uploaded' : 'Downloaded') : t.state === 'fail' ? esc(t.err || 'Failed') : t.state === 'wait' ? 'Waiting…' : `${Math.round(t.p * 100)}% · ${fmtSize(t.size)}${t.speed ? ' · ' + fmtSize(t.speed) + '/s' : ''}`}</div>
    ${t.state === 'run' || t.state === 'wait' ? `<div class="prog"><i style="width:${t.p * 100}%"></i></div>` : ''}</div>
    ${t.state === 'run' || t.state === 'wait' ? `<button class="iconbtn" data-cancel="${t.id}">${I.x}</button>` : ''}</div>`).join('')}</div>`
  $('#trx').onclick = () => { S.transfers.forEach((t) => (t.ctl.cancelled = true)); S.transfers = []; renderTransfers() }
  box.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = () => { const t = S.transfers.find((x) => x.id == b.dataset.cancel); if (t) { t.ctl.cancelled = true; t.state = 'fail'; t.err = 'Cancelled'; renderTransfers() } })
}
let trId = 0, upRunning = 0, trTimer
const trRender = () => { clearTimeout(trTimer); trTimer = setTimeout(renderTransfers, 120) }
function track(t, frac, bytes) { const now = performance.now(); if (!t.t0) { t.t0 = now; t.b0 = 0 } if (now - t.t0 > 800) { t.speed = (bytes - t.b0) / ((now - t.t0) / 1000); t.t0 = now; t.b0 = bytes } t.p = frac; trRender() }

function enqueueUploads(entries) {
  // entries: [{file, path}]
  const max = tg.MAX_SIZE()
  for (const { file, path } of entries) {
    if (file.size > max) { toast(`${file.name} is larger than ${fmtSize(max)} (Telegram limit)`, true); continue }
    S.transfers.push({ id: ++trId, kind: 'up', name: file.name, size: file.size, file, path, p: 0, state: 'wait', ctl: {} })
  }
  renderTransfers(); pumpUploads()
}
async function pumpUploads() {
  while (upRunning < 2) {
    const t = S.transfers.find((x) => x.kind === 'up' && x.state === 'wait'); if (!t) return
    t.state = 'run'; upRunning++; renderTransfers()
    ;(async () => {
      try {
        const { thumb, video } = await makeThumb(t.file)
        const it = await tg.uploadFile(t.file, t.path, { onProgress: (f, b) => track(t, f, b), ctl: t.ctl, thumb, video })
        if (it) { S.items.unshift(it); if (thumb) { const u = URL.createObjectURL(thumb); S.thumbs.set(it.id, u); idb.set('th:' + it.id, thumb).catch(() => {}) } }
        t.state = 'done'; t.p = 1; render()
      } catch (e) { if (t.state !== 'fail') { t.state = 'fail'; t.err = errMsg(e) } }
      finally { upRunning--; renderTransfers(); pumpUploads() }
    })()
  }
}
async function download(items) {
  for (const it of items) {
    const t = { id: ++trId, kind: 'down', name: it.name, size: it.size, p: 0, state: 'run', ctl: {} }
    S.transfers.push(t); renderTransfers()
    try {
      if (window.showSaveFilePicker && it.size > 200 * 1024 * 1024 && !it.isPhoto) {
        const h = await window.showSaveFilePicker({ suggestedName: it.name }); const w = await h.createWritable(); let got = 0
        for await (const ch of tg.downloadChunks(it)) { if (t.ctl.cancelled) { await w.abort(); throw new Error('Cancelled') } await w.write(ch); got += ch.length; track(t, got / it.size, got) }
        await w.close()
      } else {
        const blob = await tg.downloadBlob(it, (f, b) => track(t, f, b), t.ctl)
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = it.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000)
      }
      t.state = 'done'; t.p = 1
    } catch (e) { t.state = 'fail'; t.err = e.name === 'AbortError' ? 'Cancelled' : errMsg(e) }
    renderTransfers()
  }
}

/* ---------- modals ---------- */
function modal(html, onMount) {
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = `<div class="modal">${html}</div>`
  document.body.append(bg); const close = () => bg.remove()
  bg.onmousedown = (e) => e.target === bg && close()
  bg.addEventListener('keydown', (e) => e.key === 'Escape' && close())
  onMount && onMount(bg, close); return close
}
function promptBox(title, label, value, okText = 'Save') {
  return new Promise((res) => modal(`<h3>${title}</h3><p>${label}</p><input class="field" id="pv" value="${esc(value)}"><div class="acts"><button class="btn ghost" id="c">Cancel</button><button class="btn primary" id="o">${okText}</button></div>`, (bg, close) => {
    const i = $('#pv', bg); i.focus(); const dot = value.lastIndexOf('.'); i.setSelectionRange(0, dot > 0 ? dot : value.length)
    const ok = () => { const v = i.value.trim().replace(/\//g, '-'); if (!v) return; close(); res(v) }
    $('#o', bg).onclick = ok; i.onkeydown = (e) => e.key === 'Enter' && ok(); $('#c', bg).onclick = () => { close(); res(null) }
  }))
}
function confirmBox(title, text, okText, danger) {
  return new Promise((res) => modal(`<h3>${title}</h3><p>${text}</p><div class="acts"><button class="btn ghost" id="c">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="o">${okText}</button></div>`, (bg, close) => {
    $('#o', bg).onclick = () => { close(); res(true) }; $('#c', bg).onclick = () => { close(); res(false) }; $('#o', bg).focus()
  }))
}
function pickFolder(exclude = []) {
  return new Promise((res) => {
    const paths = ['/', ...[...allFolders().keys()].sort()].filter((p) => !exclude.some((x) => under(p, x)))
    let chosen = S.view === 'drive' ? S.path : '/'
    modal(`<h3>Move to…</h3><p>Choose a destination folder.</p><div class="tree" id="tree">${paths.map((p) => `<button data-p="${esc(p)}" style="padding-left:${8 + (p === '/' ? 0 : p.split('/').length - 1) * 16}px">${folderIcon(22)}<span>${p === '/' ? 'TeleCloud Drive' : esc(baseName(p))}</span></button>`).join('')}</div>
      <div class="acts"><button class="btn ghost" id="c">Cancel</button><button class="btn primary" id="o">Move here</button></div>`, (bg, close) => {
      const mark = () => bg.querySelectorAll('#tree button').forEach((b) => b.classList.toggle('on', b.dataset.p === chosen))
      bg.querySelectorAll('#tree button').forEach((b) => (b.onclick = () => { chosen = b.dataset.p; mark() })); mark()
      $('#o', bg).onclick = () => { close(); res(chosen) }; $('#c', bg).onclick = () => { close(); res(null) }
    })
  })
}

/* ---------- actions ---------- */
async function busy(label, fn) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<span class="spin" style="width:14px;height:14px;border-width:2px;vertical-align:-2px;margin-right:8px"></span>${esc(label)}`
  $('#toasts').append(t)
  try { return await fn() } catch (e) { toast(errMsg(e), true) } finally { t.remove(); render() }
}
async function ensureFolderMsg(path) {
  const f = S.items.find((i) => i.kind === 'folder' && i.path === path && !i.d)
  if (f) return f
  const nf = await tg.createFolder(path); S.items.unshift(nf); return nf
}
async function newFolder() {
  const name = await promptBox('New folder', 'Give your folder a name.', 'Untitled folder', 'Create'); if (!name) return
  let p = join(S.path, name), n = 2; const ex = allFolders(); while (ex.has(p)) p = join(S.path, `${name} ${n++}`)
  await busy('Creating folder…', () => ensureFolderMsg(p))
}
const descendants = (p) => S.items.filter((i) => !i.d && (i.kind === 'file' ? under(i.path, p) : under(i.path, p)))
async function rename(it) {
  const name = await promptBox('Rename', it.kind === 'folder' ? 'Folder name' : 'File name', it.name); if (!name || name === it.name) return
  if (it.kind === 'file') return busy('Renaming…', async () => { it.name = name; await tg.editItem(it) })
  const np = join(parentOf(it.path), name)
  if (allFolders().has(np)) return toast('A folder with that name already exists', true)
  await moveFolder(it.path, np, 'Renaming…')
}
async function moveFolder(from, to, label) {
  await busy(label, async () => {
    const ds = descendants(from)
    if (!ds.some((i) => i.kind === 'folder' && i.path === from)) await tg.createFolder(to).then((f) => S.items.unshift(f))
    for (const i of ds) { i.path = to + i.path.slice(from.length); await tg.editItem(i); if (i.kind === 'folder' && i.path === from) {} }
  })
}
async function moveItems(items) {
  const dest = await pickFolder(items.filter((i) => i.kind === 'folder').map((i) => i.path)); if (dest == null) return
  for (const it of items) {
    if (it.kind === 'file') { if (it.path !== dest) await busy('Moving…', async () => { it.path = dest; await tg.editItem(it) }) }
    else { const np = join(dest, it.name); if (np !== it.path) await moveFolder(it.path, np, 'Moving…') }
  }
  S.sel.clear(); render(); toast('Moved')
}
async function toggleFav(items) {
  const files = items.filter((i) => i.kind === 'file'); const v = !files.every((i) => i.fav)
  await busy(v ? 'Adding to Favorites…' : 'Removing…', async () => { for (const f of files) { f.fav = v; await tg.editItem(f) } })
}
async function trash(items) {
  const now = Math.floor(Date.now() / 1000)
  await busy('Moving to Recently Deleted…', async () => {
    for (const it of items) {
      if (it.kind === 'file') { it.d = now; await tg.editItem(it) }
      else { const ds = descendants(it.path); if (!ds.some((i) => i.kind === 'folder' && i.path === it.path)) { const f = await tg.createFolder(it.path); S.items.unshift(f); ds.push(f) } for (const i of ds) { i.d = now; await tg.editItem(i) } }
    }
  })
  S.sel.clear(); render(); toast(`${items.length} item${items.length > 1 ? 's' : ''} moved to Recently Deleted`)
}
async function restore(items) { await busy('Restoring…', async () => { for (const it of items) { it.d = 0; await tg.editItem(it) } }); S.sel.clear(); render() }
async function purge(items, ask = true) {
  if (ask && !(await confirmBox('Delete forever?', `${items.length} item${items.length > 1 ? 's' : ''} will be permanently deleted from Telegram. This can't be undone.`, 'Delete', true))) return
  await busy('Deleting…', async () => { await tg.deleteIds(items.map((i) => i.id)); const ids = new Set(items.map((i) => i.id)); S.items = S.items.filter((i) => !ids.has(i.id)) })
  S.sel.clear(); render()
}
function act(a, items) {
  if (a === 'download') return download(items.filter((i) => i.kind === 'file'))
  if (a === 'move') return moveItems(items)
  if (a === 'rename') return rename(items[0])
  if (a === 'fav') return toggleFav(items)
  if (a === 'delete') return trash(items)
  if (a === 'restore') return restore(items)
  if (a === 'purge') return purge(items)
  if (a === 'open') return open(items[0])
}
function open(it) {
  if (it.kind === 'folder') { if (it.d) return; S.view = 'drive'; S.path = it.path; S.q = ''; $('#q').value = ''; S.sel.clear(); render(); $('#content').scrollTop = 0; return }
  viewer(it)
}

/* ---------- viewer ---------- */
const blobCache = new Map()
function viewer(it) {
  const list = S._vis.filter((i) => i.kind === 'file' && !i.d)
  let idx = list.indexOf(it); if (idx < 0) { list.push(it); idx = list.length - 1 }
  const el = document.createElement('div'); el.className = 'viewer'; document.body.append(el)
  let ctl = {}
  const close = () => { ctl.cancelled = true; el.remove(); document.removeEventListener('keydown', key) }
  const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
  document.addEventListener('keydown', key)
  const go = (d) => { const n = idx + d; if (n < 0 || n >= list.length) return; idx = n; show() }
  const show = async () => {
    ctl.cancelled = true; ctl = {}
    const f = list[idx]; const my = ctl
    el.innerHTML = `<div class="vt"><button class="iconbtn" id="vx">${I.x}</button><div class="t">${esc(f.name)} <span class="s">· ${fmtSize(f.size)}</span></div>
      <button class="iconbtn" id="vf" title="Favorite">${f.fav ? I.starFill : I.star}</button><button class="iconbtn" id="vd" title="Download">${I.download}</button><button class="iconbtn" id="vt" title="Delete">${I.trash}</button></div>
      <div class="stage" id="vs"></div>`
    $('#vx', el).onclick = close; $('#vd', el).onclick = () => download([f]); $('#vt', el).onclick = () => { close(); trash([f]) }
    $('#vf', el).onclick = async () => { await toggleFav([f]); $('#vf', el).innerHTML = f.fav ? I.starFill : I.star }
    const st = $('#vs', el)
    const nav = () => { if (idx > 0) st.insertAdjacentHTML('beforeend', `<button class="nav-l">${I.left}</button>`); if (idx < list.length - 1) st.insertAdjacentHTML('beforeend', `<button class="nav-r">${I.right}</button>`); const l = $('.nav-l', st), r = $('.nav-r', st); l && (l.onclick = () => go(-1)); r && (r.onclick = () => go(1)) }
    const previewable = isImg(f) || isVid(f) || isAud(f) || isPdf(f) || isText(f)
    const limit = isVid(f) ? 1024 : 200
    if (!previewable || f.size > limit * 1024 * 1024) {
      st.innerHTML = `<div class="info">${fileIcon(f.name, 96)}<div style="margin-top:14px;font-size:16px;color:#fff">${esc(f.name)}</div><div>${fmtSize(f.size)} · ${fmtDate(f.date)}</div><button class="btn primary" style="margin-top:18px" id="vdl">${I.download} Download</button></div>`
      $('#vdl', st).onclick = () => download([f]); nav(); return
    }
    let url = blobCache.get(f.id)
    if (!url) {
      const th = S.thumbs.get(f.id)
      st.innerHTML = `<div class="info">${th ? `<img src="${th}" style="max-width:320px;max-height:320px;filter:blur(2px);opacity:.6;border-radius:8px">` : fileIcon(f.name, 96)}<div class="prog"><i id="vp" style="width:2%"></i></div><div style="margin-top:8px" id="vpt">Loading…</div></div>`
      nav()
      try {
        const blob = await tg.downloadBlob(f, (p, b) => { if (my.cancelled) return; const i = $('#vp', el); if (i) i.style.width = p * 100 + '%'; const tt = $('#vpt', el); if (tt) tt.textContent = `${fmtSize(b)} of ${fmtSize(f.size)}` }, my)
        url = URL.createObjectURL(isPdf(f) ? new Blob([blob], { type: 'application/pdf' }) : blob)
        if (f.size < 300 * 1024 * 1024) blobCache.set(f.id, url)
      } catch (e) { if (!my.cancelled) st.innerHTML = `<div class="info">Couldn't load preview: ${esc(errMsg(e))}</div>`; return }
      if (my.cancelled) return
    }
    if (isImg(f)) st.innerHTML = `<img src="${url}">`
    else if (isVid(f)) st.innerHTML = `<video src="${url}" controls autoplay playsinline></video>`
    else if (isAud(f)) st.innerHTML = `<div class="info">${fileIcon(f.name, 96)}<div style="margin:14px 0">${esc(f.name)}</div><audio src="${url}" controls autoplay></audio></div>`
    else if (isPdf(f)) st.innerHTML = `<iframe src="${url}"></iframe>`
    else { const txt = await (await fetch(url)).text(); st.innerHTML = `<pre>${esc(txt.slice(0, 500000))}</pre>` }
    nav()
  }
  show()
}

/* ---------- context menu ---------- */
function ctxMenu(x, y, items) {
  document.querySelectorAll('.ctx').forEach((e) => e.remove())
  const files = items.filter((i) => i.kind === 'file'); const one = items.length === 1
  const m = document.createElement('div'); m.className = 'ctx'
  const B = (a, ic, l, red) => `<button data-ca="${a}" class="${red ? 'red' : ''}">${ic}${l}</button>`
  m.innerHTML = S.view === 'trash' ? B('restore', I.restore, 'Restore') + B('purge', I.trash, 'Delete forever', 1)
    : (one ? B('open', items[0].kind === 'folder' ? I.drive : I.photo, 'Open') : '') + (files.length ? B('download', I.download, `Download${files.length > 1 ? ' ' + files.length + ' files' : ''}`) : '') + '<hr>' +
      (one ? B('rename', I.edit, 'Rename') : '') + B('move', I.move, 'Move to…') + (files.length ? B('fav', files.every((f) => f.fav) ? I.starFill : I.star, files.every((f) => f.fav) ? 'Remove from Favorites' : 'Add to Favorites') : '') +
      (one && files.length && S.view !== 'drive' ? B('reveal', I.drive, 'Show in folder') : '') + '<hr>' + B('delete', I.trash, 'Delete', 1)
  document.body.append(m)
  const r = m.getBoundingClientRect(); m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px'
  m.onclick = (e) => { const b = e.target.closest('[data-ca]'); if (!b) return; m.remove(); if (b.dataset.ca === 'reveal') { S.view = 'drive'; S.path = items[0].path; S.q = ''; $('#q').value = ''; S.sel = new Set([key(items[0])]); render(); return } act(b.dataset.ca, items) }
  setTimeout(() => document.addEventListener('mousedown', function h(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', h) } }), 0)
}

/* ---------- drag & drop (files + folders) ---------- */
async function collectEntries(dt, base) {
  const out = []
  const walk = async (entry, path) => {
    if (entry.isFile) { const f = await new Promise((r, j) => entry.file(r, j)); out.push({ file: f, path }) }
    else if (entry.isDirectory) {
      const p = join(path, entry.name); out.push({ dir: p })
      const rd = entry.createReader(); let batch
      do { batch = await new Promise((r, j) => rd.readEntries(r, j)); for (const e of batch) await walk(e, p) } while (batch.length)
    }
  }
  const ents = [...dt.items].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean)
  if (ents.length) { for (const e of ents) await walk(e, base) } else for (const f of dt.files) out.push({ file: f, path: base })
  return out
}
async function uploadEntries(list) {
  const dirs = [...new Set(list.filter((x) => x.dir).map((x) => x.dir))]
  const files = list.filter((x) => x.file)
  if (dirs.length) await busy('Creating folders…', async () => { for (const d of dirs) if (!allFolders().has(d)) await ensureFolderMsg(d) })
  if (files.length) enqueueUploads(files)
}

/* ---------- bindings ---------- */
function bind() {
  const go = (v) => { S.view = v; S.path = '/'; S.q = ''; $('#q').value = ''; S.sel.clear(); $('#side').classList.remove('open'); document.querySelector('.scrim')?.remove(); render(); $('#content').scrollTop = 0 }
  document.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => go(b.dataset.v)))
  $('#crumbs').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { S.path = b.dataset.p; S.sel.clear(); render() } }
  let qt; $('#q').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; S.sel.clear(); render() }, 120) }
  $('#lay').onclick = () => { S.layout = S.layout === 'grid' ? 'list' : 'grid'; localStorage.setItem('tc.layout', S.layout); render() }
  $('#sortb').onclick = (e) => {
    document.querySelectorAll('.ctx').forEach((x) => x.remove())
    const m = document.createElement('div'); m.className = 'ctx'
    m.innerHTML = [['name', 'Name'], ['date', 'Date'], ['size', 'Size']].map(([k, l]) => `<button data-s="${k}">${S.sort === k ? I.check : '<span style="width:18px"></span>'}${l}</button>`).join('') + `<hr><button data-l="1">${S.layout === 'grid' ? I.list : I.grid}${S.layout === 'grid' ? 'View as list' : 'View as icons'}</button>`
    document.body.append(m); const r = e.currentTarget.getBoundingClientRect(); m.style.top = r.bottom + 6 + 'px'; m.style.left = Math.min(r.left, innerWidth - 220) + 'px'
    m.onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.s) { S.sort = b.dataset.s; localStorage.setItem('tc.sort', S.sort) } else { S.layout = S.layout === 'grid' ? 'list' : 'grid'; localStorage.setItem('tc.layout', S.layout) } m.remove(); render() }
    setTimeout(() => document.addEventListener('mousedown', function h(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('mousedown', h) } }), 0)
  }
  const pick = () => $('#fp').click()
  const upMenu = (e) => {
    document.querySelectorAll('.ctx').forEach((x) => x.remove())
    const m = document.createElement('div'); m.className = 'ctx'; m.innerHTML = `<button data-u="f">${I.upload}Upload files</button><button data-u="d">${I.drive}Upload folder</button>${S.view === 'drive' ? `<hr><button data-u="n">${I.folderPlus}New folder</button>` : ''}`
    document.body.append(m); const r = e.currentTarget.getBoundingClientRect(), mr = m.getBoundingClientRect()
    m.style.top = (r.bottom + mr.height + 10 > innerHeight ? r.top - mr.height - 8 : r.bottom + 6) + 'px'; m.style.left = Math.max(8, Math.min(r.right - mr.width, innerWidth - mr.width - 8)) + 'px'
    m.onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; m.remove(); b.dataset.u === 'f' ? pick() : b.dataset.u === 'd' ? $('#fdp').click() : newFolder() }
    setTimeout(() => document.addEventListener('mousedown', function h(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('mousedown', h) } }), 0)
  }
  $('#up').onclick = upMenu
  $('#fab').onclick = upMenu
  $('#nf').onclick = newFolder
  const target = () => (S.view === 'drive' ? S.path : '/')
  $('#fp').onchange = (e) => { enqueueUploads([...e.target.files].map((file) => ({ file, path: target() }))); e.target.value = '' }
  $('#fdp').onchange = (e) => {
    const base = target(); const list = []
    for (const f of e.target.files) { const rel = (f.webkitRelativePath || f.name).split('/'); const dir = join(base, rel.slice(0, -1).join('/')); list.push({ file: f, path: dir }); let p = dir; while (p !== base && p !== '/') { list.push({ dir: p }); p = parentOf(p) } }
    uploadEntries(list); e.target.value = ''
  }
  $('#logout').onclick = async () => { if (await confirmBox('Sign out?', 'Your files stay safe in your Telegram account.', 'Sign out')) { await tg.logout(); location.reload() } }
  $('#menu').onclick = () => { $('#side').classList.add('open'); const s = document.createElement('div'); s.className = 'scrim'; s.onclick = () => { $('#side').classList.remove('open'); s.remove() }; document.body.append(s) }

  const c = $('#content')
  let last = null
  c.onclick = (e) => {
    const a = e.target.closest('[data-a]'); if (a) { const v = a.dataset.a; if (v === 'upload') pick(); else if (v === 'upfolder') $('#fdp').click(); else if (v === 'newfolder') newFolder(); else if (v === 'empty') { const t = S.items.filter((i) => i.d); t.length && purge(t) } return }
    const mb = e.target.closest('[data-menu]')
    if (mb) { e.stopPropagation(); const it = byKey(mb.dataset.menu); const items = S.sel.has(key(it)) ? [...S.sel].map(byKey) : [it]; if (!S.sel.has(key(it))) { S.sel = new Set([key(it)]); render() } const r = mb.getBoundingClientRect(); ctxMenu(r.left, r.bottom + 4, items); return }
    const el = e.target.closest('[data-k]')
    if (!el) { if (S.sel.size) { S.sel.clear(); render() } return }
    const k = el.dataset.k, it = byKey(k)
    if (S.view === 'photos' && !S.q) return open(it)
    const touch = matchMedia('(pointer:coarse)').matches
    if (touch && !S.sel.size) return open(it)
    if (e.shiftKey && last) { const ks = S._vis.map(key); const [a1, b1] = [ks.indexOf(last), ks.indexOf(k)].sort((x, y) => x - y); ks.slice(a1, b1 + 1).forEach((x) => S.sel.add(x)) }
    else if (e.metaKey || e.ctrlKey || (touch && S.sel.size)) { S.sel.has(k) ? S.sel.delete(k) : S.sel.add(k) }
    else S.sel = new Set([k])
    last = k; render()
  }
  c.ondblclick = (e) => { const el = e.target.closest('[data-k]'); if (el && S.view !== 'photos') open(byKey(el.dataset.k)) }
  c.oncontextmenu = (e) => {
    const el = e.target.closest('[data-k]'); if (!el) return; e.preventDefault()
    const k = el.dataset.k; if (!S.sel.has(k)) { S.sel = new Set([k]); render() }
    ctxMenu(e.clientX, e.clientY, [...S.sel].map(byKey).filter(Boolean))
  }
  let lp; c.addEventListener('touchstart', (e) => { const el = e.target.closest('[data-k]'); if (!el) return; lp = setTimeout(() => { S.sel.add(el.dataset.k); render(); navigator.vibrate && navigator.vibrate(10) }, 480) }, { passive: true })
  c.addEventListener('touchend', () => clearTimeout(lp)); c.addEventListener('touchmove', () => clearTimeout(lp), { passive: true })
  $('#selbar').onclick = (e) => { const b = e.target.closest('[data-a]'); if (!b) return; const items = [...S.sel].map(byKey).filter(Boolean); if (b.dataset.a === 'clear') { S.sel.clear(); render() } else act(b.dataset.a, items) }
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,.modal,.viewer') || document.querySelector('.viewer,.modal-bg')) return
    const items = [...S.sel].map(byKey).filter(Boolean)
    if ((e.key === 'Delete' || e.key === 'Backspace') && items.length) { e.preventDefault(); S.view === 'trash' ? purge(items) : trash(items) }
    if (e.key === 'Enter' && items.length === 1) open(items[0])
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); S.sel = new Set(S._vis.map(key)); render() }
    if (e.key === 'Escape') { S.sel.clear(); render() }
    if (e.key === '/' ) { e.preventDefault(); $('#q').focus() }
  })
  // drag & drop
  let dc = 0
  const isFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files')
  window.addEventListener('dragenter', (e) => { if (!isFiles(e)) return; e.preventDefault(); dc++; $('#dropt').textContent = `Drop to upload to ${S.view === 'drive' ? baseName(S.path) : 'TeleCloud Drive'}`; $('#drop').classList.remove('hidden') })
  window.addEventListener('dragover', (e) => { if (isFiles(e)) e.preventDefault() })
  window.addEventListener('dragleave', () => { if (--dc <= 0) { dc = 0; $('#drop').classList.add('hidden') } })
  window.addEventListener('drop', async (e) => { if (!isFiles(e)) return; e.preventDefault(); dc = 0; $('#drop').classList.add('hidden'); uploadEntries(await collectEntries(e.dataTransfer, target())) })
  window.addEventListener('beforeunload', (e) => { if (S.transfers.some((t) => t.state === 'run' || t.state === 'wait')) { e.preventDefault(); e.returnValue = '' } })
  // paste to upload
  window.addEventListener('paste', (e) => { if (e.target.closest('input')) return; const fs = [...(e.clipboardData?.files || [])]; if (fs.length) enqueueUploads(fs.map((file) => ({ file, path: target() }))) })
}

/* ---------- boot ---------- */
async function refresh() {
  S.loading = true
  try {
    const items = await tg.listAll((n) => { const l = $('#lt'); if (l) l.textContent = `Loading your drive… ${n} items` })
    const keepThumbs = S.thumbs; S.items = items; S.thumbs = keepThumbs
    // auto-purge trash older than 30 days
    const old = S.items.filter((i) => i.d && Date.now() / 1000 - i.d > 30 * 86400)
    if (old.length) tg.deleteIds(old.map((i) => i.id)).then(() => { const ids = new Set(old.map((i) => i.id)); S.items = S.items.filter((i) => !ids.has(i.id)); render() }).catch(() => {})
  } catch (e) { toast(errMsg(e), true) }
  S.loading = false; render()
}
async function start() {
  try {
    await tg.getMe(); await tg.ensureChannel()
    shell(); render(); await refresh()
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !S.transfers.some((t) => t.state === 'run')) refresh() })
  } catch (e) {
    document.body.innerHTML = `<div class="empty"><div>${logo(56)}<h3>Couldn't connect to Telegram</h3><div>${esc(errMsg(e))}</div><div class="btns"><button class="btn primary" onclick="location.reload()">Try again</button></div></div></div>`
  }
}
;(async () => {
  try { const ok = await tg.initClient(); ok ? start() : authScreen() }
  catch (e) { document.body.innerHTML = `<div class="empty"><div>${logo(56)}<h3>Couldn't connect</h3><div>${esc(errMsg(e))}</div><div class="btns"><button class="btn primary" onclick="location.reload()">Try again</button></div></div></div>` }
})()
