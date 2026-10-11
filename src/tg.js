import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { computeCheck } from 'telegram/Password'
import { generateRandomLong, sleep } from 'telegram/Helpers'
import bigInt from 'big-integer'
import * as E from './crypto.js'

export const API_ID = 34826054
export const API_HASH = 'e74ce2d97677942dace5be1495411cb2'
const META = 'tc:'
const FOLDER = 'tc-folder:'
const VAULT = 'tc-vault:'
const ETHUMB = 'tc-thumb'
const CH_TITLE = 'TeleCloud Drive'
const CH_ABOUT = '☁️ TeleCloud storage. Do not delete this channel. telecloud-v1'
const LS_SESSION = 'tc.session'
const LS_CHANNEL = 'tc.channel'

export let client = null
let peer = null, inputChannel = null
export let me = null

export async function initClient() {
  const s = localStorage.getItem(LS_SESSION) || ''
  client = new TelegramClient(new StringSession(s), API_ID, API_HASH, {
    connectionRetries: 10, useWSS: true, autoReconnect: true,
    deviceModel: 'TeleCloud Web', appVersion: '3.0', systemVersion: navigator.platform || 'Web',
  })
  client.setLogLevel('none')
  await client.connect()
  return s ? await client.checkAuthorization().catch(() => false) : false
}
export function saveSession() { localStorage.setItem(LS_SESSION, client.session.save()) }
export async function logout() {
  try { await client.invoke(new Api.auth.LogOut()) } catch {}
  localStorage.removeItem(LS_SESSION); localStorage.removeItem(LS_CHANNEL); await E.lock()
}

/* ---------- auth ---------- */
export async function sendCode(phone) {
  return client.sendCode({ apiId: API_ID, apiHash: API_HASH }, phone)
}
export async function signIn(phone, phoneCodeHash, code) {
  try {
    await client.invoke(new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code }))
    saveSession(); return 'ok'
  } catch (e) {
    if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') return 'password'
    throw e
  }
}
export async function passwordHint() {
  const p = await client.invoke(new Api.account.GetPassword()); return p.hint || ''
}
export async function checkPassword(pw) {
  const p = await client.invoke(new Api.account.GetPassword())
  await client.invoke(new Api.auth.CheckPassword({ password: await computeCheck(p, pw) }))
  saveSession()
}
/** QR login. onQr(url) is called each time the token refreshes. Resolves 'ok' or 'password'. */
export async function qrLogin(onQr, isCancelled) {
  let done = false
  const updated = new Promise((res) => client.addEventHandler((u) => { if (u instanceof Api.UpdateLoginToken) res() }))
  const loop = (async () => {
    while (!done && !isCancelled()) {
      const r = await client.invoke(new Api.auth.ExportLoginToken({ apiId: API_ID, apiHash: API_HASH, exceptIds: [] }))
      if (r instanceof Api.auth.LoginTokenSuccess) return
      if (!(r instanceof Api.auth.LoginToken)) return
      onQr('tg://login?token=' + Buffer.from(r.token).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))
      const wait = Math.max(5, r.expires - Math.floor(Date.now() / 1000) - 2)
      for (let i = 0; i < wait && !done && !isCancelled(); i++) await sleep(1000)
    }
  })()
  await Promise.race([updated, loop])
  done = true
  if (isCancelled()) return 'cancelled'
  try {
    let r = await client.invoke(new Api.auth.ExportLoginToken({ apiId: API_ID, apiHash: API_HASH, exceptIds: [] }))
    if (r instanceof Api.auth.LoginTokenMigrateTo) {
      await client._switchDC(r.dcId)
      r = await client.invoke(new Api.auth.ImportLoginToken({ token: r.token }))
    }
    saveSession(); return 'ok'
  } catch (e) {
    if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') return 'password'
    throw e
  }
}

