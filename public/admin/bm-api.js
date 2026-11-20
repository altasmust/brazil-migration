'use strict';
// Entegrasyon (Faz 5): açık API anahtarları, webhook'lar, belgeler. Arka uç: /api/platform/admin/integrations/*; genel API: /api/v1.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const dt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}) : '—');
  const chip = (t, c) => '<span class="bcs-chip ' + (c || '') + '">' + esc(t) + '</span>';
  const TABS = [['anahtar', 'API anahtarları'], ['webhook', 'Webhook’lar'], ['belge', 'Belgeler']];
  let TAB = 'anahtar', META = null, KEYS = [], HOOKS = [], REVEAL = null, DEL = {};

  const page = () => {
    setTimeout(async () => { try { await load(); } catch (e) { const r = $('#bap-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
    return '<div class="bcs">' + heading('API ve Webhook') + '<p class="bcs-sub">Firmanızı kendi web sitenize veya muhasebe programınıza (örn. Conta Azul) bağlayın. Anahtarlar yalnızca bir kez gösterilir.</p><div id="bap-root"><div class="loading">Yükleniyor…</div></div></div>';
  };
  async function load() { if (!META) META = await A('integrations/meta'); [KEYS, HOOKS] = await Promise.all([A('integrations/keys').then(d => d.keys), A('integrations/webhooks').then(d => d.webhooks)]); draw(); }
  const tabs = () => '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 14px">' + TABS.map(([k, v]) => '<button type="button" class="btn small ' + (k === TAB ? '' : 'ghost') + '" data-bap-tab="' + k + '">' + esc(v) + '</button>').join('') + '</div>';
  const reveal = () => REVEAL ? '<div class="bmc-note" style="margin-bottom:12px"><b>' + esc(REVEAL.title) + '</b><p class="bcs-hint">' + esc(REVEAL.note) + '</p><pre style="white-space:pre-wrap;word-break:break-all;background:#fff8e1;border:1px solid #f0d98a;border-radius:10px;padding:10px;user-select:all">' + esc(REVEAL.value) + '</pre><button class="btn small" id="bap-cp">Kopyala</button> <button class="btn small ghost" id="bap-ok">Kaydettim</button></div>' : '';
  const checks = (name, map, sel) => Object.entries(map).map(([k, v]) => '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="' + name + '" value="' + esc(k) + '"' + (sel && sel.includes(k) ? ' checked' : '') + '> <span><code>' + esc(k) + '</code> — ' + esc(v) + '</span></label>').join('');

  function draw() {
    const root = $('#bap-root'); if (!root) return; let h = tabs() + reveal();
    if (TAB === 'anahtar') {
      h += '<section class="panel bcs-p"><header class="panel-head"><h2>Yeni anahtar</h2></header><form id="bap-kf" class="bcs-form"><label>Ad<input name="name" maxlength="60" placeholder="Örn. Muhasebe programı" required></label><fieldset style="border:0;padding:0;display:grid;gap:6px"><legend style="font-size:13px;font-weight:600">Yetkiler</legend>' + checks('scopes', META.scopes) + '</fieldset><button class="btn primary small">Anahtar oluştur</button></form></section>' +
        '<section class="panel bcs-p"><header class="panel-head"><h2>Anahtarlar</h2></header>' + (KEYS.length ? '<ul class="bmg-ul">' + KEYS.map(k => '<li><span><b>' + esc(k.name) + '</b> ' + (k.revoked ? chip('İptal', 'bad') : chip('Etkin', 'ok')) + '<small><code>' + esc(k.prefix) + '…</code> · ' + esc((k.scopes || []).join(', ')) + ' · oluşturma ' + dt(k.created) + ' · son kullanım ' + dt(k.lastUsed) + '</small></span>' + (k.revoked ? '' : '<button class="btn small ghost" data-bap-rv="' + esc(k.id) + '" data-n="' + esc(k.name) + '">İptal et</button>') + '</li>').join('') + '</ul>' : '<p class="bcs-hint">Henüz anahtar yok.</p>') + '</section>';
    } else if (TAB === 'webhook') {
      h += '<section class="panel bcs-p"><header class="panel-head"><h2>Yeni webhook</h2></header><p class="bcs-hint">Seçtiğiniz olaylar gerçekleştiğinde adresinize imzalı bir JSON gönderilir (en geç ~1 dakika içinde). Müşteri ad ve e-postası bu adrese iletilir; yalnızca güvendiğiniz sistemlere tanımlayın.</p><form id="bap-wf" class="bcs-form"><label>Adres (https://…)<input name="url" type="url" placeholder="https://ornek.com/webhook" required></label><label>Açıklama (isteğe bağlı)<input name="description" maxlength="120"></label><fieldset style="border:0;padding:0;display:grid;gap:6px"><legend style="font-size:13px;font-weight:600">Olaylar</legend>' + checks('events', META.events) + '</fieldset><button class="btn primary small">Webhook ekle</button></form></section>' +
        '<section class="panel bcs-p"><header class="panel-head"><h2>Webhook’lar</h2></header>' + (HOOKS.length ? HOOKS.map(w => '<div style="border-top:1px solid #eef1eb;padding:10px 0"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><span><b style="word-break:break-all">' + esc(w.url) + '</b> ' + (w.active ? chip('Etkin', 'ok') : chip('Pasif', 'bad')) + (w.pending ? ' ' + chip(w.pending + ' bekliyor', 'warn') : '') + '<small style="display:block;color:#68776b">' + esc(w.events.join(', ')) + (w.description ? ' · ' + esc(w.description) : '') + ' · imza anahtarı <code>' + esc(w.secretHint) + '</code> · son başarı ' + dt(w.lastOk) + '</small>' + (w.disabledReason ? '<small style="color:#b3261e">' + esc(w.disabledReason) + '</small>' : w.lastError && w.fails ? '<small style="color:#b3261e">Son hata (' + dt(w.lastError.at) + '): ' + esc(w.lastError.error) + '</small>' : '') + '</span><span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn small ghost" data-bap-t="' + esc(w.id) + '">Test</button><button class="btn small ghost" data-bap-l="' + esc(w.id) + '">Gönderimler</button><button class="btn small ghost" data-bap-a="' + esc(w.id) + '" data-on="' + (w.active ? 0 : 1) + '">' + (w.active ? 'Durdur' : 'Etkinleştir') + '</button><button class="btn small ghost" data-bap-d="' + esc(w.id) + '">Sil</button></span></div>' + (DEL[w.id] ? delTable(DEL[w.id]) : '') + '</div>').join('') : '<p class="bcs-hint">Henüz webhook yok.</p>') + '</section>';
    } else h += docs();
    root.innerHTML = h; bind(root);
  }
  const delTable = rows => rows.length ? '<div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr style="color:#68776b;text-align:left"><th>Tarih</th><th>Olay</th><th>Durum</th><th>Deneme</th><th>Yanıt</th><th></th></tr>' + rows.map(r => '<tr><td>' + dt(r.created) + '</td><td>' + esc(r.event) + '</td><td>' + esc({done: 'Teslim edildi', pending: 'Bekliyor', failed: 'Başarısız'}[r.status] || r.status) + (r.next && r.status === 'pending' ? ' (' + dt(r.next) + ')' : '') + '</td><td>' + r.attempts + '</td><td>' + (r.code || '') + ' ' + esc(r.error) + '</td><td>' + (r.status !== 'done' ? '<button class="btn small ghost" data-bap-rt="' + esc(r.id) + '">Yeniden dene</button>' : '') + '</td></tr>').join('') + '</table></div>' : '<p class="bcs-hint">Henüz gönderim yok.</p>';

  function docs() {
    const b = META.base, ex = (t, c) => '<h3 class="bmg-h3">' + esc(t) + '</h3><pre style="white-space:pre-wrap;word-break:break-all;background:#eef3ef;border-radius:10px;padding:10px;font-size:12.5px">' + esc(c) + '</pre>';
    return '<section class="panel bcs-p"><header class="panel-head"><h2>API belgeleri</h2></header><p class="bcs-hint">Taban adres: <code>' + esc(b) + '</code> · Kimlik doğrulama: <code>Authorization: Bearer bmk_…</code> · Dakikada 120 istek · Tutarlar küçük birimdedir (cent/kuruş; 12345 = 123,45). Yanıt: <code>{"data":[…],"next":"…"}</code>; <code>next</code> boş değilse <code>?cursor=</code> ile sonraki sayfayı alın. Liste, son değişikliğe göre sıralanır; artımlı eşitleme için son <code>next</code> değerini saklayın. Sunucudan sunucuya kullanın — anahtarı tarayıcı koduna koymayın.</p>' +
      ex('Adayları listele (leads:read)', 'curl -H "Authorization: Bearer bmk_..." "' + b + '/leads?limit=50&stage=won"') + ex('Aday oluştur (leads:write)', 'curl -X POST -H "Authorization: Bearer bmk_..." -H "Content-Type: application/json" \\\n  -d \'{"name":"Ayşe Yılmaz","email":"ayse@ornek.com","service":"Oturum izni","consent":true}\' ' + b + '/leads') +
      ex('Ödenen faturalar (invoices:read) — muhasebe programı için', 'curl -H "Authorization: Bearer bmk_..." "' + b + '/invoices?status=paid"') + ex('Müşteriler / dosyalar', 'curl -H "Authorization: Bearer bmk_..." ' + b + '/customers\ncurl -H "Authorization: Bearer bmk_..." ' + b + '/cases') +
      '<h3 class="bmg-h3">Webhook imzası</h3><p class="bcs-hint">Her istekte <code>X-BM-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code> başlığı bulunur. İmza = HMAC-SHA256(imza anahtarı, <code>t + "." + ham gövde</code>). Zaman damgası 5 dakikadan eskiyse reddedin. Başarılı yanıt 2xx’tir; aksi halde 1 dk, 5 dk, 30 dk, 2 sa, 6 sa sonra yeniden denenir. Aynı olay tekrar gelebilir — <code>X-BM-Delivery</code> ile yinelenenleri eleyin.</p>' +
      ex('Doğrulama (Node.js)', "const [t, v1] = req.headers['x-bm-signature'].match(/t=(\\d+),v1=(\\w+)/).slice(1);\nconst ok = crypto.timingSafeEqual(\n  Buffer.from(crypto.createHmac('sha256', SECRET).update(t + '.' + rawBody).digest('hex')),\n  Buffer.from(v1)) && Math.abs(Date.now()/1000 - t) < 300;") +
      '<p class="bcs-hint">Olaylar: ' + Object.entries(META.events).map(([k, v]) => '<code>' + esc(k) + '</code> (' + esc(v) + ')').join(' · ') + '. Gövde: <code>{"id","type","created","data":{…}}</code>.</p></section>';
  }

  function bind(root) {
    const go = async fn => { try { await fn(); } catch (e) { say(e.message); } }, q = id => document.getElementById(id), F = f => { const x = new FormData(f); return {get: k => x.get(k), all: k => x.getAll(k)}; };
    root.querySelectorAll('[data-bap-tab]').forEach(b => b.onclick = () => { TAB = b.dataset.bapTab; draw(); });
    if (q('bap-cp')) q('bap-cp').onclick = () => { try { navigator.clipboard.writeText(REVEAL.value); say('Kopyalandı.'); } catch {} };
    if (q('bap-ok')) q('bap-ok').onclick = () => { REVEAL = null; draw(); };
    if (q('bap-kf')) q('bap-kf').onsubmit = e => { e.preventDefault(); const f = F(e.target); go(async () => { const d = await A('integrations/keys', 'POST', {name: f.get('name'), scopes: f.all('scopes')}); REVEAL = {title: 'API anahtarınız', note: d.note, value: d.key}; await load(); }); };
    root.querySelectorAll('[data-bap-rv]').forEach(b => b.onclick = () => { if (confirm('“' + b.dataset.n + '” anahtarı iptal edilsin mi? Bu anahtarı kullanan bağlantılar hemen çalışmayı durdurur.')) go(async () => { await A('integrations/keys/revoke', 'POST', {id: b.dataset.bapRv}); await load(); }); });
    if (q('bap-wf')) q('bap-wf').onsubmit = e => { e.preventDefault(); const f = F(e.target); go(async () => { const d = await A('integrations/webhooks', 'POST', {url: f.get('url'), description: f.get('description'), events: f.all('events')}); REVEAL = {title: 'Webhook imza anahtarı', note: d.note, value: d.secret}; await load(); }); };
    root.querySelectorAll('[data-bap-t]').forEach(b => b.onclick = () => go(async () => { b.disabled = true; const d = await A('integrations/webhooks/test', 'POST', {id: b.dataset.bapT}); say(d.ok ? 'Test başarılı (' + d.status + ', ' + d.ms + ' ms).' : 'Test başarısız: ' + (d.error || d.status)); await load(); }));
    root.querySelectorAll('[data-bap-l]').forEach(b => b.onclick = () => go(async () => { const id = b.dataset.bapL; if (DEL[id]) delete DEL[id]; else DEL[id] = (await A('integrations/webhooks/deliveries?id=' + encodeURIComponent(id))).deliveries; draw(); }));
    root.querySelectorAll('[data-bap-a]').forEach(b => b.onclick = () => go(async () => { await A('integrations/webhooks/update', 'POST', {id: b.dataset.bapA, active: b.dataset.on === '1'}); await load(); }));
    root.querySelectorAll('[data-bap-d]').forEach(b => b.onclick = () => { if (confirm('Webhook silinsin mi? Bekleyen gönderimler iptal olur.')) go(async () => { await A('integrations/webhooks/delete', 'POST', {id: b.dataset.bapD}); await load(); }); });
    root.querySelectorAll('[data-bap-rt]').forEach(b => b.onclick = () => go(async () => { await A('integrations/webhooks/retry', 'POST', {id: b.dataset.bapRt}); const w = b.closest('div[style*="border-top"]'); const hid = Object.keys(DEL).find(k => DEL[k].some(r => r.id === b.dataset.bapRt)); if (hid) DEL[hid] = (await A('integrations/webhooks/deliveries?id=' + encodeURIComponent(hid))).deliveries; await load(); }));
  }

  const routes = {api: page};
  Object.assign(names, {api: 'API ve Webhook'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav) {
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    let g = sum('Entegrasyon');
    if (!g) { g = document.createElement('details'); g.innerHTML = '<summary>Entegrasyon</summary><div class="dropdown"></div>'; (sum('Raporlar') || sum('Güven ve Uyum') || {after: n => nav.appendChild(n)}).after(g); }
    const dd = g.querySelector('.dropdown'); if (dd && !dd.querySelector('a[href="#api"]')) dd.insertAdjacentHTML('beforeend', '<a href="#api">API ve Webhook</a>');
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bap-root')) render(); }, 350);
})();
