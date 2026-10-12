
/* ---------- modals & sheets ---------- */
function modal(html, onMount, cls = '') {
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = `<div class="modal glass ${cls}" tabindex="-1" role="dialog" aria-modal="true"><span class="grab"></span>${html}</div>`
  const md = bg.firstElementChild
  document.body.append(bg); requestAnimationFrame(() => bg.classList.add('in'))
  let closed = false
  const onEsc = (e) => { if (e.key === 'Escape' && bg === [...document.querySelectorAll('.modal-bg:not(.out)')].pop()) { e.stopPropagation(); close() } }
  const close = () => { if (closed) return; closed = true; document.removeEventListener('keydown', onEsc, true); bg.classList.remove('in'); bg.classList.add('out'); setTimeout(() => bg.remove(), 340); bg._onclose && bg._onclose() }
  bg._close = close
  bg.onmousedown = (e) => { if (e.target === bg) close() }
  document.addEventListener('keydown', onEsc, true)
  setTimeout(() => { if (!bg.contains(document.activeElement)) (bg.querySelector('input,textarea,button.primary') || md).focus({ preventScroll: true }) }, 60)
  // swipe down to dismiss (sheets on phones)
  let y0 = null, dy = 0
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
    $('#o', bg).onclick = ok; i.onkeydown = (e) => { if (e.key === 'Enter') ok() }; $('#c', bg).onclick = close
  }))
}
function confirmBox(title, text, okText, danger) {
  return new Promise((res) => modal(`<h3>${title}</h3><p>${text}</p><div class="acts"><button class="btn glassbtn" id="c">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="o">${okText}</button></div>`, (bg, close) => {
    let v = false; bg._onclose = () => res(v)
    $('#o', bg).onclick = () => { v = true; close() }; $('#c', bg).onclick = close; setTimeout(() => $('#o', bg).focus(), 60)
  }))
}
function pickFolder(exclude = [], title = 'Move to…', okText = 'Move Here') {
  return new Promise((res) => {
    const paths = ['/', ...[...allFolders().keys()].sort()].filter((p) => !exclude.some((x) => under(p, x)))
    let chosen = S.view === 'drive' ? S.path : '/'
    modal(`<h3>${title}</h3><p>Choose a destination folder.</p><div class="tree" id="tree">${paths.map((p) => `<button data-p="${esc(p)}" style="padding-left:${10 + (p === '/' ? 0 : p.split('/').length - 1) * 18}px">${p === '/' ? `<span class="tree-root">${I.drive}</span>` : folderIcon(22)}<span>${p === '/' ? 'Drive' : esc(baseName(p))}</span></button>`).join('')}</div>
      <div class="acts"><button class="btn glassbtn" id="nf2">${I.folderPlus}</button><span class="grow"></span><button class="btn glassbtn" id="c">Cancel</button><button class="btn primary" id="o">${okText}</button></div>`, (bg, close) => {
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
    $('#o', bg).onclick = go; p1.onkeydown = (e) => { if (e.key === 'Enter') go() }; $('#c', bg).onclick = close
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
  for (const it of itemsOf('')) if (it.enc && it.locked) { try { await tg.openItem(it, tg.thumbMsgs) } catch {} }
}

/* ---------- keyboard shortcuts ---------- */
function showKeys() {
  const K = [['Space', 'Quick preview'], ['Enter', 'Open'], ['← → ↑ ↓', 'Move selection'], ['⌘/Ctrl + A', 'Select all'], ['⌫ / Delete', 'Move to Recently Deleted'], ['⌘/Ctrl + I', 'Get info'], ['/', 'Search'], ['⌘/Ctrl + [ / ]', 'Back / Forward'], ['N', 'New folder'], ['T', 'New text file'], ['⌘/Ctrl + D', 'Duplicate'], ['U', 'Upload'], ['Esc', 'Close / clear selection'], ['?', 'This list']]
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
