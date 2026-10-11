// End-to-end encryption. Everything happens in this browser; Telegram only ever sees ciphertext.
// - A random 256-bit vault key encrypts each file's metadata (name, type, per-file key) with AES-256-GCM.
// - The vault key itself is wrapped with a key derived from your passphrase (PBKDF2-SHA256, 600k rounds)
//   and stored in your private channel, so you can unlock on any device.
// - File contents (and thumbnails) use AES-256-CTR with a random per-file key, so any byte range can be
//   decrypted on its own — that is what makes streaming previews of encrypted videos possible.
const C = crypto.subtle
const enc = new TextEncoder(), dec = new TextDecoder()
export const b64 = (u8) => { let s = ''; const a = new Uint8Array(u8); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s) }
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
export const rand = (n) => crypto.getRandomValues(new Uint8Array(n))
const ITER = 600000

let vaultKey = null // CryptoKey (AES-GCM) when unlocked
export const unlocked = () => !!vaultKey

/* ---- remember the unlocked key on this device (non-extractable, in IndexedDB) ---- */
const KDB = 'telecloud-keys'
const kdb = () => new Promise((res, rej) => { const r = indexedDB.open(KDB, 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
async function kop(mode, fn) { const d = await kdb(); return new Promise((res, rej) => { const t = d.transaction('k', mode); const r = fn(t.objectStore('k')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error) }) }
export async function restore(vaultId) { try { const v = await kop('readonly', (s) => s.get('vault')); if (v && v.id === vaultId) { vaultKey = v.key; return true } } catch {} return false }
async function remember(vaultId, key) { try { await kop('readwrite', (s) => s.put({ id: vaultId, key }, 'vault')) } catch {} }
export async function lock() { vaultKey = null; fileKeys.clear(); try { await kop('readwrite', (s) => s.delete('vault')) } catch {} }

async function passKey(pass, salt, iter) {
  const base = await C.importKey('raw', enc.encode(pass.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return C.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
const importVault = (raw) => C.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])

/** Create a new vault. Returns the public record to store in the channel. */
export async function createVault(pass, keep = true) {
  const raw = rand(32), salt = rand(16), iv = rand(12)
  const pk = await passKey(pass, salt, ITER)
  const w = new Uint8Array(await C.encrypt({ name: 'AES-GCM', iv }, pk, raw))
  const rec = { v: 1, id: b64(rand(9)), s: b64(salt), i: ITER, w: b64(new Uint8Array([...iv, ...w])) }
  vaultKey = await importVault(raw); raw.fill(0)
  if (keep) await remember(rec.id, vaultKey)
  return rec
}
/** Unlock with passphrase. Throws on wrong passphrase. */
export async function unlock(rec, pass, keep = true) {
  const pk = await passKey(pass, unb64(rec.s), rec.i)
  const w = unb64(rec.w)
  let raw
  try { raw = new Uint8Array(await C.decrypt({ name: 'AES-GCM', iv: w.slice(0, 12) }, pk, w.slice(12))) } catch { throw new Error('Wrong passphrase') }
  vaultKey = await importVault(raw)
  if (keep) await remember(rec.id, vaultKey)
  return { rewrap: async (np) => { const salt = rand(16), iv = rand(12); const k = await passKey(np, salt, ITER); const ww = new Uint8Array(await C.encrypt({ name: 'AES-GCM', iv }, k, raw)); return { ...rec, s: b64(salt), i: ITER, w: b64(new Uint8Array([...iv, ...ww])) } } }
}

/* ---- metadata ---- */
export async function sealMeta(obj) {
  const iv = rand(12)
  const ct = new Uint8Array(await C.encrypt({ name: 'AES-GCM', iv }, vaultKey, enc.encode(JSON.stringify(obj))))
  return b64(new Uint8Array([...iv, ...ct]))
}
export async function openMeta(x) {
  const u = unb64(x)
  return JSON.parse(dec.decode(await C.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, vaultKey, u.slice(12))))
}

/* ---- contents: AES-CTR, random access ---- */
const fileKeys = new Map()
async function ctrKey(k64) { let k = fileKeys.get(k64); if (!k) { k = await C.importKey('raw', unb64(k64), 'AES-CTR', false, ['encrypt', 'decrypt']); fileKeys.set(k64, k) } return k }
export const newFileSecrets = () => ({ k: b64(rand(32)), c: b64(rand(8)), tn: b64(rand(8)) })
function counter(nonce64, offset) {
  if (offset % 16) throw new Error('CTR offset must be 16-byte aligned')
  const ctr = new Uint8Array(16); ctr.set(unb64(nonce64), 0)
  let blk = BigInt(offset / 16)
  for (let i = 15; i >= 8; i--) { ctr[i] = Number(blk & 0xffn); blk >>= 8n }
  return ctr
}
/** Encrypt/decrypt `data` that starts at byte `offset` of the plaintext (CTR is symmetric). */
export async function ctr(k64, nonce64, offset, data) {
  const aligned = offset - (offset % 16), pad = offset - aligned
  let buf = data
  if (pad) { buf = new Uint8Array(pad + data.length); buf.set(data, pad) }
  const out = new Uint8Array(await C.encrypt({ name: 'AES-CTR', counter: counter(nonce64, aligned), length: 64 }, await ctrKey(k64), buf))
  return pad ? out.subarray(pad) : out
}
