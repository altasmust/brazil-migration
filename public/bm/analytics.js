'use strict';
// Analiz araçları (Genel Ayarlar → Analiz & Doğrulama): yalnız ziyaretçi çerez izni verdiyse ("Tümünü kabul et") yüklenir.
(() => {
  const me = document.currentScript; if (!me) return;
  const cfg = {ga4: me.dataset.ga4, gtm: me.dataset.gtm, pixel: me.dataset.pixel, clarity: me.dataset.clarity};
  const allowed = () => { try { return localStorage.getItem('bm-consent') === 'all'; } catch { return false; } };
  const add = (src, attrs = {}) => { const s = document.createElement('script'); s.async = true; s.src = src; Object.assign(s, attrs); document.head.appendChild(s); return s; };
  let done = false;
  function load() {
    if (done || !allowed()) return; done = true;
    if (cfg.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', cfg.ga4, {anonymize_ip: true});
      add('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4));
      // ön görüşme planlama butonları dönüşüm olarak sayılsın
      document.addEventListener('click', e => { const b = e.target.closest('[onclick^="book("]'); if (b) gtag('event', 'begin_booking', {page_path: location.pathname}); }, true);
    }
    if (cfg.gtm) {
      window.dataLayer = window.dataLayer || [];
      dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
      add('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(cfg.gtm));
    }
    if (cfg.pixel) {
      const f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      if (!window._fbq) window._fbq = f; f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
      add('https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', cfg.pixel); fbq('track', 'PageView');
    }
    if (cfg.clarity) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      add('https://www.clarity.ms/tag/' + encodeURIComponent(cfg.clarity));
    }
  }
  load();
  addEventListener('bm-consent', e => { if (e.detail === 'all') load(); });
})();
