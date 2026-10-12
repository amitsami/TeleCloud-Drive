// TeleCloud icon set — consistent 24px grid, 1.7 stroke, rounded joins.
const s = (d, w = 18) => `<svg class="ico" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
// duotone: soft filled shape + crisp outline
const d2 = (fill, line, w = 18) => s(`<g fill="currentColor" stroke="none" opacity=".18">${fill}</g>${line}`, w)
export const I = {
  cloud: d2('<path d="M7 18.5a4.5 4.5 0 0 1-.7-8.95A6 6 0 0 1 17.8 8.6 4.75 4.75 0 0 1 17.3 18.5z"/>', '<path d="M7 18.5a4.5 4.5 0 0 1-.7-8.95A6 6 0 0 1 17.8 8.6 4.75 4.75 0 0 1 17.3 18.5z"/>'),
  clock: d2('<circle cx="12" cy="12" r="9"/>', '<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.2 2"/>'),
  home: d2('<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19z"/>', '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19z"/><path d="M9.5 20.5v-5.5h5v5.5"/>'),
  drive: d2('<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>', '<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.5 10.5h17"/>'),
  photo: d2('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/>', '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="9.5" r="1.6"/><path d="m4 17 4.5-4.5 3.5 3.5 2.5-2.5L20 19"/>'),
  star: s('<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7.9-5.6-4-3.9 5.6-.8z"/>'),
  starFill: s('<path fill="currentColor" d="m12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7.9-5.6-4-3.9 5.6-.8z"/>'),
  trash: s('<path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6.5 6.5l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12M10 10.5v6M14 10.5v6"/>'),
  upload: s('<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 15v2.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15"/>'),
  download: s('<path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5M5 15v2.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15"/>'),
  folderPlus: s('<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>'),
  grid: s('<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>'),
  list: s('<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r=".9" fill="currentColor"/><circle cx="4.8" cy="12" r=".9" fill="currentColor"/><circle cx="4.8" cy="17.5" r=".9" fill="currentColor"/>'),
  search: s('<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.5 4.5"/>'),
  more: s('<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
  x: s('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  edit: s('<path d="M14.5 5.5 18.5 9.5M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5z"/>'),
  move: s('<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M9 13.5h6M12.5 11l2.5 2.5-2.5 2.5"/>'),
  restore: s('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9M4.5 4.5V9H9"/>'),
  logout: s('<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16l4-4-4-4M14 12H4.5"/>'),
  chevron: s('<path d="m9.5 6 6 6-6 6"/>', 16),
  left: s('<path d="m14.5 6-6 6 6 6"/>'), right: s('<path d="m9.5 6 6 6-6 6"/>'),
  menu: s('<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>'),
  check: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  link: s('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  sort: s('<path d="M7.5 4.5v15M4.5 16.5l3 3 3-3M16.5 19.5v-15M13.5 7.5l3-3 3 3"/>'),
  phone: s('<rect x="6.5" y="3" width="11" height="18" rx="2.8"/><path d="M10.5 18h3"/>'),
  qr: s('<rect x="4" y="4" width="6" height="6" rx="1.4"/><rect x="14" y="4" width="6" height="6" rx="1.4"/><rect x="4" y="14" width="6" height="6" rx="1.4"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19.5h1M19.5 14v1"/>'),
  gear: d2('<circle cx="12" cy="12" r="8"/>', '<path d="M10.3 3.6a1.8 1.8 0 0 1 3.4 0l.3.9a1.8 1.8 0 0 0 2.4 1l.9-.4a1.8 1.8 0 0 1 2.4 2.4l-.4.9a1.8 1.8 0 0 0 1 2.4l.9.3a1.8 1.8 0 0 1 0 3.4l-.9.3a1.8 1.8 0 0 0-1 2.4l.4.9a1.8 1.8 0 0 1-2.4 2.4l-.9-.4a1.8 1.8 0 0 0-2.4 1l-.3.9a1.8 1.8 0 0 1-3.4 0l-.3-.9a1.8 1.8 0 0 0-2.4-1l-.9.4a1.8 1.8 0 0 1-2.4-2.4l.4-.9a1.8 1.8 0 0 0-1-2.4l-.9-.3a1.8 1.8 0 0 1 0-3.4l.9-.3a1.8 1.8 0 0 0 1-2.4l-.4-.9a1.8 1.8 0 0 1 2.4-2.4l.9.4a1.8 1.8 0 0 0 2.4-1z"/><circle cx="12" cy="12" r="3"/>'),
  sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
  moon: s('<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z"/>'),
  auto: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'),
  broom: s('<path d="M19.5 4.5 13 11M9.6 10.4l4 4M8.5 11.5c-2.6.4-4.2 2.6-4.5 8 5.4-.3 7.6-1.9 8-4.5"/><path d="m6.8 16.6 1.7-1.7"/>'),
  device: d2('<rect x="3" y="4.5" width="18" height="12" rx="2.5"/>', '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M8.5 20h7M12 16.5V20"/>'),
  shield: d2('<path d="M12 3.2 19 6v5.4c0 4.4-3 8-7 9.4-4-1.4-7-5-7-9.4V6z"/>', '<path d="M12 3.2 19 6v5.4c0 4.4-3 8-7 9.4-4-1.4-7-5-7-9.4V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
  shieldLock: d2('<path d="M12 3.2 19 6v5.4c0 4.4-3 8-7 9.4-4-1.4-7-5-7-9.4V6z"/>', '<path d="M12 3.2 19 6v5.4c0 4.4-3 8-7 9.4-4-1.4-7-5-7-9.4V6z"/><rect x="9" y="11" width="6" height="4.5" rx="1.2"/><path d="M10.3 11V9.8a1.7 1.7 0 0 1 3.4 0V11"/>'),
  doc: d2('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/>', '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4"/>'),
  music: d2('<circle cx="7.5" cy="17.5" r="2.8"/><circle cx="17" cy="15.5" r="2.8"/>', '<path d="M10.3 17.5V6.2l9.5-2v11.3"/><circle cx="7.5" cy="17.5" r="2.8"/><circle cx="17" cy="15.5" r="2.8"/><path d="m10.3 9.5 9.5-2"/>'),
  video: d2('<rect x="3" y="6" width="13" height="12" rx="2.8"/>', '<rect x="3" y="6" width="13" height="12" rx="2.8"/><path d="m16 10.5 4.2-2.5a.5.5 0 0 1 .8.4v7.2a.5.5 0 0 1-.8.4L16 13.5"/>'),
  box: d2('<path d="M4 7.5 12 3.5l8 4v9L12 20.5l-8-4z"/>', '<path d="M4 7.5 12 3.5l8 4v9L12 20.5l-8-4zM4 7.5l8 4 8-4M12 11.5v9"/>'),
  github: '<svg class="ico" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.2-1.2-3.2-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.4-1.1-4.4-4.7 0-1 .4-1.9 1-2.6-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.2 2.6-1 2.6-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.6 0 3.7-2.3 4.5-4.4 4.7.4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z"/></svg>',
  lock: d2('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/>', '<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5M12 14.5v2"/>'),
  unlock: d2('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/>', '<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.3-1.5M12 14.5v2"/>'),
  eye: s('<path d="M2.8 12S6.2 5.5 12 5.5 21.2 12 21.2 12 17.8 18.5 12 18.5 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="3"/>'),
  pause: s('<rect x="7" y="5.5" width="3.2" height="13" rx="1.1" fill="currentColor" stroke="none"/><rect x="13.8" y="5.5" width="3.2" height="13" rx="1.1" fill="currentColor" stroke="none"/>'),
  play: s('<path d="M8 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4A.8.8 0 0 0 8 5.6z" fill="currentColor" stroke="none"/>'),
  offline: s('<path d="M7 18.5a4.5 4.5 0 0 1-.7-8.95A6 6 0 0 1 17.8 8.6 4.75 4.75 0 0 1 17.3 18.5z"/><path d="M12 10v5.5M9.5 13l2.5 2.5 2.5-2.5"/>'),
  info: s('<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.2M12 7.8v.1"/>'),
  send: s('<path d="M20.5 3.5 10.5 13.5M20.5 3.5l-6.3 17-3.7-7-7-3.7z"/>'),
  key: s('<circle cx="8" cy="15" r="4.2"/><path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14 9l2 2"/>'),
  back: s('<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>', 20), fwd: s('<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>', 20),
  plus: s('<path d="M12 5v14M5 12h14"/>'), minus: s('<path d="M5 12h14"/>'),
  checkc: s('<circle cx="12" cy="12" r="8.8"/><path d="m8.3 12.2 2.6 2.6 4.9-5.2"/>'),
  keyboard: s('<rect x="2.5" y="6" width="19" height="12" rx="2.6"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/>'),
  sparkle: s('<path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5zM18.5 16c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z"/>'),
  select: s('<circle cx="12" cy="12" r="8.8"/><path d="m8.3 12.2 2.6 2.6 4.9-5.2"/>'),
  ext: s('<path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v3.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H10"/>'),
  telegram: '<svg class="ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.7 4.3 2.9 11.2c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.7 5.4c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.2c.3-1.2-.5-1.8-1.5-1.3zM8.6 13.8l9.4-5.9c.5-.3.9-.1.5.2l-7.9 7.2-.3 3.3z"/></svg>',
  copy: s('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.6"/><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2"/>'),
  refresh: s('<path d="M19.5 11.5a7.5 7.5 0 0 0-13.7-4L4.5 9M4.5 4.5V9H9M4.5 12.5a7.5 7.5 0 0 0 13.7 4l1.3-1.5M19.5 19.5V15H15"/>'),
  zip: d2('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/>', '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M10.5 5.5h1M10.5 8h1M10.5 10.5h1M10 13h2.5v3a1.25 1.25 0 0 1-2.5 0z"/>'),
  camera: d2('<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>', '<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.8" r="3.4"/>'),
  note: d2('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/>', '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h4"/>'),
  slides: s('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.2 9.4v5.2l4.5-2.6z" fill="currentColor"/>'),
  save: s('<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H16l3 3v11.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5z"/><path d="M8.5 4v4.5h6.5V4M8.5 20v-5.5h7V20"/>'),
  users: d2('<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0z"/>', '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.8 14.2a6.2 6.2 0 0 1 3.4 5.3"/>'),
  user: d2('<circle cx="12" cy="8.5" r="4"/>', '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
  share: s('<path d="M12 14.5V4M8 8l4-4 4 4M7 11H6.5A2.5 2.5 0 0 0 4 13.5v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4a2.5 2.5 0 0 0-2.5-2.5H17"/>'),
  join: s('<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16l4-4-4-4M14 12H4.5"/>'),
  ticket: d2('<path d="M3.5 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1.6a2.4 2.4 0 0 0 0 4.8V16a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1.6a2.4 2.4 0 0 0 0-4.8z"/>', '<path d="M3.5 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1.6a2.4 2.4 0 0 0 0 4.8V16a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1.6a2.4 2.4 0 0 0 0-4.8z"/><path d="M14.5 6v12" stroke-dasharray="1.5 2"/>'),
  crown: s('<path d="M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10z"/><path d="M4.5 20.5h15"/>'),
  palette: s('<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.5 1.6-1.5h2.1a4 4 0 0 0 4-4C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.8" cy="11.2" r="1.1" fill="currentColor"/><circle cx="10.5" cy="7.6" r="1.1" fill="currentColor"/><circle cx="15" cy="7.8" r="1.1" fill="currentColor"/>'),
  bolt: s('<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z"/>'),
}

/** Colored rounded-square icon tile (sidebar, settings rows). */
export const tile = (icon, hue) => `<span class="tile" style="--h:${hue}">${icon}</span>`

export const logo = (size = 36) => { const g = 'lg' + Math.random().toString(36).slice(2, 8); return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B7CF6"/><stop offset=".55" stop-color="#6366F1"/><stop offset="1" stop-color="#4F7BF7"/></linearGradient><radialGradient id="${g}h" cx=".3" cy=".15" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" rx="18" fill="url(#${g})"/><rect width="64" height="64" rx="18" fill="url(#${g}h)"/><path d="M21 43.5a9.5 9.5 0 0 1-1.3-18.9 12.5 12.5 0 0 1 24-1.6A10.3 10.3 0 0 1 44 43.5z" fill="#fff"/><path d="M28 34.5l9.5-5.6c.5-.3.9 0 .6.4l-5.7 8.2-.4 3.3-1.4-3.6-3-1.4c-.5-.3-.4-.9.4-1.3z" fill="#6366F1"/></svg>` }

