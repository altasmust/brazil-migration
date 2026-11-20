'use strict';
// Raporlar (Faz 5): dönüşüm hunisi, gelir, dosya süreleri, danışman/partner performansı. CSV dışa aktarım + yazdırılabilir (PDF'e kaydedilebilir) görünüm.
// Arka uç: /api/platform/admin/reports. Para birimleri hiçbir yerde toplanıp karıştırılmaz.
(() => {
  const A = async path => {
    const r = await fetch('/api/platform/admin/' + path, {cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const n2 = n => ((n || 0) / 100).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const fm = o => { const e = Object.entries(o || {}).filter(([, v]) => v); return e.length ? e.map(([c, v]) => n2(v) + ' ' + c).join(' + ') : '—'; };
  const pct = v => (v == null ? '—' : '%' + String(v).replace('.', ','));
  const dd = v => (v == null ? '—' : String(v).replace('.', ',') + ' gün');
  const SV = {oturum: 'Oturum izni', vatandaslik: 'Vatandaşlık', sirket: 'Şirket kurulumu', diger: 'Diğer hizmetler'};
  const svn = s => SV[s] || s;
  const today = () => new Date().toISOString().slice(0, 10), ago = d => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
  const TABS = [['ozet', 'Özet'], ['donusum', 'Dönüşüm'], ['gelir', 'Gelir'], ['dosya', 'Dosyalar'], ['danisman', 'Danışmanlar']];
  let TAB = 'ozet', FROM = ago(89), TO = today(), R = null;

  const page = () => {
    setTimeout(async () => { try { await load(); } catch (e) { const r = $('#brp-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
    return '<div class="bcs">' + heading('Raporlar') + '<p class="bcs-sub">Dönüşüm, gelir, dosya süreleri ve danışman performansı. Tutarlar para birimine göre ayrı gösterilir.</p><div id="brp-root"><div class="loading">Yükleniyor…</div></div></div>';
  };
  async function load() { R = await A('reports?from=' + FROM + '&to=' + TO); draw(); }

  const kpi = (l, v, s) => '<div class="bcs-kpi" style="background:#fff;border:1px solid #e3e9de;border-radius:14px;padding:12px 14px"><div style="font-size:12px;color:#68776b">' + esc(l) + '</div><div style="font-size:22px;font-weight:700;margin:2px 0">' + v + '</div>' + (s ? '<div style="font-size:12px;color:#68776b">' + s + '</div>' : '') + '</div>';
  const grid = items => '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:0 0 14px">' + items.join('') + '</div>';
  const tbl = (head, rows, empty) => rows.length ? '<div style="overflow-x:auto"><table class="bcs-t" style="width:100%;border-collapse:collapse;font-size:13.5px"><thead><tr>' + head.map(h => '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e3e9de;color:#68776b;font-weight:600">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td style="padding:6px 8px;border-bottom:1px solid #f0f3ed">' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '<p class="bcs-hint">' + esc(empty || 'Bu aralıkta veri yok.') + '</p>';
  const bar = (v, max, c) => '<div style="background:#eef3ef;border-radius:99px;height:8px;min-width:80px"><div style="width:' + (max ? Math.max(2, Math.round(v / max * 100)) : 0) + '%;height:8px;border-radius:99px;background:' + (c || '#1b5e20') + '"></div></div>';
  const csv = (sec, label) => '<a class="btn small ghost" href="/api/platform/admin/reports/csv?section=' + sec + '&from=' + FROM + '&to=' + TO + '">' + esc(label || 'CSV indir') + '</a>';
  const panel = (title, body, tools) => '<section class="panel bcs-p"><header class="panel-head"><h2>' + esc(title) + '</h2><span>' + (tools || '') + '</span></header>' + body + '</section>';

  const secConv = () => { const c = R.conversion, mx = Math.max(1, ...c.funnel.map(f => f.count));
    return grid([kpi('Aday', c.leads), kpi('Kazanılan', c.won, 'kapanan adaylarda ' + pct(c.winRate)), kpi('Adaydan müşteriye', pct(c.leadToWon)), kpi('Ort. kazanma süresi', dd(c.avgDaysToWin)), kpi('Teklif', c.quotes.total, c.quotes.accepted + ' kabul · ' + fm(c.quotes.acceptedValue))]) +
      panel('Dönüşüm hunisi', tbl(['Aşama', 'Aday', ''], c.funnel.map((f, i) => [esc(f.name), f.count + (i ? ' <small style="color:#68776b">(' + (c.funnel[0].count ? Math.round(f.count / c.funnel[0].count * 100) : 0) + '%)</small>' : ''), bar(f.count, mx)])), csv('leads', 'Adayları CSV indir')) +
      '<div class="bmg-2">' + panel('Kaynağa göre', tbl(['Kaynak', 'Aday', 'Kazanılan', 'Oran'], c.bySource.map(s => [esc(s.source), s.leads, s.won, pct(s.leads ? Math.round(s.won / s.leads * 1000) / 10 : null)]))) + panel('Hizmete göre', tbl(['Hizmet', 'Aday', 'Kazanılan', 'Oran'], c.byService.map(s => [esc(s.service), s.leads, s.won, pct(s.leads ? Math.round(s.won / s.leads * 1000) / 10 : null)]))) + '</div>'; };
  const secRev = () => { const v = R.revenue, cur = [...new Set(v.monthly.flatMap(m => Object.keys(m).filter(k => k !== 'month')))];
    return grid([kpi('Tahsil edilen', '<span style="font-size:17px">' + fm(v.gross) + '</span>', v.count + ' ödenmiş fatura'), kpi('Danışman payları', '<span style="font-size:17px">' + fm(v.commission) + '</span>'), kpi('Bekleyen', '<span style="font-size:17px">' + fm(v.outstanding.amount) + '</span>', v.outstanding.count + ' fatura'), kpi('Vadesi geçmiş', '<span style="font-size:17px;color:' + (v.outstanding.overdueCount ? '#b3261e' : 'inherit') + '">' + fm(v.outstanding.overdueAmount) + '</span>', v.outstanding.overdueCount + ' fatura')]) +
      panel('Aylık tahsilat', tbl(['Ay', ...cur], v.monthly.map(m => [esc(m.month), ...cur.map(c => (m[c] ? n2(m[c]) + ' ' + c : '—'))])), csv('revenue', 'Ödemeleri CSV indir')) +
      panel('Hizmete göre gelir', tbl(['Hizmet', 'Fatura', 'Tutar'], v.byService.map(s => [esc(svn(s.service)), s.count, n2(s.amount) + ' ' + s.currency]))); };
  const secCase = () => { const c = R.cases;
    return grid([kpi('Açılan dosya', c.opened), kpi('Tamamlanan', c.completed), kpi('Aktif dosya', c.active, 'ort. yaş ' + dd(c.avgOpenAge)), kpi('Ort. tamamlanma süresi', dd(c.avgDays), 'ortanca ' + dd(c.medianDays))]) +
      panel('Hizmete göre dosyalar', tbl(['Hizmet', 'Açılan', 'Tamamlanan', 'Aktif', 'Ort. süre'], c.byService.map(s => [esc(s.service), s.opened, s.completed, s.active, dd(s.avgDays)])), csv('cases', 'Dosyaları CSV indir')) +
      panel('Şu an hangi aşamada?', tbl(['Aşama', 'Dosya'], c.byStage.map(s => [esc(s.stage), s.count]), 'Aktif dosya yok.')); };
  const secAdv = () => panel('Danışman / partner performansı', tbl(['Danışman', 'Müşteri', 'Yeni', 'Aktif dosya', 'Tamamlanan', 'Ort. süre', 'Tahsilat', 'Danışman payı'], R.advisors.map(a => ['<b>' + esc(a.name) + '</b>', a.customers, a.newCustomers, a.activeCases, a.completedCases, dd(a.avgDays), esc(fm(a.revenue)), esc(fm(a.commission))])), csv('advisors', 'CSV indir')) +
    panel('Yeni müşteriler: kaynak', tbl(['Kaynak', 'Müşteri'], R.customerSources.map(s => [esc(s.source), s.count]), 'Bu aralıkta yeni müşteri yok.'));
  const body = () => ({ozet: () => secConv() + secRev() + secCase() + secAdv(), donusum: secConv, gelir: secRev, dosya: secCase, danisman: secAdv}[TAB])();

  function draw() {
    const root = $('#brp-root'); if (!root) return;
    root.innerHTML = '<form id="brp-f" class="bcs-bar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:0 0 10px"><label style="font-size:12px">Başlangıç<br><input type="date" name="from" value="' + FROM + '"></label><label style="font-size:12px">Bitiş<br><input type="date" name="to" value="' + TO + '"></label><button class="btn small">Uygula</button>' +
      '<button type="button" class="btn small ghost" data-brp-r="30">30 gün</button><button type="button" class="btn small ghost" data-brp-r="90">90 gün</button><button type="button" class="btn small ghost" data-brp-r="365">12 ay</button><button type="button" class="btn small ghost" data-brp-r="ytd">Bu yıl</button><span style="flex:1"></span><button type="button" class="btn small" id="brp-pr">PDF / Yazdır</button></form>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 14px">' + TABS.map(([k, v]) => '<button type="button" class="btn small ' + (k === TAB ? '' : 'ghost') + '" data-brp-tab="' + k + '">' + esc(v) + '</button>').join('') + '</div>' + body();
    root.querySelectorAll('[data-brp-tab]').forEach(b => b.onclick = () => { TAB = b.dataset.brpTab; draw(); });
    root.querySelectorAll('[data-brp-r]').forEach(b => b.onclick = () => { const v = b.dataset.brpR; TO = today(); FROM = v === 'ytd' ? TO.slice(0, 4) + '-01-01' : ago(Number(v) - 1); load().catch(e => say(e.message)); });
    $('#brp-f').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); FROM = f.get('from') || FROM; TO = f.get('to') || TO; load().catch(err => say(err.message)); };
    $('#brp-pr').onclick = print;
  }

  // Yazdırılabilir görünüm: yeni sekmede açılır, tarayıcıdan “PDF olarak kaydet” seçilebilir.
  function print() {
    const keep = TAB; TAB = 'ozet'; const h = body(); TAB = keep;
    const w = window.open('', '_blank'); if (!w) return say('Açılır pencere engellendi; izin verip tekrar deneyin.');
    w.document.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Rapor ' + esc(R.range.from) + ' – ' + esc(R.range.to) + '</title><style>body{font:13px/1.45 system-ui,sans-serif;color:#17261b;margin:24px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px}.panel-head span,.btn,.bcs-hint a{display:none}table{width:100%;border-collapse:collapse;margin-bottom:8px}th,td{padding:4px 6px;border-bottom:1px solid #ddd;text-align:left}.panel{break-inside:avoid;margin-bottom:10px}@media print{body{margin:10mm}}</style></head><body><h1>Brazil Migration · Rapor</h1><p>Dönem: ' + esc(R.range.from) + ' – ' + esc(R.range.to) + ' · Oluşturulma: ' + new Date(R.generated).toLocaleString('tr-TR') + '</p>' + h + '</body></html>');
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  const routes = {raporlar: page};
  Object.assign(names, {raporlar: 'Raporlar'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav) {
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    let g = sum('Raporlar');
    if (!g) { g = document.createElement('details'); g.innerHTML = '<summary>Raporlar</summary><div class="dropdown"></div>'; (sum('Satış') || sum('İletişim') || {after: n => nav.appendChild(n)}).after(g); }
    const dd2 = g.querySelector('.dropdown'); if (dd2 && !dd2.querySelector('a[href="#raporlar"]')) dd2.insertAdjacentHTML('beforeend', '<a href="#raporlar">Raporlar</a>');
  }
  if (routes[route()]) setTimeout(() => { if (!$('#brp-root')) render(); }, 350);
})();
