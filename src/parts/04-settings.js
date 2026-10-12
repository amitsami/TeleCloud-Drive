
/* ---------- settings: storage usage, cache, encryption, appearance ---------- */
const CS = { sel: new Set(), filter: 'all' }
const KEEP = [[3, '3 days'], [7, '1 week'], [30, '1 month'], [0, 'Forever']]
const MAXS = [[512 * 1024 ** 2, '500 MB'], [1024 ** 3, '1 GB'], [2 * 1024 ** 3, '2 GB'], [5 * 1024 ** 3, '5 GB'], [0, 'No limit']]
const segc = (name, opts, cur) => `<div class="seg glass-inset segc" data-set="${name}"><span class="seg-th"></span>${opts.map(([v, l]) => `<button data-val="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${l}</button>`).join('')}</div>`
const sw = (id, on) => `<label class="sw"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></label>`
async function settingsView() {
  const c = $('#content')
  const [media, th, est, pst] = await Promise.all([cache.list(), cache.thumbStats(), cache.storageDetails(), cache.persisted()])
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
  const oth = Math.max(0, est.usage - (est.idb ?? total) - (est.caches || 0))
  const quota = `<div class="quota"><div class="q-row"><span>Browser storage used</span><b>${fmtSize(est.usage)}${est.quota ? ` of ${fmtSize(est.quota)}` : ''}</b></div><div class="prog"><i style="width:${est.quota ? Math.max(1, Math.min(100, (est.usage / est.quota) * 100)) : 0}%"></i></div>
    <div class="q-det"><span><i style="background:#34A3F5"></i>Cached files ${fmtSize(est.idb ?? total)}</span><span><i style="background:#8B5CF6"></i>App files ${fmtSize(est.caches || 0)}</span>${oth > 1024 ? `<span title="Space the browser itself reserves for this site: your sign-in, settings and database files. It can't be cleared without signing out."><i style="background:#94A3B8"></i>Browser overhead ${fmtSize(oth)} ${I.info}</span>` : ''}</div>
    ${oth > 1024 && total === 0 && !(est.caches > 0) ? `<div class="q-note">${I.info}<span>Your cache is empty. The remaining ${fmtSize(oth)} is the browser’s own bookkeeping for this site (sign-in, settings, empty databases). Safari reports this as used space; it can only be removed by signing out and clearing website data.</span></div>` : ''}
    <button class="btn glassbtn sm q-wipe" id="bwipe">${I.broom} Clean Up Browser Storage</button></div>`
  const v = tg.vault, unl = E.unlocked(), encN = itemsOf('').filter((i) => i.enc).length
  const e2e = !v ? `<div class="e2e-card off"><span class="e2e-ic">${I.shieldLock}</span><div><b>End-to-end encryption is off</b><span>Encrypt files in this browser before they're uploaded. Names, contents and thumbnails become unreadable to anyone without your passphrase — including Telegram.</span></div><button class="btn primary" data-a="e2e">Set up</button></div>`
    : `<div class="e2e-card on ${unl ? '' : 'lk'}"><span class="e2e-ic">${unl ? I.shield : I.shieldLock}</span><div><b>${unl ? 'Encryption is on · Unlocked on this device' : 'Encryption is on · Locked'}</b><span>${encN} encrypted file${encN === 1 ? '' : 's'} · AES-256 · Your passphrase never leaves this device.</span></div>${unl ? `<button class="btn glassbtn sm" data-a="lockv">${I.lock} Lock</button>` : `<button class="btn primary sm" data-a="unlock">${I.unlock} Unlock</button>`}</div>
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
        const it = findItem(r.id); const tu = S.thumbs.get(r.id)
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
      <div class="srow"><div><b>Protect from browser cleanup</b><span>Ask the browser not to delete your cached files when space is low.</span></div>${sw('cpersist', pst)}</div>
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
    <div class="panel mat rows">
      <div class="srow"><div><b>Find duplicates</b><span>Files with the same name and size. Free up clutter in one tap.</span></div><button class="btn glassbtn sm" data-a="dups">${I.copy} Find</button></div>
      <div class="srow"><div><b>Refresh from cloud</b><span>Reload the file list from your Telegram channel.</span></div><button class="btn glassbtn sm" data-a="reload">${I.refresh} Refresh</button></div>
    </div>

    <div class="set-h"><h2>Appearance</h2></div>
    <div class="panel mat rows">
      <div class="srow skrow"><div><b>Theme</b><span>${SKINS.length} looks to choose from. Tap one to try it.</span></div></div>
      <div class="skins" id="skins">${SKINS.map(([id, nm, md, [w, sd, he, ac, cd, ol]]) => `<button class="skc ${id === skin() ? 'on' : ''}" data-skin="${id}" aria-pressed="${id === skin()}" style="--w:${w};--sd:${sd};--he:${he};--ac:${ac};--cd:${cd};--ol:${ol}"><span class="skp"><i class="p-sd"></i><i class="p-he"><em></em></i><i class="p-c1"></i><i class="p-c2"></i><i class="p-c3"></i></span><span class="skn">${nm}${md === 'dark' ? '<em>Dark</em>' : ''}</span>${id === skin() ? `<span class="skok">${I.check}</span>` : ''}</button>`).join('')}</div>
      <div class="srow"><div><b>Mode</b><span>${skinOf(skin())[2] === 'dark' ? 'This theme is always dark.' : 'Match your system, or choose light or dark.'}</span></div>${skinOf(skin())[2] === 'dark' ? '<span class="muted">Dark</span>' : segc('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], theme)}</div>
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
      <div class="srow"><div class="acc">${avatarHTML('lg')}<div><b>${esc(uname())}</b><span>${tg.me.username ? '@' + esc(tg.me.username) : ''}${tg.me.phone ? ' · +' + esc(tg.me.phone) : ''}</span></div></div><button class="btn glassbtn sm red" id="slogout">${I.logout} Sign out</button></div>
      <div class="srow"><div><b>About TeleCloud</b><span>Version 4.0 · Open source · Runs entirely in your browser</span></div><a class="btn glassbtn sm" href="https://github.com/amitsami/TeleCloud-Drive" target="_blank" rel="noopener">${I.github} GitHub</a></div>
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
  $('#cpersist', c).onchange = async (e) => { if (e.target.checked) { const ok = await cache.persist(); e.target.checked = ok; toast(ok ? 'Cached files are protected from browser cleanup' : 'Your browser declined — install the app or bookmark it, then try again', ok ? '' : 'red') } else toast('Browsers only allow turning this off by clearing site data', '', 3500) }
  $('#bwipe', c).onclick = () => wipeFlow(est.usage)
  $('#cprev', c).onchange = (e) => cache.setSettings({ prev: e.target.checked })
  $('#skins', c).onclick = (e) => { const b = e.target.closest('[data-skin]'); if (!b || b.dataset.skin === skin()) return; localStorage.setItem('tc.skin', b.dataset.skin); const y = scrollerY(); themeReveal(e.clientX, e.clientY, () => { settingsView(); scrollerY(y) }) }
  $('#solid', c).onchange = (e) => { localStorage.setItem('tc.solid', e.target.checked ? '1' : '0'); applyTheme() }
  $('#still', c).onchange = (e) => { localStorage.setItem('tc.still', e.target.checked ? '1' : '0'); applyTheme() }
  const ea = $('#e2eauto', c); if (ea) ea.onchange = async (e) => { if (e.target.checked && !E.unlocked()) { e.target.checked = false; if (await unlockFlow()) { localStorage.setItem('tc.e2e', '1'); settingsView() } return } localStorage.setItem('tc.e2e', e.target.checked ? '1' : '0'); toast(e.target.checked ? 'New uploads will be encrypted' : 'New uploads will not be encrypted', 'lock') }
  $('#slogout', c).onclick = () => $('#logout').click()
}
/* theme change with a circular reveal */
const scrollerY = (y) => { const m = document.getElementById('scroller'); if (!m) return 0; if (y != null) m.scrollTop = y; return m.scrollTop }
function themeReveal(x, y, after) {
  const run = () => { applyTheme(); after && after() }
  if (!document.startViewTransition || RM() || !x) { run(); return }
  document.documentElement.dataset.dir = 'theme'
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const t = document.startViewTransition(run)
  t.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {})
}

async function wipeFlow(before) {
  const ok = await new Promise((res) => modal(`<h3>Clean up browser storage?</h3><p>Removes cached files, thumbnails, the offline app copy and leftovers from older versions. <b>Your cloud files and your sign-in are not touched.</b></p>
    <label class="chkrow"><span class="chk"><input type="checkbox" id="wk"><span></span></span><span>Also forget the encryption key on this device <em>(you'll need your passphrase again)</em></span></label>
    <div class="acts"><button class="btn glassbtn" id="c">Cancel</button><button class="btn danger" id="o">Clean Up</button></div>`, (bg, close) => {
    let v = null; bg._onclose = () => res(v); $('#o', bg).onclick = () => { v = { keepKey: !$('#wk', bg).checked }; close() }; $('#c', bg).onclick = close
  }))
  if (!ok) return
  const t = toast('Cleaning up…', 'busy', 0)
  try {
    S.thumbs.forEach((u) => URL.revokeObjectURL(u)); S.thumbs.clear(); dropBlobs(); S.cached.clear()
    await cache.wipeBrowserStorage(ok)
    if (!ok.keepKey) { await E.lock(); itemsOf('').forEach((i) => { if (i.enc) { i.locked = true; i.name = 'Encrypted file' } }) }
    await sleep(300); const after = (await cache.estimate()).usage || 0
    toast(`Freed ${fmtSize(Math.max(0, before - after))} · your cloud files are untouched`)
  } catch (e) { toast(errMsg(e), 'red') } finally { t.close() }
  settingsView(); updateCacheLabel()
}
