'use strict';
// Beyaz etiket: ana firma dışındaki firmaların panel ve giriş sayfalarında "Brazil Migration" yerine firmanın adı / logosu görünür.
// Ana firmada (GET /api/auth/brand → {main:true}) hiçbir şey yapmaz.
(() => {
  const FROM = 'Brazil Migration', LOGO = /brazil-migration-logo/;
  fetch('/api/auth/brand', {credentials: 'same-origin'}).then(r => r.json()).then(b => { if (!b || b.main || !b.name) return; apply(b); }).catch(() => {});
  function apply(b) {
    const name = b.name;
    const text = root => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => (n.nodeValue.includes(FROM) || /BRAZIL MIGRATION/.test(n.nodeValue)) && !/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT});
      const list = []; while (w.nextNode()) list.push(w.currentNode);
      for (const n of list) n.nodeValue = n.nodeValue.split(FROM).join(name).split('BRAZIL MIGRATION').join(name.toUpperCase());
    };
    const imgs = root => {
      root.querySelectorAll('img').forEach(im => {
        const src = im.getAttribute('src') || ''; if (!LOGO.test(src) || im.dataset.bmBrand) return; im.dataset.bmBrand = '1';
        if (b.logo) { im.removeAttribute('srcset'); im.src = b.logo; im.alt = name; im.style.height = 'auto'; im.style.maxHeight = '56px'; im.style.width = 'auto'; im.style.maxWidth = '220px'; im.style.objectFit = 'contain'; }
        else { const s = document.createElement('strong'); s.className = 'bm-brand-name'; s.textContent = name; s.style.cssText = 'font-size:18px;line-height:1.2;display:inline-block;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' + (b.color || 'inherit'); im.replaceWith(s); }
      });
    };
    const attrs = root => root.querySelectorAll('[alt*="Brazil Migration"],[aria-label*="Brazil Migration"],[title*="Brazil Migration"]').forEach(el => ['alt', 'aria-label', 'title'].forEach(k => { const v = el.getAttribute(k); if (v && v.includes(FROM)) el.setAttribute(k, v.split(FROM).join(name)); }));
    // Firma giriş sayfası: ana sitenin menüsü ve alt bilgisi (Brezilya hizmet sayfaları) firmaya ait değildir
    if (/^\/giris\//.test(location.pathname)) { const st = document.createElement('style'); st.textContent = '.mega-nav,.site-footer,.new-header .nav-cta,.new-header nav,.mobile-nav-toggle{display:none!important}'; document.head.appendChild(st); }
    let busy = false;
    const all = () => { if (busy) return; busy = true; try { document.title = document.title.split(FROM).join(name); imgs(document); text(document.body); attrs(document); } finally { busy = false; } };
    all(); new MutationObserver(() => { if (!busy) all(); }).observe(document.body, {childList: true, subtree: true, characterData: true});
  }
})();
