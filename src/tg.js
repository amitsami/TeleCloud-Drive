import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { computeCheck } from 'telegram/Password'
import { generateRandomLong, sleep } from 'telegram/Helpers'
import bigInt from 'big-integer'

export const API_ID = 34826054
export const API_HASH = 'e74ce2d97677942dace5be1495411cb2'
const META = 'tc:'
const FOLDER = 'tc-folder:'
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
    deviceModel: 'TeleCloud Web', appVersion: '1.0', systemVersion: navigator.platform || 'Web',
  })
  client.setLogLevel('none')
  await client.connect()
  return s ? await client.checkAuthorization().catch(() => false) : false
}
export function saveSession() { localStorage.setItem(LS_SESSION, client.session.save()) }
export async function logout() {
  try { await client.invoke(new Api.auth.LogOut()) } catch {}
  localStorage.removeItem(LS_SESSION); localStorage.removeItem(LS_CHANNEL)
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
  return {
    kind: 'file', id: m.id, name: meta.n || name, path: normPath(meta.p || '/'), fav: !!meta.f, d: meta.d || 0,
    size, mime, duration, date: meta.t || m.date, hasThumb, isPhoto: !!photo, msg: m,
  }
}
const caption = (it) => {
  const meta = { n: it.name, p: it.path }
  if (it.fav) meta.f = 1
  if (it.d) meta.d = it.d
  if (it.t) meta.t = it.t
  return `${it.name}\n${META}${JSON.stringify(meta)}`
}
const folderText = (f) => FOLDER + JSON.stringify(f.d ? { p: f.path, d: f.d } : { p: f.path })

export async function listAll(onProgress) {
  const out = []
  for await (const m of client.iterMessages(peer, { limit: undefined, waitTime: 0 })) {
    const it = parse(m); if (it) out.push(it)
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
  const message = it.kind === 'folder' ? folderText(it) : caption(it)
  await call(new Api.messages.EditMessage({ peer, id: it.id, message, noWebpage: true }))
}
export async function deleteIds(ids) {
  for (let i = 0; i < ids.length; i += 100)
    await call(new Api.channels.DeleteMessages({ channel: inputChannel, id: ids.slice(i, i + 100) }))
}

/* ---------- upload (streams from disk, parallel parts) ---------- */
export const MAX_SIZE = () => (me && me.premium ? 4000 : 2000) * 1024 * 1024 * 1.024 // 2 GB / 4 GB
async function uploadParts(file, onProgress, ctl) {
  const partSize = 512 * 1024
  const parts = Math.max(1, Math.ceil(file.size / partSize))
  const big = file.size > 10 * 1024 * 1024
  const fileId = generateRandomLong()
  let next = 0, done = 0
  const workers = Math.min(big ? 8 : 4, parts)
  const work = async () => {
    while (next < parts) {
      if (ctl && ctl.cancelled) throw new Error('Cancelled')
      const i = next++
      const bytes = Buffer.from(await file.slice(i * partSize, Math.min(file.size, (i + 1) * partSize)).arrayBuffer())
      const req = big
        ? new Api.upload.SaveBigFilePart({ fileId, filePart: i, fileTotalParts: parts, bytes })
        : new Api.upload.SaveFilePart({ fileId, filePart: i, bytes })
      await call(req, 10)
      done++; onProgress && onProgress(done / parts, done * partSize)
    }
  }
  await Promise.all(Array.from({ length: workers }, work))
  return big ? new Api.InputFileBig({ id: fileId, parts, name: file.name })
             : new Api.InputFile({ id: fileId, parts, name: file.name, md5Checksum: '' })
}

export async function uploadFile(file, path, { onProgress, ctl, thumb, video } = {}) {
  const inputFile = await uploadParts(file, onProgress, ctl)
  let thumbFile
  if (thumb) { try { thumbFile = await uploadParts(new File([thumb], 'thumb.jpg', { type: 'image/jpeg' })) } catch {} }
  const attributes = [new Api.DocumentAttributeFilename({ fileName: file.name })]
  if (video) attributes.push(new Api.DocumentAttributeVideo({ duration: video.duration || 0, w: video.w || 0, h: video.h || 0, supportsStreaming: true }))
  const it = { name: file.name, path, t: Math.floor((file.lastModified || Date.now()) / 1000) }
  const media = new Api.InputMediaUploadedDocument({
    file: inputFile, thumb: thumbFile, mimeType: file.type || 'application/octet-stream', attributes,
    forceFile: !video,
  })
  const r = await call(new Api.messages.SendMedia({ peer, media, message: caption(it), randomId: generateRandomLong(), silent: true }))
  return parse(newMsgFrom(r))
}

/* ---------- download ---------- */
export async function* downloadChunks(it) {
  for await (const chunk of client.iterDownload({ file: it.msg.media, requestSize: 1024 * 1024, fileSize: bigInt(it.size || 0) })) yield chunk
}
export async function downloadBlob(it, onProgress, ctl) {
  if (it.isPhoto) {
    const b = await client.downloadMedia(it.msg, {})
    return new Blob([b], { type: 'image/jpeg' })
  }
  const parts = []; let got = 0
  for await (const c of downloadChunks(it)) {
    if (ctl && ctl.cancelled) throw new Error('Cancelled')
    parts.push(c); got += c.length; onProgress && onProgress(Math.min(1, got / (it.size || 1)), got)
  }
  return new Blob(parts, { type: it.mime || 'application/octet-stream' })
}
export async function downloadThumb(it) {
  const media = it.msg.media
  const list = (media.document ? media.document.thumbs : media.photo && media.photo.sizes) || []
  const cands = list.filter((t) => ['PhotoSize', 'PhotoSizeProgressive', 'PhotoCachedSize'].includes(t.className))
  if (!cands.length) return null
  const pick = cands.find((t) => t.type === 'm') || cands.find((t) => t.type === 'x') || cands[cands.length - 1]
  const b = await client.downloadMedia(it.msg, { thumb: pick })
  return b && b.length ? new Blob([b], { type: 'image/jpeg' }) : null
}
