// Güvence rozetleri — farklı şekiller: kurdele (ACG), amblem (IusJud), kalkan (KYC), altın mühür (SSL), kurdeleli rozet (KVKK).
const f2 = n => n.toFixed(2);
const scallop = (n, ro, ri, cx = 100, cy = 100) => { const p = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, t = Math.PI * i / n; p.push(f2(cx + r * Math.sin(t)) + ',' + f2(cy - r * Math.cos(t))); } return 'M' + p.join('L') + 'Z'; };
const star = (cx, cy, r, fill) => { const p = []; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r, t = Math.PI * i / 5; p.push(f2(cx + rr * Math.sin(t)) + ',' + f2(cy - rr * Math.cos(t))); } return `<path d="M${p.join('L')}Z" fill="${fill}"/>`; };
const gold = id => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".3" stop-color="#e6c35c"/><stop offset=".55" stop-color="#b8862b"/><stop offset=".78" stop-color="#f3d77a"/><stop offset="1" stop-color="#8a6119"/></linearGradient>`;
const topArc = (id, r, cx = 100, cy = 100) => `<path id="${id}" d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}"/>`;
const botArc = (id, r, cx = 100, cy = 100) => `<path id="${id}" d="M${cx - r},${cy} A${r},${r} 0 0 0 ${cx + r},${cy}"/>`;
const onArc = (id, txt, size, fill, ls = 2, w = 800, extra = '') => `<text font-size="${size}" font-weight="${w}" fill="${fill}" letter-spacing="${ls}" ${extra}><textPath href="#${id}" startOffset="50%" text-anchor="middle">${txt}</textPath></text>`;

export function acgRibbon({year, p = 'acg'}) {
  const G = `url(#${p}g)`;
  return `<svg viewBox="0 0 150 300" role="img" aria-label="ACG Advogada · Ana Carolina de Almeida Garcia · OAB/SP 386.588"><defs>${gold(p + 'g')}<linearGradient id="${p}n" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#26306a"/><stop offset=".6" stop-color="#18204c"/><stop offset="1" stop-color="#0c1230"/></linearGradient><linearGradient id="${p}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <path d="M0 0H150V300L75 268L0 300Z" fill="url(#${p}n)"/><path d="M0 0H150V300L75 268L0 300Z" fill="url(#${p}s)"/>
  <path d="M6 6H144V289L75 259L6 289Z" fill="none" stroke="${G}" stroke-width="1.3"/><path d="M10 10H140V281L75 253L10 281Z" fill="none" stroke="${G}" stroke-opacity=".4" stroke-width=".6"/>
  <g fill="none" stroke="${G}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="33" cy="60" r="13.5"/><path d="M46.5 49V73.5"/>
    <path d="M46.5 60C51 44 64 45 75 60S99 76 103.5 60"/><path d="M46.5 60C51 76 64 75 75 60S99 44 103.5 60"/>
    <path d="M126.5 50.5A13.5 13.5 0 1 0 130.5 62.5H119"/></g>
  <g font-family="'Cormorant Garamond',Georgia,serif" text-anchor="middle" fill="${G}">
    <text x="75" y="104" font-size="14.5" font-weight="700" letter-spacing=".6">ANA CAROLINA</text>
    <text x="75" y="121" font-size="11.5" font-weight="700" letter-spacing=".4">DE ALMEIDA GARCIA</text></g>
  <text x="75" y="138" text-anchor="middle" font-size="7" font-weight="600" fill="#e8d9a8" letter-spacing="4.2">ADVOGADA</text>
  <path d="M28 153H66M84 153H122" stroke="${G}" stroke-width=".8"/><path d="M75 149l4 4-4 4-4-4z" fill="${G}"/>
  <text x="75" y="174" text-anchor="middle" font-size="8.5" font-weight="700" fill="#c9cfe8" letter-spacing="2.4">OAB / SP</text>
  <text x="75" y="195" text-anchor="middle" font-size="19" font-weight="800" fill="${G}" letter-spacing="1">386.588</text>
  <text x="75" y="212" text-anchor="middle" font-size="5.8" font-weight="600" fill="#9aa3c9" letter-spacing="1.6">SÃO PAULO · BRASIL</text>
  ${[51, 63, 75, 87, 99].map((x, i) => star(x, i === 2 ? 227 : 229, i === 2 ? 4.4 : 3.4, G)).join('')}
  <text x="75" y="249" text-anchor="middle" font-size="11" font-weight="800" fill="${G}" letter-spacing="2.5">${year}</text></svg>`;
}

