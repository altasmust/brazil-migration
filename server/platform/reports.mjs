// Faz 5 · Raporlar: dönüşüm hunisi, gelir, dosya (başvuru) süreleri, danışman/partner performansı. CSV dışa aktarım; PDF için panel yazdırılabilir görünüm üretir.
// Yalnız yönetici (platform admin). Para birimleri ASLA toplanıp karıştırılmaz: her tutar para birimiyle birlikte (küçük birim: cent/kuruş) döner.
// Tarih aralığı: ?from=YYYY-MM-DD&to=YYYY-MM-DD (varsayılan son 90 gün, en çok 5 yıl).
import {json, all, parse, csvResponse, DAY, dayStr} from './kit.mjs';
import {fail, clean} from './auth.mjs';
import {LEAD_STAGES} from './sales.mjs';

const STAGE_NAME = Object.fromEntries(LEAD_STAGES);
const FUNNEL = ['new', 'contacted', 'meeting', 'quoted', 'won']; // kazanılan aday, önceki tüm aşamalardan geçmiş sayılır
const dayMs = s => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? Date.parse(s + 'T00:00:00Z') : NaN);
const month = ms => new Date(ms).toISOString().slice(0, 7);
const days = (a, b) => Math.max(0, Math.round((b - a) / DAY));
const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null);
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2 * 10) / 10; };
const addMoney = (o, cur, n) => { o[cur || 'USD'] = (o[cur || 'USD'] || 0) + n; return o; };

export function rangeOf(url) {
  const sp = url.searchParams, now = Date.now(); let to = dayMs(sp.get('to')), from = dayMs(sp.get('from'));
  if (Number.isNaN(to)) to = Math.floor(now / DAY) * DAY; to += DAY; // bitiş günü dâhil
  if (Number.isNaN(from)) from = to - 90 * DAY;
  if (from >= to) fail(400, 'Başlangıç tarihi bitişten önce olmalı.');
  if (to - from > 5 * 366 * DAY) fail(400, 'En fazla 5 yıllık aralık seçilebilir.');
  return {from, to, fromDay: dayStr(from), toDay: dayStr(to - DAY)};
}

