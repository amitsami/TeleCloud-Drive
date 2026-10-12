
/* ---------- shared folders: join with a code, share yours ---------- */
let photoURL = null
function avatarHTML(cls = '') {
  const n = uname()
  return photoURL ? `<img class="avatar ${cls}" src="${photoURL}" alt="">` : `<div class="avatar ${cls}" style="--h:${[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}">${esc((n[0] || 'T').toUpperCase())}</div>`
}
async function loadAvatar() {
  try {
    const cachedU = localStorage.getItem('tc.avatar'); if (cachedU) { photoURL = cachedU; paintAvatars() }
    const b = await tg.myPhoto(); if (!b) { if (cachedU) { localStorage.removeItem('tc.avatar'); photoURL = null; paintAvatars() } return }
    const u = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b) })
    if (u.length < 120000) localStorage.setItem('tc.avatar', u); photoURL = u; paintAvatars()
  } catch {}
}
function paintAvatars() { $$('.avatar').forEach((el) => { const lg = el.classList.contains('lg'); el.outerHTML = avatarHTML(lg ? 'lg' : '') }) }
const shareList = () => [...tg.shares.values()].sort((a, b) => a.name.localeCompare(b.name))
const shareHue = (k) => [...String(k)].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360
function renderSideShares() {
  const el = $('#sshare'); if (!el) return
  const l = shareList(); const sig = l.map((s) => s.key + s.name).join('|') + '#' + S.space
  if (el._sig === sig) return; el._sig = sig
  el.innerHTML = l.length ? l.slice(0, 10).map((s) => `<button data-sh="${s.key}" class="${S.space === s.key && S.view === 'drive' ? 'on' : ''}">${folderIcon(18, shareHue(s.key))}<span>${esc(s.name)}</span>${s.owner ? '' : `<span class="count">${I.users}</span>`}</button>`).join('')
    : `<button class="nav-cta" data-a="join">${I.ticket}<span>Join with a code</span></button>`
}
function sharedView() {
  const l = shareList()
  return `<div class="share-hero mat">
      <div class="sh-art">${folderIcon(92, 160)}<span class="sh-badge">${I.users}</span></div>
      <div class="sh-t"><h2>Shared folders</h2><p>Create a folder that others can join with a code. Everyone with the code can view, add and download files — and pass the code on to friends.</p>
        <div class="hero-acts"><button class="btn primary" data-a="join">${I.ticket} Join with a code</button><button class="btn glassbtn" data-a="newshare">${I.folderPlus} New shared folder</button></div></div>
    </div>
    ${l.length ? `<div class="section-h"><span>Your shared folders</span></div><div class="share-grid">${l.map((s, i) => `<div class="share-card mat" style="--i:${i};--h:${shareHue(s.key)}">
        <button class="sc-open" data-a="opensh" data-k="${s.key}">${folderIcon(54, shareHue(s.key))}<div class="sc-b"><b>${esc(s.name)}</b><span>${s.owner ? `${I.crown} Owner` : 'Member'}${s.count ? ` · ${s.count} member${s.count === 1 ? '' : 's'}` : ''}${S.spaces[s.key] ? ` · ${S.spaces[s.key].filter((x) => x.kind === 'file').length} files` : ''}</span></div></button>
        <div class="sc-code">${s.code ? `<button class="codechip" data-copy="${esc(s.code)}" title="Copy code">${I.ticket}<code>${esc(s.code)}</code>${I.copy}</button>` : '<span class="muted">Code unavailable</span>'}
          <button class="iconbtn" data-a="sharecode" data-k="${s.key}" title="Share">${I.share}</button><button class="iconbtn" data-a="members" data-k="${s.key}" title="Members">${I.users}</button></div>
      </div>`).join('')}</div>` : `<div class="empty sm"><div><div class="empty-ic">${folderIcon(84, 160)}</div><h3>No shared folders yet</h3><div>Got a code from a friend? Tap <b>Join with a code</b>.</div></div></div>`}`
}
function shareHead() {
  const s = tg.shares.get(S.space); if (!s) return ''
  return `<div class="banner glass-lite share-bar">${folderIcon(30, shareHue(s.key))}<span><b>${esc(s.name)}</b> · ${s.owner ? 'You own this folder' : 'Shared with you'}${s.count ? ` · ${s.count} member${s.count === 1 ? '' : 's'}` : ''}</span><span class="grow"></span>
    ${s.code ? `<button class="codechip" data-copy="${esc(s.code)}" title="Copy code">${I.ticket}<code>${esc(s.code)}</code>${I.copy}</button>` : ''}
    <button class="btn glassbtn sm" data-a="sharecode">${I.share} Invite</button><button class="iconbtn" data-a="members" title="Members">${I.users}</button><button class="iconbtn" data-a="leave" title="${s.owner ? 'Delete shared folder' : 'Leave'}">${s.owner ? I.trash : I.logout}</button></div>`
}
const joinLink = (code) => `${location.origin}${location.pathname}#join=${encodeURIComponent(code)}`
async function copyText(t, msg = 'Copied') { try { await navigator.clipboard.writeText(t) } catch { const a = document.createElement('textarea'); a.value = t; document.body.append(a); a.select(); document.execCommand('copy'); a.remove() } toast(msg, '', 1800) }
document.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) { e.preventDefault(); e.stopPropagation(); copyText(b.dataset.copy, 'Code copied — send it to anyone you want to invite') } }, true)

