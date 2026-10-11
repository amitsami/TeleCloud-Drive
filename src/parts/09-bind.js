
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
  c.onclick = (e) => {
    const a = e.target.closest('[data-a]')
    if (a) { const v = a.dataset.a; if (v === 'upload') { upFrom = centerOf(a); pick() } else if (v === 'newfolder' || v === 'newfolder-root') newFolder(); else if (v === 'empty') { const t = S.items.filter((i) => i.d); t.length && purge(t) } else if (v === 'unlock') unlockFlow(); else if (v === 'e2e') setupE2E().then(() => S.view === 'settings' && settingsView()); else if (v === 'lockv') { E.lock().then(() => { S.items.forEach((i) => { if (i.enc) { i.locked = true; i.name = 'Encrypted file'; S.thumbs.delete(i.id) } }); dropBlobs(); toast('Locked', 'lock'); render() }) } else if (v === 'e2epass') changePass(); else if (v === 'keys') showKeys(); return }
    const pz = e.target.closest('[data-pz]'); if (pz) { S.pz = Math.min(8, Math.max(2, S.pz - +pz.dataset.pz)); localStorage.setItem('tc.pz', S.pz); $$('.photos', c).forEach((p) => p.style.setProperty('--cols', pcols())); return }
    const cb = e.target.closest('[data-cat]'); if (cb) { go({ view: 'cat', cat: cb.dataset.cat }, 'fwd'); return }
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
