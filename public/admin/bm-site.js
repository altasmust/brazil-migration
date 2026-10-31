'use strict';
// Site Yönetimi: Sayfalar (görsel düzenleyici, SEO, gizle), Menü Düzenleyici, Yeni sayfa (bloklar).
(() => {
  const A = async (path, method = 'GET', body) => {
    const opts = {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'};
    let r; try { r = await fetch('/api/platform/admin/' + path, opts); } catch { await new Promise(x => setTimeout(x, 900)); r = await fetch('/api/platform/admin/' + path, opts).catch(() => { throw new Error('Sunucuya ulaşılamadı. Birkaç saniye sonra tekrar deneyin.'); }); }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const $$ = s => [...document.querySelectorAll(s)];
  const P = {
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', off: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', back: '<path d="M15 18 9 12l6-6"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>', menu: '<path d="M4 6h16M4 12h16M4 18h10"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', check: '<path d="m5 12 5 5 9-10"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  };
  const I = k => `<svg class="bms-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.file}</svg>`;
  const modal = (title, html, wide) => { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; const d = $('#modal'); d.classList.toggle('bmc-wide', !!wide); if (!d.open) d.showModal(); };
  async function upload(file) {
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch('/api/platform/admin/site/media', {method: 'POST', body: fd}); const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Görsel yüklenemedi.'); return d.url;
  }
  const pickImage = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp,image/gif'; i.onchange = () => res(i.files[0] || null); i.click(); });
  let PAGES = null;
  const allPaths = () => PAGES ? [...PAGES.pages.map(p => [p.path, p.title]), ...PAGES.custom.map(c => [c.path, c.title])] : [];
  const pathList = () => `<datalist id="bms-paths">${allPaths().map(([p, t]) => `<option value="${esc(p)}">${esc(t)}</option>`).join('')}<option value="#gorusme">15 dk ücretsiz görüşme penceresi</option></datalist>`;

  // ---------- SAYFALAR ----------
  const routes = {};
  routes.sayfalar = () => mountP('Sayfalar', async root => {
    PAGES = await A('site/pages');
    const row = p => { const custom = p.type === 'custom'; const live = custom ? p.published : !p.hidden;
      return `<tr><td><b>${esc(p.title)}</b><small class="bmc-ct">${custom ? 'Yeni sayfa' : 'Hazır sayfa'}${p.edited ? ` · ${p.edited} değişiklik` : ''}</small></td><td><code>${esc(p.path)}</code></td>
        <td>${live ? '<span class="bmc-login on">Yayında</span>' : `<span class="bmc-login off">${custom ? 'Taslak' : 'Gizli'}</span>`}</td>
        <td>${p.seo?.title || p.seo?.description ? '<span class="bmc-login on">Düzenlendi</span>' : '<span class="bmc-none">Varsayılan</span>'}${p.seo?.noindex ? ' <span class="bmc-login wait">noindex</span>' : ''}</td>
        <td class="bms-acts">${custom ? `<button class="btn primary" data-cedit="${esc(p.id)}">${I('edit')} Düzenle</button>` : `<button class="btn primary" data-vedit="${esc(p.path)}">${I('edit')} Görsel düzenle</button>`}
          <button class="btn" data-seo="${esc(custom ? p.id : p.path)}" data-custom="${custom ? 1 : ''}">${I('search')} SEO</button>
          <a class="btn" href="${esc(p.path)}" target="_blank" rel="noopener">${I('eye')} Görüntüle</a>
          ${p.path === '/' ? '' : custom ? `<button class="btn" data-cpub="${esc(p.id)}" data-v="${p.published ? 0 : 1}">${p.published ? I('off') + ' Taslağa al' : I('eye') + ' Yayınla'}</button><button class="btn danger" data-cdel="${esc(p.id)}" title="Sil">${I('trash')}</button>` : `<button class="btn" data-vis="${esc(p.path)}" data-v="${p.hidden ? 0 : 1}">${p.hidden ? I('eye') + ' Yayına al' : I('off') + ' Gizle'}</button>`}
          ${!custom && p.edited ? `<button class="btn" data-reset="${esc(p.path)}" title="Tüm metin/görsel değişikliklerini kaldır">${I('undo')} Orijinale dön</button>` : ''}</td></tr>`; };
    root.innerHTML = heading('Sayfalar') + `<div class="bmc-callout">${I('edit')}<div><b>Sayfaları sitenin üzerinde düzenleyin</b><span>“Görsel düzenle” sayfayı açar; yazılara tıklayıp değiştirin, görsellere tıklayıp yenisini yükleyin, bağlantıları düzenleyin, istemediğiniz bölümleri gizleyin. Menü ve alt bilgi (footer) tüm sayfalarda ortaktır; onları Menü Düzenleyici’den değiştirin.</span></div><a class="btn" href="#menu">${I('menu')} Menü Düzenleyici</a><button class="btn primary" id="bms-new">${I('plus')} Yeni sayfa</button></div>
      <section class="panel"><div class="bmc-table"><table><thead><tr><th>Sayfa</th><th>Adres</th><th>Durum</th><th>SEO</th><th></th></tr></thead><tbody>${PAGES.pages.map(row).join('')}${PAGES.custom.map(row).join('')}</tbody></table></div></section>`;
    $('#bms-new').onclick = () => customEditor(null);
    root.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      try {
        if (b.dataset.vedit) return visualEditor(b.dataset.vedit);
        if (b.dataset.seo) return seoModal(b.dataset.seo, !!b.dataset.custom);
        if (b.dataset.cedit) return customEditor(PAGES.custom.find(c => c.id === b.dataset.cedit));
        if (b.dataset.vis) { await A('site/visibility', 'POST', {path: b.dataset.vis, hidden: b.dataset.v === '1'}); say(b.dataset.v === '1' ? 'Sayfa gizlendi (ziyaretçilere “bulunamadı” gösterilir).' : 'Sayfa yayında.'); render(); }
        if (b.dataset.reset && confirm('Bu sayfadaki tüm metin, görsel ve bağlantı değişiklikleri kaldırılıp orijinal haline dönülsün mü?')) { await A('site/page/reset', 'POST', {path: b.dataset.reset}); say('Sayfa orijinal haline döndü.'); render(); }
        if (b.dataset.cpub) { const c = PAGES.custom.find(x => x.id === b.dataset.cpub); await A('site/custom', 'POST', {...c, slug: c.path.replace(/\//g, ''), published: b.dataset.v === '1'}); say(b.dataset.v === '1' ? 'Sayfa yayınlandı.' : 'Sayfa taslağa alındı.'); render(); }
        if (b.dataset.cdel && confirm('Bu sayfa kalıcı olarak silinsin mi?')) { await A('site/custom/delete', 'POST', {id: b.dataset.cdel}); say('Sayfa silindi.'); render(); }
      } catch (err) { say(err.message); }
    };
  });
  function mountP(title, fn) { setTimeout(async () => { const root = $('#bms-root'); try { await fn(root); } catch (e) { if (e.message !== 'Giriş gerekli') root.innerHTML = heading(title) + `<div class="bmc-err">${esc(e.message)}</div>`; } }, 0); return `<div class="bmc bms" id="bms-root">${heading(title)}<div class="loading">Yükleniyor…</div></div>`; }

  // ---------- SEO ----------
  function seoModal(idOrPath, custom) {
    const p = custom ? PAGES.custom.find(c => c.id === idOrPath) : PAGES.pages.find(x => x.path === idOrPath); const s = p.seo || {};
    modal('SEO · ' + p.title, `<form class="bmc-form" id="bms-seo" style="padding:0">
      <label class="full">Sayfa başlığı (title) <small class="muted" data-c="title"></small><input class="bmc-in" name="title" maxlength="120" value="${esc(s.title || '')}" placeholder="${esc(p.title)}"></label>
      <label class="full">Açıklama (meta description) <small class="muted" data-c="description"></small><textarea class="bmc-in" name="description" rows="3" maxlength="320" style="height:auto;padding:10px 12px" placeholder="Arama sonuçlarında başlığın altında görünen 1–2 cümle">${esc(s.description || '')}</textarea></label>
      <label class="full">Paylaşım görseli (sosyal medyada görünen) <span class="bmc-inl"><input class="bmc-in" name="image" value="${esc(s.image || '')}" placeholder="/images/... veya https://..."><button type="button" class="btn" id="bms-seoimg">${I('img')} Yükle</button></span></label>
      <label class="bmc-cb full"><input type="checkbox" name="noindex" ${s.noindex ? 'checked' : ''}> Arama motorlarında gösterme (noindex)</label>
      <div class="full bms-serp"><small>Google önizlemesi</small><b data-p="title"></b><span>${esc(location.origin + p.path)}</span><p data-p="description"></p></div>
      <div class="full bmc-actions" style="padding:0"><button class="btn primary">${I('check')} Kaydet</button><small class="muted">Boş bırakılan alanlarda sayfanın mevcut başlığı ve açıklaması kullanılır.</small></div></form>`);
    const f = $('#bms-seo');
    const upd = () => { for (const [k, max] of [['title', 60], ['description', 160]]) { const v = f[k].value; f.querySelector(`[data-c=${k}]`).textContent = `${v.length} / ${max} önerilen`; f.querySelector(`[data-p=${k}]`).textContent = v || (k === 'title' ? p.title : 'Sayfanın mevcut açıklaması kullanılır.'); } };
    f.oninput = upd; upd();
    $('#bms-seoimg').onclick = async () => { const file = await pickImage(); if (!file) return; try { f.image.value = await upload(file); say('Görsel yüklendi.'); } catch (e) { say(e.message); } };
    f.onsubmit = async e => { e.preventDefault(); try { await A('site/seo', 'POST', {path: custom ? undefined : p.path, id: custom ? p.id : undefined, seo: {title: f.title.value, description: f.description.value, image: f.image.value, noindex: f.noindex.checked}}); $('#modal').close(); say('SEO ayarları kaydedildi.'); render(); } catch (err) { say(err.message); } };
  }

  // ---------- GÖRSEL DÜZENLEYİCİ ----------
  const FRAME_CSS = `[data-bm-k]{transition:outline-color .12s}[data-bm-t]:hover{outline:2px dashed rgba(0,105,92,.55);outline-offset:2px;cursor:pointer}.bm-sel{outline:2px solid #00695c!important;outline-offset:2px;box-shadow:0 0 0 6px rgba(0,105,92,.12)}[contenteditable=true]{cursor:text!important;outline:2px solid #00695c!important;background:rgba(215,236,164,.25)}[data-bm-hidden]{opacity:.35;background-image:repeating-linear-gradient(45deg,transparent 0 8px,rgba(192,57,43,.12) 8px 16px)!important}img[data-bm-k]:hover{filter:brightness(.92)}html{scroll-behavior:auto}`;
  const FRAME_JS = `(()=>{const P=parent;const all=()=>[...document.querySelectorAll('[data-bm-k]')];const snap=e=>({html:e.dataset.bmT.includes('t')?e.innerHTML:undefined,href:e.getAttribute('href'),src:e.getAttribute('src'),alt:e.getAttribute('alt'),hide:e.hasAttribute('data-bm-hidden')});const init=new Map(all().map(e=>[e.dataset.bmK,snap(e)]));let sel=null;
const info=e=>{const pl=e.parentElement&&e.parentElement.closest('[data-bm-t*=l]');return{type:'select',key:e.dataset.bmK,kind:e.dataset.bmT,tag:e.tagName.toLowerCase(),href:e.getAttribute('href'),src:e.getAttribute('src'),alt:e.getAttribute('alt'),hidden:e.hasAttribute('data-bm-hidden'),text:(e.textContent||'').trim().slice(0,80),parentLink:pl?{key:pl.dataset.bmK,href:pl.getAttribute('href')}:null}};
const count=()=>{let n=0;for(const e of all()){const a=init.get(e.dataset.bmK),b=snap(e);if(a.html!==b.html||a.href!==b.href||a.src!==b.src||a.alt!==b.alt||a.hide!==b.hide)n++}P.postMessage({type:'dirty',n},'*')};
const choose=e=>{if(sel&&sel!==e){sel.classList.remove('bm-sel');sel.removeAttribute('contenteditable')}sel=e;e.classList.add('bm-sel');if(e.dataset.bmT.includes('t')){e.setAttribute('contenteditable','true');e.focus()}P.postMessage(info(e),'*')};
document.addEventListener('click',ev=>{const e=ev.target.closest('[data-bm-k]');const a=ev.target.closest('a,button,summary,label');if(a||e){ev.preventDefault()}if(!e)return;ev.stopPropagation();if(sel===e&&e.isContentEditable)return;choose(e)},true);
document.addEventListener('submit',ev=>ev.preventDefault(),true);
document.addEventListener('input',()=>count());
document.addEventListener('paste',ev=>{if(!ev.target.closest||!ev.target.closest('[contenteditable=true]'))return;ev.preventDefault();document.execCommand('insertText',false,(ev.clipboardData||window.clipboardData).getData('text/plain'))});
document.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.isContentEditable){ev.preventDefault();document.execCommand('insertLineBreak')}if(ev.key==='Escape'&&sel){sel.removeAttribute('contenteditable');sel.classList.remove('bm-sel');sel=null;P.postMessage({type:'select',key:null},'*')}});
window.addEventListener('message',ev=>{const m=ev.data||{};if(m.type==='set'){const e=document.querySelector('[data-bm-k="'+m.key+'"]');if(!e)return;if(m.prop==='hide'){m.value?e.setAttribute('data-bm-hidden','1'):e.removeAttribute('data-bm-hidden')}else if(m.prop==='fmt'){document.execCommand(m.value)}else{e.setAttribute(m.prop,m.value);if(m.prop==='src')e.removeAttribute('srcset')}count();if(sel===e)P.postMessage(info(e),'*')}
if(m.type==='collect'){const ch={};for(const e of all()){const k=e.dataset.bmK,a=init.get(k),b=snap(e),c={};if(a.html!==b.html)c.html=b.html;if(a.href!==b.href)c.href=b.href;if(a.src!==b.src)c.src=b.src;if(a.alt!==b.alt)c.alt=b.alt;if(a.hide!==b.hide)c.hide=b.hide;if(Object.keys(c).length)ch[k]=c}P.postMessage({type:'changes',changes:ch},'*')}});
P.postMessage({type:'ready'},'*')})();`;
  async function visualEditor(path) {
    const page = PAGES?.pages.find(p => p.path === path) || {title: path, path};
    document.getElementById('bms-ed')?.remove();
    const ed = document.createElement('div'); ed.id = 'bms-ed';
    ed.innerHTML = `<div class="bms-bar"><button class="btn" data-x>${I('back')} Kapat</button><div class="bms-title"><b>${esc(page.title)}</b><small>${esc(path)}</small></div>
      <div class="bms-dev"><button class="on" data-dev="desktop" title="Masaüstü">${I('desktop')}</button><button data-dev="mobile" title="Mobil">${I('mobile')}</button></div>
      <span class="bms-dirty" id="bms-dirty">Değişiklik yok</span><a class="btn" href="${esc(path)}" target="_blank" rel="noopener">${I('eye')} Canlı sayfa</a><button class="btn primary" id="bms-save" disabled>${I('check')} Kaydet</button></div>
      <div class="bms-body"><div class="bms-stage"><iframe id="bms-frame" title="Sayfa düzenleyici"></iframe></div><aside class="bms-side" id="bms-side"></aside></div>`;
    document.body.appendChild(ed); document.body.style.overflow = 'hidden';
    const side = $('#bms-side'), frame = $('#bms-frame');
    const help = () => { side.innerHTML = `<h3>Nasıl düzenlenir?</h3><ul class="bms-help"><li>${I('text')}<span><b>Yazı:</b> Sayfada bir yazıya tıklayın ve doğrudan yazın. Kalın için <kbd>Ctrl</kbd>+<kbd>B</kbd>, italik için <kbd>Ctrl</kbd>+<kbd>I</kbd>, yeni satır için <kbd>Enter</kbd>.</span></li><li>${I('img')}<span><b>Görsel:</b> Görsele tıklayın, sağdaki panelden yenisini yükleyin.</span></li><li>${I('link')}<span><b>Bağlantı / buton:</b> Tıklayın, sağdan adresini değiştirin.</span></li><li>${I('off')}<span><b>Gizle:</b> İstemediğiniz bir yazıyı, görseli veya kartı gizleyebilirsiniz.</span></li></ul><p class="bms-note">Menü ve alt bilgi tüm sayfalarda ortaktır; <a href="#menu" data-x>Menü Düzenleyici</a>’den değiştirin. Bazı bölümler (karşılaştırma kartları, ön değerlendirme soruları, Portekizce dersleri) sayfa açılırken oluşturulduğu için burada görünmeyebilir.</p>`; };
    help();
    let cur = null, dirty = 0;
    const post = m => frame.contentWindow.postMessage(m, '*');
    const panel = m => {
      cur = m; if (!m.key) return help();
      const k = m.kind, isImg = k === 'i', isText = k.includes('t'), isLink = k.includes('l');
      side.innerHTML = `<h3>${isImg ? I('img') + ' Görsel' : isLink && !isText ? I('link') + ' Bağlantı' : isLink ? I('link') + ' Bağlantılı yazı' : I('text') + ' Yazı'}</h3>
        ${isText ? `<p class="bms-note">Yazıyı sayfada doğrudan düzenleyin.</p><div class="bms-fmt"><button class="btn" data-fmt="bold"><b>K</b> Kalın</button><button class="btn" data-fmt="italic"><i>İ</i> İtalik</button></div>` : ''}
        ${isImg ? `<div class="bms-imgprev"><img src="${esc(m.src || '')}" alt=""></div><button class="btn primary" data-up>${I('img')} Yeni görsel yükle</button><label>Görsel adresi<input class="bmc-in" data-attr="src" value="${esc(m.src || '')}"></label><label>Alternatif metin (erişilebilirlik / SEO)<input class="bmc-in" data-attr="alt" value="${esc(m.alt || '')}"></label>` : ''}
        ${isLink ? `<label>Bağlantı adresi<input class="bmc-in" data-attr="href" list="bms-paths" value="${esc(m.href || '')}" placeholder="/sayfa/ veya https://..."></label>` : ''}
        ${m.parentLink && !isLink ? `<label>Bu kartın bağlantısı<input class="bmc-in" data-plink="${esc(m.parentLink.key)}" list="bms-paths" value="${esc(m.parentLink.href || '')}"></label>` : ''}
        ${pathList()}
        <button class="btn" data-hide>${m.hidden ? I('eye') + ' Göster' : I('off') + ' Bu öğeyi gizle'}</button>
        <button class="btn" data-revert title="Bu öğeyi sitenin orijinal haline döndürür">${I('undo')} Orijinaline döndür</button>
        <p class="bms-note">Seçili: <code>${esc(m.tag)}</code> ${m.text ? '· “' + esc(m.text) + '”' : ''}</p>`;
      side.querySelectorAll('[data-attr]').forEach(inp => inp.onchange = () => post({type: 'set', key: m.key, prop: inp.dataset.attr, value: inp.value}));
      side.querySelectorAll('[data-plink]').forEach(inp => inp.onchange = () => post({type: 'set', key: inp.dataset.plink, prop: 'href', value: inp.value}));
      side.querySelectorAll('[data-fmt]').forEach(b => b.onclick = () => post({type: 'set', key: m.key, prop: 'fmt', value: b.dataset.fmt}));
      const up = side.querySelector('[data-up]'); if (up) up.onclick = async () => { const f = await pickImage(); if (!f) return; up.disabled = true; up.textContent = 'Yükleniyor…'; try { post({type: 'set', key: m.key, prop: 'src', value: await upload(f)}); } catch (e) { say(e.message); } finally { up.disabled = false; up.innerHTML = I('img') + ' Yeni görsel yükle'; } };
      side.querySelector('[data-hide]').onclick = () => post({type: 'set', key: m.key, prop: 'hide', value: !m.hidden});
      side.querySelector('[data-revert]').onclick = async () => { if (!confirm('Bu öğe orijinal haline döndürülsün mü? (Kaydedilmemiş diğer değişiklikleriniz de kaydedilir.)')) return; await save({[m.key]: {revert: true}}); };
    };
    const load = async () => { const d = await A('site/editor?path=' + encodeURIComponent(path)); frame.srcdoc = d.html.replace('</head>', `<style>${FRAME_CSS}</style></head>`).replace(/<\/body>(?![\s\S]*<\/body>)/, `<script>${FRAME_JS}<\/script></body>`); };
    const onMsg = ev => {
      if (ev.source !== frame.contentWindow) return; const m = ev.data || {};
      if (m.type === 'select') panel(m);
      if (m.type === 'dirty') { dirty = m.n; $('#bms-dirty').textContent = m.n ? `${m.n} değişiklik kaydedilmedi` : 'Değişiklik yok'; $('#bms-dirty').classList.toggle('on', !!m.n); $('#bms-save').disabled = !m.n; }
      if (m.type === 'changes' && pending) { const r = pending; pending = null; r(m.changes); }
      if (m.type === 'ready') { dirty = 0; $('#bms-save').disabled = true; $('#bms-dirty').textContent = 'Değişiklik yok'; $('#bms-dirty').classList.remove('on'); }
    };
    let pending = null;
    const collect = () => new Promise(r => { pending = r; post({type: 'collect'}); setTimeout(() => { if (pending) { pending = null; r({}); } }, 3000); });
    async function save(extra = {}) {
      const btn = $('#bms-save'); btn.disabled = true; btn.textContent = 'Kaydediliyor…';
      try { const ch = {...await collect(), ...extra}; if (!Object.keys(ch).length) { say('Kaydedilecek değişiklik yok.'); return; } const r = await A('site/page', 'POST', {path, changes: ch}); say(`Kaydedildi. Sayfada ${r.edited} öğe düzenlenmiş durumda.`); await load(); help(); }
      catch (e) { say(e.message); } finally { btn.innerHTML = I('check') + ' Kaydet'; btn.disabled = !dirty; }
    }
    window.addEventListener('message', onMsg);
    const close = async () => { if (dirty && !confirm('Kaydedilmemiş değişiklikler var. Çıkılsın mı?')) return; window.removeEventListener('message', onMsg); ed.remove(); document.body.style.overflow = ''; render(); };
    ed.addEventListener('click', e => { if (e.target.closest('[data-x]')) { e.preventDefault(); const href = e.target.closest('a')?.getAttribute('href'); close().then(() => { if (href) location.hash = href; }); } const d = e.target.closest('[data-dev]'); if (d) { ed.querySelectorAll('[data-dev]').forEach(x => x.classList.toggle('on', x === d)); ed.querySelector('.bms-stage').classList.toggle('mobile', d.dataset.dev === 'mobile'); } });
    $('#bms-save').onclick = () => save();
    try { await load(); } catch (e) { say(e.message); }
  }

  // ---------- MENÜ DÜZENLEYİCİ ----------
  routes.menu = () => mountP('Menü Düzenleyici', async root => {
    if (!PAGES) PAGES = await A('site/pages');
    const d = await A('site/menu'); let M = d.menu;
    const mv = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
    const ctl = (path, i, n) => `<span class="bms-ctl"><button type="button" data-mv="${path}|${i}|-1" ${i === 0 ? 'disabled' : ''} title="Yukarı">${I('up')}</button><button type="button" data-mv="${path}|${i}|1" ${i === n - 1 ? 'disabled' : ''} title="Aşağı">${I('down')}</button><button type="button" data-rm="${path}|${i}" title="Sil">${I('x')}</button></span>`;
    const inp = (path, v, ph, list) => `<input class="bmc-in" data-p="${path}" value="${esc(v || '')}" placeholder="${esc(ph)}" ${list ? 'list="bms-paths"' : ''}>`;
    const draw = () => {
      root.innerHTML = heading('Menü Düzenleyici') + `${pathList()}<div class="bmc-callout">${I('menu')}<div><b>Menü ve alt bilgi tüm sayfalarda ortaktır</b><span>Burada yaptığınız değişiklik kaydedince sitenin her sayfasına uygulanır. Bağlantı adresine bir sayfa yolu (ör. <code>/iletisim/</code>) veya tam adres yazabilirsiniz; liste önerilerinden de seçebilirsiniz.</span></div>${d.saved ? `<button class="btn" id="bms-mreset">${I('undo')} Varsayılana dön</button>` : ''}<button class="btn primary" id="bms-msave">${I('check')} Kaydet</button></div>
      <section class="panel" style="margin-bottom:16px"><header class="panel-head">${I('menu')}<h2>Üst menü</h2><button class="bmc-link" data-add="groups">${I('plus')} Menü grubu ekle</button></header><div class="bms-groups">${M.groups.map((g, gi) => `<article class="bms-grp"><div class="bms-grp-hd"><input class="bmc-in bms-big" data-p="groups.${gi}.title" value="${esc(g.title)}" placeholder="Grup adı (menüde görünür)">${ctl('groups', gi, M.groups.length)}</div>
          <details class="bms-intro"><summary>Açılır panelin sol tarafı (başlık, kısa metin, buton)</summary><div class="bms-row4">${inp(`groups.${gi}.intro.kicker`, g.intro?.kicker, 'Üst yazı (ör. BRASIL · SÃO PAULO)')}${inp(`groups.${gi}.intro.heading`, g.intro?.heading, 'Panel başlığı')}${inp(`groups.${gi}.intro.cta.label`, g.intro?.cta?.label, 'Buton yazısı')}${inp(`groups.${gi}.intro.cta.href`, g.intro?.cta?.href, 'Buton bağlantısı', 1)}</div><textarea class="bmc-in" data-p="groups.${gi}.intro.text" rows="2" placeholder="Kısa metin">${esc(g.intro?.text || '')}</textarea></details>
          <div class="bms-links">${(g.links || []).map((l, li) => `<div class="bms-link">${inp(`groups.${gi}.links.${li}.title`, l.title, 'Bağlantı adı')}${inp(`groups.${gi}.links.${li}.desc`, l.desc, 'Kısa açıklama')}${inp(`groups.${gi}.links.${li}.href`, l.href, '/sayfa/', 1)}${ctl(`groups.${gi}.links`, li, g.links.length)}</div>`).join('')}</div>
          <button class="bmc-link" data-add="groups.${gi}.links">${I('plus')} Bağlantı ekle</button></article>`).join('')}</div></section>
      <section class="panel"><header class="panel-head">${I('file')}<h2>Alt bilgi (footer)</h2></header><div class="bms-foot">
        <div class="bms-row2"><label>Logo altındaki metin<textarea class="bmc-in" data-p="footer.brandText" rows="2">${esc(M.footer.brandText)}</textarea></label><label>Konum yazısı${inp('footer.location', M.footer.location, 'São Paulo · Brezilya')}</label></div>
        <div class="bms-cols">${M.footer.cols.map((c, ci) => `<article class="bms-grp"><div class="bms-grp-hd">${inp(`footer.cols.${ci}.title`, c.title, 'Sütun başlığı')}${ctl('footer.cols', ci, M.footer.cols.length)}</div><div class="bms-links">${c.links.map((l, li) => `<div class="bms-link two">${inp(`footer.cols.${ci}.links.${li}.label`, l.label, 'Bağlantı adı')}${inp(`footer.cols.${ci}.links.${li}.href`, l.href, '/sayfa/', 1)}${ctl(`footer.cols.${ci}.links`, li, c.links.length)}</div>`).join('')}</div><button class="bmc-link" data-add="footer.cols.${ci}.links">${I('plus')} Bağlantı ekle</button></article>`).join('')}${M.footer.cols.length < 4 ? `<button class="bms-addcol" data-add="footer.cols">${I('plus')} Sütun ekle</button>` : ''}</div>
        <div class="bms-row2"><label>Sağ kutu başlığı${inp('footer.contact.title', M.footer.contact.title, 'İlk adımı birlikte atalım')}</label><label>Sağ kutu metni${inp('footer.contact.text', M.footer.contact.text, '')}</label><label>Buton yazısı${inp('footer.contact.button.label', M.footer.contact.button.label, '')}</label><label>Buton bağlantısı${inp('footer.contact.button.href', M.footer.contact.button.href, '/iletisim/', 1)}</label></div>
        <div class="bms-row2"><label>Telif satırı${inp('footer.bottom.copy', M.footer.bottom.copy, '© 2026 Brazil Migration')}</label><label class="full">Alt bilgilendirme metni<textarea class="bmc-in" data-p="footer.legal" rows="2">${esc(M.footer.legal)}</textarea></label></div>
        <div class="bms-links">${M.footer.bottom.links.map((l, li) => `<div class="bms-link two">${inp(`footer.bottom.links.${li}.label`, l.label, 'Alt satır bağlantısı')}${inp(`footer.bottom.links.${li}.href`, l.href, '/sayfa/', 1)}${ctl('footer.bottom.links', li, M.footer.bottom.links.length)}</div>`).join('')}</div><button class="bmc-link" data-add="footer.bottom.links">${I('plus')} Alt satıra bağlantı ekle</button></div></section>`;
      root.querySelectorAll('[data-p]').forEach(el => el.oninput = () => setPath(M, el.dataset.p, el.value));
      $('#bms-msave').onclick = async () => { try { await A('site/menu', 'POST', {menu: M}); d.saved = true; say('Menü kaydedildi. Tüm sayfalarda geçerli.'); draw(); } catch (e) { say(e.message); } };
      const rs = $('#bms-mreset'); if (rs) rs.onclick = async () => { if (!confirm('Menü ve footer sitenin ilk haline döndürülsün mü?')) return; try { await A('site/menu', 'POST', {menu: M, reset: true}); say('Varsayılan menüye dönüldü.'); render(); } catch (e) { say(e.message); } };
    };
    const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
    function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k] ??= {}, o); t[last] = v; }
    root.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mv) { const [p, i, dir] = b.dataset.mv.split('|'); mv(get(M, p), +i, +dir); draw(); }
      if (b.dataset.rm) { const [p, i] = b.dataset.rm.split('|'); const arr = get(M, p); if (p === 'groups' && !confirm(`“${arr[i].title}” grubu silinsin mi?`)) return; arr.splice(+i, 1); draw(); }
      if (b.dataset.add) { const p = b.dataset.add, arr = get(M, p); if (p === 'groups') arr.push({title: 'Yeni grup', intro: {kicker: 'BRASIL · SÃO PAULO', heading: 'Yeni grup', text: 'Yeni başlangıcınız için\ndoğru adımı keşfedin.', cta: {label: 'Görüşme planla ↗', href: '/iletisim/'}}, links: []}); else if (p === 'footer.cols') arr.push({title: 'Yeni sütun', links: []}); else if (p.startsWith('groups')) arr.push({title: '', desc: '', href: ''}); else arr.push({label: '', href: ''}); draw(); }
    };
    draw();
  });

  // ---------- YENİ SAYFA (BLOKLAR) ----------
  const BLOCKS = {hero: 'Üst bölüm (başlık + görsel)', text: 'Metin bölümü', cards: 'Kartlar / adımlar', faq: 'Sık sorulan sorular', image: 'Görsel', cta: 'Çağrı kutusu (buton)'};
  const NEWB = {hero: () => ({type: 'hero', kicker: 'BRASIL · SÃO PAULO', title: 'Sayfa başlığı', text: 'Kısa açıklama metni.', button: '15 Dakikalık Ücretsiz Ön Görüşme', link: '#gorusme', image: '/images/marketing-v2/oturum.webp'}), text: () => ({type: 'text', title: 'Bölüm başlığı', text: 'Paragraf metni. Yeni paragraf için bir satır boş bırakın.'}), cards: () => ({type: 'cards', kicker: '', title: 'Adımlar', items: [{title: 'Birinci adım', text: 'Açıklama'}, {title: 'İkinci adım', text: 'Açıklama'}, {title: 'Üçüncü adım', text: 'Açıklama'}]}), faq: () => ({type: 'faq', title: 'Sık sorulan sorular', items: [{title: 'Soru?', text: 'Cevap.'}]}), image: () => ({type: 'image', image: '', alt: '', caption: ''}), cta: () => ({type: 'cta', title: 'Brezilya yolculuğunuza bugün başlayın', text: '15 dakikalık ücretsiz ön görüşmede durumunuzu birlikte değerlendirelim.', button: 'Görüşme planla', link: '#gorusme'})};
  function customEditor(page) {
    const P0 = page ? JSON.parse(JSON.stringify(page)) : {title: 'Yeni sayfa', path: '', published: false, blocks: [NEWB.hero(), NEWB.text(), NEWB.cta()]};
    let slug = (P0.path || '').replace(/\//g, '') || '', slugTouched = !!page;
    document.getElementById('bms-ed')?.remove();
    const ed = document.createElement('div'); ed.id = 'bms-ed';
    ed.innerHTML = `<div class="bms-bar"><button class="btn" data-x>${I('back')} Kapat</button><div class="bms-title"><b>${page ? 'Sayfayı düzenle' : 'Yeni sayfa'}</b><small id="bms-cpath"></small></div><span class="sp"></span><label class="bmc-cb" style="margin:0"><input type="checkbox" id="bms-pub" ${P0.published ? 'checked' : ''}> Yayında</label><button class="btn primary" id="bms-csave">${I('check')} Kaydet</button></div>
      <div class="bms-body"><aside class="bms-side left" id="bms-form"></aside><div class="bms-stage"><iframe id="bms-frame" title="Önizleme"></iframe></div></div>`;
    document.body.appendChild(ed); document.body.style.overflow = 'hidden';
    const form = $('#bms-form'), frame = $('#bms-frame');
    let tmr = null; const preview = () => { clearTimeout(tmr); tmr = setTimeout(async () => { try { const d = await A('site/preview', 'POST', {title: P0.title, blocks: P0.blocks}); const y = frame.contentWindow?.scrollY || 0; frame.srcdoc = d.html.replace('</head>', '<style>a,button{pointer-events:none}</style></head>'); frame.onload = () => frame.contentWindow.scrollTo(0, y); } catch (e) { say(e.message); } }, 450); };
    const fld = (bi, k, label, type = 'input', ph = '') => type === 'textarea' ? `<label>${label}<textarea class="bmc-in" rows="4" data-b="${bi}.${k}" placeholder="${esc(ph)}">${esc(P0.blocks[bi][k] || '')}</textarea></label>` : `<label>${label}<input class="bmc-in" data-b="${bi}.${k}" value="${esc(P0.blocks[bi][k] || '')}" placeholder="${esc(ph)}" ${k === 'link' ? 'list="bms-paths"' : ''}></label>`;
    const imgf = (bi, k) => `<label>Görsel<span class="bmc-inl"><input class="bmc-in" data-b="${bi}.${k}" value="${esc(P0.blocks[bi][k] || '')}" placeholder="/images/... veya yükleyin"><button type="button" class="btn" data-upb="${bi}.${k}">${I('img')}</button></span></label>`;
    const draw = () => {
      $('#bms-cpath').textContent = slug ? '/' + slug + '/' : 'adres belirleyin';
      form.innerHTML = `${pathList()}<div class="bms-meta"><label>Sayfa başlığı<input class="bmc-in" id="bms-ct" value="${esc(P0.title)}"></label><label>Sayfa adresi<span class="bms-slug"><span>${esc(location.origin)}/</span><input class="bmc-in" id="bms-cs" value="${esc(slug)}" placeholder="ornek-sayfa"><span>/</span></span></label></div>
        <h3 class="bms-h">Bölümler</h3>${P0.blocks.map((b, bi) => `<article class="bms-blk"><div class="bms-blk-hd"><b>${esc(BLOCKS[b.type])}</b><span class="bms-ctl"><button type="button" data-bmv="${bi}|-1" ${bi === 0 ? 'disabled' : ''}>${I('up')}</button><button type="button" data-bmv="${bi}|1" ${bi === P0.blocks.length - 1 ? 'disabled' : ''}>${I('down')}</button><button type="button" data-brm="${bi}">${I('x')}</button></span></div>
          ${b.type === 'hero' ? fld(bi, 'kicker', 'Üst yazı') + fld(bi, 'title', 'Başlık') + fld(bi, 'text', 'Metin', 'textarea') + `<div class="bms-row2">${fld(bi, 'button', 'Buton yazısı')}${fld(bi, 'link', 'Buton bağlantısı', 'input', '#gorusme = görüşme penceresi')}</div>` + imgf(bi, 'image') : ''}
          ${b.type === 'text' ? fld(bi, 'kicker', 'Üst yazı (isteğe bağlı)') + fld(bi, 'title', 'Başlık') + fld(bi, 'text', 'Metin', 'textarea', 'Paragraflar arasında bir satır boşluk bırakın') : ''}
          ${b.type === 'cta' ? fld(bi, 'title', 'Başlık') + fld(bi, 'text', 'Metin', 'textarea') + `<div class="bms-row2">${fld(bi, 'button', 'Buton yazısı')}${fld(bi, 'link', 'Buton bağlantısı', 'input', '#gorusme')}</div>` : ''}
          ${b.type === 'image' ? imgf(bi, 'image') + fld(bi, 'alt', 'Alternatif metin') + fld(bi, 'caption', 'Alt yazı') : ''}
          ${b.type === 'cards' || b.type === 'faq' ? (b.type === 'cards' ? fld(bi, 'kicker', 'Üst yazı (isteğe bağlı)') : '') + fld(bi, 'title', 'Bölüm başlığı') + (b.items || []).map((it, ii) => `<div class="bms-item"><input class="bmc-in" data-i="${bi}.${ii}.title" value="${esc(it.title)}" placeholder="${b.type === 'faq' ? 'Soru' : 'Kart başlığı'}"><textarea class="bmc-in" rows="2" data-i="${bi}.${ii}.text" placeholder="${b.type === 'faq' ? 'Cevap' : 'Kart metni'}">${esc(it.text)}</textarea><button type="button" class="bms-irm" data-irm="${bi}.${ii}" title="Sil">${I('x')}</button></div>`).join('') + `<button type="button" class="bmc-link" data-iadd="${bi}">${I('plus')} ${b.type === 'faq' ? 'Soru ekle' : 'Kart ekle'}</button>` : ''}</article>`).join('')}
        <div class="bms-addb"><select class="bmc-in" id="bms-nb"><option value="">+ Bölüm ekle…</option>${Object.entries(BLOCKS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <p class="bms-note">Sayfayı menüye eklemek için kaydettikten sonra <b>Menü Düzenleyici</b>’den bir bağlantı ekleyin. SEO ayarlarını Sayfalar listesinden yapabilirsiniz.</p>`;
      $('#bms-ct').oninput = e => { P0.title = e.target.value; if (!slugTouched) { slug = slugify(e.target.value); $('#bms-cs').value = slug; $('#bms-cpath').textContent = '/' + slug + '/'; } preview(); };
      $('#bms-cs').oninput = e => { slug = slugify(e.target.value); slugTouched = true; $('#bms-cpath').textContent = '/' + slug + '/'; };
      form.querySelectorAll('[data-b]').forEach(el => el.oninput = () => { const [bi, k] = el.dataset.b.split('.'); P0.blocks[bi][k] = el.value; preview(); });
      form.querySelectorAll('[data-i]').forEach(el => el.oninput = () => { const [bi, ii, k] = el.dataset.i.split('.'); P0.blocks[bi].items[ii][k] = el.value; preview(); });
      $('#bms-nb').onchange = e => { if (!e.target.value) return; P0.blocks.push(NEWB[e.target.value]()); draw(); preview(); form.scrollTop = form.scrollHeight; };
    };
    const slugify = s => String(s).toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    form.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.bmv) { const [i, d] = b.dataset.bmv.split('|').map(Number); const j = i + d; [P0.blocks[i], P0.blocks[j]] = [P0.blocks[j], P0.blocks[i]]; draw(); preview(); }
      if (b.dataset.brm) { P0.blocks.splice(+b.dataset.brm, 1); draw(); preview(); }
      if (b.dataset.iadd) { const bl = P0.blocks[+b.dataset.iadd]; (bl.items ||= []).push({title: '', text: ''}); draw(); }
      if (b.dataset.irm) { const [bi, ii] = b.dataset.irm.split('.').map(Number); P0.blocks[bi].items.splice(ii, 1); draw(); preview(); }
      if (b.dataset.upb) { const [bi, k] = b.dataset.upb.split('.'); const f = await pickImage(); if (!f) return; try { P0.blocks[bi][k] = await upload(f); draw(); preview(); say('Görsel yüklendi.'); } catch (err) { say(err.message); } }
    };
    const close = () => { ed.remove(); document.body.style.overflow = ''; render(); };
    ed.querySelector('[data-x]').onclick = () => { if (confirm('Kaydetmeden çıkılsın mı?')) close(); };
    $('#bms-csave').onclick = async () => { try { const r = await A('site/custom', 'POST', {id: P0.id, slug, title: P0.title, published: $('#bms-pub').checked, blocks: P0.blocks}); P0.id = r.id; say($('#bms-pub').checked ? `Kaydedildi ve yayında: ${r.path}` : `Taslak olarak kaydedildi: ${r.path}`); close(); } catch (e) { say(e.message); } };
    draw(); preview();
  }

  Object.assign(names, {sayfalar: 'Sayfalar', menu: 'Menü Düzenleyici'});
  const _overview = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _overview(); };
  if (routes[route()]) setTimeout(() => { if (!document.querySelector('#bms-root')) render(); }, 700);
})();
