/* TeleCloud skins: theme list + decorative art (all original drawings) */
// Original chibi hero characters (generic archetypes, no official designs)
const O='#1B1530';
const star=(cx,cy,r,f)=>{let p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;p.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1))}return `<polygon points="${p.join(' ')}" fill="${f}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`};
const emb={
 star:(c)=>star(70,104,10,c),
 bolt:(c)=>`<path d="M74 92 62 106h8l-4 12 12-15h-8z" fill="${c}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`,
 tri:(c)=>`<path d="M70 94 80 112H60z" fill="${c}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/><path d="M70 100 75 109h-10z" fill="#fff" opacity=".7"/>`,
 diamond:(c,c2='#E63946')=>`<path d="M58 96h24l6 7-18 16-18-16z" fill="${c}" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>${star(70,105,6,c2)}`,
 moon:(c)=>`<ellipse cx="70" cy="104" rx="15" ry="9" fill="${c}" stroke="${O}" stroke-width="2"/><path d="M64 98a7 7 0 1 0 9 10 6 6 0 1 1-9-10z" fill="${O}"/>`,
 chev:(c)=>`<path d="M52 94l18 10 18-10v7l-18 10-18-10z" fill="${c}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`,
 ring:(c)=>`<circle cx="70" cy="104" r="9" fill="none" stroke="${c}" stroke-width="4"/><circle cx="70" cy="104" r="9" fill="none" stroke="${O}" stroke-width="1.5"/>`,
 none:()=>''
};
function hero(o){const{skin='#F7C9A0',suit='#E63946',suit2=suit,glove=suit2,boot=suit2,belt='#F2C230',mask='band',maskc='#1B1530',hair='#3a2a1a',hs='spiky',cape=null,em='star',emc='#F2C230',pose='stand',item=null,eye='#fff',glow=null,ears=false,tiara=null,w=140}=o;
 const S=`stroke="${O}" stroke-width="3" stroke-linejoin="round"`;let g='';
 // aura
 if(glow)g+=`<ellipse cx="70" cy="100" rx="62" ry="74" fill="url(#gl${glow.replace('#','')})" opacity=".55"/><defs><radialGradient id="gl${glow.replace('#','')}"><stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>`;
 if(cape)g+= pose==='fly'?`<path d="M50 86 C20 100 8 130 2 150 C30 140 40 150 58 140 L90 86z" fill="${cape}" ${S}/>`:`<path d="M48 86 C34 110 30 140 28 166 L112 166 C110 140 106 110 92 86z" fill="${cape}" ${S}/><path d="M40 166 C52 158 88 158 100 166" fill="none" stroke="#000" stroke-opacity=".15" stroke-width="3"/>`;
 // legs
 if(pose==='fly'){g+=`<rect x="58" y="118" width="14" height="40" rx="7" fill="${suit2}" ${S} transform="rotate(28 65 120)"/><rect x="72" y="118" width="14" height="36" rx="7" fill="${suit2}" ${S} transform="rotate(38 79 120)"/><rect x="40" y="144" width="18" height="14" rx="6" fill="${boot}" ${S} transform="rotate(28 65 120)"/>`}
 else{g+=`<rect x="54" y="118" width="14" height="40" rx="6" fill="${suit2}" ${S}/><rect x="72" y="118" width="14" height="40" rx="6" fill="${suit2}" ${S}/><path d="M51 146h19v12a4 4 0 0 1-4 4H51z" fill="${boot}" ${S}/><path d="M70 146h19v16H74a4 4 0 0 1-4-4z" fill="${boot}" ${S}/>`}
 // arms
 const arm=(x,y,rot,len=34)=>`<g transform="rotate(${rot} ${x} ${y})"><rect x="${x-7}" y="${y}" width="14" height="${len}" rx="7" fill="${suit}" ${S}/><circle cx="${x}" cy="${y+len}" r="8.5" fill="${glove}" ${S}/></g>`;
 if(pose==='fly')g+=arm(88,90,-150,36)+arm(52,90,30,30);
 else if(pose==='power')g+=arm(50,90,120,32)+arm(90,90,-120,32);
 else if(pose==='hips')g+=arm(50,90,40,26)+arm(90,90,-40,26);
 else g+=arm(50,90,22,32)+arm(90,90,-22,32);
 // torso
 g+=`<rect x="46" y="84" width="48" height="42" rx="15" fill="${suit}" ${S}/>`;
 if(belt)g+=`<rect x="47" y="116" width="46" height="7" fill="${belt}" stroke="${O}" stroke-width="2"/>`;
 g+=(emb[em]||emb.none)(emc);
 // head
 const hc=mask==='helmet'?maskc:skin;
 if(ears&&mask==='cowl')g+=`<path d="M46 40 44 14 58 30z M94 40 96 14 82 30z" fill="${maskc}" ${S}/>`;
 if(hs==='long'&&mask!=='helmet')g+=`<path d="M36 52 C34 20 106 20 104 52 L108 98 C96 104 86 96 88 80 L52 80 C54 96 44 104 32 98z" fill="${hair}" ${S}/>`;
 g+=`<circle cx="70" cy="54" r="31" fill="${hc}" ${S}/>`;
 if(mask==='cowl')g+=`<path d="M39 56 C38 26 102 26 101 56 L101 60 C92 66 82 58 76 64 L64 64 C58 58 48 66 39 60z" fill="${maskc}"/><path d="M39 56 C38 26 102 26 101 56" fill="none" ${S}/>`;
 if(mask==='helmet')g+=`<path d="M48 48h44v14c0 12-10 20-22 20s-22-8-22-20z" fill="${o.face||'#F2C230'}" ${S}/>`;
 // hair
 if(mask!=='helmet'&&mask!=='cowl'){
  if(hs==='spiky')g+=`<path d="M40 50 C38 22 58 18 70 22 C84 16 104 26 100 50 L94 40 88 46 84 34 76 42 70 32 62 42 56 34 50 46z" fill="${hair}" ${S}/>`;
  if(hs==='curl')g+=`<path d="M40 50 C38 22 102 22 100 50 C92 34 70 30 52 36z" fill="${hair}" ${S}/><path d="M66 34c-6 4-2 12 4 8" fill="none" stroke="${hair}" stroke-width="4" stroke-linecap="round"/>`;
  if(hs==='long')g+=`<path d="M40 52 C38 22 102 22 100 52 C90 36 70 34 60 40 C54 44 46 46 40 52z" fill="${hair}" ${S}/>`;
  if(hs==='bun')g+=`<circle cx="70" cy="20" r="11" fill="${hair}" ${S}/><path d="M40 50 C38 24 102 24 100 50 C92 36 50 36 40 50z" fill="${hair}" ${S}/>`;
 }
 if(tiara)g+=`<path d="M46 38 Q70 28 94 38 L92 44 Q70 36 48 44z" fill="${tiara}" stroke="${O}" stroke-width="2"/>${star(70,36,6,'#E63946')}`;
 // eyes
 if(mask==='helmet'){g+=`<path d="M53 56h13l-2 5H55z M74 56h13l-2 5H76z" fill="${eye}"/><path d="M53 56h13l-2 5H55z M74 56h13l-2 5H76z" fill="none" stroke="${eye}" stroke-width="2" style="filter:drop-shadow(0 0 4px ${eye})"/>`}
 else{
  if(mask==='band')g+=`<path d="M38 50 C50 44 90 44 102 50 L101 63 C90 58 50 58 39 63z" fill="${maskc}" stroke="${O}" stroke-width="2"/>`;
  if(mask==='cowl'||mask==='band'&&o.white)g+=`<path d="M50 52 l14 4 -2 6 -11 -3z M90 52 l-14 4 2 6 11 -3z" fill="${eye}" stroke="${O}" stroke-width="1.5"/>`;
  else{g+=`<ellipse cx="58" cy="56" rx="6" ry="7" fill="#fff" stroke="${O}" stroke-width="2"/><ellipse cx="82" cy="56" rx="6" ry="7" fill="#fff" stroke="${O}" stroke-width="2"/><circle cx="59" cy="57" r="3.4" fill="${O}"/><circle cx="83" cy="57" r="3.4" fill="${O}"/><circle cx="60.3" cy="55.5" r="1.2" fill="#fff"/><circle cx="84.3" cy="55.5" r="1.2" fill="#fff"/>`}
  g+=`<path d="M63 70 Q70 76 77 70" fill="none" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="4" ry="2.5" fill="#FF7A8A" opacity=".45"/><ellipse cx="90" cy="66" rx="4" ry="2.5" fill="#FF7A8A" opacity=".45"/>`;
 }
 // items
 if(item==='hexshield')g+=`<g transform="translate(2 86)"><path d="M22 0 42 11v22L22 44 2 33V11z" fill="#3B6FD8" ${S}/><path d="M22 8 35 15v14L22 36 9 29V15z" fill="#C7D2E8" stroke="${O}" stroke-width="2"/><path d="M25 12 17 24h6l-3 9 9-12h-6z" fill="#E63946"/></g>`;
 if(item==='zap')g+=`<path d="M112 40 98 62h10l-6 18 18-26h-10l6-14z" fill="#FFE14D" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/><path d="M28 40 16 58h8l-5 14 14-20h-8l5-12z" fill="#FFE14D" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>`;
 if(item==='trident')g+=`<g><rect x="106" y="40" width="5" height="120" rx="2" fill="#F2C230" ${S}/><path d="M98 26v18h22V26l-3 10h-4l-2-14-2 14h-4z" fill="#F2C230" ${S}/></g>`;
 if(item==='lasso')g+=`<ellipse cx="112" cy="132" rx="14" ry="9" fill="none" stroke="#F2C230" stroke-width="4"/><path d="M100 128 C110 118 118 112 106 108" fill="none" stroke="#F2C230" stroke-width="4"/>`;
 if(item==='bracers')g+='';
 if(item==='orb')g+=`<circle cx="114" cy="56" r="12" fill="${o.orb||'#7CF2FF'}" stroke="${O}" stroke-width="2.4" style="filter:drop-shadow(0 0 8px ${o.orb||'#7CF2FF'})"/><circle cx="110" cy="52" r="3" fill="#fff"/>`;
 if(item==='speed')g=`<path d="M-30 96h40M-40 110h46M-24 124h34" stroke="${o.speedc||'#FFD23F'}" stroke-width="5" stroke-linecap="round" opacity=".9"/>`+g;
 if(item==='robot')g+='';
 return `<svg class="${o.cls||'chr'}" width="${w}" viewBox="-40 0 200 180" style="${o.style||''}" overflow="visible">${g}</svg>`;
}
const bubble=(t,c='#fff',tc='#1B1530',cls='bub',style='')=>`<div class="${cls}" style="${style}"><span style="background:${c};color:${tc}">${t}</span></div>`;
const sfx=(t,c1,c2,style,s=1)=>{const n=24;let p=[];for(let i=0;i<n;i++){const a=i*2*Math.PI/n,r=i%2?30:46;p.push((50+r*Math.cos(a)).toFixed(1)+','+(50+r*Math.sin(a)).toFixed(1))}return `<div class="sfx" style="${style};transform:rotate(-8deg) scale(${s})"><svg viewBox="0 0 100 100" width="110"><polygon points="${p.join(' ')}" fill="${c1}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><text x="50" y="58" text-anchor="middle" font-family="sk-bangers" font-size="24" fill="${c2}" stroke="${O}" stroke-width="1.2">${t}</text></svg></div>`};


