import './style.css'
import QRCode from 'qrcode'
import * as tg from './tg.js'
import * as E from './crypto.js'
import * as cache from './cache.js'
import { I, logo, folderIcon, fileIcon, ext } from './icons.js'

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmtSize = (b) => { if (!b) return '0 B'; const u = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.min(4, Math.floor(Math.log(b) / Math.log(1024))); return (b / 1024 ** i).toFixed(i > 1 ? 1 : 0) + ' ' + u[i] }
const fmtDate = (t) => { const d = new Date(t * 1000), n = new Date(); const same = d.toDateString() === n.toDateString(); return same ? 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' }) }
const fmtFull = (t) => new Date(t * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const fmtDur = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0') }
const fmtEta = (s) => { if (!isFinite(s) || s <= 0) return ''; if (s < 5) return 'A few seconds left'; if (s < 60) return `${Math.round(s)} s left`; if (s < 3600) return `About ${Math.round(s / 60)} min left`; return `About ${(s / 3600).toFixed(1)} h left` }
const isImg = (it) => it.isPhoto || /^image\/(jpeg|png|gif|webp|bmp|svg\+xml|avif)/.test(it.mime) || /^(jpe?g|png|gif|webp|bmp|avif)$/.test(ext(it.name))
const isVid = (it) => /^video\//.test(it.mime) || /^(mp4|webm|mov|m4v|mkv)$/.test(ext(it.name))
const isAud = (it) => /^audio\//.test(it.mime) || /^(mp3|m4a|aac|ogg|opus|wav|flac)$/.test(ext(it.name))
const isPdf = (it) => it.mime === 'application/pdf' || ext(it.name) === 'pdf'
const isText = (it) => /^text\//.test(it.mime) || /^(txt|md|json|js|ts|py|css|html|xml|csv|log|sh|yml|yaml|ini|c|cpp|h|java|go|rs|sql|kt|swift|rb|php|toml)$/.test(ext(it.name))
const parentOf = (p) => p === '/' ? '/' : '/' + p.split('/').filter(Boolean).slice(0, -1).join('/')
const baseName = (p) => p.split('/').filter(Boolean).pop() || 'Drive'
const join = (a, b) => tg.normPath(a + '/' + b)
const under = (p, root) => p === root || p.startsWith(root === '/' ? '/' : root + '/')
const errMsg = (e) => (e && (e.errorMessage || e.message)) || String(e)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const RM = () => document.documentElement.classList.contains('still') || matchMedia('(prefers-reduced-motion: reduce)').matches
const mobile = () => matchMedia('(max-width: 760px)').matches
const touch = () => matchMedia('(pointer:coarse)').matches
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

/* ---------- island notifications ---------- */
function toast(msg, kind = '', ms = 3000) {
  const box = $('#island'); if (!box) return { close() {} }
  const t = document.createElement('div'); t.className = 'isl glass ' + kind
  t.innerHTML = `<span class="isl-ic">${kind === 'red' ? I.info : kind === 'busy' ? '<span class="spin s14"></span>' : kind === 'lock' ? I.lock : I.checkc}</span><span class="isl-t">${esc(msg)}</span>`
  box.append(t)
  const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 380) }
  if (ms) setTimeout(close, ms)
  return { close, set: (m) => { $('.isl-t', t).textContent = m } }
}

/* ---------- state ---------- */
const S = {
  items: [], view: 'recents', cat: 'photos', path: '/', sel: new Set(), layout: localStorage.getItem('tc.layout') || 'grid',
  sort: localStorage.getItem('tc.sort') || 'name', q: '', qtype: 'all', loading: true, transfers: [], thumbs: new Map(), big: new Map(),
  cached: new Map(), fresh: new Set(), anim: true, hist: [], hi: -1, pz: +(localStorage.getItem('tc.pz') || 4),
}
const e2eAuto = () => localStorage.getItem('tc.e2e') === '1'
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
    k === 'date' ? (b.date - a.date) : k === 'size' ? ((b.size || 0) - (a.size || 0)) : k === 'kind' ? (ext(a.name).localeCompare(ext(b.name)) || a.name.localeCompare(b.name)) : a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })))
}
const catOfIt = (i) => cache.catOf(i.mime, i.name)
function visible() {
  const q = S.q.trim().toLowerCase()
  if (q || S.view === 'search') {
    const files = live().filter((i) => i.kind === 'file' && i.name.toLowerCase().includes(q) && (S.qtype === 'all' || catOfIt(i) === S.qtype))
    const folders = S.qtype === 'all' ? [...allFolders().keys()].filter((p) => baseName(p).toLowerCase().includes(q)).map((p) => ({ kind: 'folder', path: p, name: baseName(p), id: 'v:' + p, virtual: true, date: 0 })) : []
    return sortItems([...folders, ...files])
  }
  if (S.view === 'drive') return sortItems([...folderEntries(S.path), ...live().filter((i) => i.kind === 'file' && i.path === S.path)])
  if (S.view === 'recents') return live().filter((i) => i.kind === 'file').sort((a, b) => (b.msg?.date || b.date) - (a.msg?.date || a.date)).slice(0, 60)
  if (S.view === 'favorites') return sortItems(live().filter((i) => i.kind === 'file' && i.fav))
  if (S.view === 'offline') return sortItems(live().filter((i) => i.kind === 'file' && S.cached.has(i.id)))
  if (S.view === 'trash') return S.items.filter((i) => i.d).sort((a, b) => b.d - a.d)
  if (S.view === 'cat') return sortItems(live().filter((i) => i.kind === 'file' && catOfIt(i) === S.cat))
  if (S.view === 'photos') return live().filter((i) => i.kind === 'file' && (isImg(i) || isVid(i))).sort((a, b) => b.date - a.date)
  return []
}
const key = (i) => String(i.id)
const byKey = (k) => (S._vis || []).find((i) => key(i) === k) || S.items.find((i) => key(i) === k)
async function refreshCached() { const l = await cache.list(); S.cached = new Map(l.map((m) => [m.id, m])) }

/* ---------- wallpaper ---------- */
const WALL = '<div class="wall"><i class="w1"></i><i class="w2"></i><i class="w3"></i><i class="w4"></i></div>'

