
/* ---------- extras: batch ops, copies, ZIP, text editor, duplicates ---------- */
/** Run fn over items with limited parallelism and one progress toast. Failures don't stop the batch. */
async function runAll(items, fn, label, conc = 4) {
  if (!items.length) return { ok: 0, fail: 0 }
  const t = toast(items.length > 1 ? `${label} 0/${items.length}` : label, 'busy', 0)
  let i = 0, ok = 0, fail = 0, lastErr = null
  const work = async () => { while (i < items.length) { const it = items[i++]; try { await fn(it); ok++ } catch (e) { fail++; lastErr = e } if (items.length > 1) t.set(`${label} ${ok + fail}/${items.length}`) } }
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, work))
  t.close()
  if (fail) toast(`${fail} item${fail > 1 ? 's' : ''} failed: ${errMsg(lastErr)}`, 'red', 5000)
  return { ok, fail }
}
/** "name.ext" → "name copy.ext", "name copy 2.ext" … unique within a folder */
function uniqueName(path, name, taken, style = 'num') {
  const names = taken || new Set(live().filter((i) => i.kind === 'file' && i.path === path).map((i) => i.name.toLowerCase()))
  if (!names.has(name.toLowerCase())) { names.add(name.toLowerCase()); return name }
  const dot = name.lastIndexOf('.'), b = dot > 0 ? name.slice(0, dot) : name, e = dot > 0 ? name.slice(dot) : ''
  for (let n = style === 'copy' ? 1 : 2; ; n++) {
    const c = style === 'copy' ? `${b} copy${n > 1 ? ' ' + n : ''}${e}` : `${b} (${n})${e}`
    if (!names.has(c.toLowerCase())) { names.add(c.toLowerCase()); return c }
  }
}
async function copyItems(items, dest) {
  const dup = dest == null
  if (!dup) { dest = await pickFolder([], 'Copy to…', 'Copy Here'); if (dest == null) return }
  if (items.some((i) => i.locked) && !(await unlockFlow())) return
  const jobs = [] // { it, path }
  const taken = new Map(); const tk = (p) => taken.get(p) || (taken.set(p, new Set(live().filter((i) => i.kind === 'file' && i.path === p).map((i) => i.name.toLowerCase()))), taken.get(p))
  const folders = []
  for (const it of items) {
    const base = dup ? parentOf(it.kind === 'folder' ? it.path : it.path + '/x') : dest
    if (it.kind === 'file') { const p = dup ? it.path : dest; jobs.push({ it, path: p, name: uniqueName(p, it.name, tk(p), dup ? 'copy' : 'num') }); continue }
    let root = join(dup ? parentOf(it.path) : dest, it.name + (dup ? ' copy' : '')), n = 2; const ex = allFolders(); while (ex.has(root)) root = join(dup ? parentOf(it.path) : dest, `${it.name}${dup ? ' copy' : ''} ${n++}`)
    folders.push(root)
    for (const d of live().filter((x) => x.kind === 'folder' && under(x.path, it.path))) folders.push(root + d.path.slice(it.path.length))
    for (const f of live().filter((x) => x.kind === 'file' && under(x.path, it.path))) jobs.push({ it: f, path: root + f.path.slice(it.path.length), name: f.name })
    void base
  }
  for (const p of [...new Set(folders)]) { try { const f = await ensureFolderMsg(p); S.fresh.add(f.id) } catch (e) { toast(errMsg(e), 'red'); return } }
  const r = await runAll(jobs, async (j) => { const c = await tg.copyItem(j.it, { path: j.path, name: j.name }); itemsOf(c.src).unshift(c); S.fresh.add(c.id); if (S.thumbs.has(j.it.id)) S.thumbs.set(c.id, S.thumbs.get(j.it.id)) }, 'Copying…', 3)
  S.sel.clear(); render()
  if (r.ok || folders.length) toast(`${dup ? 'Duplicated' : 'Copied'} ${items.length} item${items.length > 1 ? 's' : ''}${dup ? '' : ` to ${dest === '/' ? 'Drive' : baseName(dest)}`}`)
}

