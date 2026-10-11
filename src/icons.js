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
  telegram: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.6 18.8 19.4c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.9 13.4 2.3 12c-1-.3-1-1 .2-1.5L20.5 3.6c.8-.3 1.6.2 1.4 1z"/></svg>`,
}

export const logo = (size = 36) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5AB8FF"/><stop offset="1" stop-color="#2A6FE8"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#lg)"/><path d="M20 44a9 9 0 0 1-1.2-17.9A12 12 0 0 1 42 25a9.5 9.5 0 0 1-1 19z" fill="#fff"/><path d="m27 36 9-5.5-2.6 9-2.2-2.6-2.4 1.6.3-3.3z" fill="#2A6FE8"/></svg>`

export const folderIcon = (size = 64) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CC4FF"/><stop offset="1" stop-color="#3D97F5"/></linearGradient><linearGradient id="ff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9AD3FF"/><stop offset="1" stop-color="#55A9F8"/></linearGradient></defs><path d="M6 16a4 4 0 0 1 4-4h14l5 5h25a4 4 0 0 1 4 4v29a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="url(#fb)"/><path d="M6 24a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="url(#ff)"/></svg>`

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
  const { label, color } = typeOf(name)
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><path d="M16 6h22l14 14v34a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" fill="#fff" stroke="rgba(0,0,0,.12)"/><path d="M38 6v10a4 4 0 0 0 4 4h10" fill="#F1F1EF" stroke="rgba(0,0,0,.12)"/><rect x="8" y="36" width="${Math.max(26, label.length * 8 + 10)}" height="15" rx="4" fill="${color}"/><text x="${8 + Math.max(26, label.length * 8 + 10) / 2}" y="47" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="9" font-weight="700" fill="#fff" text-anchor="middle">${label}</text></svg>`
}