export async function buildReport(db, {from, to}) {
  const inR = ms => ms >= from && ms < to;
  const people = await all(db, "SELECT id, name, email, role, status, advisor, source, created FROM people LIMIT 50000"), pById = new Map(people.map(p => [p.id, p]));
  const advName = id => (!id || id === 'owner' ? 'Merkez ofis' : pById.get(id)?.name || 'Silinmiş danışman');

  // ---- dönüşüm ----
  const leadRows = await all(db, "SELECT id, data, created, updated FROM items WHERE kind='lead' LIMIT 50000");
  const leads = leadRows.map(r => ({id: r.id, ...parse(r.data), created: r.created, updated: r.updated})).filter(l => inR(l.at || l.created));
  const stageIdx = s => FUNNEL.indexOf(s), wonAt = l => { const h = [...(l.history || [])].reverse().find(x => /→\s*Kazanıldı/.test(x.text || '')); return h?.at || l.updated; };
  const funnel = FUNNEL.map(id => ({id, name: STAGE_NAME[id] || id, count: leads.filter(l => l.stage === 'lost' ? id === 'new' : stageIdx(l.stage) >= stageIdx(id)).length}));
  const lost = leads.filter(l => l.stage === 'lost').length, won = leads.filter(l => l.stage === 'won'), closed = won.length + lost;
  const bySource = {}, byService = {};
  for (const l of leads) { const s = l.source || 'Diğer', e = bySource[s] ||= {source: s, leads: 0, won: 0}; e.leads++; if (l.stage === 'won') e.won++; const v = l.service || 'Belirtilmemiş', f = byService[v] ||= {service: v, leads: 0, won: 0}; f.leads++; if (l.stage === 'won') f.won++; }
  const quotes = (await all(db, "SELECT data, created FROM items WHERE kind='quote' LIMIT 50000")).map(r => ({...parse(r.data), created: r.created})).filter(q => inR(q.created));
  const conversion = {
    leads: leads.length, won: won.length, lost, open: leads.length - closed, winRate: closed ? Math.round(won.length / closed * 1000) / 10 : null, leadToWon: leads.length ? Math.round(won.length / leads.length * 1000) / 10 : null,
    avgDaysToWin: avg(won.map(l => days(l.at || l.created, wonAt(l)))), funnel, bySource: Object.values(bySource).sort((a, b) => b.leads - a.leads), byService: Object.values(byService).sort((a, b) => b.leads - a.leads),
    quotes: {total: quotes.length, sent: quotes.filter(q => q.status !== 'draft').length, accepted: quotes.filter(q => q.status === 'accepted').length, acceptedValue: quotes.filter(q => q.status === 'accepted').reduce((o, q) => addMoney(o, q.currency, q.amount || 0), {})},
    monthly: Object.entries(leads.reduce((o, l) => { const m = month(l.at || l.created); (o[m] ||= {month: m, leads: 0, won: 0}).leads++; if (l.stage === 'won') o[m].won++; return o; }, {})).sort().map(x => x[1]),
  };

  // ---- gelir ----
  const invs = (await all(db, "SELECT id, owner, data, created FROM items WHERE kind='invoice' LIMIT 100000")).map(r => ({id: r.id, owner: r.owner, ...parse(r.data), created: r.created}));
  const today = dayStr(Date.now()), paid = invs.filter(i => i.status === 'Ödendi' && inR(i.paidAt || i.created));
  const gross = {}, commission = {}, byServiceRev = {}, monthRev = {};
  for (const i of paid) {
    addMoney(gross, i.currency, i.amount); const c = i.advisor ? Math.round(i.amount * (i.rate || 0) / 100) : 0; if (c) addMoney(commission, i.currency, c);
    const sv = i.service || 'diger', e = byServiceRev[sv + '|' + i.currency] ||= {service: sv, currency: i.currency || 'USD', amount: 0, count: 0}; e.amount += i.amount; e.count++;
    const mo = month(i.paidAt || i.created), m = monthRev[mo] ||= {month: mo}; m[i.currency || 'USD'] = (m[i.currency || 'USD'] || 0) + i.amount;
  }
  const unpaid = invs.filter(i => i.status === 'Ödenmedi'), overdue = unpaid.filter(i => i.due && i.due < today);
  const sum = list => list.reduce((o, i) => addMoney(o, i.currency, i.amount), {});
  const revenue = {gross, commission, count: paid.length, byService: Object.values(byServiceRev).sort((a, b) => b.amount - a.amount), monthly: Object.values(monthRev).sort((a, b) => a.month.localeCompare(b.month)),
    outstanding: {count: unpaid.length, amount: sum(unpaid), overdueCount: overdue.length, overdueAmount: sum(overdue)}, cancelled: invs.filter(i => i.status === 'İptal' && inR(i.created)).length};

  // ---- dosyalar (başvurular) ----
  const apps = (await all(db, "SELECT id, owner, data, created, updated FROM items WHERE kind='application' LIMIT 100000")).map(r => ({id: r.id, owner: r.owner, ...parse(r.data), created: r.created, updated: r.updated}));
  const states = new Map((await all(db, "SELECT id, data FROM items WHERE kind='case_state' LIMIT 100000")).map(r => [r.id, parse(r.data)]));
  const doneAt = a => { const st = states.get('cs-' + a.id), t = (st?.events || []).reduce((m, e) => Math.max(m, e.t || 0), 0); return t || a.updated; };
  const completed = apps.filter(a => a.status === 'Tamamlandı' && inR(doneAt(a)));
  const svcCase = {};
  for (const a of apps) { const s = a.service || 'Belirtilmemiş', e = svcCase[s] ||= {service: s, opened: 0, completed: 0, active: 0, _d: []}; if (inR(a.created)) e.opened++; if (a.status === 'Tamamlandı') { if (inR(doneAt(a))) { e.completed++; e._d.push(days(a.created, doneAt(a))); } } else e.active++; }
  const stageNow = {}; for (const a of apps) if (a.status !== 'Tamamlandı') { const st = states.get('cs-' + a.id), name = st?.stages?.[st.stage] || a.status || 'Belirtilmemiş'; stageNow[name] = (stageNow[name] || 0) + 1; }
  const durs = completed.map(a => days(a.created, doneAt(a))), openAges = apps.filter(a => a.status !== 'Tamamlandı').map(a => days(a.created, Date.now()));
  const cases = {opened: apps.filter(a => inR(a.created)).length, completed: completed.length, active: apps.filter(a => a.status !== 'Tamamlandı').length, avgDays: avg(durs), medianDays: median(durs), avgOpenAge: avg(openAges),
    byService: Object.values(svcCase).map(({_d, ...e}) => ({...e, avgDays: avg(_d)})).sort((a, b) => b.opened - a.opened), byStage: Object.entries(stageNow).map(([stage, count]) => ({stage, count})).sort((a, b) => b.count - a.count),
    monthly: Object.entries([...apps.filter(a => inR(a.created)).map(a => [month(a.created), 'opened']), ...completed.map(a => [month(doneAt(a)), 'completed'])].reduce((o, [m, k]) => { (o[m] ||= {month: m, opened: 0, completed: 0})[k]++; return o; }, {})).sort().map(x => x[1])};

  // ---- danışman / partner performansı ----
  const custOf = new Map(people.filter(p => p.role === 'customer').map(p => [p.id, p])), adv = {};
  const slot = id => adv[id || 'owner'] ||= {id: id || 'owner', name: advName(id), customers: 0, newCustomers: 0, activeCases: 0, completedCases: 0, revenue: {}, commission: {}, invoices: 0, avgDays: [], tickets: 0};
  for (const p of people.filter(p => p.role === 'advisor' && p.status === 'active')) slot(p.id);
  for (const c of custOf.values()) { if (c.status === 'disabled') continue; const s = slot(c.advisor); s.customers++; if (inR(c.created)) s.newCustomers++; }
  for (const a of apps) { const s = slot(custOf.get(a.owner)?.advisor); if (a.status === 'Tamamlandı') { if (inR(doneAt(a))) { s.completedCases++; s.avgDays.push(days(a.created, doneAt(a))); } } else s.activeCases++; }
  for (const i of paid) { const s = slot(i.advisor || custOf.get(i.owner)?.advisor); addMoney(s.revenue, i.currency, i.amount); s.invoices++; if (i.advisor && i.rate) addMoney(s.commission, i.currency, Math.round(i.amount * i.rate / 100)); }
  const advisors = Object.values(adv).map(({avgDays, ...s}) => ({...s, avgDays: avg(avgDays)})).sort((a, b) => b.completedCases - a.completedCases || b.customers - a.customers);
  const sources = {}; for (const c of custOf.values()) if (inR(c.created)) { const s = clean(c.source, 40) || 'Doğrudan'; sources[s] = (sources[s] || 0) + 1; }

  return {range: {from: dayStr(from), to: dayStr(to - DAY)}, generated: Date.now(), conversion, revenue, cases, advisors, customerSources: Object.entries(sources).map(([source, count]) => ({source, count})).sort((a, b) => b.count - a.count),
    _raw: {leads, paid, completed, apps, advName, custOf, doneAt}};
}