export const SKINS = [
  // id, name, mode, preview [wall, side, hero, accent, card, outline]
  ['neopop', 'Neo Pop', 'light', ['#FFF8EA', '#F4EEFF', '#EEF1FF', '#7C6CF2', '#fff', '#111']],
  ['paper', 'Paper', 'light', ['#FFF8EA', '#F0EBE3', '#F0EBE3', '#C8553D', '#fff', '#E4DBCD']],
  ['peach', 'Peach Soft', 'light', ['#FFF5E4', '#F9F5F6', '#FFDDE0', '#FF6B6B', '#fff', '#fff0']],
  ['aurora', 'Aurora', 'light', ['#E3E0FF', '#ffffff99', '#ffffff80', '#8B5CF6', '#ffffffaa', '#fff0']],
  ['comic', 'Hero Comic', 'light', ['#FFF8EA', '#B3121B', '#FFC72C', '#E62429', '#fff', '#111']],
  ['guardian', 'Night Guardian', 'dark', ['#0B0D12', '#0E1117', '#1B2232', '#F5C518', '#121620', '#232a38']],
  ['sakura', 'Sakura Anime', 'light', ['#FFF0F6', '#ffffffbb', '#BFE2FF', '#FF5FA2', '#fff', '#fff0']],
  ['cartoon', 'Cartoon Pop', 'light', ['#FFF5E4', '#8EDCFF', '#B9F3C9', '#6C5CE7', '#fff', '#2B2250']],
  ['forest', 'Forest', 'light', ['#F0EBE3', '#24412C', '#E3F0D5', '#2F6B3F', '#FBF8F2', '#E1D9CB']],
  ['meadow', 'Meadow Dream', 'light', ['#D6EDF8', '#FFFCF3', '#8FCBEF', '#5E8F4E', '#FFFCF3', '#fff0']],
  ['bavarian', 'Bavarian Stripe', 'light', ['#F3F4F6', '#14171C', '#fff', '#1C69D4', '#fff', '#E1E5EA']],
  ['silver', 'Silver Luxe', 'dark', ['#0B0B0C', '#141416', '#1c1d20', '#D5D8DD', '#121214', '#2c2d31']],
  ['racing', 'Racing Heritage', 'light', ['#F7F5F2', '#fff', '#121212', '#C8102E', '#fff', '#E6E2DC']],
  ['synth', 'Synthwave', 'dark', ['#2A0B47', '#14062a', '#3B0D5A', '#FF2E97', '#ffffff10', '#ff71ce55']],
  ['cyber', 'Cyber Neon', 'dark', ['#07080C', '#0B0D12', '#10141c', '#FCEE0A', '#0d1117', '#1d2a36']],
  ['pixel', 'Pixel Arcade', 'light', ['#EEF1FF', '#F4EEFF', '#5C94FC', '#6C5CE7', '#fff', '#1B1B2F']],
  ['galaxy', 'Galaxy', 'dark', ['#0b0820', '#ffffff12', '#2a1a5a', '#8C5CFF', '#ffffff10', '#ffffff20']],
  ['web', 'Web Hero', 'light', ['#F4F6FF', '#1E3FA8', '#E11D2E', '#E11D2E', '#fff', '#0B0F24']],
  ['squad', 'Hero Squad', 'light', ['#FFF6E6', '#C8102E', '#8E0B1F', '#C8102E', '#fff', '#1B1530']],
  ['justice', 'Justice Night', 'dark', ['#060B1F', '#0E1A44', '#14287A', '#3B7BFF', '#ffffff0a', '#22306a']],
]
export const DEF_SKIN = 'neopop'
export const skinOf = (id) => SKINS.find((s) => s[0] === id) || SKINS[0]

