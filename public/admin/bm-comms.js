'use strict';
// İletişim (Faz 4): Gelen Kutusu (e-posta + uygulama içi mesajlar tek akışta) ve çok dilli E-posta/Mesaj Şablonları.
// Arka uç: /api/platform/admin/inbox/*. WhatsApp yoktur. Gelen e-posta yanıtları firmanın posta kutusuna gider; “Gelen e-posta kaydet” ile akışa eklenir.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const wrap = (title, sub, id) => '<div class="bcs">' + heading(title) + (sub ? '<p class="bcs-sub">' + sub + '</p>' : '') + '<div id="' + id + '"><div class="loading">Yükleniyor…</div></div></div>';
  const run = (id, fn) => setTimeout(async () => { try { await fn($('#' + id)); } catch (e) { const r = $('#' + id); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
  const dt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}) : '');
  const LN = {tr: 'Türkçe', en: 'English', pt: 'Português', fa: 'فارسی'};

  if (!document.getElementById('bcm-css')) {
    const st = document.createElement('style'); st.id = 'bcm-css';
    st.textContent = '.bcm{display:grid;grid-template-columns:320px 1fr;gap:14px;align-items:start}@media(max-width:860px){.bcm{grid-template-columns:1fr}}' +
      '.bcm-list{max-height:70vh;overflow:auto;display:grid;gap:6px;margin-top:10px}.bcm-th{display:block;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--line,#d9e2dc);border-radius:10px;background:var(--card,#fff);cursor:pointer;font:inherit;color:inherit}' +
      '.bcm-th.on{border-color:#1b5e20;box-shadow:0 0 0 2px rgba(27,94,32,.15)}.bcm-th b{display:block}.bcm-th small{display:block;color:#6b7a70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.bcm-tl{display:grid;gap:8px;max-height:52vh;overflow:auto;padding:4px 2px;margin:10px 0}.bcm-m{max-width:86%;padding:9px 12px;border-radius:12px;background:#eef3ef;justify-self:start;white-space:pre-wrap;word-break:break-word}' +
      '.bcm-m.out{background:#e3f1e5;justify-self:end}.bcm-m small{display:block;color:#6b7a70;margin-bottom:3px}.bcm-m .ch{display:inline-block;font-size:11px;padding:1px 7px;border-radius:99px;background:#fff;border:1px solid #cdd8d0;margin-right:4px}' +
      '.bcm-form{display:grid;gap:8px}.bcm-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.bcm-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.bcm-tabs button{padding:5px 12px;border-radius:99px;border:1px solid #cdd8d0;background:#fff;cursor:pointer;font:inherit}.bcm-tabs button.on{background:#1b5e20;color:#fff;border-color:#1b5e20}' +
      '.bcm-v code{background:#eef3ef;padding:1px 6px;border-radius:6px;margin-right:4px;font-size:12px}[dir=rtl]{direction:rtl}';
    document.head.appendChild(st);
  }

  // ---------------- Gelen kutusu ----------------
  let TH = [], SEL = '', TV = null, Q = '';
  const inboxPage = () => { run('bcm-root', async root => { TH = (await A('inbox/threads')).threads; drawInbox(root); }); return wrap('Gelen Kutusu', 'Müşterilerle e-posta ve uygulama içi yazışmalar tek akışta. E-postalar yalnız konu ve kısa metinle kaydedilir; bağlantılar ve şifre e-postaları saklanmaz.', 'bcm-root'); };
  function drawInbox(root) {
    root = root || $('#bcm-root'); if (!root) return;
    const list = TH.length ? TH.map(t => '<button class="bcm-th' + (t.id === SEL ? ' on' : '') + '" data-bcm-open="' + esc(t.id) + '"><b>' + esc(t.name || t.email) + (t.open ? ' <span class="bcs-chip warn">' + t.open + ' açık</span>' : '') + '</b><small>' + (t.channel === 'app' ? '💬 ' : '✉️ ') + esc(t.lastText || '') + '</small><small>' + dt(t.last) + ' · ' + esc(t.email || '') + '</small></button>').join('') : '<p class="bcs-hint">Henüz yazışma yok. Müşteriye e-posta gönderildiğinde veya destek talebi açıldığında burada görünür.</p>';
    root.innerHTML = '<div class="bcm"><section class="panel bcs-p"><form id="bcm-search" class="bcs-bar"><input name="q" placeholder="Ad, e-posta veya mesaj ara" value="' + esc(Q) + '"></form><div class="bcm-list">' + list + '</div></section><section class="panel bcs-p" id="bcm-view">' + (TV ? viewHTML() : '<p class="bcs-hint">Soldan bir konuşma seçin.</p>') + '</section></div>';
  }
  function viewHTML() {
    const p = TV.person, items = TV.items.map(i => '<div class="bcm-m ' + i.dir + '"' + (TV.lang === 'fa' && i.dir === 'in' ? ' dir="auto"' : '') + '><small><span class="ch">' + (i.ch === 'app' ? 'Uygulama' : 'E-posta') + '</span>' + esc(i.by || (i.dir === 'in' ? p.name : '')) + ' · ' + dt(i.at) + (i.subject && i.ch === 'email' ? ' · <b>' + esc(i.subject) + '</b>' : '') + (i.ok === false ? ' · <i>gönderilemedi / e-posta ayarı yok</i>' : '') + '</small>' + esc(i.text || '') + '</div>').join('') || '<p class="bcs-hint">Bu kişiyle kayıtlı yazışma yok.</p>';
    const canApp = p.role === 'customer', canMail = !!p.email;
    return '<header class="panel-head"><h2>' + esc(p.name || p.email) + '</h2><small>' + esc(p.email || '') + '</small></header>' +
      '<div class="bcm-row"><label>Müşterinin dili <select id="bcm-lang">' + Object.entries(LN).map(([k, v]) => '<option value="' + k + '"' + (k === TV.lang ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label><small class="bcs-hint">Otomatik e-postalar bu dilde gider.</small></div>' +
      '<div class="bcm-tl" id="bcm-tl">' + items + '</div>' +
      '<form class="bcm-form" id="bcm-reply" data-person="' + esc(p.id) + '"><div class="bcm-row"><label>Kanal <select name="channel">' + (canApp ? '<option value="app">Uygulama içi (panel)</option>' : '') + (canMail ? '<option value="email">E-posta</option>' : '') + '</select></label><label>Konu <small>(isteğe bağlı)</small><input name="subject" maxlength="150"></label></div>' +
      '<textarea name="text" rows="4" maxlength="4000" placeholder="Mesajınızı yazın…" required></textarea>' +
      '<div class="bcm-row"><button class="btn" type="submit">Gönder</button><button class="btn ghost" type="button" data-bcm-tr>Müşterinin diline çevir</button><label class="bcs-chk"><input type="checkbox" name="close"> Konuşmayı kapat</label><button class="btn ghost small" type="button" data-bcm-log>Gelen e-posta kaydet</button></div></form>';
  }
  async function openThread(id) { SEL = id; TV = await A('inbox/thread?id=' + encodeURIComponent(id)); drawInbox(); const tl = $('#bcm-tl'); if (tl) tl.scrollTop = tl.scrollHeight; }

  // ---------------- Şablonlar ----------------
  let TP = null, TKEY = '', TLANG = 'tr';
  const tplPage = () => { run('bct-root', async root => { TP = await A('inbox/templates'); TKEY = TKEY || TP.templates[0].key; drawTpl(root); }); return wrap('Mesaj Şablonları', 'Müşterilere giden otomatik e-postalar müşterinin dilinde gider (Türkçe · English · Português · فارسی). İsterseniz metinleri kendi üslubunuza göre değiştirin; boş bırakılan alan yerleşik metne döner.', 'bct-root'); };
  function drawTpl(root) {
    root = root || $('#bct-root'); if (!root) return;
    const t = TP.templates.find(x => x.key === TKEY) || TP.templates[0], l = t.langs[TLANG];
    root.innerHTML = '<div class="bcs-bar"><label>Şablon <select id="bct-key">' + TP.templates.map(x => '<option value="' + x.key + '"' + (x.key === t.key ? ' selected' : '') + '>' + esc(x.label) + '</option>').join('') + '</select></label></div>' +
      '<section class="panel bcs-p bcm-v"><div class="bcm-tabs">' + Object.entries(TP.langs).map(([k, v]) => '<button type="button" data-bct-lang="' + k + '" class="' + (k === TLANG ? 'on' : '') + '">' + esc(v) + (t.langs[k].custom ? ' ●' : '') + '</button>').join('') + '</div>' +
      '<p class="bcs-hint">Kullanılabilir değişkenler: ' + t.vars.map(v => '<code>{' + v + '}</code>').join('') + '</p>' +
      '<form class="bcm-form" id="bct-form" data-key="' + t.key + '" data-lang="' + TLANG + '"' + (TLANG === 'fa' ? ' dir="rtl"' : '') + '><label>Konu<input name="subject" maxlength="200" required value="' + esc(l.subject || '') + '"></label><label>Başlık<input name="title" maxlength="200" value="' + esc(l.title || '') + '"></label><label>Metin<textarea name="text" rows="7" maxlength="3000" required>' + esc(l.text || '') + '</textarea></label>' +
      (t.button ? '<label>Düğme yazısı<input name="button" maxlength="60" value="' + esc(l.button || '') + '"></label>' : '') +
      '<div class="bcm-row"><button class="btn" type="submit">Kaydet</button>' + (l.custom ? '<button class="btn ghost" type="button" data-bct-reset>Yerleşik metne dön</button><span class="bcs-chip ok">Özelleştirilmiş</span>' : '<span class="bcs-chip">Yerleşik metin</span>') + '</div></form></section>';
  }

  document.addEventListener('click', async e => {
    const t = e.target, $c = s => t.closest(s); let b;
    try {
      if ((b = $c('[data-bcm-open]'))) { await openThread(b.dataset.bcmOpen); return; }
      if ($c('[data-bcm-tr]')) {
        const f = $('#bcm-reply'), ta = f.querySelector('textarea'); if (!ta.value.trim()) { say('Önce çevrilecek metni yazın.'); return; }
        const r = await A('inbox/translate', 'POST', {text: ta.value, from: 'tr', to: TV.lang}); ta.value = r.text; say('Çevrildi — göndermeden önce gözden geçirin.'); return;
      }
      if ($c('[data-bcm-log]')) {
        const text = prompt('Müşteriden gelen e-postanın metni:', ''); if (!text) return; const subject = prompt('Konu:', '') || '';
        await A('inbox/log', 'POST', {person: TV.person.id, subject, text}); await openThread(TV.person.id); return;
      }
      if ((b = $c('[data-bct-lang]'))) { TLANG = b.dataset.bctLang; drawTpl(); return; }
      if ($c('[data-bct-reset]')) { if (!confirm('Bu dilin metni yerleşik haline dönsün mü?')) return; const f = $('#bct-form'); await A('inbox/template/reset', 'POST', {key: f.dataset.key, lang: f.dataset.lang}); TP = await A('inbox/templates'); drawTpl(); say('Yerleşik metne dönüldü.'); return; }
    } catch (err) { say(err.message); }
  });
  document.addEventListener('change', async e => {
    try {
      if (e.target.id === 'bct-key') { TKEY = e.target.value; drawTpl(); }
      if (e.target.id === 'bcm-lang') { await A('inbox/lang', 'POST', {person: TV.person.id, lang: e.target.value}); TV.lang = e.target.value; say('Müşterinin dili güncellendi.'); }
    } catch (err) { say(err.message); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target;
    try {
      if (f.id === 'bcm-search') { e.preventDefault(); Q = new FormData(f).get('q') || ''; TH = (await A('inbox/threads?q=' + encodeURIComponent(Q))).threads; drawInbox(); return; }
      if (f.id === 'bcm-reply') { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); const r = await A('inbox/reply', 'POST', {person: f.dataset.person, channel: d.channel, subject: d.subject, text: d.text, close: !!d.close}); say(d.channel === 'email' && r.sent === false ? 'Kaydedildi — e-posta ayarı olmadığı için gönderilemedi (Ayarlar → E-posta).' : 'Gönderildi.'); TH = (await A('inbox/threads?q=' + encodeURIComponent(Q))).threads; await openThread(f.dataset.person); return; }
      if (f.id === 'bct-form') { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); await A('inbox/template', 'POST', {key: f.dataset.key, lang: f.dataset.lang, ...d}); TP = await A('inbox/templates'); drawTpl(); say('Şablon kaydedildi.'); }
    } catch (err) { say(err.message); }
  });

  // ---------------- Yönlendirme ve menü ----------------
  const routes = {gelenkutusu: inboxPage, sablonlar: tplPage};
  Object.assign(names, {gelenkutusu: 'Gelen Kutusu', sablonlar: 'Mesaj Şablonları'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav && !nav.querySelector('a[href="#gelenkutusu"]')) {
    const el = document.createElement('details');
    el.innerHTML = '<summary>İletişim</summary><div class="dropdown"><a href="#gelenkutusu">Gelen Kutusu</a><a href="#sablonlar">Mesaj Şablonları</a></div>';
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    const after = sum('Partner Ağı') || sum('Satış') || sum('Dosyalar');
    if (after) after.after(el); else nav.appendChild(el);
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bcm-root') && !$('#bct-root')) render(); }, 350);
})();
