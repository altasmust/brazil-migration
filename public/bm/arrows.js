'use strict';
// "↗" ve "↔" karakterleri bazı telefonlarda emoji olarak çiziliyor; site ikonlarıyla uyumlu SVG oklara çevirir.
(() => {
  const SVG = d => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='${d}'/%3E%3C/svg%3E")`;
  if (!document.getElementById('bm-arr-css')) {
    const s = document.createElement('style'); s.id = 'bm-arr-css';
    s.textContent = `.bm-arr{display:inline-block;width:.8em;height:.8em;vertical-align:-.06em;background-color:currentColor;-webkit-mask:${SVG('M7 17 17 7M8.5 7H17v8.5')} center/contain no-repeat;mask:${SVG('M7 17 17 7M8.5 7H17v8.5')} center/contain no-repeat;flex:none}.bm-arr.lr{width:1em;-webkit-mask-image:${SVG('M7 8 3 12l4 4M17 8l4 4-4 4M3 12h18')};mask-image:${SVG('M7 8 3 12l4 4M17 8l4 4-4 4M3 12h18')}}`;
    (document.head || document.documentElement).appendChild(s);
  }
  const RE = /[↗↔]️?/;
  const fix = root => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => RE.test(n.nodeValue) && !n.parentElement?.closest('script,style,textarea,input,[contenteditable=true]') ? 1 : 3});
    const list = []; for (let n; (n = w.nextNode());) list.push(n);
    for (const n of list) {
      const parts = n.nodeValue.split(/([↗↔]️?)/), frag = document.createDocumentFragment();
      for (const p of parts) { if (!p) continue; if (/^[↗↔]/.test(p)) { const i = document.createElement('bm-arr'); i.className = 'bm-arr' + (p[0] === '↔' ? ' lr' : ''); i.setAttribute('aria-hidden', 'true'); frag.appendChild(i); } else frag.appendChild(document.createTextNode(p)); }
      n.replaceWith(frag);
    }
  };
  const run = () => { fix(document.body); new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType === 3 && RE.test(n.nodeValue) && n.parentElement) fix(n.parentElement); else if (n.nodeType === 1) fix(n); } }).observe(document.body, {childList: true, subtree: true, characterData: false}); };
  if (document.body) run(); else document.addEventListener('DOMContentLoaded', run);
})();
