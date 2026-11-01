// Blog: posts are items (kind='blog_post') edited in the admin (Site Yönetimi → Blog) and rendered into the
// shared site shell at /blog/ (list) and /blog/<slug>/ (article). Article HTML is sanitized on save and on render.
import {parse} from 'node-html-parser';

export const BLOG_POST = /^\/blog\/([a-z0-9-]{2,90})\/$/;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const siteUrl = () => (process.env.SITE_URL || 'https://brazilmigration.com').replace(/\/$/, '');
export const slugify = s => String(s || '').toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

// ---------- sanitizing ----------
const ALLOW = {p: [], h2: ['id'], h3: ['id'], h4: [], ul: [], ol: [], li: [], strong: [], b: [], em: [], i: [], u: [], s: [], br: [], hr: [], blockquote: [], a: ['href', 'title'], figure: [], figcaption: [], img: ['src', 'alt', 'width', 'height'], table: [], thead: [], tbody: [], tr: [], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'], small: [], sup: [], sub: [], mark: [], code: [], div: ['class'], span: ['class']};
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math', 'template', 'noscript', 'link', 'meta', 'head', 'title']);
const okUrl = (u, img) => { u = String(u || '').trim(); return /^(https?:\/\/|\/(?!\/)|#)/i.test(u) || (!img && /^mailto:|^tel:/i.test(u)) ? u : ''; };
const BOX = new Set(['bl-note', 'bl-tip', 'bl-warn', 'bl-steps']);
export function sanitizeRich(html) {
  const root = parse(String(html || '').slice(0, 200000), {comment: false});
  const walk = node => node.childNodes.map(n => {
    if (n.nodeType === 3) return esc(n.text.replace(/&nbsp;/g, '\u00a0'));
    if (n.nodeType !== 1) return '';
    const tag = (n.rawTagName || '').toLowerCase();
    if (DROP.has(tag)) return '';
    if (!ALLOW[tag]) return walk(n); // unknown wrapper: keep its content
    const attrs = [];
    for (const a of ALLOW[tag]) {
      let v = n.getAttribute(a); if (v == null || v === '') continue;
      if (a === 'href') v = okUrl(v); else if (a === 'src') v = okUrl(v, true); else if (a === 'class') v = v.split(/\s+/).filter(c => BOX.has(c)).join(' '); else if (a === 'id') v = slugify(v); else if (/width|height|span/.test(a)) v = String(parseInt(v, 10) || '');
      if (v) attrs.push(`${a}="${esc(v)}"`);
    }
    if (tag === 'a' && /^https?:/i.test(n.getAttribute('href') || '') && !/brazilmigration\.com/i.test(n.getAttribute('href'))) attrs.push('target="_blank" rel="noopener nofollow"');
    if (tag === 'img') { if (!attrs.some(a => a.startsWith('src='))) return ''; return `<img ${attrs.join(' ')} loading="lazy" decoding="async">`; }
    if (tag === 'br' || tag === 'hr') return `<${tag}>`;
    if ((tag === 'div' || tag === 'span') && !attrs.length) return walk(n);
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${walk(n)}</${tag}>`;
  }).join('');
  return walk(root).replace(/<p>(\s|<br>)*<\/p>/g, '');
}
export const plain = html => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
export const readMinutes = p => Math.max(1, Math.round(plain([p.lead, p.content, ...(p.faq || []).map(f => f.q + ' ' + f.a)].join(' ')).split(' ').length / 190));

// Add ids to H2s (table of contents) and return [{id, text}].
export function withToc(html) {
  const toc = [], used = new Set();
  const out = html.replace(/<h2( id="[^"]*")?>([\s\S]*?)<\/h2>/g, (m, idAttr, inner) => {
    let id = idAttr ? idAttr.slice(5, -1) : slugify(plain(inner)) || 'bolum';
    while (used.has(id)) id += '-2';
    used.add(id); toc.push({id, text: plain(inner)});
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return {html: out, toc};
}

// Normalise a post coming from the admin form.
export function cleanPost(b, old = {}) {
  const T = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
  const slug = slugify(b.slug || b.title);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : old.date || new Date().toISOString().slice(0, 10);
  return {
    slug, title: T(b.title, 180), category: T(b.category, 60) || 'Rehber', excerpt: T(b.excerpt, 400), lead: T(b.lead, 1200),
    content: sanitizeRich(b.content), cover: okUrl(T(b.cover, 600), true), coverAlt: T(b.coverAlt, 200),
    coverCredit: {name: T(b.coverCredit?.name, 80), url: okUrl(T(b.coverCredit?.url, 400))},
    author: {name: T(b.author?.name, 80) || 'Brazil Migration Editör Ekibi', role: T(b.author?.role, 120)},
    date, modified: /^\d{4}-\d{2}-\d{2}$/.test(b.modified) ? b.modified : new Date().toISOString().slice(0, 10),
    faq: (Array.isArray(b.faq) ? b.faq : []).slice(0, 20).map(f => ({q: T(f.q, 300), a: T(f.a, 3000)})).filter(f => f.q && f.a),
    sources: (Array.isArray(b.sources) ? b.sources : []).slice(0, 20).map(s => ({label: T(s.label, 200), url: okUrl(T(s.url, 500))})).filter(s => s.label),
    seo: {title: T(b.seo?.title, 120), description: T(b.seo?.description, 320), noindex: !!b.seo?.noindex},
    published: !!b.published, featured: !!b.featured,
  };
}

// ---------- rendering ----------
const TRM = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const trDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${+m[3]} ${TRM[+m[2] - 1]} ${m[1]}` : ''; };
const SV = (p, cls = 'bl-i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', upd: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', play: '<path d="M8 5v14l11-7z" fill="currentColor"/>', list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>', star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
const BRAND = {
  linkedin: '<svg class="bl-i" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.2 1.5-2.2 2.9V21H9z"/></svg>',
  facebook: '<svg class="bl-i" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.6 2 14.4 2 11.8 2 10 3.6 10 6.5v2H7.4V12H10v10h4V12h2.7l.4-3.5z"/></svg>',
  x: '<svg class="bl-i" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 2.5h3.3l-7.2 8.2L22.3 21.5h-6.6l-5.2-6.8-6 6.8H1.2L8.9 12.8.9 2.5h6.8l4.7 6.2zm-1.2 17h1.8L7.5 4.4H5.6z"/></svg>',
  whatsapp: '<svg class="bl-i" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.4-.3z"/></svg>',
};
const AI = [['ChatGPT', 'https://chatgpt.com/?q='], ['Gemini', 'https://www.google.com/search?udm=50&q='], ['Grok', 'https://grok.com/?q='], ['Perplexity', 'https://www.perplexity.ai/search?q='], ['Claude', 'https://claude.ai/new?q=']];
const aiDot = {ChatGPT: '#10a37f', Gemini: '#4f7cff', Grok: '#111', Perplexity: '#1f8a9c', Claude: '#d97757'};

function shareLinks(url, title) {
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  return `<a class="bl-sh" href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener" aria-label="LinkedIn’de paylaş">${BRAND.linkedin}</a><a class="bl-sh" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" aria-label="Facebook’ta paylaş">${BRAND.facebook}</a><a class="bl-sh" href="https://x.com/intent/post?url=${u}&amp;text=${t}" target="_blank" rel="noopener" aria-label="X’te paylaş">${BRAND.x}</a><a class="bl-sh" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener" aria-label="WhatsApp’ta paylaş">${BRAND.whatsapp}</a><button class="bl-sh" type="button" data-copy="${esc(url)}" aria-label="Bağlantıyı kopyala">${SV(IC.link)}</button>`;
}
const coverImg = (p, cls, eager) => p.cover ? `<img class="${cls}" src="${esc(p.cover)}" alt="${esc(p.coverAlt || p.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">` : `<span class="${cls} bl-noimg">${SV(IC.star)}</span>`;
function card(p, big) {
  return `<a class="bl-card${big ? ' big' : ''}" href="/blog/${esc(p.slug)}/" data-cat="${esc(p.category)}"><span class="bl-card-img">${coverImg(p, 'bl-ci', big)}</span><span class="bl-card-body"><span class="bl-cat">${esc(p.category)}</span><strong>${esc(p.title)}</strong><span class="bl-ex">${esc(p.excerpt || plain(p.lead).slice(0, 180))}</span><span class="bl-cmeta">${SV(IC.cal)} ${esc(trDate(p.date))} <i></i> ${SV(IC.clock)} ${readMinutes(p)} dk okuma</span></span></a>`;
}
const sortPosts = posts => [...posts].sort((a, b) => (b.featured - a.featured) || String(b.date).localeCompare(String(a.date)));

// Ana sayfa: en yeni 3 yazı (yeni eklenen başa düşer).
export function homeBlogHTML(posts) {
  const list = [...posts].sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.created || 0) - (a.created || 0)).slice(0, 3);
  if (!list.length) return '';
  return `<section class="home-blog" id="blogdan"><div class="wrap"><div class="hb-head"><div><div class="kicker">BLOG · BRASIL REHBERİ</div><h2>Blogdan son yazılar</h2></div><a class="hb-all" href="/blog/">Tüm yazılar ↗</a></div><div class="bl-grid3">${list.map(p => card(p)).join('')}</div></div></section>`;
}

export function blogIndexHTML(posts) {
  const list = sortPosts(posts);
  const cats = [...new Set(list.map(p => p.category))];
  const [first, ...rest] = list;
  return `<div class="bl">
  <section class="bl-hero wrap"><div class="kicker">BLOG · BRASIL REHBERİ</div><h1>Brezilya’ya taşınmadan önce<br>bilmeniz gerekenler.</h1><p>Oturum izni, vatandaşlık, şirket kurulumu ve São Paulo’da günlük yaşam üzerine sade, kaynaklı ve güncel yazılar.</p></section>
  <section class="wrap bl-list">${list.length ? `${cats.length > 1 ? `<div class="bl-chips" role="tablist"><button class="on" data-cat="">Tümü</button>${cats.map(c => `<button data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${card(first, true)}${rest.length ? `<div class="bl-grid3">${rest.map(p => card(p)).join('')}</div>` : ''}` : '<div class="bl-empty">Yakında burada yazılar olacak.</div>'}</section>
  <section class="wrap"><div class="bl-cta"><div><span class="kicker">KİŞİSEL DEĞERLENDİRME</span><h2>Sizin için hangi yol uygun?</h2><p>15 dakikalık ücretsiz ön görüşmede durumunuzu birlikte değerlendirelim.</p></div><button class="btn lime" type="button" onclick="book()">Ücretsiz ön görüşme ↗</button></div></section>
</div>`;
}

export function blogPostHTML(p, posts = []) {
  const url = `${siteUrl()}/blog/${p.slug}/`;
  const {html: body, toc} = withToc(sanitizeRich(p.content));
  const faqToc = p.faq?.length ? [{id: 'sss', text: 'Sıkça Sorulan Sorular'}] : [];
  const T = [...toc, ...faqToc];
  // intro paragraph → bold lead summary → rest of the article
  const firstP = body.indexOf('</p>');
  const lead = p.lead ? `<p class="bl-lead">${esc(p.lead)}</p>` : '';
  const bodyHtml = firstP > -1 && body.trimStart().startsWith('<p') ? body.slice(0, firstP + 4) + lead + body.slice(firstP + 4) : lead + body;
  const prompt = `${url} adresindeki “${p.title}” başlıklı makaleyi Türkçe olarak özetle; ana adımları, gerekli belgeleri ve önemli uyarıları madde madde çıkar.`;
  const mins = readMinutes(p);
  const host = siteUrl().replace(/^https?:\/\//, '');
  const tocList = `<ol>${T.map((t, i) => `<li><a href="#${t.id}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(t.text)}</a></li>`).join('')}</ol>`;
  const related = sortPosts(posts.filter(x => x.slug !== p.slug)).slice(0, 3);
  return `<div class="bl bl-post">
  <div class="wrap"><nav class="bl-crumb" aria-label="Sayfa yolu"><a href="/">Ana sayfa</a><span>/</span><a href="/blog/">Blog</a><span>/</span><b>${esc(p.category)}</b></nav></div>
  <div class="wrap bl-layout">
    <aside class="bl-aside"><div class="bl-sticky">
      ${T.length ? `<div class="bl-box bl-toc" role="navigation" aria-label="İçindekiler"><h2>${SV(IC.list)} İçindekiler</h2>${tocList}</div>` : ''}
      <div class="bl-box bl-share"><h2>Paylaş</h2><div class="bl-shares">${shareLinks(url, p.title)}</div></div>
    </div></aside>
    <article class="bl-article" itemscope itemtype="https://schema.org/BlogPosting">
      <div class="bl-meta"><span class="bl-author"><span class="bl-av" aria-hidden="true">BM</span><span><b>${esc(p.author?.name || 'Brazil Migration')}</b>${p.author?.role ? `<small>${esc(p.author.role)}</small>` : ''}</span></span>
        <span class="bl-mi">${SV(IC.clock)} ${mins} Dakika Okuma Süresi</span><span class="bl-mi">${SV(IC.cal)} ${esc(trDate(p.date))}</span>${p.modified && p.modified !== p.date ? `<span class="bl-mi">${SV(IC.upd)} Son güncelleme: ${esc(trDate(p.modified))}</span>` : ''}</div>
      <h1 itemprop="headline">${esc(p.title)}</h1>
      <div class="bl-ai"><span class="bl-ai-t">${SV(IC.spark)} Bu İçeriği Yapay Zekâ (AI) ile Özetleyin</span><div class="bl-ai-b">${AI.map(([n, u]) => `<a href="${u}${encodeURIComponent(prompt)}" target="_blank" rel="noopener nofollow"><i style="background:${aiDot[n]}"></i>${n}</a>`).join('')}</div></div>
      <div class="bl-listen" data-listen hidden><button type="button" class="bl-play" aria-label="Makaleyi dinle">${SV(IC.play)}</button><div class="bl-lt"><b>Makaleyi dinle</b><small><span data-ltime>~${mins} dk</span> · Türkçe sesli okuma</small></div><div class="bl-bar"><i data-lbar></i></div><select data-lrate aria-label="Okuma hızı"><option value="0.9">0.9x</option><option value="1" selected>1x</option><option value="1.15">1.15x</option><option value="1.3">1.3x</option></select></div>
      ${p.cover ? `<figure class="bl-cover">${coverImg(p, 'bl-cimg', true)}${p.coverCredit?.name ? `<figcaption>Fotoğraf: ${p.coverCredit.url ? `<a href="${esc(p.coverCredit.url)}" target="_blank" rel="noopener nofollow">${esc(p.coverCredit.name)}</a>` : esc(p.coverCredit.name)} / Unsplash</figcaption>` : ''}</figure>` : ''}
      <a class="bl-google" href="https://www.google.com/preferences/source?q=${encodeURIComponent(host)}" target="_blank" rel="noopener"><span class="bl-g" aria-hidden="true"><b style="color:#4285F4">G</b></span><span class="bl-gt"><b>İçeriklerimizi Google’da Takip Edin</b><small>Brazil Migration’ı Google’da tercih edilen kaynak olarak ekleyin.</small></span><span class="bl-gb">${SV(IC.star)} Tercih edilen kaynak olarak ekle</span></a>
      ${T.length ? `<details class="bl-mtoc"><summary>${SV(IC.list)} İçindekiler <small>${T.length} bölüm</small></summary>${tocList}</details>` : ''}
      <div class="bl-body" data-read itemprop="articleBody">${bodyHtml}</div>
      ${p.faq?.length ? `<section class="bl-faq" id="sss" data-read><h2>Sıkça Sorulan Sorular</h2>${p.faq.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a).replace(/\n/g, '<br>')}</p></details>`).join('')}</section>` : ''}
      ${p.sources?.length ? `<section class="bl-src"><h2>Kaynaklar</h2><ul>${p.sources.map(s => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.label)}</a>` : esc(s.label)}</li>`).join('')}</ul></section>` : ''}
      <p class="bl-disc">Bu yazı genel bilgilendirme amaçlıdır ve hukuki danışmanlık yerine geçmez. Mevzuat, ücretler ve belge listeleri değişebilir; başvurudan önce güncel resmi kaynakları kontrol edin veya bir uzmana danışın.</p>
      <div class="bl-endshare"><b>Bu yazıyı paylaşın</b><div class="bl-shares">${shareLinks(url, p.title)}</div></div>
      <div class="bl-cta"><div><span class="kicker">KİŞİSEL YOL HARİTASI</span><h2>Başvurunuzu birlikte planlayalım.</h2><p>Hangi oturum türünün size uygun olduğunu 15 dakikalık ücretsiz ön görüşmede netleştirin.</p></div><button class="btn lime" type="button" onclick="book()">Ücretsiz ön görüşme ↗</button></div>
    </article>
  </div>
  ${related.length ? `<section class="wrap bl-related"><h2>Diğer yazılar</h2><div class="bl-grid3">${related.map(x => card(x)).join('')}</div></section>` : ''}
</div>`;
}

export function blogJsonLd(p) {
  const url = `${siteUrl()}/blog/${p.slug}/`;
  const g = [{'@type': 'BlogPosting', headline: p.title, description: p.seo?.description || p.excerpt, image: p.cover ? [p.cover] : undefined, datePublished: p.date, dateModified: p.modified || p.date, author: {'@type': 'Organization', name: p.author?.name || 'Brazil Migration', url: siteUrl()}, publisher: {'@type': 'Organization', name: 'Brazil Migration', logo: {'@type': 'ImageObject', url: siteUrl() + '/brazil-migration-logo.png'}}, mainEntityOfPage: url, inLanguage: 'tr-TR'},
    {'@type': 'BreadcrumbList', itemListElement: [{'@type': 'ListItem', position: 1, name: 'Ana sayfa', item: siteUrl() + '/'}, {'@type': 'ListItem', position: 2, name: 'Blog', item: siteUrl() + '/blog/'}, {'@type': 'ListItem', position: 3, name: p.title, item: url}]}];
  if (p.faq?.length) g.push({'@type': 'FAQPage', mainEntity: p.faq.map(f => ({'@type': 'Question', name: f.q, acceptedAnswer: {'@type': 'Answer', text: f.a}}))});
  return `<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@graph': g}).replace(/</g, '\\u003c')}</script>`;
}
