// Demo backend used only for local screenshots (vite.mock.config.js). Not part of the real build.
import * as cache from './cache.js'
export const API_ID = 1, API_HASH = ''
export let me = { firstName: 'Amit', lastName: 'Sami', username: 'amitsami' }
export const normPath = (p) => '/' + String(p || '/').split('/').filter(Boolean).join('/')
export const thumbMsgs = new Map()
export let vault = { id: 1, rec: { v: 1, id: 'demo' } }
const now = Date.now() / 1000
const F = (id, name, path, size, mime, extra = {}) => ({ kind: 'file', id, name, path, size, mime, date: now - id * 86400 * 3, hasThumb: false, msg: { date: now - id * 3600 }, ...extra })
const P = (id, name, hue, extra) => F(id, name, '/Photos', 2e6 + id * 1e5, 'image/jpeg', { hasThumb: true, hue, ...extra })
let items = [
  { kind: 'folder', id: 100, path: '/Documents', d: 0, date: now }, { kind: 'folder', id: 101, path: '/Research', d: 0, date: now }, { kind: 'folder', id: 102, path: '/Photos', d: 0, date: now }, { kind: 'folder', id: 103, path: '/Backups', d: 0, date: now }, { kind: 'folder', id: 104, path: '/University', d: 0, date: now },
  F(1, 'Project Plan.pdf', '/', 2.4e6, 'application/pdf', { fav: true }), F(2, 'Contract Draft.docx', '/', 380e3, 'application/msword'), F(3, 'Budget 2026.xlsx', '/', 96e3, ''),
  F(4, 'Presentation.mp4', '/', 845e6, 'video/mp4', { duration: 312, hasThumb: true, hue: 260 }), F(5, 'Thesis Slides.pptx', '/', 12e6, ''), F(6, 'archive.zip', '/', 1.2e9, ''),
  F(7, 'notes.md', '/Research', 4e3, 'text/markdown'), F(8, 'NIDS dataset.csv', '/Research', 58e6, 'text/csv'), F(9, 'Song.mp3', '/', 7e6, 'audio/mpeg', { duration: 214 }),
  F(10, 'old.txt', '/', 1e3, 'text/plain', { d: now - 3600 }), F(11, 'Passport scan.pdf', '/', 1.8e6, 'application/pdf', { enc: true, sec: {} }), F(12, 'Bank statement.pdf', '/Documents', 640e3, 'application/pdf', { enc: true, sec: {} }),
  P(20, 'Sunset at Cox’s Bazar.jpg', 18, { fav: true }), P(21, 'Mountains.jpg', 210), P(22, 'City lights.jpg', 280), P(23, 'Tea garden.jpg', 120), P(24, 'Lake.jpg', 190), P(25, 'Friends.jpg', 330, { enc: true, sec: {} }), P(26, 'Forest.jpg', 140), P(27, 'Desert.jpg', 35), P(28, 'Rain.jpg', 220), P(29, 'Flowers.jpg', 345), P(30, 'Night sky.jpg', 250), P(31, 'Beach.jpg', 195),
  F(32, 'Trip video.mp4', '/Photos', 120e6, 'video/mp4', { duration: 95, hasThumb: true, hue: 170 }),
]
items.forEach((i) => { if (i.kind === 'file' && (i.hue != null)) i.date = now - (i.id - 15) * 86400 * 9 })
export async function initClient() { return !location.hash.includes('login') }
export async function getMe() { return me } export async function ensureChannel() {}
export async function listAll() { await new Promise((r) => setTimeout(r, 400)); return items }
export async function openItem(it) { return it }
export async function editItem() {} export async function createFolder(path) { return { kind: 'folder', id: Math.floor(Math.random() * 1e6), path, d: 0, date: now } } export async function deleteIds() {}
export async function saveVault() {} export async function sendToSaved() {}
export const MAX_SIZE = () => 2e9
export async function uploadFile(file, path, { onProgress, ctl, encrypt }) { const n = 400; for (let i = 1; i <= n; i++) { await new Promise((r) => setTimeout(r, 60)); while (ctl && ctl.paused) await new Promise((r) => setTimeout(r, 200)); onProgress(i / n, (file.size * i) / n) } return F(Math.floor(Math.random() * 1e6), file.name, path, file.size, file.type, { enc: encrypt }) }
function art(hue, w = 480, h = 360) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, `hsl(${hue},75%,62%)`); sky.addColorStop(1, `hsl(${(hue + 40) % 360},80%,78%)`); g.fillStyle = sky; g.fillRect(0, 0, w, h)
  g.fillStyle = `hsla(${(hue + 180) % 360},90%,85%,.9)`; g.beginPath(); g.arc(w * 0.7, h * 0.35, h * 0.13, 0, 7); g.fill()
  for (let k = 0; k < 3; k++) { g.fillStyle = `hsla(${(hue + 200 + k * 20) % 360},40%,${30 + k * 10}%,.85)`; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (0.55 + k * 0.12) + Math.sin(x / (60 + k * 30) + k) * 30); g.lineTo(w, h); g.fill() }
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85))
}
export async function downloadThumb(it) { await new Promise((r) => setTimeout(r, 150 + Math.random() * 300)); return it.hue != null ? art(it.hue) : null }
export async function downloadBlob(it, onProgress) { if (it.hue != null) { for (let i = 1; i <= 5; i++) { await new Promise((r) => setTimeout(r, 120)); onProgress && onProgress(i / 5, it.size * i / 5) } return art(it.hue, 1600, 1100) } return new Blob(['# Notes\n\nTeleCloud demo file.\n'], { type: it.mime }) }
export async function* downloadChunks() { yield new Uint8Array(10) }
export async function readRange(it, s, e) { return new TextEncoder().encode('# Research notes\n\n- Intrusion detection with NIDS dataset\n- Compare RF vs XGBoost\n- Write chapter 3\n\nconst model = train(data, { epochs: 20 })\n') }
export async function logout() {} export async function qrLogin() { return new Promise(() => {}) } export async function sendCode() {} export async function signIn() {} export async function passwordHint() {} export async function checkPassword() {}
;(async () => {
  if (localStorage.getItem('mockseed4')) return; localStorage.setItem('mockseed4', '1')
  const mk = (n) => new Blob([new Uint8Array(n)])
  const seed = [[1, 'Project Plan.pdf', 'application/pdf', 2.4e6, true], [4, 'Presentation.mp4', 'video/mp4', 38e6], [9, 'Song.mp3', 'audio/mpeg', 7e6], [8, 'NIDS dataset.csv', 'text/csv', 12e6, true], [20, 'Sunset at Cox’s Bazar.jpg', 'image/jpeg', 4.2e6], [21, 'Mountains.jpg', 'image/jpeg', 3.1e6], [5, 'Thesis Slides.pptx', '', 9e6]]
  for (const [id, name, mime, s, pin] of seed) await cache.putMedia({ id, name, mime }, mime.startsWith('image') ? await art(id === 20 ? 18 : 210, 1600, 1100) : mk(s), { pin, force: true })
})()