/* ---------- helpers ---------- */
async function call(req, tries = 6) {
  for (let i = 0; ; i++) {
    try { return await client.invoke(req) } catch (e) {
      const s = e.seconds || (/FLOOD_WAIT_(\d+)/.exec(e.errorMessage || '') || [])[1]
      if (s && i < tries) { await sleep((+s + 1) * 1000); continue }
      if (i < 2 && /TIMEOUT|disconnected|Not connected/i.test(String(e.message))) { await sleep(1500); continue }
      throw e
    }
  }
}
export const normPath = (p) => {
  p = '/' + String(p || '/').split('/').filter(Boolean).join('/')
  return p
}
const safeJSON = (s) => { try { return JSON.parse(s) } catch { return {} } }

/* ---------- channel ---------- */
export async function getMe() { me = await client.getMe(); return me }

export async function ensureChannel() {
  const saved = JSON.parse(localStorage.getItem(LS_CHANNEL) || 'null')
  let ch = null
  if (saved) {
    try {
      const r = await call(new Api.channels.GetChannels({ id: [new Api.InputChannel({ channelId: bigInt(saved.id), accessHash: bigInt(saved.hash) })] }))
      ch = r.chats[0]; if (ch && ch.left) ch = null
    } catch { ch = null }
  }
  if (!ch) {
    for await (const d of client.iterDialogs({ limit: 1000 })) {
      const e = d.entity
      if (e && e.className === 'Channel' && e.creator && e.title === CH_TITLE) { ch = e; break }
    }
  }
  if (!ch) {
    const r = await call(new Api.channels.CreateChannel({ title: CH_TITLE, about: CH_ABOUT, broadcast: true }))
    ch = r.chats[0]
  }
  localStorage.setItem(LS_CHANNEL, JSON.stringify({ id: ch.id.toString(), hash: ch.accessHash.toString() }))
  peer = new Api.InputPeerChannel({ channelId: ch.id, accessHash: ch.accessHash })
  inputChannel = new Api.InputChannel({ channelId: ch.id, accessHash: ch.accessHash })
  return ch
}

/* ---------- parsing ---------- */
function parse(m) {
  if (!m || m.className !== 'Message') return null
  const text = m.message || ''
  if (text.startsWith(FOLDER)) {
    const j = safeJSON(text.slice(FOLDER.length))
    return { kind: 'folder', id: m.id, path: normPath(j.p), d: j.d || 0, date: m.date }
  }
  if (text.startsWith(VAULT)) return { kind: 'vault', id: m.id, rec: safeJSON(text.slice(VAULT.length)) }
  if (text.startsWith(ETHUMB) && m.media) return { kind: 'ethumb', id: m.id, msg: m }
  if (!m.media) return null
  let name = '', size = 0, mime = '', duration = 0, thumbs = null
  const doc = m.media.document, photo = m.media.photo
  if (doc && doc.className === 'Document') {
    for (const a of doc.attributes || []) {
      if (a.className === 'DocumentAttributeFilename') name = a.fileName
      if (a.className === 'DocumentAttributeVideo' || a.className === 'DocumentAttributeAudio') duration = a.duration || 0
    }
    size = Number(doc.size); mime = doc.mimeType || ''; thumbs = doc.thumbs
  } else if (photo && photo.className === 'Photo') {
    const sz = (photo.sizes || []).map((s) => s.size || (s.sizes ? Math.max(...s.sizes) : 0))
    size = Math.max(0, ...sz); mime = 'image/jpeg'; thumbs = photo.sizes; name = `Photo ${m.id}.jpg`
  } else return null
  let meta = {}
  const lines = text.split('\n')
  const last = lines[lines.length - 1]
  if (last && last.startsWith(META)) meta = safeJSON(last.slice(META.length))
  if (!name) name = mime.startsWith('video') ? `Video ${m.id}.mp4` : mime.startsWith('audio') ? `Audio ${m.id}.mp3` : `File ${m.id}`
  const hasThumb = !!(thumbs && thumbs.some((t) => t.className === 'PhotoSize' || t.className === 'PhotoSizeProgressive' || t.className === 'PhotoCachedSize'))
  if (meta.x) return { kind: 'file', enc: true, locked: true, x: meta.x, id: m.id, name: 'Encrypted file', path: normPath(meta.p || '/'), fav: !!meta.f, d: meta.d || 0, size, mime: '', duration: 0, date: meta.t || m.date, hasThumb: false, msg: m }
  return {
    kind: 'file', id: m.id, name: meta.n || name, path: normPath(meta.p || '/'), fav: !!meta.f, d: meta.d || 0,
    size, mime, duration, date: meta.t || m.date, hasThumb, isPhoto: !!photo, msg: m,
  }
}
async function caption(it) {
  const meta = {}
  if (it.enc && it.locked) meta.x = it.x
  else if (it.enc) {
    const sec = it.sec || {}
    meta.x = await E.sealMeta({ n: it.name, m: it.mime, k: sec.k, c: sec.c, tn: sec.tn, th: sec.th, du: it.duration || 0, w: sec.w, h: sec.h })
  } else meta.n = it.name
  meta.p = it.path
  if (it.fav) meta.f = 1
  if (it.d) meta.d = it.d
  if (it.t || it.date) meta.t = it.t || it.date
  return `${it.enc ? '🔒 Encrypted file' : it.name}\n${META}${JSON.stringify(meta)}`
}
/** Decrypt an encrypted item's metadata in place (vault must be unlocked). */
export async function openItem(it, thumbMsgs) {
  if (!it.enc || !it.locked) return it
  const j = await E.openMeta(it.x)
  it.name = j.n; it.mime = j.m || ''; it.duration = j.du || 0
  it.sec = { k: j.k, c: j.c, tn: j.tn, th: j.th, w: j.w, h: j.h }
  it.hasThumb = !!(j.th && (!thumbMsgs || thumbMsgs.has(j.th)))
  it.locked = false
  return it
}
const folderText = (f) => FOLDER + JSON.stringify(f.d ? { p: f.path, d: f.d } : { p: f.path })