/* ---------- auth screen ---------- */
function authScreen() {
  document.body.innerHTML = `${WALL}<div id="auth">
    <div class="auth-card glass pop-in">
      <div class="auth-logo">${logo(64)}</div>
      <h1>TeleCloud</h1><p class="sub">Unlimited, private cloud storage — powered by your Telegram account.</p>
      <div class="seg glass-inset" id="aseg"><span class="seg-th"></span><button data-m="qr" class="on">${I.qr} QR code</button><button data-m="phone">${I.phone} Phone</button></div>
      <div id="am" class="am"></div><div class="err" id="aerr"></div>
      <div class="feats">
        <div>${I.cloud}<b>Unlimited</b><span>No storage cap</span></div>
        <div>${I.lock}<b>Encrypted</b><span>Optional E2E</span></div>
        <div>${I.device}<b>Everywhere</b><span>Any browser</span></div>
      </div>
    </div>
    <p class="auth-foot">${I.shield} Your login stays in this browser. Files live in a private channel only you can see.</p>
  </div><div id="island"></div>`
  placeSeg($('#aseg'))
  let cancelQr = false
  const err = (e) => { const el = $('#aerr'); el.textContent = e ? errMsg(e).replace(/_/g, ' ') : ''; if (e) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake') } }
  const swapAm = (html) => { const am = $('#am'); am.classList.remove('am-in'); am.innerHTML = html; void am.offsetWidth; am.classList.add('am-in') }
  const done = async () => { cancelQr = true; $('.auth-card').classList.add('pop-out'); await sleep(320); start() }
  const askPassword = async () => {
    cancelQr = true
    const hint = await tg.passwordHint().catch(() => '')
    $('#aseg').classList.add('hidden')
    swapAm(`<p class="sub" style="margin:0 0 14px">Two-step verification is on. Enter your Telegram cloud password.</p>
      <input class="field" id="pw" type="password" placeholder="Password${hint ? ' (hint: ' + esc(hint) + ')' : ''}" autocomplete="current-password" autofocus>
      <button class="btn primary lg" id="go">Continue</button>`)
    const go = async () => { err(); $('#go').disabled = true; $('#go').classList.add('loading'); try { await tg.checkPassword($('#pw').value); done() } catch (e) { err(e); $('#go').disabled = false; $('#go').classList.remove('loading') } }
    $('#go').onclick = go; $('#pw').onkeydown = (e) => e.key === 'Enter' && go(); $('#pw').focus()
  }
  const qr = async () => {
    cancelQr = false
    swapAm(`<div class="qrbox"><canvas id="qc" width="200" height="200"></canvas><div class="qr-sk"></div><div class="ql">${I.telegram}</div></div>
      <ol class="steps"><li>Open <b>Telegram</b> on your phone</li><li>Go to <b>Settings → Devices</b></li><li>Tap <b>Link Desktop Device</b> and scan</li></ol>`)
    const c = $('#qc')
    try {
      const r = await tg.qrLogin((url) => { if (c.isConnected) QRCode.toCanvas(c, url, { width: 200, margin: 0, errorCorrectionLevel: 'H' }, () => c.parentNode && c.parentNode.classList.add('ready')) }, () => cancelQr)
      if (r === 'ok') done(); else if (r === 'password') askPassword()
    } catch (e) { if (!cancelQr) err(e) }
  }
  const phone = () => {
    cancelQr = true
    swapAm(`<input class="field" id="ph" type="tel" placeholder="+880 1XXX XXXXXX" autocomplete="tel" autofocus>
      <button class="btn primary lg" id="go">Send code</button>`)
    const send = async () => {
      err(); const num = $('#ph').value.replace(/[^\d+]/g, ''); if (num.length < 8) return err({ message: 'Enter your phone number with country code' })
      $('#go').disabled = true; $('#go').classList.add('loading')
      try {
        const { phoneCodeHash, isCodeViaApp } = await tg.sendCode(num)
        swapAm(`<p class="sub" style="margin:0 0 14px">We sent a code ${isCodeViaApp ? 'to your <b>Telegram app</b>' : 'by SMS'} for ${esc(num)}.</p>
          <input class="field code" id="cd" inputmode="numeric" autocomplete="one-time-code" placeholder="• • • • •" autofocus>
          <button class="btn primary lg" id="go">Sign in</button>`)
        const signin = async () => {
          err(); $('#go').disabled = true; $('#go').classList.add('loading')
          try { const r = await tg.signIn(num, phoneCodeHash, $('#cd').value.trim()); r === 'ok' ? done() : askPassword() } catch (e) { err(e); $('#go').disabled = false; $('#go').classList.remove('loading') }
        }
        $('#go').onclick = signin; $('#cd').oninput = (e) => e.target.value.trim().length >= 5 && signin(); $('#cd').focus()
      } catch (e) { err(e); $('#go').disabled = false; $('#go').classList.remove('loading') }
    }
    $('#go').onclick = send; $('#ph').onkeydown = (e) => e.key === 'Enter' && send(); $('#ph').focus()
  }
  $$('#aseg button').forEach((b) => b.onclick = () => {
    $$('#aseg button').forEach((x) => x.classList.toggle('on', x === b)); placeSeg($('#aseg')); err()
    b.dataset.m === 'qr' ? qr() : phone()
  })
  qr()
}

/* sliding thumb for segmented controls */
function placeSeg(seg) {
  if (!seg) return
  const th = $('.seg-th', seg), on = $('button.on', seg); if (!th) return
  if (!on) { th.style.opacity = 0; return }
  th.style.opacity = 1; th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft}px)`
}

/* ---------- app shell ---------- */
const NAV = [['recents', 'Home', I.clock], ['drive', 'Drive', I.drive], ['photos', 'Photos', I.photo], ['favorites', 'Favorites', I.star], ['offline', 'On This Device', I.device]]
const NAV2 = [['trash', 'Recently Deleted', I.trash], ['settings', 'Settings', I.gear]]
const TITLES = { recents: 'Home', drive: 'Drive', photos: 'Photos', favorites: 'Favorites', offline: 'On This Device', trash: 'Recently Deleted', settings: 'Settings', search: 'Search', cat: '' }
const CATV = { photos: ['Photos', I.photo, '#2F9BFF'], videos: ['Videos', I.video, '#9B5CF6'], documents: ['Documents', I.doc, '#FF9F0A'], music: ['Music', I.music, '#FF375F'], other: ['Other', I.box, '#30D158'] }
const uname = () => [tg.me.firstName, tg.me.lastName].filter(Boolean).join(' ') || tg.me.username || 'You'
function applyTheme() {
  const t = localStorage.getItem('tc.theme') || 'auto'
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  const h = document.documentElement; h.dataset.theme = dark ? 'dark' : 'light'
  h.classList.toggle('solid', localStorage.getItem('tc.solid') === '1'); h.classList.toggle('still', localStorage.getItem('tc.still') === '1')
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0b0d12' : '#eef2f9'
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)

function shell() {
  const name = uname()
  const navBtn = ([k, l, ic]) => `<button data-v="${k}" draggable="false">${ic}<span>${l}</span><span class="count" data-c="${k}"></span></button>`
  document.body.innerHTML = `${WALL}<div id="app">
    <aside class="sidebar glass" id="side">
      <div class="brand">${logo(28)}<span>TeleCloud</span></div>
      <div class="side-scroll" id="sscroll"><span class="nav-ind"></span>
        <div class="nav-l">Library</div><nav class="nav">${NAV.map(navBtn).join('')}</nav>
        <div class="nav-l">Folders</div><nav class="nav" id="sfold"></nav>
        <div class="nav-l">More</div><nav class="nav">${NAV2.map(navBtn).join('')}</nav>
      </div>
      <div class="side-foot">
        <button class="store-card" data-v="settings" data-sv="1">
          <div class="sc-top"><span class="sc-ic">${I.cloud}</span><div><div class="sc-t">Cloud Storage</div><div class="sc-s"><b id="used">0 B</b> used · Unlimited</div></div></div>
          <div class="sc-bar" id="scbar"></div>
          <div class="sc-s" id="cachel" data-v2="settings" role="button" title="Manage storage" style="cursor:pointer">On this device: …</div>
        </button>
        <div class="acct"><div class="avatar">${esc((name[0] || 'T').toUpperCase())}</div><div style="min-width:0;flex:1"><div class="nm">${esc(name)}</div><div class="meta-s">${tg.me.username ? '@' + esc(tg.me.username) : 'Telegram account'}</div></div>
        <button class="iconbtn" id="logout" title="Sign out">${I.logout}</button></div>
      </div>
    </aside>
    <main id="scroller">
      <header class="topbar glass" id="topbar">
        <div class="navbtns"><button class="iconbtn" id="hb" title="Back">${I.back}</button><button class="iconbtn" id="hf" title="Forward">${I.fwd}</button></div>
        <button class="mback" id="mback">${I.back}<span id="mbackt">Back</span></button>
        <div class="tt"><div class="crumbs" id="crumbs"></div><div class="tsub" id="tsub"></div></div>
        <div class="mtt" id="mtt"></div>
        <label class="search glass-inset" id="searchl">${I.search}<input id="q" placeholder="Search" autocomplete="off" spellcheck="false"><kbd>/</kbd></label>
        <div class="tools" id="tools">
          <div class="seg glass-inset hide-m" id="lay"><span class="seg-th"></span><button data-l="grid" title="Icons">${I.grid}</button><button data-l="list" title="List">${I.list}</button></div>
          <button class="iconbtn" id="sortb" title="Sort & view">${I.sort}</button>
          <button class="iconbtn" id="selb" title="Select">${I.select}</button>
          <button class="btn primary hide-m" id="up">${I.plus}<span>Upload</span></button>
        </div>
      </header>
      <div class="mhead" id="mhead"><h1 id="mbig"></h1><label class="search glass-inset" id="msearchl">${I.search}<input id="mq" placeholder="Search" autocomplete="off"></label></div>
      <div class="filters" id="filters"></div>
      <div class="ptr" id="ptr"><span class="spin s18"></span></div>
      <section id="content" tabindex="-1"></section>
    </main>
  </div>
  <nav class="tabbar glass" id="tabbar"><span class="tab-ind"></span>${[NAV[0], NAV[1], NAV[2], NAV[3], ['settings', 'Settings', I.gear]].map(([k, l, ic]) => `<button data-v="${k}">${ic}<span>${l}</span></button>`).join('')}</nav>
  <button class="fab glass" id="fab" aria-label="Upload">${I.plus}</button>
  <div class="selbar glass" id="selbar"></div>
  <div id="drop"><div class="drop-card glass"><div class="big">${I.upload}</div><div id="dropt">Drop to upload</div><div class="dsub" id="drops">Files and folders go straight to Telegram</div></div></div>
  <div id="transfers"></div><div id="island"></div>
  <input type="file" id="fp" multiple class="hidden"><input type="file" id="fdp" webkitdirectory multiple class="hidden">`
  bind()
}
const catStats = () => { const o = {}; for (const k in CATV) o[k] = { n: 0, size: 0 }; for (const it of live()) if (it.kind === 'file') { const c = catOfIt(it); o[c].n++; o[c].size += it.size } return o }
const cloudBar = (st, total) => Object.entries(st).filter(([, v]) => v.size).map(([k, v]) => `<i style="width:${Math.max(1.5, (v.size / (total || 1)) * 100)}%;background:${CATV[k][2]}"></i>`).join('')
async function updateCacheLabel() { const l = $('#cachel'); if (!l) return; const [m, t] = await Promise.all([cache.list(), cache.thumbStats()]); l.textContent = `On this device: ${fmtSize(m.reduce((a, b) => a + b.size, 0) + t.size)}` }

/* ---------- navigation (with history + animated transitions) ---------- */
const navState = () => ({ view: S.view, path: S.path, cat: S.cat })
function go(st, dir = 'none', push = true) {
  const cur = navState()
  if (st.view === cur.view && (st.path ?? '/') === cur.path && (st.cat ?? S.cat) === cur.cat && !S.q) return
  if (push) { S.hist = S.hist.slice(0, S.hi + 1); S.hist.push({ view: st.view, path: st.path ?? '/', cat: st.cat ?? S.cat }); S.hi = S.hist.length - 1; history.pushState({ hi: S.hi }, '') }
  transition(() => {
    S.view = st.view; S.path = st.path ?? '/'; if (st.cat) S.cat = st.cat
    S.q = ''; $('#q').value = ''; $('#mq').value = ''; S.sel.clear(); S.anim = true
    $('#side').classList.remove('open'); $('.scrim')?.remove()
    render(); $('#scroller').scrollTop = 0
  }, dir)
}
function histGo(d) { const n = S.hi + d; if (n < 0 || n >= S.hist.length) return; S.hi = n; const st = S.hist[n]; transition(() => { Object.assign(S, { view: st.view, path: st.path, cat: st.cat, q: '' }); S.sel.clear(); S.anim = true; render(); $('#scroller').scrollTop = 0 }, d < 0 ? 'back' : 'fwd') }
window.addEventListener('popstate', (e) => {
  if (closeTop()) { history.pushState({ hi: S.hi }, ''); return }
  const hi = e.state && e.state.hi
  if (typeof hi === 'number' && hi !== S.hi) histGo(hi - S.hi)
})
function transition(fn, dir = 'none') {
  document.documentElement.dataset.dir = dir
  if (document.startViewTransition && !RM() && document.visibilityState === 'visible') { try { return document.startViewTransition(fn) } catch {} }
  fn()
}
/* closes the topmost overlay (viewer/modal/menu); returns true if something was closed */
function closeTop() {
  const m = $('.ctx'); if (m) { closeMenu(); return true }
  const md = [...document.querySelectorAll('.modal-bg')].pop(); if (md && md._close) { md._close(); return true }
  const v = $('.viewer'); if (v && v._close) { v._close(); return true }
  return false
}

/* ---------- render ---------- */
function render() {
  const vis = S._vis = S.view === 'settings' ? [] : visible()
  const active = S.q ? '' : S.view === 'cat' ? 'recents' : S.view
  $$('[data-v]').forEach((b) => !b.dataset.sv && b.classList.toggle('on', b.dataset.v === active))
  renderSideFolders()
  requestAnimationFrame(() => { placeInd(); placeSeg($('#lay')) })
  const tot = live().filter((i) => i.kind === 'file')
  const used = tot.reduce((a, b) => a + b.size, 0)
  $('#used').textContent = fmtSize(used)
  $('#scbar').innerHTML = cloudBar(catStats(), used) || '<i style="width:2%;background:var(--a)"></i>'
  const tc = S.items.filter((i) => i.d).length; $('[data-c="trash"]').textContent = tc || ''
  const oc = live().filter((i) => i.kind === 'file' && S.cached.has(i.id)).length; $('[data-c="offline"]').textContent = oc || ''
  $$('#lay button').forEach((b) => b.classList.toggle('on', b.dataset.l === S.layout))
  const settingsV = S.view === 'settings'
  $('#app').dataset.view = S.view
  $('#sortb').classList.toggle('hidden', settingsV || S.view === 'recents' || S.view === 'photos')
  $('#lay').classList.toggle('hidden', settingsV || S.view === 'photos' || S.view === 'recents')
  $('#selb').classList.toggle('hidden', settingsV || !touch())
  $('#hb').disabled = S.hi <= 0; $('#hf').disabled = S.hi >= S.hist.length - 1
  // titles
  let cr = '', title = TITLES[S.view]
  if (S.q) { cr = `<button class="cur">Results for “${esc(S.q)}”</button>`; title = 'Search' }
  else if (S.view === 'drive') {
    const parts = S.path.split('/').filter(Boolean); let acc = ''
    cr = `<button class="${parts.length ? 'up' : 'cur'}" data-p="/" data-drop="/">Drive</button>` + parts.map((p, i) => { acc += '/' + p; return `<span class="sep">${I.chevron}</span><button class="${i === parts.length - 1 ? 'cur' : 'up'}" data-p="${esc(acc)}" data-drop="${esc(acc)}">${esc(p)}</button>` }).join('')
    title = parts.length ? parts[parts.length - 1] : 'Drive'
  } else if (S.view === 'cat') { cr = `<button class="up" data-home="1">Home</button><span class="sep">${I.chevron}</span><button class="cur">${CATV[S.cat][0]}</button>`; title = CATV[S.cat][0] }
  else cr = `<button class="cur">${title}</button>`
  $('#crumbs').innerHTML = cr; $('#mtt').textContent = title; $('#mbig').textContent = title
  // mobile back button
  const backTo = S.q ? null : S.view === 'drive' && S.path !== '/' ? (parentOf(S.path) === '/' ? 'Drive' : baseName(parentOf(S.path))) : S.view === 'cat' ? 'Home' : (S.view === 'trash' || S.view === 'offline') ? 'Settings' : null
  $('#mback').classList.toggle('show', !!backTo); $('#mbackt').textContent = backTo || ''
  const fl = vis.filter((i) => i.kind === 'file'), fo = vis.length - fl.length
  $('#tsub').textContent = settingsV ? 'Storage, encryption & appearance' : S.view === 'recents' && !S.q ? `${tot.length} files · ${fmtSize(used)}` :
    [fo ? `${fo} folder${fo > 1 ? 's' : ''}` : '', `${fl.length} file${fl.length === 1 ? '' : 's'}`, fl.length ? fmtSize(fl.reduce((a, b) => a + b.size, 0)) : ''].filter(Boolean).join(' · ')
  // search filters
  $('#filters').innerHTML = S.q ? `<div class="chips">${[['all', 'All'], ...Object.entries(CATV).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<button data-qt="${k}" class="${S.qtype === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''
  // content
  const c = $('#content'); c.className = S.layout + ' v-' + S.view + (S.anim && !RM() ? ' anim' : '')
  const doAnim = S.anim; S.anim = false
  if (settingsV) { settingsView(); finish(); return }
  if (S.loading && !S.items.length) { c.innerHTML = skeleton(); finish(); return }
  const lockedN = S.items.filter((i) => i.enc && i.locked && !i.d).length
  const lockBanner = lockedN && S.view !== 'trash' ? `<div class="banner glass-lite">${I.lock}<span><b>${lockedN} encrypted file${lockedN > 1 ? 's are' : ' is'} locked.</b> Enter your passphrase to see names and previews.</span><button class="btn primary sm" data-a="unlock">Unlock</button></div>` : ''
  if (S.view === 'recents' && !S.q) { c.innerHTML = lockBanner + homeView(vis) }
  else if (!vis.length) c.innerHTML = lockBanner + emptyState()
  else if (S.view === 'photos' && !S.q) c.innerHTML = photosView(vis)
  else if (S.view === 'trash' && !S.q) c.innerHTML = `<div class="banner glass-lite">${I.trash}<span>Items are permanently deleted after 30 days.</span><button class="btn ghost sm red" data-a="empty">Empty</button></div>` + list(vis)
  else if (S.view === 'offline' && !S.q) c.innerHTML = `<div class="banner glass-lite">${I.device}<span>These files are saved on this device and open instantly, even offline. Deleting the cache never touches your cloud.</span>${vis.length ? `<button class="btn glassbtn sm" data-occ="1">${I.broom} Delete All Cache</button>` : ''}</div>` + list(vis)
  else c.innerHTML = lockBanner + list(vis)
  finish()
  function finish() { updateSel(); loadThumbs(); S.fresh.clear(); if (!doAnim) c.classList.remove('anim') }
}
const skeleton = () => `<div class="items skel">${Array.from({ length: 14 }, (_, i) => `<div class="card" style="--i:${i}"><div class="ic"><i class="sk sk-ic"></i></div><i class="sk sk-t"></i><i class="sk sk-s"></i></div>`).join('')}</div>`
function placeInd() {
  const sc = $('#sscroll'), ind = $('.nav-ind', sc || document), on = sc && $('.nav button.on', sc)
  if (ind) { if (!on) ind.style.opacity = 0; else { const r = on.getBoundingClientRect(), p = sc.getBoundingClientRect(); ind.style.opacity = 1; ind.style.height = r.height + 'px'; ind.style.transform = `translateY(${r.top - p.top + sc.scrollTop}px)` } }
  const tb = $('#tabbar'), ti = tb && $('.tab-ind', tb), ton = tb && $('button.on', tb)
  if (ti) { if (!ton) ti.style.opacity = 0; else { ti.style.opacity = 1; ti.style.width = ton.offsetWidth + 'px'; ti.style.transform = `translateX(${ton.offsetLeft}px)` } }
}
function renderSideFolders() {
  const el = $('#sfold'); if (!el) return
  const tops = folderEntries('/').sort((a, b) => a.name.localeCompare(b.name)).slice(0, 12)
  const sig = tops.map((f) => f.path).join('|') + '#' + (S.view === 'drive' ? S.path : '')
  if (el._sig === sig) return; el._sig = sig
  el.innerHTML = tops.length ? tops.map((f) => `<button data-fp="${esc(f.path)}" data-drop="${esc(f.path)}" class="${S.view === 'drive' && under(S.path, f.path) && !S.q ? 'on' : ''}">${folderIcon(18)}<span>${esc(f.name)}</span></button>`).join('') : `<div class="nav-empty">No folders yet</div>`
}
function greet() { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
function ring(parts, total, size = 120, stroke = 12) {
  const R = (size - stroke) / 2, C = 2 * Math.PI * R; let off = 0
  const segs = total ? parts.filter((p) => p.v > 0).map((p) => { const len = Math.max(0.006, p.v / total) * C; const el = `<circle r="${R}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="${p.c}" stroke-width="${stroke}" stroke-dasharray="${Math.max(0.5, len - 3)} ${C}" stroke-dashoffset="${-off}" stroke-linecap="round" class="ring-seg"/>`; off += len; return el }).join('') : ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring"><g transform="rotate(-90 ${size / 2} ${size / 2})"><circle r="${R}" cx="${size / 2}" cy="${size / 2}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>${segs}</g></svg>`
}
function homeView(vis) {
  const st = catStats(), total = Object.values(st).reduce((a, b) => a + b.size, 0)
  const nf = live().filter((i) => i.kind === 'file').length
  return `<div class="hero mat">
      <div class="hero-t"><div class="hello">${greet()}, ${esc(tg.me.firstName || uname())}</div><div class="hsub">${nf ? `You have <b>${nf}</b> file${nf === 1 ? '' : 's'} safely stored in your cloud.` : 'Your cloud is ready. Upload your first file to get started.'}</div>
        <div class="hero-acts"><button class="btn primary" data-a="upload">${I.upload} Upload</button><button class="btn glassbtn" data-a="newfolder-root">${I.folderPlus} New folder</button>${S.items.some((i) => i.enc) || tg.vault ? '' : `<button class="btn glassbtn" data-a="e2e">${I.lock} Turn on encryption</button>`}</div></div>
      <div class="hero-ring">${ring(Object.entries(st).map(([k, v]) => ({ v: v.size, c: CATV[k][2] })), total, 132, 13)}<div class="hr-c"><b>${fmtSize(total)}</b><span>in cloud</span></div></div>
    </div>
    <div class="cats">${Object.entries(CATV).map(([k, [l, ic, col]], i) => `<button class="cat mat" data-cat="${k}" style="--c:${col};--i:${i}"><span class="cat-ic">${ic}</span><span class="cat-n">${l}</span><span class="cat-s">${st[k].n} item${st[k].n === 1 ? '' : 's'} · ${fmtSize(st[k].size)}</span></button>`).join('')}</div>
    <div class="section-h"><span>Recent</span>${vis.length ? `<button class="link" data-v2="drive">Show all ${I.chevron}</button>` : ''}</div>
    ${vis.length ? `<div class="grid">${list(vis.slice(0, 24), true)}</div>` : `<div class="empty sm"><div><div class="empty-ic">${folderIcon(84)}</div><h3>Nothing here yet</h3><div>Drag files anywhere on this page, or tap Upload.</div></div></div>`}
    <div class="quick mobile-only"><button class="mat" data-v2="offline">${I.device}<span>On This Device</span>${I.chevron}</button><button class="mat" data-v2="trash">${I.trash}<span>Recently Deleted</span>${I.chevron}</button></div>`
}
function emptyState() {
  const m = {
    drive: [S.path === '/' ? 'Your drive is empty' : 'This folder is empty', 'Drop files here, or use Upload.'],
    cat: ['Nothing here yet', 'Files of this type will show up here.'], photos: ['No photos or videos', 'Upload photos and videos to see them here.'],
    favorites: ['No favorites yet', 'Mark files with a star to find them quickly.'], trash: ['Recently Deleted is empty', 'Deleted items stay here for 30 days.'],
    offline: ['Nothing saved on this device', 'Choose “Keep on This Device” on any file to open it instantly, even offline.'],
  }[S.q ? 'x' : S.view] || ['No results', 'Try a different search or filter.']
  const ic = S.view === 'trash' ? I.trash : S.view === 'favorites' ? I.star : S.view === 'offline' ? I.device : S.q ? I.search : null
  return `<div class="empty"><div><div class="empty-ic">${ic ? `<span class="big-sym">${ic}</span>` : folderIcon(96)}</div><h3>${m[0]}</h3><div>${m[1]}</div>
    ${S.view === 'drive' && !S.q ? `<div class="btns"><button class="btn primary" data-a="upload">${I.upload} Upload files</button><button class="btn glassbtn" data-a="newfolder">${I.folderPlus} New folder</button></div>` : ''}</div></div>`
}
const thumbHTML = (it, cls) => S.thumbs.get(it.id) ? `<img class="${cls}" src="${S.thumbs.get(it.id)}" alt="" draggable="false">` : (it.hasThumb ? `<img class="${cls} ld" data-th="${it.id}" alt="" draggable="false">` : '')
function badges(it) {
  if (it.kind !== 'file') return ''
  return `${it.enc ? `<span class="bdg lk" title="End-to-end encrypted">${I.lock}</span>` : ''}${S.cached.has(it.id) ? `<span class="bdg dv" title="On this device">${I.checkc}</span>` : ''}`
}
function list(vis, forceGrid) {
  const sub = (it) => it.kind === 'folder' ? (() => { const s = folderStats(it.path); return `${s.n} item${s.n === 1 ? '' : 's'}` })() : fmtSize(it.size)
  const where = (it) => (S.view !== 'drive' || S.q) ? (it.kind === 'file' ? (it.path === '/' ? 'Drive' : baseName(it.path)) : baseName(parentOf(it.path))) : ''
  const icon = (it, sz) => it.kind === 'folder' ? folderIcon(sz) : it.locked ? lockedIcon(sz) : (thumbHTML(it, sz > 40 ? 'th' : 'tl') || fileIcon(it.name, sz * 0.92))
  const dnd = !touch() && S.view !== 'trash'
  if (S.layout === 'grid' || forceGrid) return `<div class="items">${vis.map((it, i) => {
    const cl = (S.sel.has(key(it)) ? ' sel' : '') + (S.fresh.has(it.id) ? ' fresh' : '') + (it.locked ? ' locked' : '')
    return `<div class="card${cl}" data-k="${esc(key(it))}" style="--i:${Math.min(i, 24)}" ${dnd ? 'draggable="true"' : ''} ${it.kind === 'folder' && S.view !== 'trash' ? `data-drop="${esc(it.path)}"` : ''}>
      <div class="ic">${icon(it, 76)}${badges(it)}${it.kind === 'file' && isVid(it) && it.duration ? `<span class="vbadge">${fmtDur(it.duration)}</span>` : ''}</div>
      <div class="nm" title="${esc(it.name)}">${it.fav ? `<span class="fav">${I.starFill}</span>` : ''}${esc(it.name)}</div><div class="sz">${where(it) ? esc(where(it)) + ' · ' : ''}${sub(it)}</div>
      <button class="iconbtn dots" data-menu="${esc(key(it))}" aria-label="More">${I.more}</button></div>`
  }).join('')}</div>`
  return `<div class="lhead"><div>Name</div><div>Size</div><div>${S.view === 'trash' ? 'Deleted' : 'Date'}</div><div></div></div><div class="items rows">${vis.map((it, i) => {
    const cl = (S.sel.has(key(it)) ? ' sel' : '') + (S.fresh.has(it.id) ? ' fresh' : '')
    return `<div class="row${cl}" data-k="${esc(key(it))}" style="--i:${Math.min(i, 24)}" ${dnd ? 'draggable="true"' : ''} ${it.kind === 'folder' && S.view !== 'trash' ? `data-drop="${esc(it.path)}"` : ''}><div class="n"><span class="ri">${icon(it, 30)}</span><span class="rn" title="${esc(it.name)}">${esc(it.name)}</span>${it.fav ? `<span class="fav">${I.starFill}</span>` : ''}${it.enc ? `<span class="rb">${I.lock}</span>` : ''}${S.cached.has(it.id) ? `<span class="rb g">${I.checkc}</span>` : ''}</div>
      <div class="c">${sub(it)}</div><div class="c">${it.d ? fmtDate(it.d) : it.date ? fmtDate(it.date) : '—'}${where(it) ? ' · ' + esc(where(it)) : ''}</div><button class="iconbtn" data-menu="${esc(key(it))}" aria-label="More">${I.more}</button></div>`
  }).join('')}</div>`
}
const lockedIcon = (sz) => `<span class="lockic" style="--s:${sz}px">${I.lock}</span>`
const pcols = () => mobile() ? Math.max(2, S.pz - 1) : S.pz * 2
function photosView(vis) {
  const groups = new Map()
  for (const it of vis) { const d = new Date(it.date * 1000); const k = d.toLocaleDateString([], { month: 'long', year: 'numeric' }); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it) }
  let n = 0
  return `<div class="pz glass" id="pz"><button data-pz="-1">${I.minus}</button><button data-pz="1">${I.plus}</button></div>` + [...groups].map(([k, arr]) => `<div class="section-t"><span class="glass-lite">${k}</span><em>${arr.length} item${arr.length > 1 ? 's' : ''}</em></div><div class="photos" style="--cols:${pcols()}">${arr.map((it) => `<div class="ph${S.sel.has(key(it)) ? ' sel' : ''}" data-k="${it.id}" style="--i:${Math.min(n++, 30)}">${S.thumbs.get(it.id) ? `<img src="${S.thumbs.get(it.id)}" draggable="false">` : it.hasThumb ? `<img data-th="${it.id}" class="ld" draggable="false">` : `<div class="ph-ic">${it.locked ? lockedIcon(40) : fileIcon(it.name, 48)}</div>`}${isVid(it) ? `<span class="vbadge">${I.play}${it.duration ? fmtDur(it.duration) : ''}</span>` : ''}${it.enc ? `<span class="bdg lk">${I.lock}</span>` : ''}${it.fav ? `<span class="phfav">${I.starFill}</span>` : ''}</div>`).join('')}</div>`).join('')
}

/* ---------- selection (no re-render → no flicker) ---------- */
function updateSel() {
  const sel = [...S.sel].map(byKey).filter(Boolean); S.sel = new Set(sel.map(key))
  $$('#content [data-k]').forEach((el) => el.classList.toggle('sel', S.sel.has(el.dataset.k)))
  const sb = $('#selbar'); document.body.classList.toggle('selecting', sel.length > 0)
  if (!sel.length) { sb.classList.remove('show'); return }
  const files = sel.filter((i) => i.kind === 'file' && !i.locked)
  const B = (a, ic, l, cls = '') => `<button class="sb ${cls}" data-a="${a}" title="${l}">${ic}<span>${l}</span></button>`
  const allCached = files.length && files.every((f) => S.cached.get(f.id)?.pin), anyCached = files.some((f) => S.cached.has(f.id))
  sb.innerHTML = `<span class="sb-n"><span><b>${sel.length}</b> selected</span>${files.length ? `<em>${fmtSize(files.reduce((a, b) => a + b.size, 0))}</em>` : ''}</span><span class="sb-div"></span>` + (S.view === 'trash'
    ? B('restore', I.restore, 'Restore') + B('purge', I.trash, 'Delete', 'red')
    : (files.length === 1 && sel.length === 1 ? B('preview', I.eye, 'Preview') : '') + (files.length ? B('download', I.download, 'Download') : '') + (files.length && !allCached ? B('pin', I.offline, 'Keep Offline') : '') + (anyCached ? B('unpin', I.broom, 'Delete Cache') : '') +
      B('move', I.move, 'Move') + (sel.length === 1 && !sel[0].locked ? B('rename', I.edit, 'Rename') : '') + (files.length ? B('fav', files.every((f) => f.fav) ? I.starFill : I.star, 'Favorite') : '') + B('delete', I.trash, 'Delete', 'red')) +
    `<span class="sb-div"></span><button class="sb x" data-a="clear" title="Done">${I.x}</button>`
  sb.classList.add('show')
}

/* ---------- settings: storage usage, cache, encryption, appearance ---------- */
const CS = { sel: new Set(), filter: 'all' }
const KEEP = [[3, '3 days'], [7, '1 week'], [30, '1 month'], [0, 'Forever']]
const MAXS = [[512 * 1024 ** 2, '500 MB'], [1024 ** 3, '1 GB'], [2 * 1024 ** 3, '2 GB'], [5 * 1024 ** 3, '5 GB'], [0, 'No limit']]
const segc = (name, opts, cur) => `<div class="seg glass-inset segc" data-set="${name}"><span class="seg-th"></span>${opts.map(([v, l]) => `<button data-val="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${l}</button>`).join('')}</div>`
const sw = (id, on) => `<label class="sw"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></label>`
async function settingsView() {
  const c = $('#content')
  const [media, th, est] = await Promise.all([cache.list(), cache.thumbStats(), cache.estimate()])
  if (S.view !== 'settings') return
  S.cached = new Map(media.map((m) => [m.id, m]))
  const st = cache.settings()
  const byCat = {}; for (const k in cache.CATS) byCat[k] = { n: 0, size: 0 }
  for (const m of media) { if (!byCat[m.cat]) m.cat = 'other'; byCat[m.cat].n++; byCat[m.cat].size += m.size }
  byCat.thumbs = { n: th.count, size: th.size }
  const total = Object.values(byCat).reduce((a, b) => a + b.size, 0)
  const rows = [...media.map((m) => ({ ...m, key: String(m.id) })), ...(th.count ? [{ key: 'thumbs', id: 'thumbs', name: 'Thumbnails & previews', size: th.size, cat: 'thumbs', used: Date.now(), n: th.count }] : [])].sort((a, b) => b.size - a.size)
  const shown = rows.filter((r) => CS.filter === 'all' || r.cat === CS.filter)
  CS.sel = new Set([...CS.sel].filter((k) => rows.some((r) => r.key === k)))
  const selSize = rows.filter((r) => CS.sel.has(r.key)).reduce((a, b) => a + b.size, 0)
  const allSel = shown.length && shown.every((r) => CS.sel.has(r.key))
  const cloud = catStats(), cloudTotal = Object.values(cloud).reduce((a, b) => a + b.size, 0)
  const theme = localStorage.getItem('tc.theme') || 'auto'
  const quota = est.quota ? `<div class="quota"><div class="q-row"><span>Browser storage used</span><b>${fmtSize(est.usage || 0)} of ${fmtSize(est.quota)}</b></div><div class="prog"><i style="width:${Math.min(100, ((est.usage || 0) / est.quota) * 100)}%"></i></div></div>` : ''
  const v = tg.vault, unl = E.unlocked(), encN = S.items.filter((i) => i.enc).length
  const e2e = !v ? `<div class="e2e-card off"><span class="e2e-ic">${I.lock}</span><div><b>End-to-end encryption is off</b><span>Encrypt files in this browser before they're uploaded. Names, contents and thumbnails become unreadable to anyone without your passphrase — including Telegram.</span></div><button class="btn primary" data-a="e2e">Set up</button></div>`
    : `<div class="e2e-card on ${unl ? '' : 'lk'}"><span class="e2e-ic">${unl ? I.unlock : I.lock}</span><div><b>${unl ? 'Encryption is on · Unlocked on this device' : 'Encryption is on · Locked'}</b><span>${encN} encrypted file${encN === 1 ? '' : 's'} · AES-256 · Your passphrase never leaves this device.</span></div>${unl ? `<button class="btn glassbtn sm" data-a="lockv">${I.lock} Lock</button>` : `<button class="btn primary sm" data-a="unlock">${I.unlock} Unlock</button>`}</div>
      <div class="srow"><div><b>Encrypt new uploads</b><span>When on, every file you upload is end-to-end encrypted.</span></div>${sw('e2eauto', e2eAuto())}</div>
      ${unl ? `<div class="srow"><div><b>Change passphrase</b><span>Existing files stay readable — only the key that protects them is re-wrapped.</span></div><button class="btn glassbtn sm" data-a="e2epass">${I.key} Change</button></div>` : ''}`
  c.innerHTML = `<div class="set">
    <div class="set-h"><h2>Storage Usage</h2><p>Files you download or keep offline are saved on this device so they open instantly. <b>Clearing the cache never deletes anything from your cloud.</b></p></div>
    <div class="panel mat usage">
      <div class="donut-w">${ring(Object.entries(byCat).map(([k, v]) => ({ v: v.size, c: cache.CATS[k].color })), total, 150, 16)}<div class="hr-c"><b>${fmtSize(total)}</b><span>on this device</span></div></div>
      <div class="legend">${Object.entries(byCat).map(([k, v]) => `<button class="lg ${CS.filter === k ? 'on' : ''}" data-f="${k}"><i style="background:${cache.CATS[k].color}"></i><span class="lg-n">${cache.CATS[k].label}</span><span class="lg-c">${v.n}</span><b>${fmtSize(v.size)}</b></button>`).join('')}
        ${quota}</div>
    </div>
    <div class="panel mat cachelist">
      <div class="cl-h">
        <label class="chk"><input type="checkbox" id="csall" ${allSel ? 'checked' : ''}><span></span></label>
        <div class="chips">${[['all', 'All'], ...Object.entries(cache.CATS).map(([k, v]) => [k, v.label])].map(([k, l]) => `<button data-f="${k}" class="${CS.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="cl-b">${shown.length ? shown.map((r, i) => {
        const it = S.items.find((x) => x.id === r.id); const tu = S.thumbs.get(r.id)
        const ic = r.cat === 'thumbs' ? `<span class="ti" style="background:${cache.CATS.thumbs.color}">${I.photo}</span>` : tu ? `<img src="${tu}">` : fileIcon(r.name, 36)
        return `<label class="cr ${CS.sel.has(r.key) ? 'on' : ''}" style="--i:${Math.min(i, 20)}"><span class="chk"><input type="checkbox" data-ck="${esc(r.key)}" ${CS.sel.has(r.key) ? 'checked' : ''}><span></span></span>${ic}
          <span class="cr-b"><span class="cr-n">${esc(it ? it.name : r.name)}${r.pin ? `<em class="pin">${I.offline} Kept offline</em>` : ''}</span><span class="cr-s">${r.cat === 'thumbs' ? `${r.n} small images` : `${cache.CATS[r.cat].label} · used ${fmtDate(r.used / 1000)}${it ? '' : ' · no longer in cloud'}`}</span></span><b>${fmtSize(r.size)}</b><button class="iconbtn crx" data-rm="${esc(r.key)}" title="Delete from this device">${I.trash}</button></label>`
      }).join('') : `<div class="cl-empty">${I.broom}<div>${rows.length ? 'Nothing cached in this category' : 'Nothing is stored on this device'}</div></div>`}</div>
      <div class="cl-f"><span>${CS.sel.size ? `<b>${CS.sel.size}</b> selected · <b>${fmtSize(selSize)}</b>` : 'Select items, or tap 🗑 to delete a cached file from this device'}</span>
        <button class="btn glassbtn sm" id="clrall" ${total ? '' : 'disabled'}>Delete All Cache</button>
        <button class="btn primary sm" id="clrsel" ${CS.sel.size ? '' : 'disabled'}>${I.broom} Delete ${CS.sel.size ? fmtSize(selSize) : 'Selected'}</button></div>
    </div>

    <div class="set-h"><h2>Cache</h2></div>
    <div class="panel mat rows">
      <div class="srow"><div><b>Keep media</b><span>Cached files you haven't used for this long are removed automatically. Files kept offline are never removed.</span></div>${segc('keep', KEEP, st.keep)}</div>
      <div class="srow"><div><b>Maximum cache size</b><span>When full, the least recently used files are removed first.</span></div>${segc('max', MAXS, st.max)}</div>
      <div class="srow"><div><b>Keep downloaded files</b><span>Save a copy of files you download, so the next open is instant.</span></div>${sw('cauto', st.auto)}</div>
      <div class="srow"><div><b>Keep previewed files</b><span>Off: previews stream straight from the cloud and leave nothing behind on this device.</span></div>${sw('cprev', st.prev)}</div>
    </div>

    <div class="set-h"><h2>End-to-End Encryption</h2></div>
    <div class="panel mat rows">${e2e}</div>

    <div class="set-h"><h2>Cloud</h2><p>Stored in the private “TeleCloud Drive” channel in your Telegram account.</p></div>
    <div class="panel mat">
      <div class="cloud-t"><b>${fmtSize(cloudTotal)}</b><span>used · Unlimited</span></div>
      <div class="cbar">${cloudBar(cloud, cloudTotal) || '<i style="width:100%;background:var(--track)"></i>'}</div>
      <div class="cleg">${Object.entries(cloud).map(([k, v]) => `<span><i style="background:${CATV[k][2]}"></i>${CATV[k][0]} <b>${fmtSize(v.size)}</b></span>`).join('')}</div>
    </div>

    <div class="set-h"><h2>Appearance</h2></div>
    <div class="panel mat rows">
      <div class="srow"><div><b>Theme</b><span>Match your system, or choose one.</span></div>${segc('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], theme)}</div>
      <div class="srow"><div><b>Reduce transparency</b><span>Use solid backgrounds instead of glass.</span></div>${sw('solid', localStorage.getItem('tc.solid') === '1')}</div>
      <div class="srow"><div><b>Reduce motion</b><span>Turn off animations and transitions.</span></div>${sw('still', localStorage.getItem('tc.still') === '1')}</div>
      <div class="srow"><div><b>Keyboard shortcuts</b><span>Space to preview, arrows to move, ⌫ to delete and more.</span></div><button class="btn glassbtn sm" data-a="keys">${I.keyboard} Show</button></div>
    </div>

    <div class="set-h mobile-only"><h2>Places</h2></div>
    <div class="panel mat rows mobile-only">
      <button class="srow link-row" data-v2="offline"><div><b>${I.device} On This Device</b></div>${I.chevron}</button>
      <button class="srow link-row" data-v2="trash"><div><b>${I.trash} Recently Deleted</b></div>${I.chevron}</button>
    </div>

    <div class="set-h"><h2>Account</h2></div>
    <div class="panel mat rows">
      <div class="srow"><div class="acc"><div class="avatar lg">${esc((uname()[0] || 'T').toUpperCase())}</div><div><b>${esc(uname())}</b><span>${tg.me.username ? '@' + esc(tg.me.username) : ''}${tg.me.phone ? ' · +' + esc(tg.me.phone) : ''}</span></div></div><button class="btn glassbtn sm red" id="slogout">${I.logout} Sign out</button></div>
      <div class="srow"><div><b>About TeleCloud</b><span>Version 3.0 · Open source · Runs entirely in your browser</span></div><a class="btn glassbtn sm" href="https://github.com/amitsami/TeleCloud-Drive" target="_blank" rel="noopener">${I.github} GitHub</a></div>
    </div>
  </div>`
  $$('.segc', c).forEach(placeSeg)
  c.querySelectorAll('[data-f]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); CS.filter = CS.filter === b.dataset.f && b.classList.contains('lg') ? 'all' : b.dataset.f; settingsView() }))
  c.querySelectorAll('[data-ck]').forEach((i) => (i.onchange = () => { i.checked ? CS.sel.add(i.dataset.ck) : CS.sel.delete(i.dataset.ck); settingsView() }))
  c.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = async (e) => {
    e.preventDefault(); e.stopPropagation(); const k = b.dataset.rm; const r = rows.find((x) => x.key === k)
    b.closest('.cr').classList.add('leaving'); await sleep(260)
    if (k === 'thumbs') { await cache.clearThumbs(); S.thumbs.forEach((u) => URL.revokeObjectURL(u)); S.thumbs.clear() } else { await cache.remove([Number(k)]); dropBlobs([Number(k)]) }
    CS.sel.delete(k); toast(`Deleted ${fmtSize(r ? r.size : 0)} from this device · cloud file is safe`); settingsView(); updateCacheLabel()
  }))
  $('#csall', c).onchange = (e) => { shown.forEach((r) => (e.target.checked ? CS.sel.add(r.key) : CS.sel.delete(r.key))); settingsView() }
  $('#clrsel', c).onclick = async () => {
    const keys = [...CS.sel]; const ids = keys.filter((k) => k !== 'thumbs').map(Number)
    $$('.cr.on', c).forEach((el) => el.classList.add('leaving')); await sleep(260)
    await cache.remove(ids); if (keys.includes('thumbs')) { await cache.clearThumbs(); S.thumbs.forEach((u) => URL.revokeObjectURL(u)); S.thumbs.clear() }
    dropBlobs(ids)
    CS.sel.clear(); toast(`Freed ${fmtSize(selSize)} · your cloud files are untouched`); settingsView(); updateCacheLabel()
  }
  $('#clrall', c).onclick = async () => {
    if (!(await confirmBox('Clear entire cache?', `${fmtSize(total)} of cached files and thumbnails will be removed from this device. Nothing is deleted from your cloud.`, 'Clear cache', true))) return
    $$('.cr', c).forEach((el) => el.classList.add('leaving')); await sleep(260)
    await cache.clearAll(); S.thumbs.forEach((u) => URL.revokeObjectURL(u)); S.thumbs.clear(); dropBlobs()
    CS.sel.clear(); toast('Cache cleared · your cloud files are untouched'); settingsView(); updateCacheLabel()
  }
  c.querySelectorAll('[data-set]').forEach((g) => g.onclick = async (e) => {
    const b = e.target.closest('[data-val]'); if (!b) return; const k = g.dataset.set, val = b.dataset.val
    $$('button', g).forEach((x) => x.classList.toggle('on', x === b)); placeSeg(g)
    if (k === 'theme') { localStorage.setItem('tc.theme', val); themeReveal(e.clientX, e.clientY); return }
    cache.setSettings({ [k]: Number(val) }); const n = await cache.enforce(); if (n) toast(`Removed ${n} old item${n > 1 ? 's' : ''} from this device`)
    setTimeout(() => { settingsView(); updateCacheLabel() }, 260)
  })
  $('#cauto', c).onchange = (e) => cache.setSettings({ auto: e.target.checked })
  $('#cprev', c).onchange = (e) => cache.setSettings({ prev: e.target.checked })
  $('#solid', c).onchange = (e) => { localStorage.setItem('tc.solid', e.target.checked ? '1' : '0'); applyTheme() }
  $('#still', c).onchange = (e) => { localStorage.setItem('tc.still', e.target.checked ? '1' : '0'); applyTheme() }
  const ea = $('#e2eauto', c); if (ea) ea.onchange = async (e) => { if (e.target.checked && !E.unlocked()) { e.target.checked = false; if (await unlockFlow()) { localStorage.setItem('tc.e2e', '1'); settingsView() } return } localStorage.setItem('tc.e2e', e.target.checked ? '1' : '0'); toast(e.target.checked ? 'New uploads will be encrypted' : 'New uploads will not be encrypted', 'lock') }
  $('#slogout', c).onclick = () => $('#logout').click()
}
/* theme change with a circular reveal */
function themeReveal(x, y) {
  if (!document.startViewTransition || RM()) { applyTheme(); return }
  document.documentElement.dataset.dir = 'theme'
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const t = document.startViewTransition(() => applyTheme())
  t.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {})
}

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
        if (!blob) { const it = S.items.find((i) => i.id === id); if (it && !it.locked) { blob = await tg.downloadThumb(it); if (blob) cache.putThumb(id, blob) } }
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
  const k = Math.min(1, 480 / Math.max(w, h)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k))
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
  let encrypt = e2eAuto()
  if (encrypt && !E.unlocked()) { if (!(await unlockFlow('Unlock to upload encrypted files'))) { toast('Upload cancelled — encryption is locked', 'red'); return } }
  let first = null
  for (const { file, path } of entries) {
    if (file.size > max) { toast(`${file.name} is larger than ${fmtSize(max)} (Telegram limit)`, 'red'); continue }
    const t = { id: ++trId, kind: 'up', name: file.name, size: file.size, file, path, p: 0, bytes: 0, state: 'wait', ctl: {}, enc: encrypt }
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
        const it = await tg.uploadFile(t.file, t.path, { onProgress: (f, b) => track(t, f, b), ctl: t.ctl, thumb, video, encrypt: t.enc })
        if (it) { S.items.unshift(it); S.fresh.add(it.id); if (thumb) { const u = URL.createObjectURL(thumb); S.thumbs.set(it.id, u); cache.putThumb(it.id, thumb); it.hasThumb = true } }
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

/* ---------- modals & sheets ---------- */
function modal(html, onMount, cls = '') {
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = `<div class="modal glass ${cls}"><span class="grab"></span>${html}</div>`
  document.body.append(bg); requestAnimationFrame(() => bg.classList.add('in'))
  let closed = false
  const close = () => { if (closed) return; closed = true; bg.classList.remove('in'); bg.classList.add('out'); setTimeout(() => bg.remove(), 340); bg._onclose && bg._onclose() }
  bg._close = close
  bg.onmousedown = (e) => e.target === bg && close()
  bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } })
  // swipe down to dismiss (sheets on phones)
  const md = $('.modal', bg); let y0 = null, dy = 0
  md.addEventListener('touchstart', (e) => { if (md.scrollTop <= 0 && !e.target.closest('input,textarea,.tree')) { y0 = e.touches[0].clientY; dy = 0; md.style.transition = 'none' } }, { passive: true })
  md.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); md.style.transform = `translateY(${dy}px)` }, { passive: true })
  md.addEventListener('touchend', () => { if (y0 == null) return; md.style.transition = ''; md.style.transform = ''; if (dy > 110) close(); y0 = null })
  onMount && onMount(bg, close); return close
}
function promptBox(title, label, value, okText = 'Save') {
  return new Promise((res) => modal(`<h3>${title}</h3><p>${label}</p><input class="field" id="pv" value="${esc(value)}" spellcheck="false"><div class="acts"><button class="btn glassbtn" id="c">Cancel</button><button class="btn primary" id="o">${okText}</button></div>`, (bg, close) => {
    const i = $('#pv', bg); setTimeout(() => { i.focus(); const dot = value.lastIndexOf('.'); i.setSelectionRange(0, dot > 0 ? dot : value.length) }, 60)
    let v = null; bg._onclose = () => res(v)
    const ok = () => { const x = i.value.trim().replace(/\//g, '-'); if (!x) return; v = x; close() }
    $('#o', bg).onclick = ok; i.onkeydown = (e) => e.key === 'Enter' && ok(); $('#c', bg).onclick = close
  }))
}
function confirmBox(title, text, okText, danger) {
  return new Promise((res) => modal(`<h3>${title}</h3><p>${text}</p><div class="acts"><button class="btn glassbtn" id="c">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="o">${okText}</button></div>`, (bg, close) => {
    let v = false; bg._onclose = () => res(v)
    $('#o', bg).onclick = () => { v = true; close() }; $('#c', bg).onclick = close; setTimeout(() => $('#o', bg).focus(), 60)
  }))
}
function pickFolder(exclude = [], title = 'Move to…') {
  return new Promise((res) => {
    const paths = ['/', ...[...allFolders().keys()].sort()].filter((p) => !exclude.some((x) => under(p, x)))
    let chosen = S.view === 'drive' ? S.path : '/'
    modal(`<h3>${title}</h3><p>Choose a destination folder.</p><div class="tree" id="tree">${paths.map((p) => `<button data-p="${esc(p)}" style="padding-left:${10 + (p === '/' ? 0 : p.split('/').length - 1) * 18}px">${p === '/' ? `<span class="tree-root">${I.drive}</span>` : folderIcon(22)}<span>${p === '/' ? 'Drive' : esc(baseName(p))}</span></button>`).join('')}</div>
      <div class="acts"><button class="btn glassbtn" id="nf2">${I.folderPlus}</button><span class="grow"></span><button class="btn glassbtn" id="c">Cancel</button><button class="btn primary" id="o">Move Here</button></div>`, (bg, close) => {
      let v = null; bg._onclose = () => res(v)
      const mark = () => bg.querySelectorAll('#tree button').forEach((b) => b.classList.toggle('on', b.dataset.p === chosen))
      bg.querySelectorAll('#tree button').forEach((b) => (b.onclick = () => { chosen = b.dataset.p; mark() })); mark()
      $('#o', bg).onclick = () => { v = chosen; close() }; $('#c', bg).onclick = close
      $('#nf2', bg).onclick = async () => { const n = await promptBox('New folder', `Inside ${chosen === '/' ? 'Drive' : baseName(chosen)}`, 'Untitled folder', 'Create'); if (!n) return; const p = join(chosen, n); await ensureFolderMsg(p); v = p; close() }
    })
  })
}

/* ---------- encryption flows ---------- */
function strength(p) { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; if (p.length >= 16) s++; return Math.min(4, Math.floor(s * 4 / 6 + (p.length >= 20 ? 1 : 0))) }
function passFields(confirm, rem = true) {
  return `<div class="pf"><input class="field" id="p1" type="password" placeholder="Passphrase" autocomplete="new-password">${confirm ? `<div class="meter"><i></i><i></i><i></i><i></i></div><input class="field" id="p2" type="password" placeholder="Repeat passphrase" autocomplete="new-password">` : ''}
    ${rem ? `<label class="rem">${sw('keep', true)}<span>Remember on this device</span></label>` : ''}</div>`
}
function setupE2E() {
  if (tg.vault) return unlockFlow()
  return new Promise((res) => modal(`<div class="m-ic lockc">${I.lock}</div><h3>Turn on end-to-end encryption</h3>
    <p>Files are encrypted on this device with AES-256 before upload. Only someone with your passphrase can open them — not Telegram, not us.</p>
    ${passFields(true)}
    <div class="warn">${I.info}<span>There is no way to recover a forgotten passphrase. Write it down somewhere safe.</span></div>
    <div class="err" id="perr"></div>
    <div class="acts"><button class="btn glassbtn" id="c">Not now</button><button class="btn primary" id="o">Turn On</button></div>`, (bg, close) => {
    let v = false; bg._onclose = () => res(v)
    const p1 = $('#p1', bg), p2 = $('#p2', bg)
    setTimeout(() => p1.focus(), 60)
    p1.oninput = () => { const s = strength(p1.value); $$('.meter i', bg).forEach((i, n) => { i.className = n < s ? 'on s' + s : '' }) }
    $('#c', bg).onclick = close
    $('#o', bg).onclick = async () => {
      const err = (m) => { const e = $('#perr', bg); e.textContent = m; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake') }
      if (p1.value.length < 8) return err('Use at least 8 characters')
      if (p1.value !== p2.value) return err("Passphrases don't match")
      const b = $('#o', bg); b.disabled = true; b.classList.add('loading')
      try { const rec = await E.createVault(p1.value, $('#keep', bg).checked); await tg.saveVault(rec); localStorage.setItem('tc.e2e', '1'); v = true; close(); toast('Encryption is on — new uploads are end-to-end encrypted', 'lock', 4000); render() }
      catch (e) { err(errMsg(e)); b.disabled = false; b.classList.remove('loading') }
    }
  }))
}
function unlockFlow(title = 'Unlock encrypted files') {
  if (E.unlocked()) return Promise.resolve(true)
  if (!tg.vault) return setupE2E()
  return new Promise((res) => modal(`<div class="m-ic lockc">${I.lock}</div><h3>${title}</h3><p>Enter the passphrase you chose when you turned on encryption.</p>${passFields(false)}<div class="err" id="perr"></div>
    <div class="acts"><button class="btn glassbtn" id="c">Cancel</button><button class="btn primary" id="o">Unlock</button></div>`, (bg, close) => {
    let v = false; bg._onclose = () => res(v)
    const p1 = $('#p1', bg); setTimeout(() => p1.focus(), 60)
    const go = async () => {
      const b = $('#o', bg); b.disabled = true; b.classList.add('loading')
      try { await E.unlock(tg.vault.rec, p1.value, $('#keep', bg).checked); await decryptAll(); v = true; close(); toast('Unlocked', 'lock'); render() }
      catch (e) { const er = $('#perr', bg); er.textContent = errMsg(e); er.classList.remove('shake'); void er.offsetWidth; er.classList.add('shake'); $('.modal', bg).animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 }); b.disabled = false; b.classList.remove('loading'); p1.select() }
    }
    $('#o', bg).onclick = go; p1.onkeydown = (e) => e.key === 'Enter' && go(); $('#c', bg).onclick = close
  }))
}
function changePass() {
  return new Promise((res) => modal(`<div class="m-ic lockc">${I.key}</div><h3>Change passphrase</h3><p>Enter your current passphrase, then a new one.</p>
    <input class="field" id="p0" type="password" placeholder="Current passphrase" autocomplete="current-password">${passFields(true, false)}<div class="err" id="perr"></div>
    <div class="acts"><button class="btn glassbtn" id="c">Cancel</button><button class="btn primary" id="o">Change</button></div>`, (bg, close) => {
    bg._onclose = () => res()
    const p1 = $('#p1', bg); p1.oninput = () => { const s = strength(p1.value); $$('.meter i', bg).forEach((i, n) => { i.className = n < s ? 'on s' + s : '' }) }
    $('#c', bg).onclick = close
    $('#o', bg).onclick = async () => {
      const err = (m) => { $('#perr', bg).textContent = m }
      if (p1.value.length < 8) return err('Use at least 8 characters'); if (p1.value !== $('#p2', bg).value) return err("New passphrases don't match")
      const b = $('#o', bg); b.disabled = true; b.classList.add('loading')
      try { const u = await E.unlock(tg.vault.rec, $('#p0', bg).value, true); await tg.saveVault(await u.rewrap(p1.value)); close(); toast('Passphrase changed', 'lock') }
      catch (e) { err(errMsg(e)); b.disabled = false; b.classList.remove('loading') }
    }
  }))
}
async function decryptAll() {
  if (!E.unlocked()) return
  for (const it of S.items) if (it.enc && it.locked) { try { await tg.openItem(it, tg.thumbMsgs) } catch {} }
}

/* ---------- keyboard shortcuts ---------- */
function showKeys() {
  const K = [['Space', 'Quick preview'], ['Enter', 'Open'], ['← → ↑ ↓', 'Move selection'], ['⌘/Ctrl + A', 'Select all'], ['⌫ / Delete', 'Move to Recently Deleted'], ['⌘/Ctrl + I', 'Get info'], ['/', 'Search'], ['⌘/Ctrl + [ / ]', 'Back / Forward'], ['N', 'New folder'], ['U', 'Upload'], ['Esc', 'Close / clear selection'], ['?', 'This list']]
  modal(`<h3>Keyboard shortcuts</h3><div class="keys">${K.map(([k, l]) => `<div><span>${l}</span><kbd>${k}</kbd></div>`).join('')}</div><div class="acts"><button class="btn primary" id="o">Done</button></div>`, (bg, close) => { $('#o', bg).onclick = close })
}

/* ---------- get info ---------- */
function info(it) {
  const th = S.thumbs.get(it.id)
  const rows = it.kind === 'folder' ? [['Kind', 'Folder'], ['Contains', (() => { const s = folderStats(it.path); return `${s.n} files · ${fmtSize(s.size)}` })()], ['Where', it.path === '/' ? 'Drive' : 'Drive' + parentOf(it.path).replace(/\//g, ' › ').replace(/^ › $/, '')]]
    : [['Kind', (ext(it.name) || 'File').toUpperCase() + (it.mime ? ` · ${it.mime}` : '')], ['Size', `${fmtSize(it.size)} (${it.size.toLocaleString()} bytes)`], ['Where', 'Drive' + (it.path === '/' ? '' : it.path.replace(/\//g, ' › '))], ['Added', fmtFull(it.msg?.date || it.date)], it.duration ? ['Duration', fmtDur(it.duration)] : null,
      ['Encryption', it.enc ? 'End-to-end encrypted (AES-256)' : 'Standard (Telegram cloud)'], ['On this device', S.cached.has(it.id) ? (S.cached.get(it.id).pin ? 'Kept offline' : 'Cached') : 'No — streams from cloud'], ['Telegram message', '#' + it.id]].filter(Boolean)
  modal(`<div class="info-h">${it.kind === 'folder' ? folderIcon(64) : th ? `<img src="${th}">` : fileIcon(it.name, 64)}<div><h3>${esc(it.name)}</h3><p>${it.kind === 'folder' ? 'Folder' : fmtSize(it.size)}</p></div></div>
    <div class="info-t">${rows.map(([a, b]) => `<div><span>${a}</span><b>${esc(b)}</b></div>`).join('')}</div><div class="acts"><button class="btn primary" id="o">Done</button></div>`, (bg, close) => { $('#o', bg).onclick = close })
}

/* ---------- actions ---------- */
async function busy(label, fn) {
  const t = toast(label, 'busy', 0)
  try { return await fn() } catch (e) { toast(errMsg(e), 'red') } finally { t.close(); render() }
}
async function ensureFolderMsg(path) {
  const f = S.items.find((i) => i.kind === 'folder' && i.path === path && !i.d)
  if (f) return f
  const nf = await tg.createFolder(path); S.items.unshift(nf); return nf
}
async function newFolder() {
  if (S.view !== 'drive') go({ view: 'drive', path: '/' }, 'fwd')
  const name = await promptBox('New folder', 'Give your folder a name.', 'Untitled folder', 'Create'); if (!name) return
  let p = join(S.path, name), n = 2; const ex = allFolders(); while (ex.has(p)) p = join(S.path, `${name} ${n++}`)
  await busy('Creating folder…', async () => { const f = await ensureFolderMsg(p); S.fresh.add(f.id) })
}
const descendants = (p) => S.items.filter((i) => !i.d && under(i.path, p))
async function leave(items) {
  if (RM()) return
  const els = items.map(cardOf).filter(Boolean); els.forEach((el) => el.classList.add('leaving'))
  if (els.length) await sleep(260)
}
async function rename(it) {
  if (it.locked && !(await unlockFlow())) return
  const name = await promptBox('Rename', it.kind === 'folder' ? 'Folder name' : 'File name', it.name); if (!name || name === it.name) return
  if (it.kind === 'file') return busy('Renaming…', async () => { it.name = name; await tg.editItem(it) })
  const np = join(parentOf(it.path), name)
  if (allFolders().has(np)) return toast('A folder with that name already exists', 'red')
  await moveFolder(it.path, np, 'Renaming…')
}
async function moveFolder(from, to, label) {
  await busy(label, async () => {
    const ds = descendants(from)
    if (!ds.some((i) => i.kind === 'folder' && i.path === from)) await tg.createFolder(to).then((f) => S.items.unshift(f))
    for (const i of ds) { i.path = to + i.path.slice(from.length); await tg.editItem(i) }
  })
}
async function moveItems(items, dest) {
  if (dest == null) dest = await pickFolder(items.filter((i) => i.kind === 'folder').map((i) => i.path)); if (dest == null) return
  items = items.filter((it) => !(it.kind === 'folder' && under(dest, it.path)))
  const moving = items.filter((it) => (it.kind === 'file' ? it.path !== dest : join(dest, it.name) !== it.path)); if (!moving.length) return
  if (S.view === 'drive') await leave(moving)
  for (const it of moving) {
    if (it.kind === 'file') await busy('Moving…', async () => { it.path = dest; await tg.editItem(it) })
    else await moveFolder(it.path, join(dest, it.name), 'Moving…')
  }
  S.sel.clear(); render(); toast(`Moved ${moving.length} item${moving.length > 1 ? 's' : ''} to ${dest === '/' ? 'Drive' : baseName(dest)}`)
}
async function toggleFav(items) {
  const files = items.filter((i) => i.kind === 'file'); const v = !files.every((i) => i.fav)
  await busy(v ? 'Adding to Favorites…' : 'Removing from Favorites…', async () => { for (const f of files) { f.fav = v; await tg.editItem(f) } })
}
async function trash(items) {
  const now = Math.floor(Date.now() / 1000)
  await leave(items)
  await busy('Moving to Recently Deleted…', async () => {
    for (const it of items) {
      if (it.kind === 'file') { it.d = now; await tg.editItem(it) }
      else { const ds = descendants(it.path); if (!ds.some((i) => i.kind === 'folder' && i.path === it.path)) { const f = await tg.createFolder(it.path); S.items.unshift(f); ds.push(f) } for (const i of ds) { i.d = now; await tg.editItem(i) } }
    }
  })
  S.sel.clear(); render(); toast(`${items.length} item${items.length > 1 ? 's' : ''} moved to Recently Deleted`)
}
async function restore(items) { await leave(items); await busy('Restoring…', async () => { for (const it of items) { it.d = 0; await tg.editItem(it) } }); S.sel.clear(); render(); toast('Restored') }
async function purge(items, ask = true) {
  if (ask && !(await confirmBox('Delete forever?', `${items.length} item${items.length > 1 ? 's' : ''} will be permanently deleted from Telegram. This can't be undone.`, 'Delete', true))) return
  await leave(items)
  await busy('Deleting…', async () => {
    const ids = items.map((i) => i.id).filter((x) => typeof x === 'number')
    const extra = items.map((i) => i.sec && i.sec.th).filter(Boolean)
    await tg.deleteIds([...ids, ...extra]); await cache.remove(ids).catch(() => {})
    const set = new Set(ids); S.items = S.items.filter((i) => !set.has(i.id))
  })
  S.sel.clear(); render()
}
async function share(items) {
  const files = items.filter((i) => i.kind === 'file')
  if (files.some((f) => f.enc) && !(await confirmBox('Send encrypted files?', 'Encrypted files arrive in Saved Messages as unreadable data — they can only be opened here in TeleCloud.', 'Send anyway'))) return
  await busy('Sending to Saved Messages…', () => tg.sendToSaved(files.map((f) => f.id)))
  toast(`Sent to your Saved Messages in Telegram`)
}
function act(a, items, src) {
  if (!items.length) return
  if (a === 'download') return download(items, src)
  if (a === 'pin') return pin(items, true)
  if (a === 'unpin') return pin(items, false)
  if (a === 'move') return moveItems(items)
  if (a === 'rename') return rename(items[0])
  if (a === 'fav') return toggleFav(items)
  if (a === 'delete') return trash(items)
  if (a === 'restore') return restore(items)
  if (a === 'purge') return purge(items)
  if (a === 'open' || a === 'preview') return open(items[0])
  if (a === 'info') return info(items[0])
  if (a === 'share') return share(items)
  if (a === 'reveal') { go({ view: 'drive', path: items[0].path }, 'fwd'); setTimeout(() => { S.sel = new Set([key(items[0])]); updateSel(); cardOf(items[0])?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, 350) }
}
async function open(it) {
  if (!it) return
  if (it.kind === 'folder') { if (it.d) return; go({ view: 'drive', path: it.path }, 'fwd'); return }
  if (it.locked) { if (!(await unlockFlow())) return; render() }
  viewer(it)
}

/* ---------- context menu ---------- */
function closeMenu() { $$('.ctx').forEach((m) => { m.classList.add('out'); setTimeout(() => m.remove(), 160) }) }
function menu(x, y, html, onPick) {
  $$('.ctx').forEach((e) => e.remove())
  const m = document.createElement('div'); m.className = 'ctx glass'; m.innerHTML = html
  document.body.append(m)
  const r = m.getBoundingClientRect(); const left = Math.max(8, Math.min(x, innerWidth - r.width - 8)), top = Math.max(8, Math.min(y, innerHeight - r.height - 8))
  m.style.left = left + 'px'; m.style.top = top + 'px'; m.style.transformOrigin = `${x - left}px ${y - top}px`
  m.onclick = (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; closeMenu(); onPick(b) }
  setTimeout(() => document.addEventListener('pointerdown', function h(e) { if (!m.contains(e.target)) { closeMenu(); document.removeEventListener('pointerdown', h) } }), 0)
  return m
}
function ctxMenu(x, y, items) {
  const files = items.filter((i) => i.kind === 'file'); const one = items.length === 1; const it = items[0]
  const B = (a, ic, l, cls = '', k = '') => `<button data-ca="${a}" class="${cls}">${ic}<span>${l}</span>${k ? `<kbd>${k}</kbd>` : ''}</button>`
  const pinned = files.length && files.every((f) => S.cached.get(f.id)?.pin)
  const html = S.view === 'trash' ? B('restore', I.restore, 'Restore') + '<hr>' + B('purge', I.trash, 'Delete Forever', 'red')
    : (one ? (it.kind === 'folder' ? B('open', I.drive, 'Open', '', '↵') : B('preview', I.eye, 'Quick Preview', '', 'Space')) : '') +
      (files.length ? B('download', I.download, files.length > 1 ? `Download ${files.length} Files` : 'Download') + (pinned ? '' : B('pin', I.offline, 'Keep on This Device')) + (files.some((f) => S.cached.has(f.id)) ? B('unpin', I.broom, 'Delete from This Device') : '') + B('share', I.send, 'Send to Saved Messages') : '') + '<hr>' +
      (one && !it.locked ? B('rename', I.edit, 'Rename') : '') + B('move', I.move, 'Move to…') + (files.length ? B('fav', files.every((f) => f.fav) ? I.starFill : I.star, files.every((f) => f.fav) ? 'Remove from Favorites' : 'Add to Favorites') : '') +
      (one ? B('info', I.info, 'Get Info', '', '⌘I') : '') + (one && files.length && S.view !== 'drive' ? B('reveal', I.drive, 'Show in Folder') : '') + '<hr>' + B('delete', I.trash, 'Delete', 'red', '⌫')
  menu(x, y, html, (b) => act(b.dataset.ca, items, cardOf(it)))
}

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
      <div class="vacts"><button class="iconbtn" id="vfav" title="Favorite"></button><button class="iconbtn" id="vpin" title="Keep on this device">${I.offline}</button><button class="iconbtn hide-s" id="vsh" title="Send to Saved Messages">${I.send}</button><button class="iconbtn" id="vdl" title="Download">${I.download}</button><button class="iconbtn hide-s" id="vinfo" title="Info">${I.info}</button><button class="iconbtn hide-s red" id="vdel" title="Delete">${I.trash}</button></div></div>
    <div class="stage" id="vst"></div>
    <button class="vnav l glass" id="vl">${I.back}</button><button class="vnav r glass" id="vr">${I.fwd}</button>
    <div class="vcount glass" id="vc"></div>`
  let ctl = {}, urlNow = null
  const stage = $('#vst', el)
  const origin = () => { const r = srcEl && srcEl.isConnected ? srcEl.getBoundingClientRect() : null; return r ? `${r.left + r.width / 2}px ${r.top + r.height / 2}px` : '50% 50%' }
  stage.style.transformOrigin = origin()
  requestAnimationFrame(() => el.classList.add('in'))
  const close = () => {
    if (el._closing) return; el._closing = true; ctl.cancelled = true
    const cur = list[idx]; const src = cardOf(cur); if (src) srcEl = src
    stage.style.transformOrigin = origin(); el.classList.remove('in'); el.classList.add('out')
    document.removeEventListener('keydown', onKey)
    setTimeout(() => { el.remove(); if (urlNow && urlNow.startsWith('blob:') && !blobUrls.has(cur.id)) URL.revokeObjectURL(urlNow); streamItems.clear(); ahead.clear() }, 380)
  }
  el._close = close
  const onKey = (e) => { if (document.querySelector('.modal-bg')) return; if (e.key === 'Escape' || (e.key === ' ' && !e.target.closest('video,audio'))) { e.preventDefault(); close() } if (e.key === 'ArrowRight') go2(1); if (e.key === 'ArrowLeft') go2(-1) }
  document.addEventListener('keydown', onKey)
  const go2 = (d) => { const n = idx + d; if (n < 0 || n >= list.length) return; idx = n; stage.dataset.dir = d > 0 ? 'r' : 'l'; show() }
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
        stage.innerHTML = `<div class="code glass"><pre>${lines.map((l) => `<code>${esc(l) || ' '}</code>`).join('')}</pre></div>`; setSub(mode); return
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

/* ---------- drag & drop uploads (files + folders) ---------- */
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
async function uploadEntries(list, from) {
  const dirs = [...new Set(list.filter((x) => x.dir).map((x) => x.dir))]
  const files = list.filter((x) => x.file)
  if (dirs.length) await busy('Creating folders…', async () => { for (const d of dirs) if (!allFolders().has(d)) await ensureFolderMsg(d) })
  if (files.length) enqueueUploads(files, from)
}

/* ---------- bindings ---------- */
function bind() {
  const goV = (v) => go({ view: v, path: '/' }, 'none')
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b && !e.target.closest('#content')) goV(b.dataset.v) })
  $('#sfold').onclick = (e) => { const b = e.target.closest('[data-fp]'); if (b) go({ view: 'drive', path: b.dataset.fp }, 'fwd') }
  $('#hb').onclick = () => histGo(-1); $('#hf').onclick = () => histGo(1)
  $('#mback').onclick = () => {
    if (S.view === 'drive' && S.path !== '/') go({ view: 'drive', path: parentOf(S.path) }, 'back')
    else if (S.view === 'cat') go({ view: 'recents' }, 'back')
    else go({ view: 'settings' }, 'back')
  }
  $('#crumbs').onclick = (e) => { if (e.target.closest('[data-home]')) return go({ view: 'recents' }, 'back'); const b = e.target.closest('[data-p]'); if (b && b.dataset.p !== S.path) go({ view: 'drive', path: b.dataset.p }, 'back') }
  let qt
  const onQ = (v) => { clearTimeout(qt); qt = setTimeout(() => { const was = !!S.q; S.q = v; S.sel.clear(); S.anim = !was; render() }, 140) }
  $('#q').oninput = (e) => { $('#mq').value = e.target.value; onQ(e.target.value) }
  $('#mq').oninput = (e) => { $('#q').value = e.target.value; onQ(e.target.value) }
  $('#filters').onclick = (e) => { const b = e.target.closest('[data-qt]'); if (!b) return; S.qtype = b.dataset.qt; S.anim = true; render() }
  $('#lay').onclick = (e) => { const b = e.target.closest('[data-l]'); if (!b || b.dataset.l === S.layout) return; S.layout = b.dataset.l; localStorage.setItem('tc.layout', S.layout); transition(() => { S.anim = true; render() }); }
  $('#sortb').onclick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    menu(r.left, r.bottom + 8, `<div class="ctx-l">Sort by</div>${[['name', 'Name'], ['date', 'Date Added'], ['size', 'Size'], ['kind', 'Kind']].map(([k, l]) => `<button data-s="${k}">${S.sort === k ? I.check : '<span class="ck0"></span>'}<span>${l}</span></button>`).join('')}<hr><div class="ctx-l">View</div><button data-l="grid">${S.layout === 'grid' ? I.check : '<span class="ck0"></span>'}<span>Icons</span></button><button data-l="list">${S.layout === 'list' ? I.check : '<span class="ck0"></span>'}<span>List</span></button>`,
      (b) => { if (b.dataset.s) { S.sort = b.dataset.s; localStorage.setItem('tc.sort', S.sort) } else { S.layout = b.dataset.l; localStorage.setItem('tc.layout', S.layout) } transition(() => { S.anim = true; render() }) })
  }
  $('#selb').onclick = () => { if (S.sel.size) { S.sel.clear(); updateSel() } else { S.selMode = !S.selMode; document.body.classList.toggle('selmode', S.selMode); toast(S.selMode ? 'Tap items to select them' : 'Selection off', '', 1600) } }
  const pick = () => $('#fp').click()
  let upFrom = null
  const upMenu = (e) => {
    const r = e.currentTarget.getBoundingClientRect(); upFrom = centerOf(e.currentTarget)
    const enc = e2eAuto()
    const m = menu(r.right - 240, r.bottom + 8, `<button data-u="f">${I.upload}<span>Upload Files</span><kbd>U</kbd></button><button data-u="d">${I.drive}<span>Upload Folder</span></button><button data-u="n">${I.folderPlus}<span>New Folder</span><kbd>N</kbd></button><hr><button data-u="e" class="${enc ? 'on' : ''}">${enc ? I.lock : I.unlock}<span>End-to-end encryption</span><em>${enc ? 'On' : 'Off'}</em></button>`,
      async (b) => {
        const u = b.dataset.u
        if (u === 'f') pick(); else if (u === 'd') $('#fdp').click(); else if (u === 'n') newFolder()
        else if (u === 'e') { if (enc) { localStorage.setItem('tc.e2e', '0'); toast('Encryption off for new uploads', 'lock') } else if (!tg.vault) setupE2E(); else if (await unlockFlow()) { localStorage.setItem('tc.e2e', '1'); toast('New uploads will be encrypted', 'lock') } }
      })
    if (r.bottom + m.offsetHeight + 16 > innerHeight) { m.style.top = r.top - m.offsetHeight - 10 + 'px'; m.style.transformOrigin = 'bottom right' }
  }
  $('#up').onclick = upMenu; $('#fab').onclick = upMenu
  const target = () => (S.view === 'drive' ? S.path : '/')
  $('#fp').onchange = (e) => { enqueueUploads([...e.target.files].map((file) => ({ file, path: target() })), upFrom || { x: innerWidth / 2, y: innerHeight / 2 }); e.target.value = '' }
  $('#fdp').onchange = (e) => {
    const base = target(); const list = []
    for (const f of e.target.files) { const rel = (f.webkitRelativePath || f.name).split('/'); const dir = join(base, rel.slice(0, -1).join('/')); list.push({ file: f, path: dir }); let p = dir; while (p !== base && p !== '/') { list.push({ dir: p }); p = parentOf(p) } }
    uploadEntries(list, upFrom); e.target.value = ''
  }
  $('#logout').onclick = async () => { if (await confirmBox('Sign out?', 'Your files stay safe in your Telegram account. Cached files on this device are removed.', 'Sign out', true)) { await cache.clearAll().catch(() => {}); await tg.logout(); location.reload() } }
  bindTransfers()

  const c = $('#content'), sc = $('#scroller')
  let last = null
  $('#cachel') && ($('#cachel').onclick = () => go({ view: 'settings' }, 'fwd'))
  c.onclick = (e) => {
    const a = e.target.closest('[data-a]')
    if (a) { const v = a.dataset.a; if (v === 'upload') { upFrom = centerOf(a); pick() } else if (v === 'newfolder' || v === 'newfolder-root') newFolder(); else if (v === 'empty') { const t = S.items.filter((i) => i.d); t.length && purge(t) } else if (v === 'unlock') unlockFlow(); else if (v === 'e2e') setupE2E().then(() => S.view === 'settings' && settingsView()); else if (v === 'lockv') { E.lock().then(() => { S.items.forEach((i) => { if (i.enc) { i.locked = true; i.name = 'Encrypted file'; S.thumbs.delete(i.id) } }); dropBlobs(); toast('Locked', 'lock'); render() }) } else if (v === 'e2epass') changePass(); else if (v === 'keys') showKeys(); return }
    const pz = e.target.closest('[data-pz]'); if (pz) { S.pz = Math.min(8, Math.max(2, S.pz - +pz.dataset.pz)); localStorage.setItem('tc.pz', S.pz); $$('.photos', c).forEach((p) => p.style.setProperty('--cols', pcols())); return }
    const cb = e.target.closest('[data-cat]'); if (cb) { go({ view: 'cat', cat: cb.dataset.cat }, 'fwd'); return }
    if (e.target.closest('[data-occ]')) { (async () => { const l = await cache.list(); if (!(await confirmBox('Delete all cache?', `${fmtSize(l.reduce((a, b) => a + b.size, 0))} saved on this device will be removed. Your cloud files are not deleted.`, 'Delete cache', true))) return; await cache.clearAll(); S.thumbs.forEach((u) => URL.revokeObjectURL(u)); S.thumbs.clear(); dropBlobs(); S.cached.clear(); toast('Cache deleted · your cloud files are untouched'); updateCacheLabel(); render() })(); return }
    const v2 = e.target.closest('[data-v2]'); if (v2) { go({ view: v2.dataset.v2 }, 'fwd'); return }
    if (S.view === 'settings') return
    const mb = e.target.closest('[data-menu]')
    if (mb) { e.stopPropagation(); const it = byKey(mb.dataset.menu); if (!S.sel.has(key(it))) { S.sel = new Set([key(it)]); updateSel() } const r = mb.getBoundingClientRect(); ctxMenu(r.left, r.bottom + 6, [...S.sel].map(byKey).filter(Boolean)); return }
    const el = e.target.closest('[data-k]')
    if (!el) { if (S.sel.size && !e.target.closest('.banner')) { S.sel.clear(); updateSel() } return }
    const k = el.dataset.k, it = byKey(k)
    const selecting = S.sel.size > 0 || S.selMode
    if ((touch() && !selecting) || (S.view === 'photos' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !selecting)) return open(it)
    if (e.shiftKey && last) { const ks = S._vis.map(key); const [a1, b1] = [ks.indexOf(last), ks.indexOf(k)].sort((x, y) => x - y); ks.slice(a1, b1 + 1).forEach((x) => S.sel.add(x)) }
    else if (e.metaKey || e.ctrlKey || (touch() && selecting)) { S.sel.has(k) ? S.sel.delete(k) : S.sel.add(k) }
    else S.sel = new Set([k])
    last = k; updateSel()
  }
  c.ondblclick = (e) => { const el = e.target.closest('[data-k]'); if (el && !touch()) open(byKey(el.dataset.k)) }
  c.oncontextmenu = (e) => {
    const el = e.target.closest('[data-k]'); if (!el) return; e.preventDefault()
    const k = el.dataset.k; if (!S.sel.has(k)) { S.sel = new Set([k]); updateSel() }
    ctxMenu(e.clientX, e.clientY, [...S.sel].map(byKey).filter(Boolean))
  }
  // long-press on touch → select + haptic + menu
  let lp, lpEl
  c.addEventListener('touchstart', (e) => { const el = e.target.closest('[data-k]'); if (!el) return; lpEl = el; el.classList.add('press'); lp = setTimeout(() => { el.classList.remove('press'); S.sel.add(el.dataset.k); updateSel(); navigator.vibrate && navigator.vibrate(12); const r = el.getBoundingClientRect(); ctxMenu(r.left + 20, r.bottom - 10, [...S.sel].map(byKey).filter(Boolean)) }, 520) }, { passive: true })
  const lpEnd = () => { clearTimeout(lp); lpEl && lpEl.classList.remove('press') }
  c.addEventListener('touchend', lpEnd); c.addEventListener('touchmove', lpEnd, { passive: true })
  $('#selbar').onclick = (e) => { const b = e.target.closest('[data-a]'); if (!b) return; const items = [...S.sel].map(byKey).filter(Boolean); if (b.dataset.a === 'clear') { S.sel.clear(); S.selMode = false; document.body.classList.remove('selmode'); updateSel() } else act(b.dataset.a, items, b) }

  // internal drag & drop: move files into folders
  let dragItems = null
  c.addEventListener('dragstart', (e) => {
    const el = e.target.closest('[data-k]'); if (!el) return
    if (!S.sel.has(el.dataset.k)) { S.sel = new Set([el.dataset.k]); updateSel() }
    dragItems = [...S.sel].map(byKey).filter(Boolean)
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-tc', '1')
    const g = document.createElement('div'); g.className = 'dragghost glass'; g.innerHTML = `${dragItems[0].kind === 'folder' ? folderIcon(34) : fileIcon(dragItems[0].name, 34)}<span>${dragItems.length > 1 ? dragItems.length + ' items' : esc(dragItems[0].name)}</span>`
    document.body.append(g); e.dataTransfer.setDragImage(g, 24, 24); setTimeout(() => g.remove(), 0)
    document.body.classList.add('dragging')
  })
  document.addEventListener('dragend', () => { dragItems = null; document.body.classList.remove('dragging'); $$('.drop-on').forEach((x) => x.classList.remove('drop-on')) })
  document.addEventListener('dragover', (e) => { if (!dragItems) return; const t = e.target.closest('[data-drop]'); $$('.drop-on').forEach((x) => x !== t && x.classList.remove('drop-on')); if (t && !dragItems.some((i) => i.kind === 'folder' && under(t.dataset.drop, i.path))) { e.preventDefault(); t.classList.add('drop-on') } })
  document.addEventListener('drop', (e) => { if (!dragItems) return; const t = e.target.closest('[data-drop]'); if (!t) return; e.preventDefault(); e.stopPropagation(); t.classList.remove('drop-on'); const items = dragItems; dragItems = null; moveItems(items, t.dataset.drop) }, true)

  // keyboard
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,.modal') || document.querySelector('.viewer,.modal-bg')) return
    const items = [...S.sel].map(byKey).filter(Boolean), mod = e.metaKey || e.ctrlKey
    if ((e.key === 'Delete' || e.key === 'Backspace') && items.length) { e.preventDefault(); S.view === 'trash' ? purge(items) : trash(items) }
    else if (e.key === ' ' && items.length === 1) { e.preventDefault(); open(items[0]) }
    else if (e.key === 'Enter' && items.length === 1) open(items[0])
    else if (mod && e.key === 'a') { e.preventDefault(); S.sel = new Set(S._vis.map(key)); updateSel() }
    else if (mod && e.key === 'i' && items.length === 1) { e.preventDefault(); info(items[0]) }
    else if (mod && e.key === '[') { e.preventDefault(); histGo(-1) } else if (mod && e.key === ']') { e.preventDefault(); histGo(1) }
    else if (e.key === 'Escape') { if (S.sel.size) { S.sel.clear(); updateSel() } }
    else if (e.key === '/') { e.preventDefault(); $('#q').focus() }
    else if (e.key === '?') showKeys()
    else if (!mod && e.key.toLowerCase() === 'n' && S.view !== 'settings') newFolder()
    else if (!mod && e.key.toLowerCase() === 'u') { upFrom = centerOf($('#up')); pick() }
    else if (e.key.startsWith('Arrow') && S._vis && S._vis.length) {
      e.preventDefault()
      const ks = S._vis.map(key); let i = last ? ks.indexOf(last) : -1
      const cards = $$('#content [data-k]'); let cols = 1
      if (cards.length > 1 && S.layout === 'grid') { const y0 = cards[0].getBoundingClientRect().top; cols = cards.findIndex((x) => x.getBoundingClientRect().top > y0 + 5); if (cols < 1) cols = cards.length }
      const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: S.layout === 'grid' || S.view === 'photos' ? cols : 1, ArrowUp: S.layout === 'grid' || S.view === 'photos' ? -cols : -1 }[e.key]
      i = Math.max(0, Math.min(ks.length - 1, i < 0 ? 0 : i + d)); last = ks[i]
      if (e.shiftKey) S.sel.add(last); else S.sel = new Set([last]); updateSel()
      $(`#content [data-k="${CSS.escape(last)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })

  // file drop from the computer
  let dc = 0
  const isFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files') && !dragItems
  window.addEventListener('dragenter', (e) => { if (!isFiles(e)) return; e.preventDefault(); dc++; $('#dropt').textContent = `Drop to upload to ${S.view === 'drive' ? baseName(S.path) : 'Drive'}`; $('#drops').textContent = e2eAuto() ? 'Files will be end-to-end encrypted' : 'Files and folders go straight to Telegram'; $('#drop').classList.add('show') })
  window.addEventListener('dragover', (e) => { if (isFiles(e)) e.preventDefault() })
  window.addEventListener('dragleave', () => { if (--dc <= 0) { dc = 0; $('#drop').classList.remove('show') } })
  window.addEventListener('drop', async (e) => { if (!isFiles(e)) return; e.preventDefault(); dc = 0; $('#drop').classList.remove('show'); const from = { x: e.clientX, y: e.clientY }; uploadEntries(await collectEntries(e.dataTransfer, target()), from) })
  window.addEventListener('beforeunload', (e) => { if (S.transfers.some(active)) { e.preventDefault(); e.returnValue = '' } })
  window.addEventListener('paste', (e) => { if (e.target.closest('input')) return; const fs = [...(e.clipboardData?.files || [])]; if (fs.length) enqueueUploads(fs.map((file) => ({ file, path: target() })), { x: innerWidth / 2, y: innerHeight / 2 }) })
  window.addEventListener('resize', () => requestAnimationFrame(() => { placeInd(); $$('.seg').forEach(placeSeg) }))

  // scroll: compact header + pull to refresh on phones
  sc.addEventListener('scroll', () => { document.body.classList.toggle('scrolled', sc.scrollTop > 36) }, { passive: true })
  let py = null, pd = 0
  sc.addEventListener('touchstart', (e) => { if (sc.scrollTop <= 0 && !document.querySelector('.viewer')) { py = e.touches[0].clientY; pd = 0 } }, { passive: true })
  sc.addEventListener('touchmove', (e) => { if (py == null) return; pd = Math.max(0, e.touches[0].clientY - py); if (pd > 0 && sc.scrollTop <= 0) { const k = Math.min(1, pd / 90); $('#ptr').style.transform = `translateY(${Math.min(70, pd * 0.5)}px) rotate(${k * 270}deg)`; $('#ptr').style.opacity = k } }, { passive: true })
  sc.addEventListener('touchend', () => { if (py == null) return; py = null; const p = $('#ptr'); if (pd > 90) { p.classList.add('spinning'); refresh().finally(() => { p.classList.remove('spinning'); p.style.transform = ''; p.style.opacity = 0 }) } else { p.style.transform = ''; p.style.opacity = 0 } })
}

/* ---------- boot ---------- */
async function refresh() {
  S.loading = true
  try {
    const items = await tg.listAll()
    S.items = items
    if (tg.vault && !E.unlocked()) await E.restore(tg.vault.rec.id)
    await decryptAll()
    await refreshCached()
    const old = S.items.filter((i) => i.d && Date.now() / 1000 - i.d > 30 * 86400)
    if (old.length) tg.deleteIds([...old.map((i) => i.id), ...old.map((i) => i.sec && i.sec.th).filter(Boolean)]).then(() => { const ids = new Set(old.map((i) => i.id)); S.items = S.items.filter((i) => !ids.has(i.id)); render() }).catch(() => {})
  } catch (e) { toast(errMsg(e), 'red') }
  S.loading = false; S.anim = true; render()
}
async function start() {
  try {
    await tg.getMe(); await tg.ensureChannel()
    shell(); S.hist = [navState()]; S.hi = 0; history.replaceState({ hi: 0 }, '')
    render(); cache.enforce().finally(updateCacheLabel); setupSW(); await refresh()
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !S.transfers.some(active) && !document.querySelector('.viewer,.modal-bg')) refresh() })
  } catch (e) {
    document.body.innerHTML = `${WALL}<div class="empty"><div>${logo(64)}<h3>Couldn't connect to Telegram</h3><div>${esc(errMsg(e))}</div><div class="btns"><button class="btn primary" onclick="location.reload()">Try again</button></div></div></div>`
  }
}
applyTheme()
;(async () => {
  try { const ok = await tg.initClient(); ok ? start() : authScreen() }
  catch (e) { document.body.innerHTML = `${WALL}<div class="empty"><div>${logo(64)}<h3>Couldn't connect</h3><div>${esc(errMsg(e))}</div><div class="btns"><button class="btn primary" onclick="location.reload()">Try again</button></div></div></div>` }
})()