/* ---- art ---- */
const rnd = (n, seed) => { let x = seed; const r = () => (x = (x * 16807) % 2147483647) / 2147483647; return Array.from({ length: n }, () => [r(), r(), r()]) }
const burst = (c, s = 210) => `<svg class="sk-burst" width="${s}" height="${s}" viewBox="0 0 100 100"><polygon points="${Array.from({ length: 28 }, (_, i) => { const a = i * Math.PI / 14, r = i % 2 ? 32 : 50; return (50 + r * Math.cos(a)).toFixed(1) + ',' + (50 + r * Math.sin(a)).toFixed(1) }).join(' ')}" fill="${c}" stroke="#111" stroke-width="2.5"/></svg>`
const skyline = (f = '#000', o = '.55') => `<svg class="sk-sky" viewBox="0 0 600 160" preserveAspectRatio="none"><path d="M0 160V90h30V60h20v30h25V40h18v-20h8v20h18v120h20V70h40v40h22V30h10V10h4v20h10v130h30V80h26V50h30v110h24V95h30V60h12V35h20v25h14v100h30V85h22v-30h26v105h28V70h40v90z" fill="${f}" opacity="${o}"/></svg>`
const clouds = (o = 1) => `<svg class="sk-clouds" viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice"><g fill="#fff" opacity="${o}"><ellipse cx="120" cy="70" rx="70" ry="26"/><circle cx="95" cy="55" r="28"/><circle cx="140" cy="48" r="34"/><ellipse cx="560" cy="50" rx="90" ry="24"/><circle cx="530" cy="36" r="26"/><circle cx="585" cy="30" r="32"/><ellipse cx="700" cy="120" rx="60" ry="18"/><circle cx="690" cy="108" r="20"/><circle cx="720" cy="104" r="24"/><ellipse cx="330" cy="150" rx="70" ry="18"/><circle cx="320" cy="138" r="22"/></g></svg>`
const hills = `<svg class="sk-hills" viewBox="0 0 800 200" preserveAspectRatio="none"><path d="M0 120 C120 70 220 90 330 120 S560 60 800 100 V200 H0z" fill="#9BCB7A"/><path d="M0 150 C160 110 280 150 420 140 S650 110 800 140 V200 H0z" fill="#6FAE5A"/><path d="M0 175 C200 150 400 185 800 165 V200 H0z" fill="#4E8F45"/><circle cx="640" cy="95" r="6" fill="#E25C5C"/><rect x="637" y="100" width="6" height="10" fill="#8B5A3C"/></svg>`
const petals = () => `<div class="sk-petals">${rnd(16, 7).map(([a, b, s]) => `<i style="left:${(a * 100).toFixed(1)}%;top:${(b * 100).toFixed(1)}%;--r:${Math.round(s * 360)}deg;--s:${(.6 + s * .8).toFixed(2)};--d:${(6 + s * 8).toFixed(1)}s"></i>`).join('')}</div>`
const leaves = () => `<div class="sk-leaves">${rnd(9, 3).map(([a, b, s]) => `<svg style="left:${(a * 96).toFixed(1)}%;top:${(b * 90).toFixed(1)}%;transform:rotate(${Math.round(s * 360)}deg)" width="${Math.round(30 + s * 30)}" viewBox="0 0 40 40"><path d="M4 36C4 16 16 4 36 4c0 20-12 32-32 32z" fill="#3F7D4A" opacity=".18"/><path d="M6 34 30 10" stroke="#3F7D4A" stroke-opacity=".25" stroke-width="1.5"/></svg>`).join('')}</div>`
const blobs = `<svg class="sk-blobs" width="220" height="170" viewBox="0 0 260 200"><circle cx="70" cy="80" r="46" fill="#FFD23F" stroke="#2B2250" stroke-width="4"/><circle cx="170" cy="60" r="30" fill="#FF6B9A" stroke="#2B2250" stroke-width="4"/><circle cx="200" cy="150" r="20" fill="#8EDCFF" stroke="#2B2250" stroke-width="4"/><circle cx="58" cy="72" r="5" fill="#2B2250"/><circle cx="86" cy="72" r="5" fill="#2B2250"/><path d="M58 92q14 12 28 0" fill="none" stroke="#2B2250" stroke-width="4" stroke-linecap="round"/><circle cx="162" cy="56" r="3.5" fill="#2B2250"/><circle cx="178" cy="56" r="3.5" fill="#2B2250"/></svg>`
const web = (s = 360, o = .5, c = '#000') => { const out = [], L = 12; for (let i = 0; i <= L; i++) { const a = i * Math.PI / 2 / L; out.push(`<line x1="0" y1="0" x2="${(s * Math.cos(a)).toFixed(1)}" y2="${(s * Math.sin(a)).toFixed(1)}"/>`) } for (let r = 40; r <= s; r += 42) { let d = ''; for (let i = 0; i <= L; i++) { const a = i * Math.PI / 2 / L; const x = (r * Math.cos(a)).toFixed(1), y = (r * Math.sin(a)).toFixed(1); if (!i) d = `M${x} ${y}`; else { const am = (i - .5) * Math.PI / 2 / L, rm = r * .86; d += ` Q${(rm * Math.cos(am)).toFixed(1)} ${(rm * Math.sin(am)).toFixed(1)} ${x} ${y}` } } out.push(`<path d="${d}"/>`) } return `<g fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="1.6">${out.join('')}</g>` }
const MV = { armor: { suit: '#C8102E', suit2: '#F2B632', glove: '#F2B632', boot: '#C8102E', mask: 'helmet', maskc: '#C8102E', face: '#F2B632', eye: '#9FF3FF', em: 'tri', emc: '#9FF3FF', belt: null, pose: 'power', glow: '#FFB020' },
  cap: { suit: '#2C4FA8', suit2: '#2C4FA8', glove: '#C8102E', boot: '#C8102E', mask: 'band', maskc: '#2C4FA8', hair: '#E8C26A', hs: 'curl', em: 'star', emc: '#fff', belt: '#C8102E', item: 'hexshield', pose: 'hips' },
  cat: { suit: '#1E1E28', suit2: '#1E1E28', glove: '#2a2a38', boot: '#2a2a38', mask: 'cowl', maskc: '#1E1E28', ears: true, eye: '#C9A7FF', em: 'chev', emc: '#B9B9C9', belt: '#6b5bd6', pose: 'stand' },
  cosmic: { suit: '#14A39A', suit2: '#0E6E7A', glove: '#F2C230', boot: '#F2C230', mask: 'none', hair: '#2a1f3a', hs: 'long', cape: '#7A3DDB', em: 'star', emc: '#F2C230', pose: 'fly', item: 'orb', orb: '#FF9EF5' },
  volt: { suit: '#7A2AC2', suit2: '#4B1A80', glove: '#FFD23F', boot: '#FFD23F', mask: 'band', maskc: '#FFD23F', hair: '#111', hs: 'spiky', em: 'bolt', emc: '#FFD23F', belt: '#FFD23F', pose: 'power', item: 'zap' },
  tank: { suit: '#6F7A8A', suit2: '#46505E', skin: '#8FA0B5', glove: '#2E3542', boot: '#2E3542', mask: 'none', hair: '#2E3542', hs: 'bun', em: 'ring', emc: '#FF5A36', belt: '#2E3542', pose: 'hips' } }