export const thumbMsgs = new Map()
export let vault = null // { id (message id), rec }
export async function listAll(onProgress) {
  const out = []; thumbMsgs.clear(); vault = null
  for await (const m of client.iterMessages(peer, { limit: undefined, waitTime: 0 })) {
    const it = parse(m); if (!it) continue
    if (it.kind === 'ethumb') { thumbMsgs.set(it.id, it.msg); continue }
    if (it.kind === 'vault') { if (!vault) vault = { id: it.id, rec: it.rec }; continue }
    out.push(it)
    if (onProgress && out.length % 200 === 0) onProgress(out.length)
  }
  return out
}

function newMsgFrom(updates) {
  const list = updates.updates || []
  for (const u of list) if ((u.className === 'UpdateNewChannelMessage' || u.className === 'UpdateNewMessage') && u.message) return u.message
  return null
}

/* ---------- mutations ---------- */
export async function createFolder(path) {
  const r = await call(new Api.messages.SendMessage({ peer, message: folderText({ path }), randomId: generateRandomLong(), noWebpage: true, silent: true }))
  return parse(newMsgFrom(r)) || { kind: 'folder', id: Date.now(), path, d: 0, date: Date.now() / 1000 }
}
export async function editItem(it) {
  const message = it.kind === 'folder' ? folderText(it) : await caption(it)
  await call(new Api.messages.EditMessage({ peer, id: it.id, message, noWebpage: true }))
}
export async function deleteIds(ids) {
  for (let i = 0; i < ids.length; i += 100)
    await call(new Api.channels.DeleteMessages({ channel: inputChannel, id: ids.slice(i, i + 100) }))
}

export async function saveVault(rec) {
  const message = VAULT + JSON.stringify(rec)
  if (vault) await call(new Api.messages.EditMessage({ peer, id: vault.id, message, noWebpage: true }))
  else { const r = await call(new Api.messages.SendMessage({ peer, message, randomId: generateRandomLong(), noWebpage: true, silent: true })); const m = newMsgFrom(r); vault = { id: m ? m.id : 0, rec } }
  vault.rec = rec
}
/** Send copies to the user's Saved Messages in Telegram. */
export async function sendToSaved(ids) {
  await call(new Api.messages.ForwardMessages({ fromPeer: peer, id: ids, toPeer: new Api.InputPeerSelf(), randomId: ids.map(() => generateRandomLong()), dropAuthor: true }))
}