export function iusjudEmblem({year, p = 'ius'}) {
  const G = `url(#${p}g)`;
  return `<svg viewBox="0 0 200 200" role="img" aria-label="IusJud"><defs>${gold(p + 'g')}<radialGradient id="${p}d" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#3d3e42"/><stop offset="1" stop-color="#18191b"/></radialGradient>${topArc(p + 't', 69)}${botArc(p + 'b', 80)}</defs>
  <circle cx="100" cy="100" r="97" fill="url(#${p}d)"/><circle cx="100" cy="100" r="96" fill="none" stroke="${G}" stroke-width="1.4"/>
  <circle cx="100" cy="100" r="88" fill="none" stroke="#6d6f74" stroke-width="3"/><circle cx="100" cy="100" r="61" fill="none" stroke="#5c5e62" stroke-width="3"/>
  <text font-size="19" font-weight="800" fill="${G}" letter-spacing="4"><textPath href="#${p}t" startOffset="27%" text-anchor="middle">IUSJUD</textPath></text>
  ${onArc(p + 'b', 'VERIFIED · ' + year, 10, G, 3, 700)}
  ${star(17, 100, 4, G)}${star(183, 100, 4, G)}
  <path d="M14 136C58 116 118 104 186 60L188 76C122 114 62 128 18 152Z" fill="#0d0d0e" stroke="${G}" stroke-width="1.6"/>
  <path d="M100 82V127C100 146 90 154 79 154C70 154 64 149 61 142" fill="none" stroke="${G}" stroke-width="19" stroke-linecap="butt"/>
  <path d="M100 82V127C100 146 90 154 79 154C70 154 64 149 61 142" fill="none" stroke="#0d0d0e" stroke-width="13"/>
  <path d="M100 84V127C100 146 90 154 79 154" fill="none" stroke="${G}" stroke-width="1.2"/>
  
  <rect x="90" y="76" width="20" height="7" rx="1.5" fill="${G}"/>
  <path d="M91.5 76V71C91.5 63 96 57 100 46C104 57 108.5 63 108.5 71V76Z" fill="${G}"/><path d="M100 49V66" stroke="#2a2a2a" stroke-width="1.3"/><circle cx="100" cy="67.5" r="2.2" fill="#2a2a2a"/>
  ${[[84, 41, 2.6], [92, 36, 2.8], [100, 34, 3.4], [108, 36, 2.8], [116, 41, 2.6]].map(([x, y, r]) => star(x, y, r, G)).join('')}</svg>`;
}

export function kycShield({p = 'kyc'}) {
  const S = 'M90 6L168 27V100C168 150 134 183 90 205C46 183 12 150 12 100V27Z';
  const trace = '#a2a8b1';
  const fp = [10, 17, 24, 31, 38, 45, 52].map((r, i) => `<path d="M${f2(112 - r)} 196A${r} ${r} 0 0 1 ${f2(112 + r * .92)} ${f2(196 - r * .4)}" fill="none" stroke="#9aa0a9" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="${i % 3 === 1 ? '22 4 60' : i % 3 === 2 ? '40 5 90' : '200'}"/>`).join('');
  return `<svg viewBox="0 0 180 212" role="img" aria-label="KYC kimlik doğrulama"><defs><linearGradient id="${p}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#e3e6ea"/><stop offset=".55" stop-color="#f7f8f9"/><stop offset=".8" stop-color="#c7ccd3"/><stop offset="1" stop-color="#eef0f2"/></linearGradient><clipPath id="${p}c"><path d="${S}"/></clipPath></defs>
  <path d="${S}" fill="url(#${p}s)" stroke="#8b919a" stroke-width="2"/><path d="M90 13L161 32V100C161 145 130 175 90 197C50 175 19 145 19 100V32Z" fill="none" stroke="#fff" stroke-width="1.5"/>
  <g clip-path="url(#${p}c)">
    <path d="M90 6V74" stroke="#b5bac2" stroke-width="1"/>
    <g fill="none" stroke="${trace}" stroke-width="1.3">
      <path d="M24 44H52L58 50H70"/><path d="M24 56H44"/><path d="M30 66H62"/><path d="M76 20V62"/><path d="M66 26V44L60 50"/><path d="M84 28V58"/>
      <path d="M104 22V58"/><path d="M114 28V50L120 56H156"/><path d="M126 22V40L138 34H160"/><path d="M134 46H158"/><path d="M118 66H150"/></g>
    <g fill="#fff" stroke="${trace}" stroke-width="1.2">${[[70, 50], [44, 56], [62, 66], [76, 20], [66, 26], [84, 28], [104, 22], [126, 22], [158, 46], [150, 66], [24, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g>
    <g stroke="#c9cdd3" stroke-width=".6">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${20 + i * 8} 150l26-26M${30 + i * 8} 178l26-26"/>`).join('')}</g>
    ${fp}</g>
  <text x="90" y="80" text-anchor="middle" font-size="7.5" font-weight="700" fill="#13235b" letter-spacing="2.6">IDENTITY VERIFIED</text>
  <text x="90" y="125" text-anchor="middle" font-size="50" font-weight="900" fill="#13235b" stroke="#fff" stroke-width="1.5" paint-order="stroke" letter-spacing="-1">KYC</text>
  <path d="M62 136L90 160L118 136" fill="none" stroke="#13235b" stroke-width="7" stroke-linejoin="miter"/></svg>`;
}

export function sslSeal({p = 'ssl'}) {
  const G = `url(#${p}g)`, D = '#2b2520';
  return `<svg viewBox="0 0 200 200" role="img" aria-label="SSL güvenli bağlantı"><defs>${gold(p + 'g')}<radialGradient id="${p}r" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#e2b84c"/><stop offset="1" stop-color="#a87a22"/></radialGradient>${topArc(p + 't', 66)}${botArc(p + 'b', 75)}</defs>
  <path d="${scallop(60, 98, 91)}" fill="${G}"/><circle cx="100" cy="100" r="89" fill="none" stroke="#fff6cf" stroke-opacity=".7" stroke-width="1"/>
  <circle cx="100" cy="100" r="85" fill="${D}"/><circle cx="100" cy="100" r="82" fill="none" stroke="${G}" stroke-width="1.2"/>
  <circle cx="100" cy="100" r="58" fill="url(#${p}r)"/><circle cx="100" cy="100" r="58" fill="none" stroke="${G}" stroke-width="2"/><circle cx="100" cy="100" r="53" fill="none" stroke="${D}" stroke-opacity=".5" stroke-width=".8"/>
  ${onArc(p + 't', 'SECURE CONNECTION', 12, G, 2.4, 800)}
  ${onArc(p + 'b', '256-BIT ENCRYPTION', 11.5, G, 2.4, 800)}
  ${star(23, 100, 4.5, G)}${star(177, 100, 4.5, G)}
  ${[[78, 72, 4], [100, 66, 5], [122, 72, 4], [78, 130, 4], [100, 136, 5], [122, 130, 4]].map(([x, y, r]) => star(x, y, r, D)).join('')}
  <text x="100" y="117" text-anchor="middle" font-size="44" font-weight="900" fill="${D}" letter-spacing="1">SSL</text></svg>`;
}

