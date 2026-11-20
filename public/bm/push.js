// Brazil Migration — PWA bildirimleri (istemci). Paneller (müşteri, danışman, yönetici) bu dosyayı yükler.
//  • window.BMPush: {supported, state(), enable(detail), disable(), setDetail(bool), test()} — /uygulama/ sayfası kullanır.
//  • Giriş yapılmış panellerde, bildirim izni henüz sorulmamışsa küçük, kapatılabilir bir öneri şeridi gösterir (7 gün sonra tekrar).
//  • İzin verilmiş cihazlarda aboneliği oturumla eşler (6 saatte bir sessizce); çıkış yapılınca sunucu bu cihaza göndermeyi bırakır.
(function () {
  'use strict';
  var admin = location.pathname.indexOf('/admin') === 0, base = (admin ? '/api/auth/admin/' : '/api/auth/') + 'push/';
  var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol === 'https:' || (location.hostname === 'localhost' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function api(path, body) {
    return fetch(base + path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Hata'); e.status = r.status; throw e; } return d; }); });
  }
  function key(s) { var p = '='.repeat((4 - s.length % 4) % 4), b = (s + p).replace(/-/g, '+').replace(/_/g, '/'), raw = atob(b), out = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; }
  function reg() { return navigator.serviceWorker.register('/sw.js').then(function () { return navigator.serviceWorker.ready; }); }
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  var BMPush = {
    supported: supported, standalone: standalone, ios: ios, needsInstall: ios && !standalone,
    state: function () {
      if (!supported) return Promise.resolve({ supported: false, permission: 'unsupported' });
      return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (sub) {
        if (!sub) return { supported: true, permission: Notification.permission, subscribed: false, detail: false };
        return api('status?endpoint=' + encodeURIComponent(sub.endpoint)).then(function (s) { return { supported: true, permission: Notification.permission, subscribed: s.thisDevice, detail: s.detail, devices: s.devices }; });
      });
    },
    enable: function (detail) {
      if (!supported) return Promise.reject(new Error('unsupported'));
      return Notification.requestPermission().then(function (p) {
        if (p !== 'granted') throw Object.assign(new Error('denied'), { denied: true });
        return Promise.all([api('key'), reg()]);
      }).then(function (a) {
        ls.set('bm-push-me', a[0].me); ls.set('bm-push-detail', detail ? '1' : '0');
        return a[1].pushManager.getSubscription().then(function (sub) { return sub || a[1].pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(a[0].publicKey) }); });
      }).then(function (sub) { return api('subscribe', { subscription: sub.toJSON(), detail: !!detail }); });
    },
    setDetail: function (on) { ls.set('bm-push-detail', on ? '1' : '0'); return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (sub) { if (!sub) throw new Error('no-sub'); return api('subscribe', { subscription: sub.toJSON(), detail: !!on }); }); },
    disable: function () { return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (sub) { if (!sub) return; var ep = sub.endpoint; return sub.unsubscribe().then(function () { return api('unsubscribe', { endpoint: ep }); }); }); },
    test: function () { return api('test', {}); }
  };
  window.BMPush = BMPush;
  if (!supported || /^\/(uygulama|giris)\b/.test(location.pathname)) return;

  // Sessiz eşitleme: bu cihazda bildirimi BU hesap açtıysa aboneliği geçerli oturuma bağla (çıkış/giriş sonrası). Başka hesap açtıysa dokunmaz.
  function sync() {
    if (Notification.permission !== 'granted') return;
    if (Date.now() - Number(ls.get('bm-push-sync') || 0) < 6 * 3600e3) return;
    Promise.all([api('key'), reg().then(function (r) { return r.pushManager.getSubscription(); })]).then(function (a) {
      if (!a[1] || ls.get('bm-push-me') !== a[0].me) return;
      return api('subscribe', { subscription: a[1].toJSON(), detail: ls.get('bm-push-detail') === '1' }).then(function () { ls.set('bm-push-sync', String(Date.now())); });
    }).catch(function () {});
  }

  // Öneri şeridi (yalnız izin henüz sorulmamışsa).
  var T = { tr: ['Yeni mesaj ve güncellemeleri bildirim olarak alın.', 'Bildirimleri aç', 'Sonra', 'Uygulamayı yükleyin: yeni mesaj ve güncellemeler bildirim olarak gelsin.', 'Nasıl?'], en: ['Get new messages and updates as notifications.', 'Turn on', 'Later', 'Install the app to get new messages and updates as notifications.', 'How?'], pt: ['Receba novas mensagens e atualizações como notificações.', 'Ativar', 'Depois', 'Instale o app para receber novas mensagens e atualizações como notificações.', 'Como?'] };
  var L = (document.documentElement.lang || 'tr').slice(0, 2), t = T[L] || T.tr;
  function banner() {
    if (Notification.permission !== 'default' && !BMPush.needsInstall) return;
    if (BMPush.needsInstall && standalone) return;
    if (Date.now() - Number(ls.get('bm-push-later') || 0) < 7 * 864e5) return;
    var b = document.createElement('div'); b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Bildirimler');
    b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:520px;margin:0 auto;background:#17261b;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.3);display:flex;gap:10px;align-items:center;flex-wrap:wrap;font:14px/1.4 system-ui,sans-serif';
    var p = document.createElement('span'); p.style.flex = '1 1 200px'; p.textContent = BMPush.needsInstall ? t[3] : t[0]; b.appendChild(p);
    function btn(label, primary, fn) { var x = document.createElement('button'); x.type = 'button'; x.textContent = label; x.style.cssText = 'font:inherit;border:0;border-radius:9px;padding:7px 12px;cursor:pointer;' + (primary ? 'background:#fff;color:#1b5e20;font-weight:600' : 'background:transparent;color:#cfe3d2'); x.onclick = fn; b.appendChild(x); }
    if (BMPush.needsInstall) btn(t[4], true, function () { location.href = '/uygulama/'; });
    else btn(t[1], true, function () { BMPush.enable(false).then(function () { b.remove(); }).catch(function (e) { if (e && e.denied) ls.set('bm-push-later', String(Date.now())); b.remove(); }); });
    btn(t[2], false, function () { ls.set('bm-push-later', String(Date.now())); b.remove(); });
    document.body.appendChild(b);
  }
  addEventListener('load', function () { setTimeout(function () { sync(); setTimeout(banner, 6000); }, 1500); });
})();