/* ---------- upload (streams from disk, parallel parts) ---------- */
export const MAX_SIZE = () => (me && me.premium ? 4000 : 2000) * 1024 * 1024 * 1.024 // 2 GB / 4 GB
async function uploadParts(file, onProgress, ctl, sec) {
  const partSize = 512 * 1024
  const parts = Math.max(1, Math.ceil(file.size / partSize))
  const big = file.size > 10 * 1024 * 1024
  const fileId = generateRandomLong()
  let next = 0, done = 0
  const workers = Math.min(big ? 8 : 4, parts)
  const work = async () => {
    while (next < parts) {
      while (ctl && ctl.paused && !ctl.cancelled) await sleep(300)
      if (ctl && ctl.cancelled) throw new Error('Cancelled')
      const i = next++
      let raw = new Uint8Array(await file.slice(i * partSize, Math.min(file.size, (i + 1) * partSize)).arrayBuffer())
      if (sec) raw = await E.ctr(sec.k, sec.c, i * partSize, raw)
      const bytes = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength)
      const req = big
        ? new Api.upload.SaveBigFilePart({ fileId, filePart: i, fileTotalParts: parts, bytes })
        : new Api.upload.SaveFilePart({ fileId, filePart: i, bytes })
      await call(req, 10)
      done++; onProgress && onProgress(done / parts, Math.min(file.size, done * partSize))
    }
  }
  await Promise.all(Array.from({ length: workers }, work))
  return big ? new Api.InputFileBig({ id: fileId, parts, name: file.name })
             : new Api.InputFile({ id: fileId, parts, name: file.name, md5Checksum: '' })
}

export async function uploadFile(file, path, { onProgress, ctl, thumb, video, encrypt } = {}) {
  const t = Math.floor((file.lastModified || Date.now()) / 1000)
  if (encrypt) {
    const sec = E.newFileSecrets()
    if (video) { sec.w = video.w; sec.h = video.h }
    if (thumb) {
      try {
        const tb = await E.ctr(sec.k, sec.tn, 0, new Uint8Array(await thumb.arrayBuffer()))
        const tf = await uploadParts(new File([tb], 'thumb.bin'))
        const r = await call(new Api.messages.SendMedia({ peer, media: new Api.InputMediaUploadedDocument({ file: tf, mimeType: 'application/octet-stream', attributes: [new Api.DocumentAttributeFilename({ fileName: 'thumb.bin' })], forceFile: true }), message: ETHUMB, randomId: generateRandomLong(), silent: true }))
        const m = newMsgFrom(r); if (m) { sec.th = m.id; thumbMsgs.set(m.id, m) }
      } catch {}
    }
    const inputFile = await uploadParts(file, onProgress, ctl, sec)
    const it = { enc: true, sec, name: file.name, mime: file.type || 'application/octet-stream', duration: video ? video.duration : 0, path, t }
    const media = new Api.InputMediaUploadedDocument({ file: inputFile, mimeType: 'application/octet-stream', attributes: [new Api.DocumentAttributeFilename({ fileName: 'encrypted.bin' })], forceFile: true })
    const r = await call(new Api.messages.SendMedia({ peer, media, message: await caption(it), randomId: generateRandomLong(), silent: true }))
    const out = parse(newMsgFrom(r))
    if (out) { await openItem(out, thumbMsgs) }
    return out
  }
  const inputFile = await uploadParts(file, onProgress, ctl)
  let thumbFile
  if (thumb) { try { thumbFile = await uploadParts(new File([thumb], 'thumb.jpg', { type: 'image/jpeg' })) } catch {} }
  const attributes = [new Api.DocumentAttributeFilename({ fileName: file.name })]
  if (video) attributes.push(new Api.DocumentAttributeVideo({ duration: video.duration || 0, w: video.w || 0, h: video.h || 0, supportsStreaming: true }))
  const it = { name: file.name, path, t }
  const media = new Api.InputMediaUploadedDocument({
    file: inputFile, thumb: thumbFile, mimeType: file.type || 'application/octet-stream', attributes,
    forceFile: !video,
  })
  const r = await call(new Api.messages.SendMedia({ peer, media, message: await caption(it), randomId: generateRandomLong(), silent: true }))
  return parse(newMsgFrom(r))
}

