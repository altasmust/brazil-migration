// Brazil Migration icon library (single source). `node scripts/build-icons.mjs` writes /public/bm/icons.css and
// the glyph map in /public/bm/icons.js. Icons are 24×24 line icons drawn with currentColor, so they follow text
// colour and dark mode. In HTML: <bm-i class="ic ic-check"></bm-i>. In CSS: mask: var(--ic-check) (see icons.css).
// Text glyphs (↗ ✓ ⌄ × ☰ ☾ 💡 …) on the site are swapped for these icons automatically (server + /bm/icons.js).
export const ICONS = {
  'arrow-up-right': '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'arrows-lr': '<path d="M7 8l-4 4 4 4M17 8l4 4-4 4M3 12h18"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'corner-down-right': '<path d="M5 4v7a4 4 0 0 0 4 4h11M15 10l5 5-5 5"/>',
  check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  refresh: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
  alert: '<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.3 1.8M9.5 2.5h5"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3v2.5c0 2.8 5 4 5 6.5s-5 3.7-5 6.5V21M17 3v2.5c0 2.8-5 4-5 6.5s5 3.7 5 6.5V21"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12.5h7M9 16.5h7"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  'star-fill': {fill: true, d: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>'},
  heart: {fill: true, d: '<path d="M12 20s-8-4.7-8-10.3A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.7C20 15.3 12 20 12 20z"/>'},
  volume: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  flame: '<path d="M12 3s5.5 4.6 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.7 1.7-4.4 1.7-4.4s.4 2.3 2.1 2.8C9.6 7.8 12 3 12 3z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4.2M16 6h3a3 3 0 0 1-3 4.2M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><path d="M4 15h3.5v5.5H5a1 1 0 0 1-1-1zM20 15h-3.5v5.5H19a1 1 0 0 0 1-1z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 7.6-1.8"/>',
  hand: '<path d="M8 13V5.8a1.5 1.5 0 0 1 3 0V11M11 10.5V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5v-4a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.4A6.3 6.3 0 0 1 4 17.2l-1-3a1.5 1.5 0 0 1 2.6-1.3L8 15.5"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.2a4.2 4.2 0 0 0 7 0M9 9.6v.1M15 9.6v.1"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
  cart: '<path d="M2.5 3.5h2.8l2.4 11.5h10.8l2-8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17.5" cy="19.5" r="1.3"/>',
  coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5v2.5M12 3.5v2.5"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3M16 18v3M8 14.5v.1M16 14.5v.1"/>',
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M10 20v-5.5h4V20"/>',
  stethoscope: '<path d="M6 3.5v5.5a4 4 0 0 0 8 0V3.5M10 13v2.5a4.5 4.5 0 0 0 9 0V13"/><circle cx="19" cy="11" r="2"/>',
  party: '<path d="M4 20.5 8.5 8l7.5 7.5z"/><path d="M14 4.5l.8 2M19.5 9.5l2-.8M17 3.5l-1 3M20.5 14l-3-.8"/>',
  key: '<circle cx="8" cy="15.5" r="4"/><path d="M11 12.5l9-9M17 6.5l3 3M14.5 9l2 2"/>',
  shield: '<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  'shield-check': '<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  asterisk: '<path d="M12 4v16M5.1 8l13.8 8M18.9 8 5.1 16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  phone: '<path d="M5 3.5h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.6 6.6l1.4-2.3 4.5 1.8V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  'map-pin': '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3 12.5h18"/>',
  building: '<path d="M4 21V4h11v17M15 9h5v12M2.5 21h19M8 8h3M8 12h3M8 16h3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  passport: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10.5" r="3"/><path d="M9 17h6"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11"/><path d="M15.5 13.5h.1"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  bank: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  'credit-card': '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
  'shopping-bag': '<path d="M5 8h14l-1 12H6z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  transfer: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  power: '<path d="M12 3v8M6.4 6.6a8 8 0 1 0 11.2 0"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-3 7.5-3 7.5h18s-3-1-3-7.5M10 20a2 2 0 0 0 4 0"/>',
  scale: '<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
  play: {fill: true, d: '<path d="M8 5v14l11-7z"/>'},
  pause: {fill: true, d: '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'},
};

