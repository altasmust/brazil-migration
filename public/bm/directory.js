'use strict';
// Firma dizini (herkese açık sayfa). Sunucudan gelen her metin textContent ile yazılır (HTML olarak yorumlanmaz).
(() => {
  const root = document.getElementById('fd-app'); if (!root) return;
  const LANG = {tr: 'Türkçe', pt: 'Português', en: 'English', fa: 'فارسی', th: 'ไทย'}, API = '/api/auth/directory/';
  const loaded = Date.now();
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v === false || v == null) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  };
  const put = (el, ...kids) => el.replaceChildren(...kids.flat().filter(k => k != null && k !== false));
  const get = async path => { const r = await fetch(API + path, {headers: {Accept: 'application/json'}}); const d = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(d.error || 'İstek tamamlanamadı.'), {status: r.status}); return d; };
  const qs = o => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v) p.set(k, v); return p.toString(); };
  const lang = l => LANG[l] || l.toUpperCase();
  const badge = () => h('span', {class: 'fd-badge', title: 'Platform ekibi tarafından doğrulandı'}, h('img', {src: '/bm/verified.svg', alt: '', width: 16, height: 16}), 'Doğrulanmış');
  const chips = f => h('div', {class: 'fd-chips'}, f.services.map(s => h('span', {class: 'fd-chip'}, s)), f.languages.map(l => h('span', {class: 'fd-chip lang'}, lang(l))));

  const st = () => Object.fromEntries(new URLSearchParams(location.search));
  const filter = h('form', {class: 'fd-filter', id: 'fd-filter', role: 'search', 'aria-label': 'Firma ara'});
  const results = h('div', {id: 'fd-results', 'aria-live': 'polite'}), detail = h('div', {id: 'fd-detail'});
  const lists = {};
  const sel = (name, label) => { const s = h('select', {name, id: 'fd-' + name}, h('option', {value: ''}, 'Tümü')); lists[name] = s; return h('label', {for: 'fd-' + name}, label, s); };
  const q = h('input', {type: 'search', name: 'q', id: 'fd-q', placeholder: 'Firma, şehir veya hizmet', maxlength: 60, autocomplete: 'off'});
  filter.append(h('label', {for: 'fd-q'}, 'Ara', q), sel('country', 'Ülke'), sel('service', 'Hizmet'), sel('language', 'Dil'), h('button', {type: 'submit'}, 'Ara'));
  root.append(filter, results, detail);

  const fill = (select, items, cur) => { select.replaceChildren(h('option', {value: ''}, 'Tümü'), ...items.map(i => h('option', {value: i.value}, `${select.name === 'language' ? lang(i.value) : i.value} (${i.n})`))); select.value = cur || ''; if (cur && select.value !== cur) select.value = ''; };

  async function showList() {
    detail.replaceChildren(); filter.hidden = false; results.hidden = false;
    const s = st(); q.value = s.q || '';
    results.replaceChildren(h('p', {class: 'fd-sub'}, 'Yükleniyor…'));
    let d; try { d = await get('list?' + qs({q: s.q, country: s.country, service: s.service, language: s.language, page: s.page})); } catch (e) { results.replaceChildren(h('p', {class: 'fd-msg err'}, e.message)); return; }
    fill(lists.country, d.facets.countries, s.country); fill(lists.service, d.facets.services, s.service); fill(lists.language, d.facets.languages, s.language);
    document.title = 'Firma dizini | Doğrulanmış danışmanlık firmaları | Brazil Migration';
    const cards = d.firms.map(f => h('article', {class: 'fd-card'},
      h('h2', {}, h('a', {href: '?' + qs({firma: f.slug}), onclick: ev => { ev.preventDefault(); go({firma: f.slug}); }, style: 'color:inherit;text-decoration:none'}, f.name), badge()),
      h('div', {class: 'fd-sub'}, [f.city, f.countries.join(', ')].filter(Boolean).join(' · ')),
      h('p', {}, f.about), chips(f),
      h('a', {class: 'fd-btn ghost', href: '?' + qs({firma: f.slug}), onclick: ev => { ev.preventDefault(); go({firma: f.slug}); }}, 'Firmayı incele')));
    put(results,
      h('div', {class: 'fd-meta'}, h('span', {}, d.total ? `${d.total} firma bulundu` : '')),
      d.total ? h('div', {class: 'fd-grid'}, cards) : h('div', {class: 'fd-empty'}, h('b', {}, s.q || s.country || s.service || s.language ? 'Bu aramaya uyan firma bulunamadı.' : 'Dizinde henüz yayınlanmış firma yok.'), h('p', {class: 'fd-sub'}, 'Filtreleri değiştirmeyi deneyin.')),
      d.pages > 1 ? h('div', {class: 'fd-pager'}, h('button', {class: 'fd-btn ghost', type: 'button', disabled: d.page <= 1, onclick: () => go({...st(), page: d.page - 1})}, '← Önceki'), h('span', {class: 'fd-sub'}, `${d.page} / ${d.pages}`), h('button', {class: 'fd-btn ghost', type: 'button', disabled: d.page >= d.pages, onclick: () => go({...st(), page: d.page + 1})}, 'Sonraki →')) : null);
  }

  async function showFirm(slug) {
    filter.hidden = true; results.replaceChildren(); detail.replaceChildren(h('p', {class: 'fd-sub'}, 'Yükleniyor…'));
    let f; try { f = (await get('firm?slug=' + encodeURIComponent(slug))).firm; } catch (e) { detail.replaceChildren(h('a', {class: 'fd-back', href: location.pathname, onclick: ev => { ev.preventDefault(); go({}); }}, '← Tüm firmalar'), h('p', {class: 'fd-msg err'}, e.status === 404 ? 'Bu firma dizinde yayında değil.' : e.message)); return; }
    document.title = f.name + ' | Firma dizini | Brazil Migration';
    const rows = [['Ülkeler', f.countries.join(', ')], ['Hizmetler', f.services.join(', ')], ['Diller', f.languages.map(lang).join(', ')], ['Şehir', f.city], ['Meslek kaydı', f.registry]].filter(r => r[1]);
    const dl = h('dl', {class: 'fd-dl'}, rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
    if (f.website) dl.append(h('dt', {}, 'Web sitesi'), h('dd', {}, h('a', {href: f.website, rel: 'noopener nofollow ugc', target: '_blank'}, f.website.replace(/^https:\/\//, ''))));
    const info = h('article', {class: 'fd-card'}, h('h2', {}, f.name, badge()), h('p', {style: 'white-space:pre-line;flex:none'}, f.about), dl,
      h('p', {class: 'fd-note'}, 'Bu firma, platform ekibinin kimlik ve meslek kaydı kontrolünden geçti. Dizin bir tavsiye veya sonuç garantisi değildir; hizmet sözleşmesi doğrudan sizinle firma arasında yapılır.'));
    detail.replaceChildren(h('a', {class: 'fd-back', href: location.pathname, onclick: ev => { ev.preventDefault(); go({}); }}, '← Tüm firmalar'), h('div', {class: 'fd-detail'}, info, contactCard(f)));
  }

  function contactCard(f) {
    if (!f.accepting) return h('aside', {class: 'fd-card'}, h('h2', {}, 'İletişim'), h('p', {}, 'Bu firma şu anda yeni talep almıyor. Başka bir firmaya göz atabilirsiniz.'));
    const msg = h('p', {class: 'fd-msg', hidden: true, role: 'status'}), btn = h('button', {class: 'fd-btn', type: 'submit'}, 'Talebi gönder');
    const svc = h('select', {name: 'service'}, h('option', {value: ''}, 'Seçin'), f.services.map(s => h('option', {value: s}, s)));
    const form = h('form', {class: 'fd-form', novalidate: true},
      h('label', {}, 'Ad soyad', h('input', {name: 'name', required: true, minlength: 2, maxlength: 100, autocomplete: 'name'})),
      h('div', {class: 'row'}, h('label', {}, 'E-posta', h('input', {name: 'email', type: 'email', required: true, maxlength: 254, autocomplete: 'email'})), h('label', {}, 'Telefon (isteğe bağlı)', h('input', {name: 'phone', type: 'tel', maxlength: 40, autocomplete: 'tel'}))),
      h('div', {class: 'row'}, h('label', {}, 'Hizmet', svc), h('label', {}, 'Bulunduğunuz ülke', h('input', {name: 'country', maxlength: 60, autocomplete: 'country-name'}))),
      h('label', {}, 'Mesajınız', h('textarea', {name: 'message', maxlength: 1500, placeholder: 'Durumunuzu kısaca anlatın.'})),
      h('div', {class: 'fd-hp', 'aria-hidden': 'true'}, h('label', {}, 'Bu alanı boş bırakın', h('input', {name: 'hp', tabindex: -1, autocomplete: 'off'}))),
      h('label', {class: 'check'}, h('input', {type: 'checkbox', name: 'consent'}), `Bilgilerimin ${f.name} firmasına iletilmesini ve benimle iletişime geçilmesini kabul ediyorum.`),
      h('p', {class: 'fd-note'}, `Bilgileriniz yalnız ${f.name} firmasına iletilir; o firma veri sorumlusu olarak sizinle iletişime geçer. Dizin, talebinizin içeriğini saklamaz.`), btn, msg);
    form.addEventListener('submit', async ev => {
      ev.preventDefault(); const d = Object.fromEntries(new FormData(form)); d.consent = form.consent.checked; d.slug = f.slug; d.ts = loaded;
      const show = (t, c) => { msg.hidden = false; msg.className = 'fd-msg ' + c; msg.textContent = t; };
      if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email.trim())) return show('Adınızı ve geçerli bir e-posta adresini yazın.', 'err');
      if (!d.consent) return show('Devam etmek için onay kutusunu işaretleyin.', 'err');
      btn.disabled = true;
      try {
        const r = await fetch(API + 'contact', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d)}), j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Talep gönderilemedi.');
        show(j.message || 'Talebiniz iletildi.', 'ok'); form.reset(); btn.hidden = true;
      } catch (e) { show(e.message, 'err'); btn.disabled = false; }
    });
    return h('aside', {class: 'fd-card'}, h('h2', {}, f.name + ' ile iletişime geçin'), form);
  }

  function go(s) { history.pushState(null, '', location.pathname + (qs(s) ? '?' + qs(s) : '')); route(); window.scrollTo({top: root.offsetTop - 90, behavior: 'smooth'}); }
  const route = () => { const s = st(); return s.firma ? showFirm(s.firma) : showList(); };
  filter.addEventListener('submit', ev => { ev.preventDefault(); const d = Object.fromEntries(new FormData(filter)); go({q: d.q.trim(), country: d.country, service: d.service, language: d.language}); });
  for (const k of ['country', 'service', 'language']) lists[k].addEventListener('change', () => filter.requestSubmit());
  addEventListener('popstate', route);
  route();
})();