/* ---------- download ---------- */
const RS = 512 * 1024
/** Read bytes [start, end] (inclusive) of a file — decrypted if needed. */
export async function readRange(it, start, end, ctl) {
  end = Math.min(end, it.size - 1)
  const a = Math.floor(start / RS) * RS
  const n = Math.ceil((end + 1 - a) / RS)
  const parts = []; let len = 0
  for (let tries = 0; ; tries++) {
    try {
      for await (const c of client.iterDownload({ file: it.msg.media, offset: bigInt(a + len), requestSize: RS, limit: n - Math.round(len / RS), fileSize: bigInt(it.size) })) {
        if (ctl && ctl.cancelled) throw new Error('Cancelled')
        parts.push(c); len += c.length
      }
      break
    } catch (e) { if ((ctl && ctl.cancelled) || tries > 3 || len % RS) throw e; await sleep(800 * (tries + 1)) }
  }
  const buf = new Uint8Array(len); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length }
  let out = buf.subarray(start - a, Math.min(len, end + 1 - a))
  if (it.enc) out = await E.ctr(it.sec.k, it.sec.c, start, out)
  return out
}
/** Parallel, ordered download. Yields Uint8Array chunks in order. */
export async function* downloadChunks(it, ctl) {
  const SEG = 2 * 1024 * 1024, W = it.size > 8 * SEG ? 4 : 2
  const segs = Math.max(1, Math.ceil(it.size / SEG))
  const pending = new Map(); let next = 0
  const startSeg = (i) => { const p = readRange(it, i * SEG, Math.min(it.size, (i + 1) * SEG) - 1, ctl); p.catch(() => {}); pending.set(i, p) }
  for (; next < Math.min(W, segs); next++) startSeg(next)
  for (let i = 0; i < segs; i++) {
    while (ctl && ctl.paused && !ctl.cancelled) await sleep(300)
    if (ctl && ctl.cancelled) throw new Error('Cancelled')
    const data = await pending.get(i); pending.delete(i)
    if (next < segs) startSeg(next++)
    yield data
  }
}
export async function downloadBlob(it, onProgress, ctl) {
  if (it.isPhoto) {
    const b = await client.downloadMedia(it.msg, {})
    return new Blob([b], { type: 'image/jpeg' })
  }
  const parts = []; let got = 0
  for await (const c of downloadChunks(it, ctl)) {
    parts.push(c); got += c.length; onProgress && onProgress(Math.min(1, got / (it.size || 1)), got)
  }
  return new Blob(parts, { type: it.mime || 'application/octet-stream' })
}
export async function downloadThumb(it, big) {
  if (it.enc) {
    const m = it.sec && it.sec.th && thumbMsgs.get(it.sec.th); if (!m) return null
    const b = await client.downloadMedia(m, {}); if (!b || !b.length) return null
    return new Blob([await E.ctr(it.sec.k, it.sec.tn, 0, new Uint8Array(b))], { type: 'image/jpeg' })
  }
  const media = it.msg.media
  const list = (media.document ? media.document.thumbs : media.photo && media.photo.sizes) || []
  const cands = list.filter((t) => ['PhotoSize', 'PhotoSizeProgressive', 'PhotoCachedSize'].includes(t.className))
  if (!cands.length) return null
  const pick = big ? cands[cands.length - 1] : (cands.find((t) => t.type === 'm') || cands.find((t) => t.type === 'x') || cands[cands.length - 1])
  const b = await client.downloadMedia(it.msg, { thumb: pick })
  return b && b.length ? new Blob([b], { type: 'image/jpeg' }) : null
}