/* store-only ZIP writer (streams into a file when the browser allows it) */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crcUp = (c, d) => { c = ~c; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); return ~c >>> 0 }
async function zipItems(items) {
  if (items.some((i) => i.locked) && !(await unlockFlow())) return
  const files = []
  for (const it of items) {
    if (it.kind === 'file') files.push({ it, name: it.name })
    else { const pre = parentOf(it.path); for (const f of live().filter((x) => x.kind === 'file' && under(x.path, it.path))) files.push({ it: f, name: (f.path.slice(pre === '/' ? 1 : pre.length + 1) + '/' + f.name) }) }
  }
  if (!files.length) return toast('Nothing to download — the folder is empty', 'red')
  const seen = new Set(); for (const f of files) { let n = f.name, k = 2; while (seen.has(n.toLowerCase())) { const d = f.name.lastIndexOf('.'); n = d > 0 ? `${f.name.slice(0, d)} (${k})${f.name.slice(d)}` : `${f.name} (${k})`; k++ } seen.add(n.toLowerCase()); f.name = n }
  const total = files.reduce((a, f) => a + f.it.size, 0)
  if (total > 3.9 * 1024 ** 3) return toast('ZIP downloads are limited to 4 GB — select fewer files', 'red')
  const zname = (items.length === 1 && items[0].kind === 'folder' ? items[0].name : 'TeleCloud ' + new Date().toISOString().slice(0, 10)) + '.zip'
  let w = null, parts = []
  if (window.showSaveFilePicker && total > 300 * 1024 * 1024) { try { w = await (await window.showSaveFilePicker({ suggestedName: zname })).createWritable() } catch { return } }
  const t = { id: ++trId, kind: 'down', name: zname, size: total, p: 0, bytes: 0, state: 'run', started: 1, ctl: {}, thumb: null }
  S.transfers.push(t); trOpen = true; renderTransfers()
  const src = cardOf(items[0]); if (src) { await nextFrame(); fly(centerOf(src), `<div class="flyzip">${I.zip}</div>`) }
  const enc = new TextEncoder(); let off = 0, got = 0; const cen = []
  const put = async (u8) => { off += u8.length; if (w) await w.write(u8); else parts.push(u8) }
  const dt = (() => { const d = new Date(); return { t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() } })()
  try {
    for (const f of files) {
      const nm = enc.encode(f.name), start = off
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0808, true); h.setUint16(10, dt.t, true); h.setUint16(12, dt.d, true); h.setUint16(26, nm.length, true)
      await put(new Uint8Array(h.buffer)); await put(nm)
      let crc = 0, size = 0
      const cached = await cache.getMedia(f.it.id)
      const src = cached ? (async function* () { yield new Uint8Array(await cached.arrayBuffer()) })() : f.it.isPhoto ? (async function* () { yield new Uint8Array(await (await tg.downloadBlob(f.it)).arrayBuffer()) })() : tg.downloadChunks(f.it, t.ctl)
      for await (const ch of src) {
        while (t.ctl.paused && !t.ctl.cancelled) await sleep(300)
        if (t.ctl.cancelled) throw new Error('Cancelled')
        crc = crcUp(crc, ch); size += ch.length; got += ch.length; await put(ch); track(t, Math.min(1, got / (total || 1)), got)
      }
      const dd = new DataView(new ArrayBuffer(16)); dd.setUint32(0, 0x08074b50, true); dd.setUint32(4, crc, true); dd.setUint32(8, size, true); dd.setUint32(12, size, true); await put(new Uint8Array(dd.buffer))
      cen.push({ nm, crc, size, start })
    }
    const cstart = off
    for (const c of cen) {
      const h = new DataView(new ArrayBuffer(46)); h.setUint32(0, 0x02014b50, true); h.setUint16(4, 20, true); h.setUint16(6, 20, true); h.setUint16(8, 0x0808, true); h.setUint16(12, dt.t, true); h.setUint16(14, dt.d, true)
      h.setUint32(16, c.crc, true); h.setUint32(20, c.size, true); h.setUint32(24, c.size, true); h.setUint16(28, c.nm.length, true); h.setUint32(42, c.start, true)
      await put(new Uint8Array(h.buffer)); await put(c.nm)
    }
    const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, cen.length, true); e.setUint16(10, cen.length, true); e.setUint32(12, off - cstart, true); e.setUint32(16, cstart, true); await put(new Uint8Array(e.buffer))
    if (w) await w.close()
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(parts, { type: 'application/zip' })); a.download = zname; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000) }
    t.state = 'done'; t.p = 1; t.bytes = total
  } catch (e) { if (w) await w.abort().catch(() => {}); t.state = 'fail'; t.err = /Cancel/.test(errMsg(e)) ? 'Cancelled' : errMsg(e) }
  parts = null; renderTransfers()
}