let _u = 0
export const folderIcon = (size = 64, hue = 248) => { const u = ++_u; return `<svg class="fico" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="fb${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 68%)"/><stop offset="1" stop-color="hsl(${hue} 62% 58%)"/></linearGradient><linearGradient id="ff${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 95% 88%)"/><stop offset=".5" stop-color="hsl(${hue} 85% 79%)"/><stop offset="1" stop-color="hsl(${hue} 75% 70%)"/></linearGradient></defs><path d="M6 15.5A4.5 4.5 0 0 1 10.5 11h12.6a4 4 0 0 1 3 1.4l2.4 2.8a4 4 0 0 0 3 1.3h22a4.5 4.5 0 0 1 4.5 4.5V47a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z" fill="url(#fb${u})"/><rect x="10" y="19.5" width="44" height="12" rx="2.5" fill="#fff" opacity=".85"/><path d="M5 26.5A4.5 4.5 0 0 1 9.5 22h45a4.5 4.5 0 0 1 4.5 4.5V47.5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" fill="url(#ff${u})"/><path d="M5.6 25h52.8" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/></svg>` }

const TYPES = [
  [/^(pdf)$/, 'PDF', 4], [/^(docx?|rtf|odt|pages)$/, 'DOC', 218], [/^(xlsx?|csv|ods|numbers)$/, 'XLS', 148],
  [/^(pptx?|key|odp)$/, 'PPT', 22], [/^(zip|rar|7z|tar|gz|bz2|xz)$/, 'ZIP', 35], [/^(mp3|wav|flac|m4a|aac|ogg|opus)$/, 'AUDIO', 330],
  [/^(mp4|mkv|mov|avi|webm|m4v|3gp)$/, 'VIDEO', 268], [/^(jpe?g|png|gif|webp|heic|bmp|svg|tiff?)$/, 'IMG', 178],
  [/^(apk|exe|dmg|msi|deb|ipa|appimage)$/, 'APP', 210], [/^(js|ts|py|java|c|cpp|cs|go|rs|php|rb|html|css|json|xml|sh|sql|kt|swift)$/, 'CODE', 190],
  [/^(txt|md|log)$/, 'TXT', 240], [/^(epub|mobi)$/, 'BOOK', 30],
]
const GLYPH = {
  PDF: '<path d="M25 40.5c3-5 5-11 5-15.5 0-2.5-2.5-2.5-2.5 0 0 6 6.5 13 12.5 14 2.5.4 2.5-2.2 0-2.2-5 0-12 2.7-15 3.7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  DOC: '<path d="M23 29h18M23 34h18M23 39h12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  XLS: '<rect x="22.5" y="27.5" width="19" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M22.5 34.5h19M31 27.5v14" stroke="currentColor" stroke-width="2.2"/>',
  PPT: '<rect x="22.5" y="27.5" width="19" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M32 39.5v4M28 43.5h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  ZIP: '<path d="M31 22v3M33 25v3M31 28v3M33 31v3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="29" y="35" width="6" height="7" rx="1.6" fill="currentColor"/>',
  AUDIO: '<path d="M29 40.5V28.5l10-2v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="26.5" cy="40.5" r="3" fill="currentColor"/><circle cx="36.5" cy="38.5" r="3" fill="currentColor"/>',
  VIDEO: '<path d="M28.5 27.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  IMG: '<circle cx="27" cy="29" r="2.6" fill="currentColor"/><path d="M21.5 42l7-7.5 4.5 4.5 3-3 6.5 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>',
  CODE: '<path d="M27 29l-5 5 5 5M37 29l5 5-5 5M33.5 27l-3 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  TXT: '<path d="M23 28h18M23 33h18M23 38h11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  APP: '<rect x="24" y="26" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M28.5 34h7M32 30.5v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  BOOK: '<path d="M32 29c-3-2-6-2-9-1.5v13c3-.5 6-.5 9 1.5 3-2 6-2 9-1.5v-13c-3-.5-6-.5-9 1.5zM32 29v13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"/>',
}
export const ext = (n) => { const m = /\.([a-z0-9]{1,8})$/i.exec(n || ''); return m ? m[1].toLowerCase() : '' }
export const typeOf = (n) => { const e = ext(n); for (const [re, label, hue] of TYPES) if (re.test(e)) return { label, hue, color: `hsl(${hue} 70% 52%)` }; return { label: (e || 'FILE').toUpperCase().slice(0, 4), hue: 250, color: 'hsl(250 12% 55%)', plain: true } }
export const fileIcon = (name, size = 64) => {
  const { label, hue, plain } = typeOf(name); const u = ++_u
  const sat = plain ? 14 : 72
  const glyph = GLYPH[label] || `<text x="32" y="39" font-family="Inter Variable,Inter,system-ui,sans-serif" font-size="${label.length > 3 ? 8.5 : 10}" font-weight="750" fill="currentColor" text-anchor="middle" letter-spacing=".4">${label}</text>`
  return `<svg class="fico" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="color:hsl(${hue} ${sat}% ${plain ? 45 : 50}%)"><defs><linearGradient id="p${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} ${plain ? 20 : 100}% 99%)"/><stop offset="1" stop-color="hsl(${hue} ${plain ? 18 : 70}% 94%)"/></linearGradient><linearGradient id="c${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} ${sat}% 80%)"/><stop offset="1" stop-color="hsl(${hue} ${sat}% 66%)"/></linearGradient></defs><path d="M17.5 5h20L51 18.5V54a5 5 0 0 1-5 5H17.5a5 5 0 0 1-5-5V10a5 5 0 0 1 5-5z" fill="url(#p${u})" stroke="hsl(${hue} ${plain ? 10 : 45}% 84%)" stroke-width="1"/><path d="M37.5 5v9a4.5 4.5 0 0 0 4.5 4.5h9z" fill="url(#c${u})"/>${glyph}${GLYPH[label] ? `<rect x="19" y="47" width="26" height="7" rx="3.5" fill="hsl(${hue} ${sat}% 52%)" opacity=".12"/><text x="32" y="52.6" font-family="Inter Variable,Inter,system-ui,sans-serif" font-size="5.6" font-weight="750" fill="currentColor" text-anchor="middle" letter-spacing=".5">${label}</text>` : ''}</svg>`
}