// Text glyph → icon. Emoji variation selectors are removed with the glyph.
export const GLYPHS = {
  '↗': 'arrow-up-right', '→': 'arrow-right', '←': 'arrow-left', '↓': 'arrow-down', '↑': 'arrow-up', '↔': 'arrows-lr', '⌄': 'chevron-down', '↳': 'corner-down-right',
  '✓': 'check', '✔': 'check', '×': 'x', '✕': 'x', '☰': 'menu', '☾': 'moon', '☀': 'sun', '↺': 'refresh', '💡': 'bulb', '⚠': 'alert', 'ℹ': 'info', '⏱': 'timer', '⏳': 'hourglass',
  '▤': 'doc', '📄': 'file', '★': 'star-fill', '⭐': 'star-fill', '☆': 'star', '❤': 'heart', '🔊': 'volume', '🔥': 'flame', '🏆': 'trophy', '🎧': 'headphones', '🎯': 'target',
  '🔓': 'unlock', '🔒': 'lock', '👋': 'hand', '🙂': 'smile', '🔢': 'hash', '🛒': 'cart', '☕': 'coffee', '🚌': 'bus', '🏠': 'home', '🩺': 'stethoscope', '🎉': 'party',
  '🔑': 'key', '🛡': 'shield', '✳': 'asterisk',
};

const enc = s => encodeURIComponent(s).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
export function iconURL(name) {
  const i = ICONS[name]; if (!i) return '';
  const fill = typeof i === 'object', d = fill ? i.d : i;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${fill ? 'black' : 'none'}' stroke='black' stroke-width='${fill ? 0 : 2}' stroke-linecap='round' stroke-linejoin='round'>${d.replace(/"/g, "'")}</svg>`;
  return `url("data:image/svg+xml,${enc(svg)}")`;
}
export function iconsCSS() {
  const vars = Object.keys(ICONS).map(n => `--ic-${n}:${iconURL(n)}`).join(';');
  const cls = Object.keys(ICONS).map(n => `.ic-${n}{--ic:var(--ic-${n})}`).join('');
  return `/* Brazil Migration icon library — generated by scripts/build-icons.mjs from server/platform/icons.mjs. Do not edit by hand. */
:root{${vars}}
.ic,bm-i{display:inline-block;width:1em;height:1em;flex:none;vertical-align:-.14em;background-color:currentColor;-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat;font-style:normal}
.ic-arrow-up-right{width:.82em;height:.82em;vertical-align:-.06em}
.ic-chevron-down{vertical-align:-.18em}
.ic-sm{width:.8em;height:.8em}.ic-lg{width:1.3em;height:1.3em}.ic-xl{width:1.8em;height:1.8em}
${cls}
`;
}

// Replace glyphs in the text parts of an HTML string (scripts, styles, textareas, tags and attributes untouched).
const KEYS = Object.keys(GLYPHS).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
export const GLYPH_RE = new RegExp(`(${KEYS.join('|')})\\uFE0F?`, 'gu');
export const iconTag = name => `<bm-i class="ic ic-${name}" aria-hidden="true"></bm-i>`;
// "2 × 3", "1920×1000" and "Paket × (1 + …" are maths, not a close button.
const isMath = (s, i, len) => { const p = s.slice(0, i).trimEnd().slice(-1), n = s.slice(i + len).trimStart()[0] || ''; return /[\p{L}\d)]/u.test(p) && /[\d(]/.test(n); };
export function iconizeText(t) {
  return t.replace(GLYPH_RE, (m, g, i, s) => (g === '×' && isMath(s, i, m.length)) ? m : iconTag(GLYPHS[g]));
}
export function iconizeHTML(html) {
  return html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<textarea[\s\S]*?<\/textarea>|<title>[\s\S]*?<\/title>|<option[\s\S]*?<\/option>|<[^>]+>)/i).map((seg, i) => i % 2 ? seg : iconizeText(seg)).join('');
}