/* ---------- text notes: create & edit ---------- */
function editorBox(title, name, text, okText = 'Save') {
  return new Promise((res) => modal(`<div class="ed-h"><span class="ed-ic">${I.note}</span><input class="field ed-n" id="en" value="${esc(name)}" spellcheck="false"><span class="ed-c" id="ecount"></span></div>
    <textarea class="field ed-t" id="et" spellcheck="false" placeholder="Start typing…">${esc(text)}</textarea>
    <div class="acts"><span class="ed-k">${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+S to save</span><span class="grow"></span><button class="btn glassbtn" id="c">Cancel</button><button class="btn primary" id="o">${I.save} ${okText}</button></div>`, (bg, close) => {
    const ta = $('#et', bg), nm = $('#en', bg), cnt = $('#ecount', bg)
    const upd = () => { cnt.textContent = `${ta.value.length.toLocaleString()} chars` }; upd(); ta.oninput = upd
    let v = null; bg._onclose = () => res(v)
    const ok = () => { const n = nm.value.trim().replace(/\//g, '-'); if (!n) return nm.focus(); v = { name: /\.[a-z0-9]{1,6}$/i.test(n) ? n : n + '.txt', text: ta.value }; close() }
    $('#o', bg).onclick = ok; $('#c', bg).onclick = close
    ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ok() } if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); upd() } })
    setTimeout(() => (text ? ta : nm).focus(), 80)
  }, 'editor'))
}
async function newTextFile() {
  if (S.view !== 'drive') go({ view: 'drive', path: S.view === 'drive' ? S.path : '/' }, 'fwd')
  const r = await editorBox('New text file', 'Untitled.txt', '', 'Create'); if (!r) return
  const path = S.path, name = uniqueName(path, r.name)
  const file = new File([r.text], name, { type: r.name.endsWith('.md') ? 'text/markdown' : 'text/plain' })
  enqueueUploads([{ file, path }], { x: innerWidth / 2, y: innerHeight / 2 })
}
async function editText(it, after) {
  if (it.locked && !(await unlockFlow())) return
  if (it.size > 2 * 1024 * 1024) return toast('Files over 2 MB can only be previewed', 'red')
  const t = toast('Opening…', 'busy', 0); let txt = ''
  try { const b = await cache.getMedia(it.id); txt = b ? await b.text() : new TextDecoder().decode(it.size ? await tg.readRange(it, 0, it.size - 1) : new Uint8Array()) } catch (e) { t.close(); return toast(errMsg(e), 'red') }
  t.close()
  const r = await editorBox('Edit', it.name, txt); if (!r || (r.text === txt && r.name === it.name)) return
  await busy('Saving…', async () => {
    const file = new File([r.text], r.name, { type: it.mime || 'text/plain' })
    const nu = await tg.replaceFile({ ...it, name: r.name }, file)
    await cache.remove([it.id]).catch(() => {}); dropBlobs([it.id]); S.cached.delete(it.id)
    S.spaces[it.src || ''] = itemsOf(it.src).map((x) => (x.id === it.id ? nu : x)); S.fresh.add(nu.id)
    toast('Saved to your cloud'); after && after(nu)
  })
}

/* ---------- duplicates ---------- */
async function findDups() {
  const groups = new Map()
  for (const f of live()) if (f.kind === 'file' && !f.locked) { const k = f.name.toLowerCase() + '|' + f.size; groups.set(k, [...(groups.get(k) || []), f]) }
  const g = [...groups.values()].filter((x) => x.length > 1).map((x) => x.sort((a, b) => a.date - b.date))
  if (!g.length) return confirmBox('No duplicates found', 'Every file in your drive is unique. Nice and tidy!', 'Done')
  const extra = g.flatMap((x) => x.slice(1)), size = extra.reduce((a, b) => a + b.size, 0)
  const ok = await new Promise((res) => modal(`<h3>${g.length} duplicate group${g.length > 1 ? 's' : ''}</h3><p>Keeping the oldest copy of each. ${extra.length} extra file${extra.length > 1 ? 's' : ''} · ${fmtSize(size)}.</p>
    <div class="dups">${g.slice(0, 60).map((x) => `<div class="dup">${S.thumbs.get(x[0].id) ? `<img src="${S.thumbs.get(x[0].id)}">` : fileIcon(x[0].name, 34)}<div><b>${esc(x[0].name)}</b><span>${x.length} copies · ${fmtSize(x[0].size)} each · ${x.map((i) => esc(i.path === '/' ? 'Drive' : baseName(i.path))).join(', ')}</span></div></div>`).join('')}</div>
    <div class="acts"><button class="btn glassbtn" id="c">Cancel</button><button class="btn danger" id="o">Move ${extra.length} to Recently Deleted</button></div>`, (bg, close) => { let v = false; bg._onclose = () => res(v); $('#o', bg).onclick = () => { v = true; close() }; $('#c', bg).onclick = close }))
  if (ok) await trash(extra)
}
async function restoreAll() { const t = S.items.filter((i) => i.d); if (t.length) await restore(t) }