const DC = { fly: { suit: '#2F5BD6', suit2: '#2F5BD6', glove: '#2F5BD6', boot: '#D62839', cape: '#D62839', mask: 'none', hair: '#111', hs: 'curl', em: 'diamond', emc: '#F2C230', belt: '#D62839', pose: 'fly' },
  night: { suit: '#4A4F5C', suit2: '#2D313A', glove: '#16181D', boot: '#16181D', cape: '#16181D', mask: 'cowl', maskc: '#16181D', ears: true, eye: '#fff', em: 'moon', emc: '#F2C230', belt: '#F2C230', pose: 'stand' },
  amazon: { suit: '#C8102E', suit2: '#1E3FA8', glove: '#C9CED8', boot: '#C8102E', mask: 'none', hair: '#111', hs: 'long', tiara: '#F2C230', em: 'chev', emc: '#F2C230', belt: '#F2C230', pose: 'hips', item: 'lasso' },
  speed: { suit: '#E8461F', suit2: '#E8461F', glove: '#E8461F', boot: '#F2C230', mask: 'band', maskc: '#E8461F', hair: '#c46a1a', hs: 'spiky', em: 'bolt', emc: '#FFE14D', belt: '#F2C230', pose: 'stand', item: 'speed' },
  sea: { suit: '#F08A24', suit2: '#1F8A5B', glove: '#1F8A5B', boot: '#1F8A5B', mask: 'none', hair: '#E8C26A', hs: 'long', em: 'none', belt: '#F2C230', pose: 'hips', item: 'trident' },
  ring: { suit: '#1F9D55', suit2: '#111', glove: '#fff', boot: '#111', mask: 'band', maskc: '#1F9D55', hair: '#5a3a22', hs: 'spiky', em: 'ring', emc: '#B8FFCB', belt: null, pose: 'power', glow: '#3CFF8A', item: 'orb', orb: '#3CFF8A' } }
