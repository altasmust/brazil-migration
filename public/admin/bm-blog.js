'use strict';
// Site Yönetimi → Blog: yazı listesi, zengin metin düzenleyici, kapak görseli, SSS, kaynaklar, SEO, canlı önizleme.
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
  const P = {
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', off: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', back: '<path d="M15 18 9 12l6-6"/>', check: '<path d="m5 12 5 5 9-10"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    blog: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>', desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    ul: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>', ol: '<path d="M10 6h10M10 12h10M10 18h10M4 5h1v3M4 11.5 5.5 10H4M4 17h1.5L4 19h1.5"/>', quote: '<path d="M7 7h4v4c0 3-2 5-4 5M14 7h4v4c0 3-2 5-4 5"/>', code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>', star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  };
  const I = k => `<svg class="bms-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.blog}</svg>`;
  async function upload(file) {
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch('/api/platform/admin/site/media', {method: 'POST', body: fd}); const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Görsel yüklenemedi.'); return d.url;
  }
  const pickImage = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp,image/gif'; i.onchange = () => res(i.files[0] || null); i.click(); });
  const slugify = s => String(s).toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const trDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : '—'; };
  const today = () => new Date().toISOString().slice(0, 10);
  let LIST = null;

  // ---------- LIST ----------
  function page() {
    setTimeout(async () => {
      const root = $('#bmb-root');
      try {
        LIST = await A('blog');
        const row = p => `<tr><td><div class="bmb-t">${p.cover ? `<img src="${esc(p.cover)}" alt="">` : `<span class="bmb-noimg">${I('img')}</span>`}<div><b>${esc(p.title)}</b><small class="bmc-ct">${esc(p.category)} · ${p.readMin} dk okuma${p.featured ? ' · <span class="bmc-login wait">Öne çıkan</span>' : ''}</small></div></div></td>
          <td><code>/blog/${esc(p.slug)}/</code></td><td>${trDate(p.date)}${p.modified && p.modified !== p.date ? `<small class="bmc-ct">Güncelleme ${trDate(p.modified)}</small>` : ''}</td>
          <td>${p.published ? '<span class="bmc-login on">Yayında</span>' : '<span class="bmc-login off">Taslak</span>'}</td>
          <td><div class="bmb-acts"><button class="btn primary" data-ed="${esc(p.id)}">${I('edit')} Düzenle</button>${p.published ? `<a class="btn" href="/blog/${esc(p.slug)}/" target="_blank" rel="noopener">${I('eye')} Görüntüle</a>` : ''}<button class="btn" data-pub="${esc(p.id)}">${p.published ? I('off') + ' Taslağa al' : I('eye') + ' Yayınla'}</button><button class="btn danger" data-del="${esc(p.id)}" title="Sil">${I('trash')}</button></div></td></tr>`;
        root.innerHTML = heading('Blog') + `<div class="bmc-callout">${I('blog')}<div><b>Blog yazıları</b><span>Yazılar <code>/blog/</code> sayfasında listelenir. Yazı sayfasında içindekiler, paylaşım, yapay zekâ ile özetleme, sesli dinleme ve sıkça sorulan sorular otomatik oluşturulur. Ara başlıklar (H2) içindekiler listesine eklenir.</span></div><a class="btn" href="/blog/" target="_blank" rel="noopener">${I('eye')} Blog sayfası</a><button class="btn primary" id="bmb-new">${I('plus')} Yeni yazı</button></div>
          <section class="panel"><div class="bmc-table"><table><thead><tr><th>Yazı</th><th>Adres</th><th>Tarih</th><th>Durum</th><th></th></tr></thead><tbody>${LIST.posts.length ? LIST.posts.map(row).join('') : '<tr><td colspan="5" class="bmc-none" style="padding:30px;text-align:center">Henüz yazı yok. “Yeni yazı” ile başlayın.</td></tr>'}</tbody></table></div></section>`;
        $('#bmb-new').onclick = () => editor(null);
        root.onclick = async e => {
          const b = e.target.closest('button'); if (!b) return;
          const post = id => LIST.posts.find(p => p.id === id);
          try {
            if (b.dataset.ed) return editor(post(b.dataset.ed));
            if (b.dataset.pub) { const p = post(b.dataset.pub); await A('blog/save', 'POST', {...p, published: !p.published}); say(p.published ? 'Yazı taslağa alındı.' : 'Yazı yayınlandı.'); render(); }
            if (b.dataset.del && confirm('Bu yazı kalıcı olarak silinsin mi?')) { await A('blog/delete', 'POST', {id: b.dataset.del}); say('Yazı silindi.'); render(); }
          } catch (err) { say(err.message); }
        };
      } catch (e) { if (e.message !== 'Giriş gerekli') root.innerHTML = heading('Blog') + `<div class="bmc-err">${esc(e.message)}</div>`; }
    }, 0);
    return `<div class="bmc bms" id="bmb-root">${heading('Blog')}<div class="loading">Yükleniyor…</div></div>`;
  }

  // ---------- EDITOR ----------
  const TOOLS = [['h2', 'H2', 'Ara başlık (içindekilere eklenir)'], ['h3', 'H3', 'Alt başlık'], ['p', '¶', 'Paragraf'], ['|'], ['bold', '<b>B</b>', 'Kalın (Ctrl+B)'], ['italic', '<i>I</i>', 'İtalik (Ctrl+I)'], ['link', I('link'), 'Bağlantı'], ['|'], ['ul', I('ul'), 'Madde listesi'], ['ol', I('ol'), 'Numaralı liste'], ['quote', I('quote'), 'Alıntı'], ['|'], ['img', I('img'), 'Görsel ekle'], ['tip', '💡', 'İpucu kutusu'], ['warn', '⚠', 'Uyarı kutusu'], ['note', 'ℹ', 'Not kutusu'], ['|'], ['clear', 'Tx', 'Biçimi temizle'], ['html', I('code'), 'HTML kaynağı']];
  function editor(post) {
    const D = post ? JSON.parse(JSON.stringify(post)) : {title: '', slug: '', category: LIST?.categories?.[0] || 'Rehber', date: today(), modified: today(), author: {name: 'Brazil Migration Editör Ekibi', role: ''}, excerpt: '', lead: '', cover: '', coverAlt: '', coverCredit: {name: '', url: ''}, content: '<p>Giriş paragrafı…</p><h2>İlk bölüm başlığı</h2><p>Metin…</p>', faq: [], sources: [], seo: {}, published: false, featured: false};
    D.author ||= {}; D.coverCredit ||= {}; D.seo ||= {}; D.faq ||= []; D.sources ||= [];
    let slugTouched = !!post, dirty = false, htmlMode = false;
    document.getElementById('bms-ed')?.remove();
    const ed = document.createElement('div'); ed.id = 'bms-ed'; ed.className = 'bmb-ed';
    ed.innerHTML = `<div class="bms-bar"><button class="btn" data-x>${I('back')} Kapat</button><div class="bms-title"><b>${post ? 'Yazıyı düzenle' : 'Yeni yazı'}</b><small id="bmb-path"></small></div><span class="sp"></span>
      <span class="bms-dev"><button class="btn on" data-dev="desktop" title="Masaüstü">${I('desktop')}</button><button class="btn" data-dev="mobile" title="Mobil">${I('mobile')}</button></span>
      <label class="bmc-cb" style="margin:0"><input type="checkbox" id="bmb-feat" ${D.featured ? 'checked' : ''}> Öne çıkar</label><label class="bmc-cb" style="margin:0"><input type="checkbox" id="bmb-pub" ${D.published ? 'checked' : ''}> Yayında</label><button class="btn primary" id="bmb-save">${I('check')} Kaydet</button></div>
      <div class="bms-body"><aside class="bms-side left" id="bmb-form"></aside><div class="bms-stage" id="bmb-stage"><iframe id="bmb-frame" title="Önizleme"></iframe></div></div>`;
    document.body.appendChild(ed); document.body.style.overflow = 'hidden';
    const form = $('#bmb-form'), frame = $('#bmb-frame');
    const path = () => '/blog/' + (D.slug || 'adres') + '/';
    let tmr = null;
    const preview = () => { clearTimeout(tmr); tmr = setTimeout(async () => { try { syncContent(); const d = await A('blog/preview', 'POST', D); const y = frame.contentWindow?.scrollY || 0; frame.srcdoc = d.html.replace('</head>', '<style>a,button.btn,.bl-sh{pointer-events:none}</style></head>'); frame.onload = () => frame.contentWindow.scrollTo(0, y); } catch (e) { say(e.message); } }, 600); };
    const touch = () => { dirty = true; preview(); };
    const inp = (k, label, ph = '', type = 'text') => `<label>${label}<input class="bmc-in" type="${type}" data-k="${k}" value="${esc(k.split('.').reduce((o, x) => o?.[x], D) ?? '')}" placeholder="${esc(ph)}"></label>`;
    const area = (k, label, rows, ph = '') => `<label>${label}<textarea class="bmc-in" rows="${rows}" data-k="${k}" placeholder="${esc(ph)}">${esc(k.split('.').reduce((o, x) => o?.[x], D) ?? '')}</textarea></label>`;
    const syncContent = () => { const rte = $('#bmb-rte'), src = $('#bmb-src'); if (htmlMode && src) D.content = src.value; else if (rte) D.content = rte.innerHTML; };
    const draw = () => {
      $('#bmb-path').textContent = path();
      form.innerHTML = `<datalist id="bmb-cats">${(LIST?.categories || []).concat(['Oturum İzni', 'Vatandaşlık', 'Şirket Kurulumu', 'São Paulo’da Yaşam', 'Rehber']).filter((v, i, a) => a.indexOf(v) === i).map(c => `<option value="${esc(c)}">`).join('')}</datalist>
        <section class="bmb-sec"><h3>Yazı bilgileri</h3>
          ${inp('title', 'Başlık (H1)', 'Ör. Brezilya’da oturum izni nasıl alınır?')}
          <label>Yazı adresi<span class="bms-slug"><span>/blog/</span><input class="bmc-in" id="bmb-slug" value="${esc(D.slug)}" placeholder="yazi-adresi"><span>/</span></span></label>
          <div class="bms-row2"><label>Kategori<input class="bmc-in" data-k="category" list="bmb-cats" value="${esc(D.category)}"></label>${inp('date', 'Yayın tarihi', '', 'date')}</div>
          <div class="bms-row2">${inp('author.name', 'Yazar')}${inp('modified', 'Son güncelleme', '', 'date')}</div>
          ${inp('author.role', 'Yazar ünvanı (isteğe bağlı)', 'Ör. Göç danışmanı · São Paulo')}
          ${area('excerpt', 'Kısa açıklama (liste kartlarında görünür)', 2)}
          ${area('lead', 'Öne çıkan özet (ilk paragraftan sonra kalın kutu olarak görünür)', 3)}</section>
        <section class="bmb-sec"><h3>Kapak görseli</h3>
          <div class="bmb-cover">${D.cover ? `<img src="${esc(D.cover)}" alt="">` : `<span>${I('img')} Kapak görseli yok</span>`}</div>
          <label>Görsel adresi<span class="bmc-inl"><input class="bmc-in" data-k="cover" value="${esc(D.cover)}" placeholder="https://images.unsplash.com/... veya yükleyin"><button type="button" class="btn" id="bmb-upc" title="Yükle">${I('img')}</button></span></label>
          ${inp('coverAlt', 'Alternatif metin (görme engelliler ve SEO için)')}
          <div class="bms-row2">${inp('coverCredit.name', 'Fotoğrafçı (Unsplash)', 'Ör. Odair Faléco')}${inp('coverCredit.url', 'Fotoğrafçı bağlantısı', 'https://unsplash.com/@...')}</div></section>
        <section class="bmb-sec"><h3>İçerik</h3>
          <div class="bmb-tools">${TOOLS.map(t => t[0] === '|' ? '<i></i>' : `<button type="button" data-t="${t[0]}" title="${esc(t[2])}" class="${t[0] === 'html' && htmlMode ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
          ${htmlMode ? `<textarea class="bmc-in bmb-src" id="bmb-src" spellcheck="false">${esc(D.content)}</textarea>` : `<div class="bmb-rte bl-body" id="bmb-rte" contenteditable="true">${D.content}</div>`}
          <p class="bms-note">Ara başlıkları <b>H2</b> ile verin; her H2 içindekiler listesine eklenir. Görseller yazının arasına yüklenebilir. Kaydederken güvenli olmayan kodlar otomatik temizlenir.</p></section>
        <section class="bmb-sec"><h3>Sıkça sorulan sorular <small>${D.faq.length}</small></h3>
          ${D.faq.map((f, i) => `<div class="bms-item"><input class="bmc-in" data-f="${i}.q" value="${esc(f.q)}" placeholder="Soru"><textarea class="bmc-in" rows="3" data-f="${i}.a" placeholder="Cevap">${esc(f.a)}</textarea><button type="button" class="bms-irm" data-frm="${i}" title="Sil">${I('x')}</button></div>`).join('')}
          <button type="button" class="bmc-link" id="bmb-fadd">${I('plus')} Soru ekle</button></section>
        <section class="bmb-sec"><h3>Kaynaklar <small>${D.sources.length}</small></h3>
          ${D.sources.map((s, i) => `<div class="bms-item"><input class="bmc-in" data-s="${i}.label" value="${esc(s.label)}" placeholder="Kaynak adı"><input class="bmc-in" data-s="${i}.url" value="${esc(s.url)}" placeholder="https://"><button type="button" class="bms-irm" data-srm="${i}" title="Sil">${I('x')}</button></div>`).join('')}
          <button type="button" class="bmc-link" id="bmb-sadd">${I('plus')} Kaynak ekle</button></section>
        <section class="bmb-sec"><h3>SEO</h3>
          ${inp('seo.title', 'Google başlığı', 'Boş bırakılırsa yazı başlığı kullanılır')}
          ${area('seo.description', 'Google açıklaması (150–160 karakter)', 3, 'Boş bırakılırsa kısa açıklama kullanılır')}
          <div class="bmb-serp"><small>${esc(location.host)} › blog › ${esc(D.slug || '')}</small><b>${esc(D.seo.title || (D.title ? D.title + ' | Brazil Migration Blog' : 'Yazı başlığı'))}</b><span>${esc((D.seo.description || D.excerpt || 'Açıklama').slice(0, 160))}</span></div>
          <label class="bmc-cb"><input type="checkbox" id="bmb-noidx" ${D.seo.noindex ? 'checked' : ''}> Arama motorlarında gösterme (noindex)</label></section>`;
      const set = (k, v) => { const ks = k.split('.'); const last = ks.pop(); ks.reduce((o, x) => o[x] ??= {}, D)[last] = v; };
      form.querySelectorAll('[data-k]').forEach(el => el.oninput = () => { set(el.dataset.k, el.value); if (el.dataset.k === 'title') { if (!slugTouched) { D.slug = slugify(el.value); $('#bmb-slug').value = D.slug; } $('#bmb-path').textContent = path(); } if (el.dataset.k === 'cover') { const c = form.querySelector('.bmb-cover'); c.innerHTML = el.value ? `<img src="${esc(el.value)}" alt="">` : ''; } touch(); });
      $('#bmb-slug').oninput = e => { D.slug = slugify(e.target.value); slugTouched = true; $('#bmb-path').textContent = path(); dirty = true; };
      $('#bmb-noidx').onchange = e => { D.seo.noindex = e.target.checked; dirty = true; };
      form.querySelectorAll('[data-f]').forEach(el => el.oninput = () => { const [i, k] = el.dataset.f.split('.'); D.faq[i][k] = el.value; touch(); });
      form.querySelectorAll('[data-s]').forEach(el => el.oninput = () => { const [i, k] = el.dataset.s.split('.'); D.sources[i][k] = el.value; touch(); });
      const rte = $('#bmb-rte'), src = $('#bmb-src');
      if (rte) { rte.oninput = touch; rte.addEventListener('paste', ev => { const h = ev.clipboardData?.getData('text/html'); const t = ev.clipboardData?.getData('text/plain') || ''; ev.preventDefault(); if (h) document.execCommand('insertHTML', false, cleanPaste(h)); else document.execCommand('insertHTML', false, t.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')); }); }
      if (src) src.oninput = touch;
    };
    const cleanPaste = h => { const d = document.createElement('div'); d.innerHTML = h; d.querySelectorAll('script,style,meta,link,iframe,object').forEach(x => x.remove()); d.querySelectorAll('*').forEach(el => { [...el.attributes].forEach(a => { if (!['href', 'src', 'alt'].includes(a.name)) el.removeAttribute(a.name); }); }); return d.innerHTML; };
    const wrapBox = cls => { const s = getSelection(); const rte = $('#bmb-rte'); let n = s.anchorNode; while (n && n.parentNode !== rte) n = n.parentNode; const box = document.createElement('div'); box.className = cls; if (n && n !== rte && n.nodeType === 1 && n.tagName === 'P') { n.replaceWith(box); box.appendChild(n); } else { box.innerHTML = '<p>Metin…</p>'; (n && n.parentNode === rte ? n.after(box) : rte.appendChild(box)); } };
    form.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'bmb-upc') { const f = await pickImage(); if (!f) return; try { D.cover = await upload(f); draw(); touch(); say('Kapak görseli yüklendi.'); } catch (err) { say(err.message); } return; }
      if (b.id === 'bmb-fadd') { syncContent(); D.faq.push({q: '', a: ''}); draw(); return; }
      if (b.id === 'bmb-sadd') { syncContent(); D.sources.push({label: '', url: ''}); draw(); return; }
      if (b.dataset.frm) { syncContent(); D.faq.splice(+b.dataset.frm, 1); draw(); touch(); return; }
      if (b.dataset.srm) { syncContent(); D.sources.splice(+b.dataset.srm, 1); draw(); touch(); return; }
      const t = b.dataset.t; if (!t) return;
      if (t === 'html') { syncContent(); htmlMode = !htmlMode; draw(); return; }
      if (htmlMode) return say('Biçimlendirme için HTML kaynağı modunu kapatın.');
      const rte = $('#bmb-rte'); rte.focus();
      const X = (c, v) => document.execCommand(c, false, v);
      if (['h2', 'h3', 'p'].includes(t)) X('formatBlock', t.toUpperCase());
      if (t === 'bold' || t === 'italic') X(t);
      if (t === 'ul') X('insertUnorderedList'); if (t === 'ol') X('insertOrderedList');
      if (t === 'quote') X('formatBlock', 'BLOCKQUOTE');
      if (t === 'clear') { X('removeFormat'); X('formatBlock', 'P'); }
      if (t === 'link') { const u = prompt('Bağlantı adresi (ör. /iletisim/ veya https://…)', 'https://'); if (u) X('createLink', u); }
      if (t === 'tip' || t === 'warn' || t === 'note') wrapBox('bl-' + t);
      if (t === 'img') {
        const sel = getSelection().rangeCount ? getSelection().getRangeAt(0).cloneRange() : null;
        const choice = confirm('Bilgisayarınızdan görsel yüklemek için Tamam’a, görsel adresi (Unsplash vb.) yapıştırmak için İptal’e basın.');
        let url = ''; if (choice) { const f = await pickImage(); if (!f) return; try { url = await upload(f); } catch (err) { return say(err.message); } } else url = prompt('Görsel adresi', 'https://images.unsplash.com/') || '';
        if (!/^(https?:\/\/|\/)/.test(url)) return;
        const alt = prompt('Görsel açıklaması (alternatif metin)', '') || '', cap = prompt('Alt yazı / fotoğraf kredisi (isteğe bağlı)', '') || '';
        rte.focus(); if (sel) { const s = getSelection(); s.removeAllRanges(); s.addRange(sel); }
        X('insertHTML', `<figure><img src="${esc(url)}" alt="${esc(alt)}">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure><p><br></p>`);
      }
      touch();
    };
    ed.querySelectorAll('[data-dev]').forEach(b => b.onclick = () => { ed.querySelectorAll('[data-dev]').forEach(x => x.classList.toggle('on', x === b)); $('#bmb-stage').classList.toggle('mobile', b.dataset.dev === 'mobile'); });
    const close = () => { ed.remove(); document.body.style.overflow = ''; render(); };
    ed.querySelector('[data-x]').onclick = () => { if (!dirty || confirm('Kaydedilmemiş değişiklikler var. Çıkılsın mı?')) close(); };
    $('#bmb-save').onclick = async () => {
      syncContent(); D.published = $('#bmb-pub').checked; D.featured = $('#bmb-feat').checked;
      try { const r = await A('blog/save', 'POST', D); D.id = r.id; dirty = false; say(D.published ? `Kaydedildi ve yayında: ${r.path}` : `Taslak olarak kaydedildi: ${r.path}`); close(); } catch (e) { say(e.message); }
    };
    draw(); preview();
  }

  window.BMBlog = {editor};
  Object.assign(names, {blog: 'Blog'});
  const _overview = overview;
  overview = function () { return route() === 'blog' ? page() : _overview(); };
  if (route() === 'blog') setTimeout(() => { if (!document.querySelector('#bmb-root')) render(); }, 700);
})();
