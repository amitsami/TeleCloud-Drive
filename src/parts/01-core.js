import './style.css'
import QRCode from 'qrcode'
import * as tg from './tg.js'
import * as E from './crypto.js'
import * as cache from './cache.js'
import { I, logo, folderIcon, fileIcon, ext } from './icons.js'

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmtSize = (b) => { if (!b) return '0 B'; const u = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.min(4, Math.floor(Math.log(b) / Math.log(1024))); return (b / 1024 ** i).toFixed(i > 1 ? 1 : 0) + ' ' + u[i] }
const fmtDate = (t) => { const d = new Date(t * 1000), n = new Date(); const same = d.toDateString() === n.toDateString(); return same ? 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' }) }
const fmtFull = (t) => new Date(t * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const fmtDur = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0') }
const fmtEta = (s) => { if (!isFinite(s) || s <= 0) return ''; if (s < 5) return 'A few seconds left'; if (s < 60) return `${Math.round(s)} s left`; if (s < 3600) return `About ${Math.round(s / 60)} min left`; return `About ${(s / 3600).toFixed(1)} h left` }
const isImg = (it) => it.isPhoto || /^image\/(jpeg|png|gif|webp|bmp|svg\+xml|avif)/.test(it.mime) || /^(jpe?g|png|gif|webp|bmp|avif)$/.test(ext(it.name))
const isVid = (it) => /^video\//.test(it.mime) || /^(mp4|webm|mov|m4v|mkv)$/.test(ext(it.name))
const isAud = (it) => /^audio\//.test(it.mime) || /^(mp3|m4a|aac|ogg|opus|wav|flac)$/.test(ext(it.name))
const isPdf = (it) => it.mime === 'application/pdf' || ext(it.name) === 'pdf'
const isText = (it) => /^text\//.test(it.mime) || /^(txt|md|json|js|ts|py|css|html|xml|csv|log|sh|yml|yaml|ini|c|cpp|h|java|go|rs|sql|kt|swift|rb|php|toml)$/.test(ext(it.name))
const parentOf = (p) => p === '/' ? '/' : '/' + p.split('/').filter(Boolean).slice(0, -1).join('/')
const baseName = (p) => p.split('/').filter(Boolean).pop() || 'Drive'
const join = (a, b) => tg.normPath(a + '/' + b)
const under = (p, root) => p === root || p.startsWith(root === '/' ? '/' : root + '/')
const errMsg = (e) => (e && (e.errorMessage || e.message)) || String(e)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const RM = () => document.documentElement.classList.contains('still') || matchMedia('(prefers-reduced-motion: reduce)').matches
const mobile = () => matchMedia('(max-width: 760px)').matches
const touch = () => matchMedia('(pointer:coarse)').matches
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

/* ---------- island notifications ---------- */
function toast(msg, kind = '', ms = 3000) {
  const box = $('#island'); if (!box) return { close() {} }
  const t = document.createElement('div'); t.className = 'isl glass ' + kind
  t.innerHTML = `<span class="isl-ic">${kind === 'red' ? I.info : kind === 'busy' ? '<span class="spin s14"></span>' : kind === 'lock' ? I.lock : I.checkc}</span><span class="isl-t">${esc(msg)}</span>`
  box.append(t)
  const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 380) }
  if (ms) setTimeout(close, ms)
  return { close, set: (m) => { $('.isl-t', t).textContent = m } }
}

/* ---------- state ---------- */
const S = {
  items: [], view: 'recents', cat: 'photos', path: '/', sel: new Set(), layout: localStorage.getItem('tc.layout') || 'grid',
  sort: localStorage.getItem('tc.sort') || 'name', q: '', qtype: 'all', loading: true, transfers: [], thumbs: new Map(), big: new Map(),
  cached: new Map(), fresh: new Set(), anim: true, hist: [], hi: -1, pz: +(localStorage.getItem('tc.pz') || 4),
}
const e2eAuto = () => localStorage.getItem('tc.e2e') === '1'
const live = () => S.items.filter((i) => !i.d)
function allFolders() {
  const set = new Map()
  for (const it of live()) {
    if (it.kind === 'folder') set.set(it.path, it)
    let p = it.kind === 'folder' ? parentOf(it.path) : it.path
    while (p !== '/') { if (!set.has(p)) set.set(p, null); p = parentOf(p) }
  }
  set.delete('/')
  return set
}
function folderEntries(path) {
  const out = []
  for (const [p, msg] of allFolders()) if (parentOf(p) === path) out.push({ kind: 'folder', path: p, name: baseName(p), id: msg ? msg.id : 'v:' + p, virtual: !msg, date: msg ? msg.date : 0 })
  return out
}
function folderStats(p) { let n = 0, size = 0; for (const it of live()) if (it.kind === 'file' && under(it.path, p)) { n++; size += it.size } return { n, size } }
function sortItems(arr) {
  const k = S.sort
  return arr.sort((a, b) => (a.kind !== b.kind ? (a.kind === 'folder' ? -1 : 1) :
    k === 'date' ? (b.date - a.date) : k === 'size' ? ((b.size || 0) - (a.size || 0)) : k === 'kind' ? (ext(a.name).localeCompare(ext(b.name)) || a.name.localeCompare(b.name)) : a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })))
}
const catOfIt = (i) => cache.catOf(i.mime, i.name)
function visible() {
  const q = S.q.trim().toLowerCase()
  if (q || S.view === 'search') {
    const files = live().filter((i) => i.kind === 'file' && i.name.toLowerCase().includes(q) && (S.qtype === 'all' || catOfIt(i) === S.qtype))
    const folders = S.qtype === 'all' ? [...allFolders().keys()].filter((p) => baseName(p).toLowerCase().includes(q)).map((p) => ({ kind: 'folder', path: p, name: baseName(p), id: 'v:' + p, virtual: true, date: 0 })) : []
    return sortItems([...folders, ...files])
  }
  if (S.view === 'drive') return sortItems([...folderEntries(S.path), ...live().filter((i) => i.kind === 'file' && i.path === S.path)])
  if (S.view === 'recents') return live().filter((i) => i.kind === 'file').sort((a, b) => (b.msg?.date || b.date) - (a.msg?.date || a.date)).slice(0, 60)
  if (S.view === 'favorites') return sortItems(live().filter((i) => i.kind === 'file' && i.fav))
  if (S.view === 'offline') return sortItems(live().filter((i) => i.kind === 'file' && S.cached.has(i.id)))
  if (S.view === 'trash') return S.items.filter((i) => i.d).sort((a, b) => b.d - a.d)
  if (S.view === 'cat') return sortItems(live().filter((i) => i.kind === 'file' && catOfIt(i) === S.cat))
  if (S.view === 'photos') return live().filter((i) => i.kind === 'file' && (isImg(i) || isVid(i))).sort((a, b) => b.date - a.date)
  return []
}
const key = (i) => String(i.id)
const byKey = (k) => (S._vis || []).find((i) => key(i) === k) || S.items.find((i) => key(i) === k)
async function refreshCached() { const l = await cache.list(); S.cached = new Map(l.map((m) => [m.id, m])) }