const C = (o, w, cls = '') => hero({ ...o, w, cls: 'chr ' + cls })
const cache = new Map()
/** decorative markup for a slot: hero | side | sect | tip */
export function skinArt(id, slot) {
  const k = id + ':' + slot; if (cache.has(k)) return cache.get(k)
  let h = ''
  if (slot === 'hero') {
    if (id === 'comic') h = burst('#fff')
    else if (id === 'guardian') h = skyline()
    else if (id === 'sakura') h = clouds(.9) + petals()
    else if (id === 'cartoon') h = blobs
    else if (id === 'forest') h = leaves()
    else if (id === 'meadow') h = clouds(1) + hills
    else if (id === 'synth') h = '<div class="sk-sun"></div><div class="sk-floor"></div>'
    else if (id === 'galaxy') h = '<div class="sk-planet"></div>'
    else if (id === 'pixel') h = '<div class="sk-pcloud"></div><div class="sk-ground"></div>'
    else if (id === 'web') h = `<svg class="sk-web" viewBox="0 0 360 360">${web(360, .55)}</svg>` + skyline('#000', '.5')
    else if (id === 'squad') h = `<div class="sk-squad">${C(MV.tank, 150, 'c1')}${C(MV.cap, 150, 'c2')}${C(MV.armor, 175, 'c3')}${C(MV.volt, 150, 'c4')}${C(MV.cat, 145, 'c5')}${C(MV.cosmic, 165, 'c6')}</div>${sfx('POW!', '#F2B632', '#C8102E', '', .85).replace('class="sfx"', 'class="sfx s1"')}${sfx('ZAP!', '#fff', '#2C4FA8', '', .75).replace('class="sfx"', 'class="sfx s2"')}`
    else if (id === 'justice') h = `<div class="sk-moon"></div><div class="sk-beam"></div>${skyline('#000', '.5')}<div class="sk-squad">${C(DC.sea, 150, 'c1')}${C(DC.amazon, 150, 'c2')}${C(DC.night, 170, 'c3')}${C(DC.ring, 150, 'c4')}${C(DC.speed, 145, 'c5')}${C(DC.fly, 165, 'c6')}</div>`
  } else if (slot === 'side') {
    if (id === 'squad') h = C(MV.armor, 140) + bubble('Files safe!', '#fff', '#1B1530', 'bub')
    else if (id === 'justice') h = C(DC.night, 140) + bubble('On patrol', '#F2C230', '#0A1433', 'bub')
    else if (id === 'web') h = `<svg class="sk-sweb" viewBox="0 0 360 360">${web(360, .6, '#fff')}</svg>`
  } else if (slot === 'sect') {
    if (id === 'squad') h = C(MV.cat, 80)
    else if (id === 'justice') h = C(DC.fly, 92)
  } else if (slot === 'tip') {
    if (id === 'squad') h = `<div class="sk-tip">${C(MV.volt, 150)}<div class="sk-tip-t"><b>Share a folder with a code</b><span>Your squad joins with one code. Files land straight in your Telegram.</span></div><button class="btn primary" data-a="newshare">Create code</button></div>`
    else if (id === 'justice') h = `<div class="sk-tip">${C(DC.speed, 145)}<div class="sk-tip-t"><b>Lightning-fast uploads</b><span>Big files go straight to your Telegram. No limits, no waiting.</span></div><button class="btn primary" data-a="upload">Upload now</button></div>`
  }
  cache.set(k, h); return h
}
