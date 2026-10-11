const s = (d, w = 18) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
export const I = {
  cloud: s('<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.75 4.75 0 0 1-.5 9.5H7z"/>'),
  clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  drive: s('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  photo: s('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
  star: s('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  starFill: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>`,
  trash: s('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
  upload: s('<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'),
  download: s('<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>'),
  folderPlus: s('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>'),
  grid: s('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  list: s('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
  search: s('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  more: s('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
  x: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  edit: s('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  move: s('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M10 13h6M13 10l3 3-3 3"/>'),
  restore: s('<path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7M4 4v4.7h4.7"/>'),
  logout: s('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>'),
  chevron: s('<path d="m9 6 6 6-6 6"/>', 14),
  left: s('<path d="m15 6-6 6 6 6"/>', 22),
  right: s('<path d="m9 6 6 6-6 6"/>', 22),
  menu: s('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  check: s('<path d="m5 12 5 5 9-10"/>'),
  link: s('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  sort: s('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'),
  phone: s('<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>'),
  qr: s('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/>'),
  gear: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: s('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  auto: s('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
  broom: s('<path d="M14 4l6 6M12.5 5.5l6 6-7 7a3 3 0 0 1-4.2 0l-1.8-1.8a3 3 0 0 1 0-4.2zM5 19l-2 2"/>'),
  device: s('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  shield: s('<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  doc: s('<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  music: s('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  video: s('<rect x="3" y="5" width="13" height="14" rx="2.5"/><path d="m16 10 5-3v10l-5-3"/>'),
  box: s('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  github: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.5-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>`,
  lock: s('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>'),
  unlock: s('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8 10.5V7.8a4 4 0 0 1 7.6-1.7"/>'),
  eye: s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  pause: s('<path d="M9 6v12M15 6v12"/>'),
  play: s('<path d="M8 5.5v13l10.5-6.5z"/>'),
  offline: s('<path d="M7 18.5h10.2a4.3 4.3 0 0 0 .6-8.55A6 6 0 0 0 6.3 9.1 4.7 4.7 0 0 0 7 18.5z"/><path d="M12 10v5.5m-2.4-2.3L12 15.6l2.4-2.4"/>'),
  info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>'),
  send: s('<path d="M21 3 10.2 13.8M21 3l-6.8 18-4-7.2L3 9.8z"/>'),
  key: s('<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7m-3 3 2.5 2.5m-5-.5 2 2"/>'),
  back: s('<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>'),
  fwd: s('<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  minus: s('<path d="M5 12h14"/>'),
  checkc: s('<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16.2 9.6"/>'),
  keyboard: s('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>'),
  sparkle: s('<path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9z"/>'),
  select: s('<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16.2 9.6"/>'),
  ext: s('<path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>'),
  telegram: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.6 18.8 19.4c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.9 13.4 2.3 12c-1-.3-1-1 .2-1.5L20.5 3.6c.8-.3 1.6.2 1.4 1z"/></svg>`,
}

export const logo = (size = 36) => { const g = "lg" + Math.random().toString(36).slice(2, 8); return `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5AB8FF"/><stop offset="1" stop-color="#2A6FE8"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#${g})"/><path d="M20 44a9 9 0 0 1-1.2-17.9A12 12 0 0 1 42 25a9.5 9.5 0 0 1-1 19z" fill="#fff"/><path d="m27 36 9-5.5-2.6 9-2.2-2.6-2.4 1.6.3-3.3z" fill="#2A6FE8"/></svg>` }

let _u = 0
export const folderIcon = (size = 64) => { const u = ++_u; return `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="fb${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FA8F7"/><stop offset="1" stop-color="#2B86EC"/></linearGradient><linearGradient id="ff${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CCBFF"/><stop offset="1" stop-color="#4FA6F6"/></linearGradient></defs><path d="M6 15.5A3.5 3.5 0 0 1 9.5 12h13.2a3.5 3.5 0 0 1 2.6 1.2l2.9 3.3h26.3A3.5 3.5 0 0 1 58 20v29.5A3.5 3.5 0 0 1 54.5 53h-45A3.5 3.5 0 0 1 6 49.5z" fill="url(#fb${u})"/><path d="M6 25a3.5 3.5 0 0 1 3.5-3.5h45A3.5 3.5 0 0 1 58 25v24.5a3.5 3.5 0 0 1-3.5 3.5h-45A3.5 3.5 0 0 1 6 49.5z" fill="url(#ff${u})"/><path d="M9.5 22h45" stroke="#fff" stroke-opacity=".55" stroke-width="1"/></svg>` }

const TYPES = [
  [/^(pdf)$/, 'PDF', '#E5484D'], [/^(docx?|rtf|odt|pages)$/, 'DOC', '#2B7CE9'], [/^(xlsx?|csv|ods|numbers)$/, 'XLS', '#1F9D57'],
  [/^(pptx?|key|odp)$/, 'PPT', '#E8772E'], [/^(zip|rar|7z|tar|gz|bz2|xz)$/, 'ZIP', '#8E8A84'], [/^(mp3|wav|flac|m4a|aac|ogg|opus)$/, 'AUDIO', '#E5487F'],
  [/^(mp4|mkv|mov|avi|webm|m4v|3gp)$/, 'VIDEO', '#8B5CF6'], [/^(jpe?g|png|gif|webp|heic|bmp|svg|tiff?)$/, 'IMG', '#0EA5A4'],
  [/^(apk|exe|dmg|msi|deb|ipa|appimage)$/, 'APP', '#475569'], [/^(js|ts|py|java|c|cpp|cs|go|rs|php|rb|html|css|json|xml|sh|sql|kt|swift)$/, 'CODE', '#0F766E'],
  [/^(txt|md|log)$/, 'TXT', '#6B7280'], [/^(epub|mobi)$/, 'BOOK', '#B45309'],
]
export const ext = (n) => { const m = /\.([a-z0-9]{1,8})$/i.exec(n || ''); return m ? m[1].toLowerCase() : '' }
export const typeOf = (n) => { const e = ext(n); for (const [re, label, color] of TYPES) if (re.test(e)) return { label, color }; return { label: (e || 'FILE').toUpperCase().slice(0, 4), color: '#8E8A84' } }
export const fileIcon = (name, size = 64) => {
  const { label, color } = typeOf(name); const u = ++_u
  const fs = label.length > 4 ? 7.5 : 8.5
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="p${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F3F4F6"/></linearGradient><filter id="s${u}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-opacity=".14"/></filter></defs><g filter="url(#s${u})"><path d="M17 5h20.5L51 18.5V55a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z" fill="url(#p${u})"/></g><path d="M37.5 5v9.5a4 4 0 0 0 4 4H51" fill="#E5E7EB"/><rect x="18" y="38" width="28" height="13" rx="6.5" fill="${color}"/><text x="32" y="47.2" font-family="Segoe UI,Roboto,sans-serif" font-size="${fs}" font-weight="700" letter-spacing=".3" fill="#fff" text-anchor="middle">${label}</text><path d="M20 24h18M20 29h24" stroke="${color}" stroke-opacity=".28" stroke-width="2.4" stroke-linecap="round"/></svg>`
}
