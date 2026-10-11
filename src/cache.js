// Device cache (like Telegram's "Storage Usage"): thumbnails + opened/downloaded media kept in IndexedDB.
const DB = 'telecloud-cache'
let dbp
const db = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('thumbs'); d.createObjectStore('media'); d.createObjectStore('idx') }
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
}))
const tx = async (stores, mode, fn) => {
  const d = await db()
  return new Promise((res, rej) => {
    const t = d.transaction(stores, mode); let out
    Promise.resolve(fn(...[].concat(stores).map((s) => t.objectStore(s)))).then((v) => (out = v))
    t.oncomplete = () => res(out && out.result !== undefined && out instanceof IDBRequest ? out.result : out)
    t.onerror = () => rej(t.error); t.onabort = () => rej(t.error)
  })
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })

export const CATS = {
  photos: { label: 'Photos', color: '#34A3F5' }, videos: { label: 'Videos', color: '#8B5CF6' }, music: { label: 'Music', color: '#F43F75' },
  documents: { label: 'Documents', color: '#F59E0B' }, other: { label: 'Other files', color: '#10B981' }, thumbs: { label: 'Thumbnails', color: '#94A3B8' },
}
export const catOf = (mime = '', name = '') => {
  const e = (/\.([a-z0-9]+)$/i.exec(name) || [])[1]?.toLowerCase() || ''
  if (mime.startsWith('image/') || /^(jpe?g|png|gif|webp|heic|bmp|avif)$/.test(e)) return 'photos'
  if (mime.startsWith('video/') || /^(mp4|mkv|mov|webm|avi|m4v)$/.test(e)) return 'videos'
  if (mime.startsWith('audio/') || /^(mp3|wav|flac|m4a|aac|ogg|opus)$/.test(e)) return 'music'
  if (/pdf|word|excel|sheet|presentation|powerpoint|text|json|xml|csv|rtf/.test(mime) || /^(pdf|docx?|xlsx?|pptx?|txt|md|csv|rtf|odt|epub)$/.test(e)) return 'documents'
  return 'other'
}

/* settings */
const LS = 'tc.cache.settings'
export const settings = () => ({ max: 2 * 1024 ** 3, keep: 30, auto: true, prev: false, ...(JSON.parse(localStorage.getItem(LS) || '{}')) })
export const setSettings = (s) => localStorage.setItem(LS, JSON.stringify({ ...settings(), ...s }))

/* thumbnails */
export async function getThumb(id) { try { const v = await tx('thumbs', 'readonly', (s) => req(s.get(id))); return v ? v.blob : null } catch { return null } }
export async function putThumb(id, blob) { try { await tx('thumbs', 'readwrite', (s) => s.put({ blob, size: blob.size, at: Date.now() }, id)) } catch {} }

/* media */
export async function getMedia(id) {
  try {
    const v = await tx('media', 'readonly', (s) => req(s.get(id)))
    if (!v) return null
    tx('idx', 'readwrite', async (s) => { const m = await req(s.get(id)); if (m) { m.used = Date.now(); s.put(m, id) } }).catch(() => {})
    return v
  } catch { return null }
}
/** opts.pin = keep offline (never auto-removed); opts.force = save even if auto-saving is off */
export async function putMedia(it, blob, opts = {}) {
  const st = settings()
  if (!opts.pin && !opts.force && (!st.auto || (st.max && blob.size > st.max))) return false
  try {
    const now = Date.now()
    await tx(['media', 'idx'], 'readwrite', (m, i) => { m.put(blob, it.id); i.put({ id: it.id, name: it.name, size: blob.size, mime: it.mime, cat: catOf(it.mime, it.name), at: now, used: now, pin: !!opts.pin }, it.id) })
    await enforce()
    return true
  } catch { return false }
}
export async function setPin(id, pin) { try { await tx('idx', 'readwrite', async (s) => { const m = await req(s.get(id)); if (m) { m.pin = pin; s.put(m, id) } }) } catch {} }
export async function has(id) { try { return !!(await tx('idx', 'readonly', (s) => req(s.get(id)))) } catch { return false } }
export async function list() { try { return (await tx('idx', 'readonly', (s) => req(s.getAll()))) || [] } catch { return [] } }
export async function thumbStats() {
  try {
    return await tx('thumbs', 'readonly', async (s) => { let count = 0, size = 0; await new Promise((res) => { const c = s.openCursor(); c.onsuccess = () => { const cur = c.result; if (!cur) return res(); count++; size += cur.value.size || 0; cur.continue() } }); return { count, size } })
  } catch { return { count: 0, size: 0 } }
}
export async function remove(ids) { if (!ids.length) return; await tx(['media', 'idx'], 'readwrite', (m, i) => { for (const id of ids) { m.delete(id); i.delete(id) } }) }
export async function clearThumbs() { await tx('thumbs', 'readwrite', (s) => s.clear()) }
export async function clearAll() { await tx(['media', 'idx', 'thumbs'], 'readwrite', (m, i, t) => { m.clear(); i.clear(); t.clear() }) }
/** evict least-recently-used media beyond the max size and anything older than "keep" days */
export async function enforce() {
  const st = settings(); const all = (await list()).sort((a, b) => b.used - a.used)
  const out = []; let total = 0; const cutoff = st.keep ? Date.now() - st.keep * 86400e3 : 0
  for (const m of all) { if (m.pin) continue; total += m.size; if ((st.max && total > st.max) || (cutoff && m.used < cutoff)) out.push(m.id) }
  if (out.length) await remove(out)
  return out.length
}
export async function estimate() { try { return await navigator.storage.estimate() } catch { return {} } }
// remove the old v1 cache database
try { indexedDB.deleteDatabase('telecloud') } catch {}