export function kvkkRosette({year, p = 'kv'}) {
  const G = `url(#${p}g)`;
  return `<svg viewBox="0 0 200 252" role="img" aria-label="KVKK ve LGPD uyumlu"><defs>${gold(p + 'g')}<linearGradient id="${p}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8862b"/><stop offset=".5" stop-color="#f0d27a"/><stop offset="1" stop-color="#9a6d1d"/></linearGradient><radialGradient id="${p}n" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#22597a"/><stop offset="1" stop-color="#0d2c42"/></radialGradient>${topArc(p + 'a', 66)}${botArc(p + 'b', 75)}</defs>
  <path d="M74 150L104 160L82 248L68 230L48 240Z" fill="url(#${p}t)"/><path d="M126 150L96 160L118 248L132 230L152 240Z" fill="url(#${p}t)"/>
  <path d="M84 158L74 236M116 158L126 236" stroke="#6e4b10" stroke-width="2.4" opacity=".5"/>
  <path d="${scallop(34, 96, 87)}" fill="${G}"/><circle cx="100" cy="100" r="84" fill="url(#${p}n)"/><circle cx="100" cy="100" r="84" fill="none" stroke="${G}" stroke-width="2.4"/>
  <circle cx="100" cy="100" r="58" fill="none" stroke="${G}" stroke-width="1.6"/>
  ${onArc(p + 'a', 'KVKK &amp; LGPD', 13, G, 3.5, 800)}
  ${onArc(p + 'b', 'VERİ KORUMA UYUMU', 11, '#ffffff', 2.4, 600, `font-family="'Cormorant Garamond',Georgia,serif"`)}
  ${star(22, 100, 3.6, G)}${star(178, 100, 3.6, G)}
  <text x="100" y="102" text-anchor="middle" font-size="31" font-weight="900" fill="${G}" letter-spacing="1">KVKK</text>
  <path d="M66 110H134L129 117L134 124H66L71 117Z" fill="#2d7fd0"/><path d="M66 110L72 106V110M134 110L128 106V110" fill="#1c5c9e"/>
  <text x="100" y="120.5" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" letter-spacing="3">LGPD · ${year}</text>
  ${[[80, 138], [90, 141], [100, 142], [110, 141], [120, 138]].map(([x, y]) => star(x, y, 3.8, G)).join('')}</svg>`;
}