const money = n => ((n || 0) / 100).toFixed(2).replace('.', ',');
const cell = o => Object.entries(o || {}).map(([c, n]) => money(n) + ' ' + c).join(' + ');
const sectionCsv = (name, r) => {
  const {_raw: x} = r, d = ms => (ms ? dayStr(ms) : '');
  if (name === 'leads') return [['Tarih', 'Ad', 'E-posta', 'Hizmet', 'Kaynak', 'Aşama', 'Değer', 'Para birimi'], x.leads.map(l => [d(l.at || l.created), l.name, l.email, l.service, l.source, STAGE_NAME[l.stage] || l.stage, l.value ? money(l.value) : '', l.currency || ''])];
  if (name === 'revenue') return [['Ödeme tarihi', 'Fatura no', 'Başlık', 'Müşteri', 'Hizmet', 'Danışman', 'Tutar', 'Para birimi', 'Danışman payı'], x.paid.map(i => [d(i.paidAt || i.created), i.number, i.title, x.custOf.get(i.owner)?.name || '', i.service || '', i.advisor ? x.advName(i.advisor) : '', money(i.amount), i.currency || '', i.advisor && i.rate ? money(Math.round(i.amount * i.rate / 100)) : ''])];
  if (name === 'cases') return [['Açılış', 'Müşteri', 'Hizmet', 'Durum', 'Danışman', 'Süre (gün)'], x.apps.map(a => [d(a.created), x.custOf.get(a.owner)?.name || '', a.service, a.status, x.advName(x.custOf.get(a.owner)?.advisor), a.status === 'Tamamlandı' ? days(a.created, x.doneAt(a)) : ''])];
  if (name === 'advisors') return [['Danışman', 'Müşteri', 'Yeni müşteri', 'Aktif dosya', 'Tamamlanan dosya', 'Ort. süre (gün)', 'Tahsil edilen', 'Danışman payı'], r.advisors.map(a => [a.name, a.customers, a.newCustomers, a.activeCases, a.completedCases, a.avgDays ?? '', cell(a.revenue), cell(a.commission)])];
  return null;
};

export async function reportsAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('reports')) return null;
  if (req.method !== 'GET') return null;
  const url = new URL(req.url), rg = rangeOf(url), rep = await buildReport(db, rg);
  if (route === 'reports/csv') {
    const sec = url.searchParams.get('section') || '', s = sectionCsv(sec, rep); if (!s) fail(400, 'Geçersiz rapor bölümü.');
    try { if (ctx.audit) await ctx.audit(db, ctx.actor, 'report.export', sec + ' ' + rep.range.from + '..' + rep.range.to).run(); } catch {}
    return csvResponse(`rapor-${sec}-${rep.range.from}_${rep.range.to}.csv`, s[0], s[1]);
  }
  if (route === 'reports') { const {_raw, ...out} = rep; return json(out); }
  return null;
}