async function joinFlow(pre = '') {
  const code = await new Promise((res) => modal(`<div class="mh">${tile(I.ticket, 160)}<div><h3>Join a shared folder</h3><p>Paste the code (or link) someone shared with you.</p></div></div>
    <input class="field code-in" id="jc" placeholder="TC-xxxxxxxxxxxx" value="${esc(pre)}" spellcheck="false" autocomplete="off">
    <div class="peek" id="jp"></div>
    <div class="acts"><button class="btn glassbtn" id="c">Cancel</button><button class="btn primary" id="o" disabled>${I.join} Join</button></div>`, (bg, close) => {
    const i = $('#jc', bg), ok = $('#o', bg), pk = $('#jp', bg); let v = null, t, seq = 0; bg._onclose = () => res(v)
    const check = async () => {
      const my = ++seq; const val = i.value.trim(); ok.disabled = true
      if (val.length < 8) { pk.innerHTML = ''; return }
      pk.innerHTML = `<span class="spin s14"></span> Checking code…`
      try { const r = await tg.peekShare(val); if (my !== seq) return
        pk.innerHTML = `<div class="peek-card">${folderIcon(40, 160)}<div><b>${esc(r.name || 'Shared folder')}</b><span>${r.count ? `${r.count} member${r.count === 1 ? '' : 's'}` : 'Shared folder'}${r.joined ? ' · already joined' : ''}</span></div></div>${r.ok === false ? '<div class="warn">This code belongs to a Telegram group that isn’t a TeleCloud folder.</div>' : ''}`
        ok.disabled = false; ok.innerHTML = r.joined ? `${I.fwd} Open` : `${I.join} Join`
      } catch (e) { if (my === seq) pk.innerHTML = `<div class="warn">${esc(errMsg(e))}</div>` }
    }
    i.oninput = () => { clearTimeout(t); t = setTimeout(check, 350) }; if (pre) check()
    ok.onclick = () => { v = i.value.trim(); close() }; i.onkeydown = (e) => e.key === 'Enter' && !ok.disabled && ok.click(); $('#c', bg).onclick = close
    setTimeout(() => i.focus(), 80)
  }))
  if (!code) return
  const t = toast('Joining…', 'busy', 0)
  try { const sh = await tg.joinShare(code); t.close(); toast(`Joined “${sh.name}”`); render(); go({ view: 'drive', path: '/', space: sh.key }, 'fwd') }
  catch (e) { t.close(); toast(errMsg(e), 'red', 5000) }
}
async function newShareFlow(name, after) {
  name = name || (await promptBox('New shared folder', 'People who join with the code can see and add files.', 'Shared folder', 'Create')); if (!name) return null
  const t = toast('Creating shared folder…', 'busy', 0)
  try { const sh = await tg.createShare(name); S.spaces[sh.key] = []; t.close(); render(); if (after) return sh; go({ view: 'drive', path: '/', space: sh.key }, 'fwd'); setTimeout(() => shareCodeModal(sh.key, true), 500); return sh }
  catch (e) { t.close(); toast(errMsg(e), 'red', 5000); return null }
}
function shareCodeModal(key, fresh) {
  const s = tg.shares.get(key); if (!s) return
  const link = s.code ? joinLink(s.code) : ''
  modal(`<div class="mh">${folderIcon(52, shareHue(key))}<div><h3>${fresh ? 'Your shared folder is ready' : 'Invite people'}</h3><p>Anyone with this code can join <b>${esc(s.name)}</b>. Members can share the same code with others.</p></div></div>
    <div class="bigcode">${s.code ? `<code>${esc(s.code)}</code>` : '<span class="muted">No code yet</span>'}</div>
    <div class="code-acts"><button class="btn glassbtn" data-copy="${esc(s.code || '')}">${I.copy} Copy code</button><button class="btn glassbtn" id="cl">${I.link} Copy link</button>${navigator.share ? `<button class="btn glassbtn" id="sh">${I.share} Share…</button>` : ''}</div>
    <div class="howto"><div><span>1</span>Send the code to a friend</div><div><span>2</span>They open TeleCloud → <b>Shared</b> → <b>Join with a code</b></div><div><span>3</span>Everyone sees the same files instantly</div></div>
    <div class="acts">${s.owner ? `<button class="btn ghost sm" id="rs">${I.refresh} New code</button>` : ''}<span class="grow"></span><button class="btn primary" id="o">Done</button></div>`, (bg, close) => {
    $('#o', bg).onclick = close
    $('#cl', bg).onclick = () => copyText(link, 'Invite link copied')
    const sh = $('#sh', bg); if (sh) sh.onclick = () => navigator.share({ title: `Join “${s.name}” on TeleCloud`, text: `Join my shared folder “${s.name}” on TeleCloud. Code: ${s.code}`, url: link }).catch(() => {})
    const rs = $('#rs', bg); if (rs) rs.onclick = async () => { if (!(await confirmBox('Create a new code?', 'The old code stops working. People who already joined stay in.', 'New code', true))) return; try { await tg.resetShareCode(key); close(); shareCodeModal(key); render() } catch (e) { toast(errMsg(e), 'red') } }
  })
}
async function membersModal(key) {
  const s = tg.shares.get(key); if (!s) return
  modal(`<div class="mh">${tile(I.users, 160)}<div><h3>Members</h3><p>${esc(s.name)}</p></div></div><div class="members" id="mm"><span class="spin s18"></span></div><div class="acts"><button class="btn glassbtn" data-a="x" id="inv">${I.share} Invite</button><span class="grow"></span><button class="btn primary" id="o">Done</button></div>`, async (bg, close) => {
    $('#o', bg).onclick = close; $('#inv', bg).onclick = () => { close(); shareCodeModal(key) }
    try { const l = await tg.shareMembers(key); s.count = l.length; $('#mm', bg).innerHTML = l.map((u) => `<div class="mem"><div class="avatar" style="--h:${[...u.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}">${esc(u.name[0].toUpperCase())}</div><div><b>${esc(u.name)}${String(u.id) === String(tg.me.id) ? ' (you)' : ''}</b><span>${u.username ? '@' + esc(u.username) : 'Telegram user'}</span></div>${u.owner ? `<em>${I.crown} Owner</em>` : ''}</div>`).join('') }
    catch (e) { $('#mm', bg).innerHTML = `<div class="warn">${esc(errMsg(e))}</div>` }
  })
}
async function leaveFlow(key) {
  const s = tg.shares.get(key); if (!s) return
  if (!(await confirmBox(s.owner ? `Delete “${s.name}”?` : `Leave “${s.name}”?`, s.owner ? 'The shared folder and every file in it will be deleted for all members. This can’t be undone.' : 'You’ll lose access until someone shares the code with you again.', s.owner ? 'Delete for everyone' : 'Leave', true))) return
  const t = toast(s.owner ? 'Deleting…' : 'Leaving…', 'busy', 0)
  try { await tg.leaveShare(key); delete S.spaces[key]; t.close(); toast(s.owner ? 'Shared folder deleted' : 'Left the shared folder'); go({ view: 'shared', space: '' }, 'back'); render() }
  catch (e) { t.close(); toast(errMsg(e), 'red') }
}
async function pickShare() {
  const l = shareList(); if (!l.length) return null
  return new Promise((res) => modal(`<h3>Add to shared folder</h3><p>Copies go to the folder for every member to see.</p><div class="tree">${l.map((s) => `<button data-k="${s.key}">${folderIcon(22, shareHue(s.key))}<span>${esc(s.name)}</span></button>`).join('')}</div><div class="acts"><button class="btn glassbtn" id="c">Cancel</button></div>`, (bg, close) => {
    let v = null; bg._onclose = () => res(v); $('#c', bg).onclick = close
    bg.querySelectorAll('.tree button').forEach((b) => (b.onclick = () => { v = b.dataset.k; close() }))
  }))
}
/** Copy between your drive and shared folders (server-side, no re-upload). to = '' (My Drive) or null (ask) */
async function copyCross(items, to) {
  if (to === null) { to = await pickShare(); if (!to) return }
  if (to && items.some((i) => i.enc)) return toast('Encrypted files can’t be shared — only you hold the key', 'red', 4500)
  if (to) await loadSpace(to)
  const jobs = []; const dst = itemsOf(to); const names = new Set(dst.filter((i) => i.kind === 'file' && i.path === '/').map((i) => i.name.toLowerCase()))
  const folders = new Set()
  for (const it of items) {
    if (it.kind === 'file') { jobs.push({ it, path: '/', name: uniqueName('/', it.name, names) }); continue }
    const base = parentOf(it.path)
    for (const f of itemsOf(it.src).filter((x) => !x.d && x.kind === 'file' && under(x.path, it.path))) { const p = tg.normPath('/' + f.path.slice(base === '/' ? 0 : base.length)); folders.add(p); let q = parentOf(p); while (q !== '/') { folders.add(q); q = parentOf(q) } jobs.push({ it: f, path: p, name: f.name }) }
    folders.add(tg.normPath('/' + it.path.slice(base === '/' ? 0 : base.length)))
  }
  const have = new Set(dst.filter((i) => i.kind === 'folder' && !i.d).map((i) => i.path))
  try { for (const p of [...folders].sort()) if (!have.has(p)) { const f = await tg.createFolder(p, to); dst.unshift(f) } } catch (e) { return toast(errMsg(e), 'red') }
  const r = await runAll(jobs, async (j) => { const c = await tg.copyItem(j.it, { path: j.path, name: j.name, src: to }); itemsOf(to).unshift(c); if (S.thumbs.has(j.it.id)) S.thumbs.set(c.id, S.thumbs.get(j.it.id)) }, 'Copying…', 3)
  render(); if (r.ok) toast(`Copied ${r.ok} file${r.ok > 1 ? 's' : ''} to ${to ? tg.shares.get(to).name : 'My Drive'}`)
}
async function shareFolderFlow(folder) {
  const sh = await newShareFlow(folder.name, true); if (!sh) return
  await copyCross([folder], sh.key)
  go({ view: 'drive', path: '/', space: sh.key }, 'fwd'); setTimeout(() => shareCodeModal(sh.key, true), 500)
}
/* #join=CODE links */
function checkJoinLink() {
  const c = sessionStorage.getItem('tc.join'); if (!c) return
  sessionStorage.removeItem('tc.join'); setTimeout(() => joinFlow(c), 700)
}

/* ---------- liquid glass: pointer light + refraction (Chromium) ---------- */
function liquid() {
  if (liquid.done) return; liquid.done = true
  let raf = 0, last = null
  document.addEventListener('pointermove', (e) => {
    last = e; if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0; const g = last.target.closest && last.target.closest('.glass'); if (!g) return
      const r = g.getBoundingClientRect(); g.style.setProperty('--mx', `${last.clientX - r.left}px`); g.style.setProperty('--my', `${last.clientY - r.top}px`)
    })
  }, { passive: true })
  const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands && navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand)))
  if (chromium && !RM() && !document.getElementById('liquidsvg')) {
    document.body.insertAdjacentHTML('beforeend', `<svg id="liquidsvg" width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="liquid" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="n"/><feGaussianBlur in="n" stdDeviation="2" result="nb"/><feDisplacementMap in="SourceGraphic" in2="nb" scale="22" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`)
    document.documentElement.classList.add('refract')
  }
}
