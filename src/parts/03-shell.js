
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
