
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
