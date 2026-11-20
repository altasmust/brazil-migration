'use strict';
// Güvenlik (Faz 5): yönetici hesabı için iki aşamalı doğrulama (TOTP), açık oturumlar, belge şifreleme.
// Yedek geri yükleme: Ayarlar → Yedekler. Kullanıcı uçları /api/auth/admin/security/*, ayar uçları /api/platform/admin/security/*.
(() => {
  const call = async (base, path, method = 'GET', body) => {
    const r = await fetch(base + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const U = (p, m, b) => call('/api/auth/admin/', p, m, b), A = (p, m, b) => call('/api/platform/admin/', p, m, b);
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const dt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '');
  const chip = (t, c) => '<span class="bcs-chip ' + (c || '') + '">' + esc(t) + '</span>';
  let ME = null, ENC = null, SETUP = null, CODES = null;

  const page = () => {
    setTimeout(async () => { try { await load(); } catch (e) { const r = $('#bsc-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
    return '<div class="bcs">' + heading('Güvenlik') + '<p class="bcs-sub">İki aşamalı doğrulama, açık oturumlar ve belge şifreleme. Yedek geri yükleme için Ayarlar → Yedekler sayfasına bakın.</p><div id="bsc-root"><div class="loading">Yükleniyor…</div></div></div>';
  };
  async function load() { [ME, ENC] = await Promise.all([U('security/me'), A('security/docenc')]); draw(); }

  function draw() {
    const root = $('#bsc-root'); if (!root) return; const tf = ME.twofa;
    let two = '<section class="panel bcs-p"><header class="panel-head"><h2>İki aşamalı doğrulama</h2>' + chip(tf.enabled ? 'Açık' : 'Kapalı', tf.enabled ? 'ok' : 'warn') + '</header>' +
      '<p class="bcs-hint">Yönetici girişinde parolaya ek olarak kimlik doğrulama uygulamasındaki (Google/Microsoft Authenticator, Authy…) 6 haneli kod istenir. Yönetici hesabı tüm verilere eriştiği için açmanızı öneririz.</p>';
    if (CODES) two += '<h3 class="bmg-h3">Kurtarma kodları</h3><p class="bcs-hint">Telefona erişemezseniz her kod bir kez kullanılabilir. Güvenli bir yere kaydedin; bir daha gösterilmeyecek.</p><pre style="white-space:pre-wrap;background:#eef3ef;border-radius:10px;padding:10px 12px;margin:8px 0;user-select:all">' + CODES.map(esc).join('\n') + '</pre><button class="btn small" id="bsc-cpc">Kopyala</button> <button class="btn small ghost" id="bsc-ok">Kaydettim</button>';
    else if (tf.enabled) two += '<p class="bcs-hint">Kalan kurtarma kodu: <b>' + tf.recovery + '</b></p><form id="bsc-dis" class="bcs-form"><label>Parolanız<input name="password" type="password" autocomplete="current-password" required></label><label>Kod veya kurtarma kodu<input name="code" inputmode="numeric" autocomplete="one-time-code" required></label><button class="btn small danger">İki aşamalı doğrulamayı kapat</button></form>';
    else if (SETUP) two += '<p class="bcs-hint">Uygulamada “anahtar gir” seçeneğiyle şu kurulum anahtarını ekleyin (hesap türü: zamana bağlı):</p><pre style="white-space:pre-wrap;background:#eef3ef;border-radius:10px;padding:10px 12px;margin:8px 0;user-select:all;font-size:16px">' + esc(SETUP.secret.replace(/(.{4})/g, '$1 ').trim()) + '</pre><p class="bcs-hint"><a href="' + esc(SETUP.uri) + '">Telefonda kimlik doğrulama uygulamasında aç</a></p><form id="bsc-en" class="bcs-form"><label>Uygulamadaki 6 haneli kod<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label><button class="btn small">Etkinleştir</button></form>';
    else two += '<button class="btn primary small" id="bsc-st">Kurulumu başlat</button>';
    two += '</section>';

    const ses = '<section class="panel bcs-p"><header class="panel-head"><h2>Açık oturumlar</h2>' + (ME.sessions.length > 1 ? '<button class="btn small ghost" id="bsc-all">Diğerlerini kapat</button>' : '') + '</header><p class="bcs-hint">Hesabınıza giriş yapılmış cihazlar. Tanımadığınız bir oturum varsa kapatın ve parolanızı değiştirin.</p>' +
      '<ul class="bmg-ul">' + ME.sessions.map(s => '<li><span><b>' + esc(s.agent) + '</b> ' + (s.current ? chip('Bu cihaz', 'ok') : '') + '<small>' + esc((s.ip ? s.ip + ' · ' : '') + (s.country ? s.country + ' · ' : '') + 'giriş ' + dt(s.created) + ' · bitiş ' + dt(s.expires)) + '</small></span>' + (s.current ? '' : '<button class="btn small ghost" data-bsc-rev="' + esc(s.id) + '">Kapat</button>') + '</li>').join('') + '</ul></section>';

    const enc = '<section class="panel bcs-p"><header class="panel-head"><h2>Belge şifreleme</h2>' + chip(ENC.enabled ? 'Açık' : 'Kapalı', ENC.enabled ? 'ok' : '') + '</header>' +
      '<p class="bcs-hint">Açıkken yüklenen belgeler dosya deposuna AES-256 ile şifreli yazılır; yalnız panel üzerinden açılabilir. <b>Neyi korur:</b> dosya deposunun (Vercel Blob / sunucu diski) tek başına sızması. <b>Neyi korumaz:</b> veritabanıyla birlikte ele geçirilen anahtar, yönetici/danışman hesabının ele geçirilmesi. Anahtar firma veritabanında ve yedeklerde durur; yedek dosyalarını güvenli saklayın. Kapatsanız bile şifreli eski dosyalar okunmaya devam eder.</p>' +
      '<p class="bcs-hint">Belge kaydı: <b>' + ENC.documents + '</b> · şifreli: <b>' + ENC.encrypted + '</b></p>' +
      (ENC.enabled ? '<button class="btn small" id="bsc-mig">Mevcut belgeleri şifrele' + (ENC.documents > ENC.encrypted ? ' (' + (ENC.documents - ENC.encrypted) + ' kalan)' : '') + '</button> <button class="btn small ghost" id="bsc-off">Şifrelemeyi kapat</button>' : '<button class="btn primary small" id="bsc-on">Şifrelemeyi aç</button>') + '</section>';
    root.innerHTML = '<div class="bmg-2">' + two + ses + '</div>' + enc; bind();
  }

  function bind() {
    const q = id => document.getElementById(id), go = async fn => { try { await fn(); } catch (e) { say(e.message); } };
    if (q('bsc-st')) q('bsc-st').onclick = () => go(async () => { SETUP = await U('security/2fa/setup', 'POST', {}); draw(); });
    if (q('bsc-en')) q('bsc-en').onsubmit = e => { e.preventDefault(); go(async () => { const d = await U('security/2fa/enable', 'POST', {code: new FormData(e.target).get('code')}); SETUP = null; CODES = d.recoveryCodes; ME = await U('security/me'); draw(); say('İki aşamalı doğrulama açıldı.'); }); };
    if (q('bsc-dis')) q('bsc-dis').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); go(async () => { await U('security/2fa/disable', 'POST', {password: f.get('password'), code: f.get('code')}); say('İki aşamalı doğrulama kapatıldı.'); await load(); }); };
    if (q('bsc-cpc')) q('bsc-cpc').onclick = () => { try { navigator.clipboard.writeText(CODES.join('\n')); say('Kopyalandı.'); } catch {} };
    if (q('bsc-ok')) q('bsc-ok').onclick = () => { CODES = null; draw(); };
    document.querySelectorAll('[data-bsc-rev]').forEach(b => b.onclick = () => go(async () => { await U('security/sessions/revoke', 'POST', {id: b.dataset.bscRev}); await load(); }));
    if (q('bsc-all')) q('bsc-all').onclick = () => { if (confirm('Bu cihaz dışındaki tüm oturumlar kapatılsın mı?')) go(async () => { await U('security/sessions/revoke-all', 'POST', {}); await load(); }); };
    if (q('bsc-on')) q('bsc-on').onclick = () => { if (confirm('Belge şifreleme açılsın mı?\n\nYeni yüklenen belgeler şifreli saklanır. Anahtar veritabanınızda tutulur; yedeklerinizi güvenli saklayın. Bu işlem koruma sağlar ama tek başına güvenlik garantisi değildir.')) go(async () => { await A('security/docenc', 'POST', {enabled: true, confirm: true}); await load(); say('Belge şifreleme açıldı.'); }); };
    if (q('bsc-off')) q('bsc-off').onclick = () => go(async () => { await A('security/docenc', 'POST', {enabled: false}); await load(); say('Yeni belgeler artık şifrelenmeyecek.'); });
    if (q('bsc-mig')) q('bsc-mig').onclick = () => go(async () => { q('bsc-mig').disabled = true; let r; do { r = await A('security/docenc/migrate', 'POST', {limit: 50}); } while (r.remaining > 0 && r.done > 0); await load(); say('Mevcut belgeler şifrelendi' + (r.failed ? ' (' + r.failed + ' dosya bulunamadı)' : '') + '.'); });
  }

  const routes = {guvenlik: page};
  Object.assign(names, {guvenlik: 'Güvenlik'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav) {
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    let g = sum('Güven ve Uyum');
    if (!g) { g = document.createElement('details'); g.innerHTML = '<summary>Güven ve Uyum</summary><div class="dropdown"></div>'; (sum('İletişim') || sum('Partner Ağı') || sum('Satış') || {after: n => nav.appendChild(n)}).after(g); }
    const dd = g.querySelector('.dropdown'); if (dd && !dd.querySelector('a[href="#guvenlik"]')) dd.insertAdjacentHTML('afterbegin', '<a href="#guvenlik">Güvenlik</a>');
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bsc-root')) render(); }, 350);
})();
