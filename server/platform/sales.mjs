// Satış modülü (Faz 3): aday (lead) panosu + açık başvuru formu, teklif, sözleşme + basit e-imza, taksit planı ve gecikme hatırlatıcıları.
// Tüm veriler firmanın kendi veritabanındaki `items` tablosunda tutulur (lead · quote · contract_tpl · contract · pay_plan);
// fatura kayıtları mevcut `invoice` yapısıyla birebir aynıdır, bu yüzden ödeme yöntemleri (Pix/boleto, havale, kart) ve komisyon akışı aynen çalışır.
// Hukuki not: bu modüldeki imza "basit elektronik imza"dır (bağlantı + onay + zaman/IP/belge özeti kaydı); nitelikli e-imza değildir.
import {fail, clean, now, uuid, validEmail, sha, siteUrl} from './auth.mjs';
import {sendMail} from './mail.mjs';
import {mailTpl, langOf, validLang} from './comms.mjs';
import {currentTenant, cfgEnv} from './tenant-context.mjs';
import {loadSplits, splitFor, serviceKey} from './commission.mjs';
import {clientIp} from '../waf.mjs';
import {SERVICES} from './cases.mjs';
import {timingSafeEqual, randomBytes} from 'node:crypto';

const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const first = (db, sql, ...a) => db.prepare(sql).bind(...a).first();
const stmt = (db, id, kind, owner, data) => db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').bind(id, kind, owner, JSON.stringify(data), now(), now());
const put = (db, id, kind, owner, data) => stmt(db, id, kind, owner, data).run();
const del = (db, id) => db.prepare('DELETE FROM items WHERE id=?').bind(id).run();
const get = async (db, id, kind) => { const r = await first(db, 'SELECT * FROM items WHERE id=?', id); return r && (!kind || r.kind === kind) ? {...r, d: parse(r.data)} : null; };
const readBody = async req => { const t = await req.text(); if (t.length > 300000) fail(413, 'İstek çok büyük.'); try { return JSON.parse(t || '{}') || {}; } catch { fail(400, 'Geçersiz istek.'); } };
const notice = (db, owner, title, link) => put(db, uuid(), 'notice', owner, {title, link, read: false});
const DAY = 864e5;
const dayStr = ms => new Date(ms).toISOString().slice(0, 10);
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
const token = () => randomBytes(16).toString('hex');
const sameSecret = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && timingSafeEqual(x, y); };
const firmName = () => { const t = currentTenant(); return t.isDefault ? 'Brazil Migration' : (t.name || 'Danışmanlık firması'); };
const baseUrl = req => { try { return req ? siteUrl(req).replace(/\/$/, '') : (cfgEnv('SITE_URL') || '').replace(/\/$/, ''); } catch { return ''; } };
const money = (c, cur) => (c / 100).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ' + cur;
const CURRENCIES = ['USD', 'BRL', 'EUR', 'TRY'];

export const LEAD_STAGES = [['new', 'Yeni'], ['contacted', 'İletişim kuruldu'], ['meeting', 'Görüşme'], ['quoted', 'Teklif verildi'], ['won', 'Kazanıldı'], ['lost', 'Kaybedildi']];
const STAGE_IDS = LEAD_STAGES.map(s => s[0]), stageName = id => (LEAD_STAGES.find(s => s[0] === id) || [])[1] || id;
const SOURCES = ['Web sitesi', 'Başvuru formu', 'Ön değerlendirme', 'Tavsiye', 'Sosyal medya', 'Telefon / WhatsApp', 'Partner ağı', 'Diğer'];

// Firma görünümü (açık sayfalar için): ad, logo, renk. Gizli veri içermez.
async function firmBrand(db) {
  const T = currentTenant(); let co = {};
  try { co = parse((await first(db, "SELECT data FROM items WHERE id='config-company'"))?.data); } catch {}
  const logo = /^(https:\/\/|\/api\/admin\/asset\/)/.test(String(co.logoUrl || '')) ? co.logoUrl : '';
  return {name: co.brand || (T.isDefault ? 'Brazil Migration' : T.name) || '', logo, color: /^#[0-9a-fA-F]{6}$/.test(String(co.brandColor || '')) ? co.brandColor : ''};
}
const pushHist = (d, text, by, kind = 'note') => { d.history = [...(d.history || []), {at: now(), by: clean(by, 80) || 'Sistem', kind, text: clean(text, 600)}].slice(-100); };

// ---------------- Aday (lead) ----------------
const leadOut = r => { const d = parse(r.data); return {id: r.id, ...d, stage: STAGE_IDS.includes(d.stage) ? d.stage : 'new', updated: r.updated, created: r.created}; };
export async function upsertLead(db, f, by) {
  const email = clean(f.email, 254).toLowerCase(), phone = clean(f.phone, 40);
  const id = email ? 'lead-' + sha(email).slice(0, 24) : 'lead-m-' + uuid().slice(0, 12);
  const old = await get(db, id, 'lead'), d = old ? old.d : {email, at: now(), count: 0, stage: 'new', consent: !!f.consent, history: []};
  d.name = clean(f.name, 100) || d.name || ''; if (email) d.email = email; d.phone = phone || d.phone || '';
  d.service = clean(f.service, 60) || d.service || ''; d.country = clean(f.country, 60) || d.country || '';
  d.source = clean(f.source, 40) || d.source || 'Diğer'; d.count = (d.count || 0) + (old ? 1 : 0);
  if (f.note) d.message = clean(f.note, 2000);
  if (f.value !== undefined) d.value = Math.max(0, Math.round((Number(f.value) || 0) * 100));
  if (f.currency && CURRENCIES.includes(f.currency)) d.currency = f.currency;
  if (f.consent) { d.consent = true; d.consentText = clean(f.consentText, 300) || d.consentText || ''; }
  if (old && d.stage === 'lost' && f.reopen) { d.stage = 'new'; delete d.lostReason; }
  pushHist(d, old ? (f.historyText || 'Aday yeniden başvurdu / güncellendi.') : (f.historyText || 'Aday oluşturuldu.'), by, 'created');
  await put(db, id, 'lead', 'owner', d);
  return {id, created: !old, data: d};
}

// Başka modüllerin (partner ağı) adaya not düşmesi / aşamasını güncellemesi için.
export async function noteLead(db, id, text, by, stage) {
  const l = id ? await get(db, id, 'lead') : null; if (!l) return false;
  if (stage && STAGE_IDS.includes(stage) && stage !== (l.d.stage || 'new')) { pushHist(l.d, `Aşama: ${stageName(l.d.stage || 'new')} → ${stageName(stage)}`, by, 'stage'); l.d.stage = stage; }
  pushHist(l.d, text, by, 'note'); await put(db, l.id, 'lead', l.owner, l.d); return true;
}

// Açık başvuru formu: bot koruması (honeypot + süre + IP sınırı), onaylı rıza kaydı.
const rl = (globalThis.__bmSalesRl ??= new Map());
function limited(key, max, windowMs) {
  const t = now(), e = rl.get(key);
  if (!e || t - e.t > windowMs) { rl.set(key, {t, n: 1}); if (rl.size > 5000) for (const [k, v] of rl) if (t - v.t > windowMs) rl.delete(k); return false; }
  e.n++; return e.n > max;
}
// Varsayılan KAPALI: firma formu kendisi açıp bağlantısını paylaşana kadar açık bir giriş noktası yoktur.
const FORM_DEFAULT = {enabled: false, title: 'Ücretsiz ön görüşme talebi', intro: 'Formu doldurun; danışmanımız en kısa sürede sizinle iletişime geçsin.', services: SERVICES, consentText: 'Kişisel verilerimin başvurumu değerlendirmek ve benimle iletişime geçmek amacıyla işlenmesini kabul ediyorum.', thanks: 'Talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.', notifyEmail: '', askPhone: true, askCountry: true};
async function formConfig(db) { const r = await get(db, 'config-leadform'); return {...FORM_DEFAULT, ...(r ? r.d : {})}; }

// ---------------- Teklif ----------------
const cleanLines = lines => (Array.isArray(lines) ? lines : []).slice(0, 50).map(l => ({name: clean(l.name, 200), qty: Math.max(1, Math.min(10000, Math.round(Number(l.qty) || 1))), price: Math.max(0, Math.round((Number(l.price) || 0) * 100))})).filter(l => l.name);
function totals(lines, discount, tax) {
  const sub = lines.reduce((n, l) => n + l.qty * l.price, 0), after = Math.round(sub * (1 - discount / 100)), taxAmt = Math.round(after * tax / 100);
  return {sub, discountAmt: sub - after, taxAmt, amount: after + taxAmt};
}
const quoteLink = (req, q) => `${baseUrl(req)}/teklif/?q=${q.id}.${q.d.token}`, contractLink = (req, c) => `${baseUrl(req)}/teklif/?s=${c.id}.${c.d.token}`;
const effStatus = d => d.status === 'sent' && d.validUntil && d.validUntil < dayStr(now()) ? 'expired' : d.status;
const quoteOut = r => { const d = typeof r.d === 'object' ? r.d : parse(r.data); const {token: _t, ...rest} = d; return {id: r.id, ...rest, status: effStatus(d), hasLink: !!d.token, updated: r.updated}; };
async function nextNumber(db, kind, prefix) {
  const n = (await first(db, 'SELECT COUNT(*) AS n FROM items WHERE kind=?', kind))?.n || 0;
  return `${prefix}-${new Date().getUTCFullYear()}-${String(n + 1).padStart(3, '0')}`;
}
// Teklifteki taksit önerisinin gerçek takvimi (peşinat varsa ilk taksit olarak); tarih girilmediyse yalnız tutarlar.
const scheduleOf = (inst, amount) => (inst && inst.count >= 2 ? splitInstallments(amount, inst.count, inst.down || 0, inst.firstDue || '', inst.interval) : null);
function installmentText(inst, cur, amount) {
  const sch = scheduleOf(inst, amount); if (!sch) return 'Tek seferde ödeme.';
  return `${sch.length} taksit: ` + sch.map(x => `${x.n}) ${x.due ? x.due + ' — ' : ''}${money(x.amount, cur)}`).join('; ') + '.';
}
function cleanInst(i) {
  const count = Math.max(1, Math.min(36, Math.round(Number(i?.count) || 1)));
  return count < 2 ? null : {count, firstDue: validDate(String(i?.firstDue || '')) ? i.firstDue : '', interval: i?.interval === 'monthly' ? 'monthly' : Math.max(7, Math.min(120, Math.round(Number(i?.intervalDays) || 30))), down: Math.max(0, Math.round((Number(i?.down) || 0) * 100))};
}

// ---------------- Sözleşme ----------------
export const CONTRACT_VARS = [['ad', 'Müşterinin adı soyadı'], ['email', 'E-posta'], ['telefon', 'Telefon'], ['hizmet', 'Hizmet'], ['tutar', 'Toplam tutar'], ['para_birimi', 'Para birimi'], ['teklif_no', 'Teklif numarası'], ['teklif_kalemleri', 'Teklif kalemleri'], ['taksit_plani', 'Ödeme / taksit bilgisi'], ['firma', 'Firma adı'], ['tarih', 'Bugünün tarihi']];
const STARTER_CONTRACT = {name: 'Hizmet sözleşmesi (başlangıç taslağı)', body: `HİZMET SÖZLEŞMESİ

Taraflar
Hizmet veren: {{firma}}
Müşteri: {{ad}} ({{email}})

1. Konu
İşbu sözleşme, {{firma}} tarafından Müşteri'ye "{{hizmet}}" kapsamında danışmanlık ve başvuru takip hizmeti verilmesine ilişkindir. Teklif no: {{teklif_no}}.

2. Hizmet kapsamı
{{teklif_kalemleri}}

3. Ücret ve ödeme
Toplam hizmet bedeli {{tutar}}'dir. {{taksit_plani}}
Resmî harçlar, çeviri, apostil ve benzeri üçüncü kişi masrafları aksi yazılmadıkça bedele dahil değildir.

4. Müşterinin yükümlülükleri
Müşteri, istenen belgeleri eksiksiz, doğru ve zamanında sunacağını; verdiği bilgilerin doğruluğundan sorumlu olduğunu kabul eder.

5. Sonuç garantisi
Başvurunun sonucu ilgili resmî makamların takdirindedir. Firma, olumlu sonucu garanti etmez; süreci özenle ve mevzuata uygun yürütmeyi taahhüt eder.

6. Gizlilik ve kişisel veriler
Taraflar, süreç boyunca öğrendikleri bilgileri gizli tutar. Kişisel veriler yalnızca hizmetin ifası amacıyla ve ilgili veri koruma mevzuatına uygun işlenir.

7. Fesih
Taraflar yazılı bildirimle sözleşmeyi feshedebilir. Fesih tarihine kadar yapılmış işlerin bedeli ödenir.

8. Uyuşmazlık
Uyuşmazlıklarda öncelikle uzlaşma aranır; sonuç alınamazsa firmanın bulunduğu yerin mahkemeleri yetkilidir.

Tarih: {{tarih}}

Bu metin başlangıç taslağıdır; hukuki tavsiye değildir. Kullanmadan önce kendi avukatınıza inceletin ve ülkenizin mevzuatına göre düzenleyin.`};
async function ensureContractTpl(db) {
  if ((await first(db, "SELECT COUNT(*) AS n FROM items WHERE kind='contract_tpl'"))?.n) return;
  await put(db, 'cpl-starter', 'contract_tpl', 'site', {...STARTER_CONTRACT, builtin: true});
}
function renderBody(body, v) { return String(body || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k) => (k in v ? String(v[k]) : m)); }
const unresolved = text => [...new Set((String(text).match(/\{\{\s*[a-z_]+\s*\}\}/g) || []))];
const docHash = (title, body) => sha(String(title) + '\n' + String(body));
const contractOut = r => { const d = typeof r.d === 'object' ? r.d : parse(r.data); const {token: _t, ...rest} = d; return {id: r.id, ...rest, hasLink: !!d.token, updated: r.updated}; };
function quoteVars(q, firm) {
  const d = q.d, cur = d.currency;
  return {ad: d.name, email: d.email, telefon: d.phone || '', hizmet: d.service || d.title, tutar: money(d.amount, cur), para_birimi: cur, teklif_no: d.number, firma: firm,
    teklif_kalemleri: d.lines.map(l => `• ${l.name} — ${l.qty} × ${money(l.price, cur)}`).join('\n') + (d.discount ? `\nİndirim: %${d.discount}` : '') + (d.tax ? `\nKDV/vergi: %${d.tax}` : ''),
    taksit_plani: installmentText(d.installments, cur, d.amount), tarih: dayStr(now())};
}
async function makeContract(db, {tpl, quote, name, email, phone, title, leadId, customerId, by}) {
  const firm = firmName(), v = quote ? quoteVars(quote, firm) : {ad: name, email, telefon: phone || '', hizmet: title || '', tutar: '', para_birimi: '', teklif_no: '', teklif_kalemleri: '', taksit_plani: '', firma: firm, tarih: dayStr(now())};
  const body = renderBody(tpl.d.body, v), t = clean(title, 160) || tpl.d.name, id = 'ctr-' + uuid().slice(0, 16);
  const d = {number: await nextNumber(db, 'contract', 'S'), title: t, body, bodyHash: docHash(t, body), templateId: tpl.id, quoteId: quote?.id || '', leadId: leadId || quote?.d.leadId || '', customerId: customerId || quote?.d.customerId || '', name: clean(name, 100), email: clean(email, 254).toLowerCase(), phone: clean(phone, 40), status: 'draft', createdBy: clean(by, 80), created: now(), history: []};
  pushHist(d, 'Sözleşme taslağı oluşturuldu.', by, 'created');
  await put(db, id, 'contract', 'site', d);
  return {id, d};
}

// ---------------- Taksit planı ----------------
function addDays(dateStr, n) { return dayStr(Date.parse(dateStr + 'T00:00:00Z') + n * DAY); }
function addMonths(dateStr, n) { const [y, m, d] = dateStr.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + n, 1)), last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); return dayStr(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last))); }
export function splitInstallments(totalC, count, downC, firstDue, interval) {
  const rest = downC > 0 && count > 1 ? totalC - downC : totalC, n = downC > 0 && count > 1 ? count - 1 : count, base = Math.floor(rest / n);
  const amounts = Array.from({length: n}, () => base); amounts[n - 1] += rest - base * n;
  if (downC > 0 && count > 1) amounts.unshift(downC);
  return amounts.map((amount, i) => ({n: i + 1, amount, due: !firstDue ? '' : interval === 'monthly' ? addMonths(firstDue, i) : addDays(firstDue, i * (Number(interval) || 30))}));
}
async function createPlan(db, req, b, by) {
  const cid = clean(b.customerId, 80), p = await first(db, "SELECT id, name, email, role, advisor FROM people WHERE id=? AND role='customer'", cid);
  if (!p) fail(400, 'Ödeme planı için müşteriyi seçin.');
  const totalC = Math.round((Number(b.total) || 0) * 100); if (totalC < 100) fail(400, 'Toplam tutar en az 1,00 olmalı.');
  const count = Math.max(1, Math.min(36, Math.round(Number(b.count) || 1))), downC = Math.round((Number(b.down) || 0) * 100);
  if (downC < 0 || (count > 1 && downC >= totalC)) fail(400, 'Peşinat toplam tutardan küçük olmalı.');
  const firstDue = validDate(String(b.firstDue || '')) ? b.firstDue : dayStr(now() + 7 * DAY);
  const currency = CURRENCIES.includes(b.currency) ? b.currency : 'USD', title = clean(b.title, 140) || 'Hizmet bedeli', service = serviceKey(b.service);
  const interval = b.interval === 'monthly' ? 'monthly' : Math.max(7, Math.min(120, Math.round(Number(b.intervalDays) || 30)));
  const sched = splitInstallments(totalC, count, downC, firstDue, interval), split = splitFor(await loadSplits(db), service);
  const advisor = p.advisor && p.advisor !== 'owner' ? p.advisor : null, planId = 'pp-' + uuid().slice(0, 14), prefix = 'PL-' + planId.slice(3, 8).toUpperCase();
  const items = [], ops = [];
  for (const s of sched) {
    const invId = 'inv-' + uuid().slice(0, 16), label = sched.length > 1 ? `${title} · Taksit ${s.n}/${sched.length}` : title;
    items.push({...s, invoiceId: invId});
    ops.push(stmt(db, invId, 'invoice', p.id, {title: label, number: `${prefix}-${s.n}`, amount: s.amount, currency, status: 'Ödenmedi', issued: dayStr(now()), due: s.due, lines: [{name: label, qty: 1, price: s.amount}], discount: 0, notes: clean(b.notes, 500), advisor, service, split: {owner: split.owner, cost: split.cost, advisor: split.advisor}, rate: advisor ? split.advisor : 0, createdBy: 'plan', planId, installment: {n: s.n, of: sched.length}}));
  }
  const plan = {customerId: p.id, title, service, currency, total: totalC, count: sched.length, items, quoteId: clean(b.quoteId, 80), contractId: clean(b.contractId, 80), status: 'active', createdBy: clean(by, 80), created: now(), number: prefix};
  ops.push(stmt(db, planId, 'pay_plan', p.id, plan), stmt(db, uuid(), 'notice', p.id, {title: `Ödeme planınız oluşturuldu: ${title} (${sched.length} ödeme)`, link: 'finance', read: false}));
  await db.batch(ops);
  let mailed = false;
  if (b.notify && p.email) {
    const lines = items.map(i => `${i.n}. ${i.due} — ${money(i.amount, currency)}`).join('\n');
    const m = await mailTpl(db, {to: p.email, key: 'plan.created', vars: {title, name: p.name || '', total: money(totalC, currency), count: sched.length, lines}, link: baseUrl(req) + '/panel/#finance'});
    mailed = !!m.sent;
  }
  return {id: planId, number: prefix, mailed, items};
}

// Vade ifadesi müşterinin dilinde ("bugün", "3 gün içinde", "2 gün önce").
const WHEN = {tr: [n => 'bugün', n => `${n} gün içinde`, n => `${n} gün önce`], en: [() => 'today', n => `in ${n} days`, n => `${n} days ago`], pt: [() => 'hoje', n => `em ${n} dias`, n => `${n} dias atrás`], fa: [() => 'امروز', n => `تا ${n} روز دیگر`, n => `${n} روز پیش`]};
const whenLoc = (left, lang) => { const w = WHEN[lang] || WHEN.tr; return left === 0 ? w[0](0) : left > 0 ? w[1](left) : w[2](-left); };
const setLangSafe = async (db, email, lang) => { try { const {setLang} = await import('./comms.mjs'); await setLang(db, email, lang); } catch {} };

// ---------------- Hatırlatıcılar (yalnız taksit planı faturaları) ----------------
export async function runSalesReminders(db, nowMs = now()) {
  const st = await get(db, 'config-sales'); if (st && st.d.reminders === false) return 0;
  const today = Date.parse(dayStr(nowMs) + 'T00:00:00Z'), base = baseUrl(null);
  const list = await all(db, "SELECT id, owner, data FROM items WHERE kind='invoice' AND json_extract(data,'$.planId') IS NOT NULL AND json_extract(data,'$.status')='Ödenmedi' LIMIT 2000");
  let sent = 0;
  for (const r of list) {
    const d = parse(r.data); if (!validDate(String(d.due || ''))) continue;
    const left = Math.round((Date.parse(d.due + 'T00:00:00Z') - today) / DAY), rem = d.rem || {pre: 0, over: []};
    let kind = '';
    if (left >= 0 && left <= 3 && !rem.pre) kind = 'pre';
    else if (left < 0 && (!rem.over?.length || (rem.over.length < 3 && nowMs - rem.over[rem.over.length - 1] >= 7 * DAY))) kind = 'over';
    if (!kind) continue;
    const p = await first(db, 'SELECT id, name, email FROM people WHERE id=?', r.owner); if (!p) continue;
    const when = left === 0 ? 'bugün' : left > 0 ? `${left} gün içinde` : `${-left} gün önce`, amt = money(d.amount, d.currency);
    const title = kind === 'pre' ? `Ödeme hatırlatması: ${d.title}` : `Geciken ödeme: ${d.title}`;
    const text = kind === 'pre' ? `Merhaba ${p.name || ''}, "${d.title}" ödemeniz (${amt}) ${when} (${d.due}) vadesine ulaşıyor.` : `Merhaba ${p.name || ''}, "${d.title}" ödemenizin (${amt}) vadesi ${d.due} tarihinde dolmuştu (${when}). Henüz ödemeniz görünmüyor; yaptıysanız dekontu panelden yükleyebilirsiniz.`;
    try {
      await notice(db, p.id, text.replace(/^Merhaba [^,]*, /, ''), 'finance');
      if (p.email) await mailTpl(db, {to: p.email, key: kind === 'pre' ? 'installment.pre' : 'installment.over', vars: {title: d.title, name: p.name || '', amount: amt, due: d.due, when: whenLoc(left, await langOf(db, p.email))}, link: base ? base + '/panel/#finance' : undefined});
      if (kind === 'pre') rem.pre = nowMs; else { rem.over = [...(rem.over || []), nowMs]; if (rem.over.length === 1) await notice(db, 'owner', `Geciken taksit: ${p.name || p.email} · ${d.title}`, 'odemeplani'); }
      await put(db, r.id, 'invoice', r.owner, {...d, rem}); sent++;
    } catch (e) { console.error('[sales-reminder]', e.message); }
  }
  return sent;
}
export async function maybeRunSalesReminders(db) {
  const m = (globalThis.__bmSalesRem ??= new Map()), id = currentTenant().id;
  if (now() - (m.get(id) || 0) < 3 * 3600e3) return 0; m.set(id, now());
  return runSalesReminders(db);
}

// ---------------- Açık (kimliksiz) uçlar ----------------
// Teklif / sözleşme bağlantıları: "<id>.<gizli>" biçimli, tahmin edilemez anahtar. Yanıtlar yalnız o belgeyi gösterir.
async function byToken(db, t, kind, prefix) {
  const [id, secret] = String(t || '').split('.');
  if (!id || !id.startsWith(prefix) || !secret) fail(404, 'Bağlantı geçersiz veya süresi dolmuş.');
  const r = await get(db, id, kind); if (!r || !sameSecret(r.d.token, secret)) fail(404, 'Bağlantı geçersiz veya süresi dolmuş.');
  return r;
}
const ua = req => clean(req.headers.get('user-agent') || '', 200);
export async function salesPublic(req, db, route) {
  if (!route.startsWith('sales/')) return null;
  const url = new URL(req.url);
  if (route === 'sales/form' && req.method === 'GET') {
    const c = await formConfig(db); if (!c.enabled) return json({enabled: false});
    return json({enabled: true, title: c.title, intro: c.intro, services: c.services, consentText: c.consentText, askPhone: c.askPhone !== false, askCountry: c.askCountry !== false, firm: await firmBrand(db)});
  }
  if (route === 'sales/lead' && req.method === 'POST') {
    const b = await readBody(req), c = await formConfig(db); if (!c.enabled) fail(404, 'Form kapalı.');
    if (clean(b.website, 100)) return json({ok: true}); // honeypot: botlar gizli alanı doldurur
    if (now() - (Number(b.ts) || 0) < 2500) return json({ok: true}); // insan olamayacak kadar hızlı
    const ip = clientIp(req.headers); if (limited('lead:' + ip, 6, 3600e3)) fail(429, 'Çok fazla başvuru. Lütfen daha sonra tekrar deneyin.');
    const name = clean(b.name, 100), email = clean(b.email, 254).toLowerCase(), phone = clean(b.phone, 40);
    if (name.length < 2) fail(400, 'Adınızı yazın.');
    if (!validEmail(email)) fail(400, 'Geçerli bir e-posta adresi girin.');
    if (phone && phone.replace(/\D/g, '').length < 6) fail(400, 'Telefon numarası geçersiz görünüyor.');
    if (!b.consent) fail(400, 'Devam etmek için onay kutusunu işaretleyin.');
    const services = Array.isArray(c.services) && c.services.length ? c.services : SERVICES, service = services.includes(b.service) ? b.service : clean(b.service, 60);
    const r = await upsertLead(db, {name, email, phone, service, country: b.country, note: b.message, source: 'Başvuru formu', consent: true, consentText: c.consentText, historyText: 'Başvuru formundan geldi.'}, 'Form');
    if (r.created) await notice(db, 'owner', `Yeni başvuru: ${name}${service ? ' · ' + service : ''}`, 'adaylar');
    const brand = await firmBrand(db);
    if (validLang(b.lang)) await setLangSafe(db, email, b.lang);
    await mailTpl(db, {to: email, key: 'lead.thanks', hint: b.lang, vars: {first: name.split(' ')[0], firm: brand.name, thanks: c.thanks || FORM_DEFAULT.thanks}}).catch(() => {});
    if (c.notifyEmail && validEmail(c.notifyEmail) && r.created) await sendMail({to: c.notifyEmail, subject: `Yeni başvuru: ${name}`, text: `${name} (${email}${phone ? ', ' + phone : ''}) ${service ? '· ' + service : ''}\n${clean(b.message, 500)}`}).catch(() => {});
    return json({ok: true, message: c.thanks});
  }
  if (route === 'sales/quote' && req.method === 'GET') {
    const q = await byToken(db, url.searchParams.get('t'), 'quote', 'qt-'); if (q.d.status === 'draft') fail(404, 'Bağlantı geçersiz veya süresi dolmuş.');
    if (!q.d.viewedAt) { q.d.viewedAt = now(); pushHist(q.d, 'Müşteri teklifi görüntüledi.', 'Müşteri', 'view'); await put(db, q.id, 'quote', q.owner, q.d); await notice(db, 'owner', `Teklif görüntülendi: ${q.d.number} · ${q.d.name}`, 'teklifler'); }
    const d = q.d, contract = d.contractId ? await get(db, d.contractId, 'contract') : null;
    return json({number: d.number, title: d.title, name: d.name, currency: d.currency, lines: d.lines, sub: d.sub, discount: d.discount, tax: d.tax, amount: d.amount, validUntil: d.validUntil, notes: d.notes, installments: d.installments ? {schedule: scheduleOf(d.installments, d.amount), text: installmentText(d.installments, d.currency, d.amount)} : null, status: effStatus(d), decision: d.decision ? {by: d.decision.by, at: d.decision.at, result: d.decision.result} : null, contract: contract && contract.d.status !== 'void' ? {status: contract.d.status, url: `/teklif/?s=${contract.id}.${contract.d.token}`} : null, firm: await firmBrand(db)});
  }
  if (route === 'sales/quote/decide' && req.method === 'POST') {
    const b = await readBody(req), ip = clientIp(req.headers); if (limited('qd:' + ip, 30, 3600e3)) fail(429, 'Çok fazla deneme.');
    const q = await byToken(db, b.t, 'quote', 'qt-'), d = q.d;
    if (effStatus(d) === 'expired') fail(400, 'Bu teklifin geçerlilik süresi dolmuş. Lütfen firmayla iletişime geçin.');
    if (d.status !== 'sent') fail(409, d.status === 'accepted' ? 'Bu teklif zaten kabul edildi.' : d.status === 'rejected' ? 'Bu teklif reddedildi.' : 'Bu teklif şu anda yanıtlanamaz.');
    const result = b.decision === 'accept' ? 'accepted' : b.decision === 'reject' ? 'rejected' : fail(400, 'Geçersiz seçim.'), by = clean(b.name, 100);
    if (result === 'accepted' && (by.length < 2 || !b.agree)) fail(400, 'Kabul etmek için adınızı yazın ve onay kutusunu işaretleyin.');
    d.status = result; d.decision = {result, by: by || d.name, note: clean(b.note, 500), at: now(), ip, ua: ua(req)};
    pushHist(d, result === 'accepted' ? `Teklif kabul edildi (${d.decision.by}).` : 'Teklif reddedildi.' + (d.decision.note ? ' Not: ' + d.decision.note : ''), 'Müşteri', result);
    let contractUrl = null;
    if (result === 'accepted' && d.contractTpl && !d.contractId) {
      const tpl = await get(db, d.contractTpl, 'contract_tpl');
      if (tpl) { const c = await makeContract(db, {tpl, quote: q, name: d.name, email: d.email, phone: d.phone, by: 'Otomatik'}); c.d.token = token(); c.d.status = 'sent'; c.d.sentAt = now(); pushHist(c.d, 'Teklif kabulüyle otomatik gönderildi.', 'Sistem', 'sent'); await put(db, c.id, 'contract', 'site', c.d); d.contractId = c.id; contractUrl = `/teklif/?s=${c.id}.${c.d.token}`; }
    }
    await put(db, q.id, 'quote', q.owner, d);
    if (d.leadId) { const l = await get(db, d.leadId, 'lead'); if (l) { const ld = l.d; const to = result === 'accepted' ? 'won' : ld.stage; if (to !== ld.stage) { pushHist(ld, `Aşama: ${stageName(ld.stage)} → ${stageName(to)} (teklif kabulü)`, 'Sistem', 'stage'); ld.stage = to; } await put(db, l.id, 'lead', l.owner, ld); } }
    await notice(db, 'owner', `${result === 'accepted' ? 'Teklif kabul edildi' : 'Teklif reddedildi'}: ${d.number} · ${d.name}`, 'teklifler');
    return json({ok: true, status: result, contractUrl});
  }
  if (route === 'sales/contract' && req.method === 'GET') {
    const c = await byToken(db, url.searchParams.get('t'), 'contract', 'ctr-'); if (c.d.status === 'draft') fail(404, 'Bağlantı geçersiz veya süresi dolmuş.');
    const d = c.d;
    if (!d.viewedAt && d.status === 'sent') { d.viewedAt = now(); pushHist(d, 'Müşteri sözleşmeyi görüntüledi.', 'Müşteri', 'view'); await put(db, c.id, 'contract', c.owner, d); }
    return json({number: d.number, title: d.title, body: d.body, bodyHash: d.bodyHash, name: d.name, status: d.status, signature: d.signature ? {name: d.signature.name, method: d.signature.method, at: d.signature.at, seal: d.signature.seal, image: d.signature.image || ''} : null, firm: await firmBrand(db)});
  }
  if (route === 'sales/contract/sign' && req.method === 'POST') {
    const b = await readBody(req), ip = clientIp(req.headers); if (limited('cs:' + ip, 20, 3600e3)) fail(429, 'Çok fazla deneme.');
    const c = await byToken(db, b.t, 'contract', 'ctr-'), d = c.d;
    if (d.status === 'signed') fail(409, 'Bu sözleşme zaten imzalandı.'); if (d.status !== 'sent') fail(409, 'Bu sözleşme şu anda imzaya açık değil.');
    if (docHash(d.title, d.body) !== d.bodyHash) fail(409, 'Belge bütünlüğü doğrulanamadı. Lütfen firmayla iletişime geçin.');
    const name = clean(b.name, 100); if (name.length < 3) fail(400, 'Ad soyadınızı eksiksiz yazın.');
    if (!b.consent) fail(400, 'İmzalamak için sözleşmeyi okuyup kabul ettiğinizi onaylayın.');
    const method = b.method === 'drawn' ? 'drawn' : 'typed'; let image = '';
    if (method === 'drawn') { image = String(b.image || ''); if (!/^data:image\/png;base64,[A-Za-z0-9+/=]{100,}$/.test(image) || image.length > 90000) fail(400, 'Çizilen imza geçersiz veya çok büyük. Lütfen yeniden çizin.'); }
    const at = now(), consent = 'Sözleşme metnini okudum, anladım ve elektronik ortamda imzalamayı kabul ediyorum.';
    const seal = sha(JSON.stringify([d.bodyHash, name, d.email, at, ip, ua(req)]));
    d.status = 'signed'; d.signedAt = at; d.signature = {name, method, image, consent, at, ip, ua: ua(req), bodyHash: d.bodyHash, seal};
    pushHist(d, `Sözleşme imzalandı (${name}).`, 'Müşteri', 'signed'); await put(db, c.id, 'contract', c.owner, d);
    if (d.quoteId) { const q = await get(db, d.quoteId, 'quote'); if (q) { pushHist(q.d, 'Sözleşme imzalandı.', 'Müşteri', 'signed'); q.d.contractSigned = at; await put(db, q.id, 'quote', q.owner, q.d); } }
    await notice(db, 'owner', `Sözleşme imzalandı: ${d.number} · ${name}`, 'sozlesmeler');
    if (d.email) await sendMail({to: d.email, subject: `İmzalı sözleşmeniz: ${d.title}`, title: 'Sözleşmeniz imzalandı', text: `${d.title} (${d.number}) ${dayStr(at)} tarihinde ${name} tarafından elektronik olarak imzalandı.\nBelge özeti (SHA-256): ${d.bodyHash}\nİmza mührü: ${seal}\nBu bağlantıdan her zaman görüntüleyip yazdırabilirsiniz.`, link: `${baseUrl(req)}/teklif/?s=${c.id}.${d.token}`, button: 'Sözleşmeyi görüntüle'}).catch(() => {});
    return json({ok: true, seal, at});
  }
  return null;
}

// ---------------- Yönetim uçları ----------------
export async function salesAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('sales/')) return null;
  const {audit, actor, createCustomer} = ctx, url = new URL(req.url);
  const log = async (action, target) => { try { if (audit) await audit(db, actor, action, target).run(); } catch {} };
  const body = async () => (req.method === 'GET' ? {} : await readBody(req));

  // ----- aday panosu -----
  if (route === 'sales/leads' && req.method === 'GET') {
    const leads = (await all(db, "SELECT * FROM items WHERE kind='lead' ORDER BY updated DESC LIMIT 1500")).map(leadOut);
    return json({leads, stages: LEAD_STAGES.map(([id, name]) => ({id, name})), sources: SOURCES, services: SERVICES});
  }
  if (route === 'sales/summary' && req.method === 'GET') {
    const leads = (await all(db, "SELECT data FROM items WHERE kind='lead'")).map(r => parse(r.data)), by = {};
    for (const l of leads) { const s = STAGE_IDS.includes(l.stage) ? l.stage : 'new'; by[s] = (by[s] || 0) + 1; }
    const quotes = (await all(db, "SELECT data FROM items WHERE kind='quote'")).map(r => parse(r.data)), won = quotes.filter(q => q.status === 'accepted');
    const closed = (by.won || 0) + (by.lost || 0);
    return json({leads: leads.length, byStage: by, winRate: closed ? Math.round((by.won || 0) / closed * 100) : null, quotes: {total: quotes.length, sent: quotes.filter(q => q.status === 'sent').length, accepted: won.length, acceptedValue: won.reduce((n, q) => n + (q.amount || 0), 0)}});
  }
  if (route === 'sales/leads' && req.method === 'POST') {
    const b = await body(), name = clean(b.name, 100), email = clean(b.email, 254).toLowerCase(), phone = clean(b.phone, 40);
    if (name.length < 2) fail(400, 'Aday adını yazın.'); if (!email && !phone) fail(400, 'E-posta veya telefon girin.'); if (email && !validEmail(email)) fail(400, 'E-posta geçersiz.');
    const r = await upsertLead(db, {name, email, phone, service: b.service, country: b.country, note: b.note, source: SOURCES.includes(b.source) ? b.source : 'Diğer', value: b.value, currency: b.currency, historyText: 'Elle eklendi.'}, actor);
    await log('lead.create', r.id); return json({ok: true, id: r.id, existing: !r.created});
  }
  if (route === 'sales/leads/update' && req.method === 'POST') {
    const b = await body(), l = await get(db, clean(b.id, 80), 'lead'); if (!l) fail(404, 'Aday bulunamadı.');
    const d = l.d;
    if (b.stage !== undefined) { if (!STAGE_IDS.includes(b.stage)) fail(400, 'Geçersiz aşama.'); const cur = STAGE_IDS.includes(d.stage) ? d.stage : 'new'; if (b.stage !== cur) { pushHist(d, `Aşama: ${stageName(cur)} → ${stageName(b.stage)}`, actor, 'stage'); d.stage = b.stage; } if (b.stage === 'lost') d.lostReason = clean(b.lostReason, 300); else delete d.lostReason; }
    for (const [k, n] of [['name', 100], ['phone', 40], ['service', 60], ['country', 60], ['source', 40]]) if (b[k] !== undefined) d[k] = clean(b[k], n);
    if (b.email !== undefined && b.email && validEmail(clean(b.email, 254).toLowerCase())) d.email = clean(b.email, 254).toLowerCase();
    if (b.value !== undefined) d.value = Math.max(0, Math.round((Number(b.value) || 0) * 100)); if (CURRENCIES.includes(b.currency)) d.currency = b.currency;
    if (b.note && clean(b.note, 1000)) pushHist(d, clean(b.note, 1000), actor, 'note');
    await put(db, l.id, 'lead', l.owner, d); await log('lead.update', l.id); return json({ok: true});
  }
  if (route === 'sales/leads/delete' && req.method === 'POST') {
    const b = await body(), l = await get(db, clean(b.id, 80), 'lead'); if (!l) fail(404, 'Aday bulunamadı.');
    await del(db, l.id); await log('lead.delete', l.id); return json({ok: true});
  }
  if (route === 'sales/leads/convert' && req.method === 'POST') {
    const b = await body(), l = await get(db, clean(b.id, 80), 'lead'); if (!l) fail(404, 'Aday bulunamadı.');
    if (!l.d.email || !validEmail(l.d.email)) fail(400, 'Müşteri hesabı için adayın e-posta adresi gerekli.');
    if (!createCustomer) fail(500, 'Müşteri oluşturma kullanılamıyor.');
    const r = await createCustomer(db, req, {name: l.d.name || l.d.email, email: l.d.email, phone: l.d.phone, country: l.d.country});
    l.d.customerId = r.id; if (l.d.stage !== 'won') { pushHist(l.d, `Aşama: ${stageName(l.d.stage || 'new')} → Kazanıldı`, actor, 'stage'); l.d.stage = 'won'; }
    pushHist(l.d, r.existing ? 'Mevcut müşteri hesabıyla eşleştirildi.' : 'Müşteri hesabı oluşturuldu ve davet gönderildi.', actor, 'convert');
    await put(db, l.id, 'lead', l.owner, l.d); await log('lead.convert', l.id);
    return json({ok: true, customerId: r.id, existing: !!r.existing, mailSent: !!r.mailSent, devLink: r.devLink});
  }
  if (route === 'sales/form' && req.method === 'GET') return json({config: await formConfig(db), defaults: FORM_DEFAULT, link: baseUrl(req) + '/basvuru/'});
  if (route === 'sales/form' && req.method === 'POST') {
    const b = await body(), c = {enabled: b.enabled === true, title: clean(b.title, 120) || FORM_DEFAULT.title, intro: clean(b.intro, 500), services: (Array.isArray(b.services) ? b.services : []).map(s => clean(s, 60)).filter(Boolean).slice(0, 20), consentText: clean(b.consentText, 500) || FORM_DEFAULT.consentText, thanks: clean(b.thanks, 400) || FORM_DEFAULT.thanks, notifyEmail: validEmail(clean(b.notifyEmail, 254)) ? clean(b.notifyEmail, 254).toLowerCase() : '', askPhone: b.askPhone !== false, askCountry: b.askCountry !== false};
    if (!c.services.length) c.services = SERVICES;
    await put(db, 'config-leadform', 'config', 'owner', c); await log('leadform.save', ''); return json({ok: true, config: c});
  }

  // ----- teklifler -----
  if (route === 'sales/quotes' && req.method === 'GET') {
    await ensureContractTpl(db);
    const list = (await all(db, "SELECT * FROM items WHERE kind='quote' ORDER BY created DESC LIMIT 1000")).map(r => quoteOut({...r, d: parse(r.data)}));
    return json({quotes: list, templates: (await all(db, "SELECT id, data FROM items WHERE kind='contract_tpl' ORDER BY created")).map(r => ({id: r.id, name: parse(r.data).name})), currencies: CURRENCIES, services: SERVICES});
  }
  if (route === 'sales/quotes' && req.method === 'POST') {
    const b = await body(), old = b.id ? await get(db, clean(b.id, 80), 'quote') : null; if (b.id && !old) fail(404, 'Teklif bulunamadı.');
    if (old && old.d.status !== 'draft') fail(400, 'Gönderilmiş teklif düzenlenemez; geri çekip yeniden düzenleyin veya yeni teklif oluşturun.');
    const lines = cleanLines(b.lines); if (!lines.length) fail(400, 'En az bir kalem girin.');
    const name = clean(b.name, 100), email = clean(b.email, 254).toLowerCase(); if (name.length < 2) fail(400, 'Müşteri adını yazın.'); if (!validEmail(email)) fail(400, 'Geçerli bir e-posta girin.');
    const discount = Math.max(0, Math.min(100, Number(b.discount) || 0)), tax = Math.max(0, Math.min(100, Number(b.tax) || 0)), t = totals(lines, discount, tax);
    if (t.amount < 100) fail(400, 'Teklif tutarı en az 1,00 olmalı.');
    const days = Math.max(1, Math.min(180, Math.round(Number(b.validDays) || 14))), validUntil = validDate(String(b.validUntil || '')) ? b.validUntil : dayStr(now() + days * DAY);
    const inst = cleanInst(b.installments); if (inst && inst.down >= t.amount) fail(400, 'Peşinat toplam tutardan küçük olmalı.');
    const tplId = clean(b.contractTpl, 80); if (tplId && !(await get(db, tplId, 'contract_tpl'))) fail(400, 'Sözleşme şablonu bulunamadı.');
    const d = {...(old?.d || {number: await nextNumber(db, 'quote', 'T'), status: 'draft', created: now(), history: []}), title: clean(b.title, 160) || 'Hizmet teklifi', name, email, phone: clean(b.phone, 40), leadId: clean(b.leadId, 80) || old?.d.leadId || '', customerId: clean(b.customerId, 80) || old?.d.customerId || '', service: clean(b.service, 60), currency: CURRENCIES.includes(b.currency) ? b.currency : 'USD', lines, discount, tax, sub: t.sub, amount: t.amount, validUntil, notes: clean(b.notes, 2000), installments: inst, contractTpl: tplId};
    if (!old) pushHist(d, 'Teklif taslağı oluşturuldu.', actor, 'created');
    const id = old?.id || 'qt-' + uuid().slice(0, 16); await put(db, id, 'quote', 'site', d); await log('quote.save', id); return json({ok: true, id, number: d.number, amount: d.amount});
  }
  if (route === 'sales/quotes/send' && req.method === 'POST') {
    const b = await body(), q = await get(db, clean(b.id, 80), 'quote'); if (!q) fail(404, 'Teklif bulunamadı.');
    if (['accepted', 'rejected'].includes(q.d.status)) fail(400, 'Yanıtlanmış teklif yeniden gönderilemez.');
    if (!q.d.token) q.d.token = token(); q.d.status = 'sent'; q.d.sentAt = now(); if (effStatus(q.d) === 'expired') q.d.validUntil = dayStr(now() + 14 * DAY);
    pushHist(q.d, 'Teklif gönderildi.', actor, 'sent'); await put(db, q.id, 'quote', q.owner, q.d);
    if (q.d.leadId) { const l = await get(db, q.d.leadId, 'lead'); if (l && ['new', 'contacted', 'meeting'].includes(l.d.stage || 'new')) { pushHist(l.d, `Aşama: ${stageName(l.d.stage || 'new')} → Teklif verildi`, 'Sistem', 'stage'); l.d.stage = 'quoted'; await put(db, l.id, 'lead', l.owner, l.d); } }
    const link = quoteLink(req, q); let mailed = false;
    if (b.notify !== false) { const m = await mailTpl(db, {to: q.d.email, key: 'quote.ready', vars: {title: q.d.title, first: q.d.name.split(' ')[0], number: q.d.number, total: money(q.d.amount, q.d.currency), valid: q.d.validUntil}, link}); mailed = !!m.sent; }
    await log('quote.send', q.id); return json({ok: true, link, mailed});
  }
  if (route === 'sales/quotes/link' && req.method === 'GET') { const q = await get(db, clean(url.searchParams.get('id'), 80), 'quote'); if (!q || !q.d.token) fail(404, 'Teklif henüz gönderilmedi.'); return json({link: quoteLink(req, q)}); }
  if (route === 'sales/quotes/withdraw' && req.method === 'POST') {
    const b = await body(), q = await get(db, clean(b.id, 80), 'quote'); if (!q) fail(404, 'Teklif bulunamadı.'); if (q.d.status !== 'sent') fail(400, 'Yalnız gönderilmiş teklif geri çekilebilir.');
    q.d.status = 'draft'; delete q.d.token; pushHist(q.d, 'Teklif geri çekildi (bağlantı geçersiz).', actor, 'withdraw'); await put(db, q.id, 'quote', q.owner, q.d); return json({ok: true});
  }
  if (route === 'sales/quotes/delete' && req.method === 'POST') {
    const b = await body(), q = await get(db, clean(b.id, 80), 'quote'); if (!q) fail(404, 'Teklif bulunamadı.'); if (q.d.status === 'accepted') fail(400, 'Kabul edilmiş teklif silinemez.');
    await del(db, q.id); await log('quote.delete', q.id); return json({ok: true});
  }
  if (route === 'sales/quotes/contract' && req.method === 'POST') { // tekliften sözleşme taslağı
    const b = await body(), q = await get(db, clean(b.id, 80), 'quote'); if (!q) fail(404, 'Teklif bulunamadı.');
    await ensureContractTpl(db); const tpl = await get(db, clean(b.templateId, 80) || q.d.contractTpl || 'cpl-starter', 'contract_tpl'); if (!tpl) fail(400, 'Sözleşme şablonu seçin.');
    const c = await makeContract(db, {tpl, quote: q, name: q.d.name, email: q.d.email, phone: q.d.phone, by: actor}); q.d.contractId = c.id; await put(db, q.id, 'quote', q.owner, q.d);
    await log('contract.create', c.id); return json({ok: true, id: c.id, unresolved: unresolved(c.d.body)});
  }

  // ----- sözleşme şablonları ve sözleşmeler -----
  if (route === 'sales/contract-templates' && req.method === 'GET') { await ensureContractTpl(db); return json({templates: (await all(db, "SELECT * FROM items WHERE kind='contract_tpl' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data)})), vars: CONTRACT_VARS}); }
  if (route === 'sales/contract-templates' && req.method === 'POST') {
    const b = await body(), name = clean(b.name, 120), text = String(b.body || '').slice(0, 30000); if (!name) fail(400, 'Şablon adı gerekli.'); if (text.trim().length < 50) fail(400, 'Sözleşme metni çok kısa.');
    const id = b.id && String(b.id).startsWith('cpl-') ? clean(b.id, 80) : 'cpl-' + uuid().slice(0, 12), old = await get(db, id, 'contract_tpl');
    await put(db, id, 'contract_tpl', 'site', {name, body: text, ...(old?.d.builtin ? {builtin: true} : {})}); await log('contract.tpl.save', id); return json({ok: true, id});
  }
  if (route === 'sales/contract-templates/delete' && req.method === 'POST') { const b = await body(), t = await get(db, clean(b.id, 80), 'contract_tpl'); if (!t) fail(404, 'Şablon bulunamadı.'); await del(db, t.id); return json({ok: true}); }
  if (route === 'sales/contracts' && req.method === 'GET') return json({contracts: (await all(db, "SELECT * FROM items WHERE kind='contract' ORDER BY created DESC LIMIT 1000")).map(r => { const o = contractOut({...r, d: parse(r.data)}); return {...o, body: undefined, signature: o.signature ? {name: o.signature.name, method: o.signature.method, at: o.signature.at, seal: o.signature.seal} : null}; })});
  if (route === 'sales/contracts/get' && req.method === 'GET') {
    const c = await get(db, clean(url.searchParams.get('id'), 80), 'contract'); if (!c) fail(404, 'Sözleşme bulunamadı.');
    const o = contractOut(c); if (o.signature) o.signature = {...o.signature, image: o.signature.image ? '(çizilmiş imza kayıtlı)' : ''}; return json({contract: o, unresolved: unresolved(c.d.body), link: c.d.token ? contractLink(req, c) : ''});
  }
  if (route === 'sales/contracts/create' && req.method === 'POST') {
    const b = await body(); await ensureContractTpl(db); const tpl = await get(db, clean(b.templateId, 80), 'contract_tpl'); if (!tpl) fail(400, 'Sözleşme şablonu seçin.');
    const name = clean(b.name, 100), email = clean(b.email, 254).toLowerCase(); if (name.length < 2 || !validEmail(email)) fail(400, 'Ad ve geçerli e-posta gerekli.');
    const c = await makeContract(db, {tpl, name, email, phone: b.phone, title: b.title, leadId: clean(b.leadId, 80), customerId: clean(b.customerId, 80), by: actor});
    await log('contract.create', c.id); return json({ok: true, id: c.id, unresolved: unresolved(c.d.body)});
  }
  if (route === 'sales/contracts/update' && req.method === 'POST') {
    const b = await body(), c = await get(db, clean(b.id, 80), 'contract'); if (!c) fail(404, 'Sözleşme bulunamadı.'); if (c.d.status !== 'draft') fail(400, 'Gönderilmiş sözleşme değiştirilemez. İptal edip yeni sözleşme oluşturun.');
    const text = String(b.body ?? c.d.body).slice(0, 30000); if (text.trim().length < 50) fail(400, 'Sözleşme metni çok kısa.');
    c.d.title = clean(b.title, 160) || c.d.title; c.d.body = text; c.d.bodyHash = docHash(c.d.title, text); pushHist(c.d, 'Taslak düzenlendi.', actor, 'edit');
    await put(db, c.id, 'contract', c.owner, c.d); return json({ok: true, unresolved: unresolved(text)});
  }
  if (route === 'sales/contracts/send' && req.method === 'POST') {
    const b = await body(), c = await get(db, clean(b.id, 80), 'contract'); if (!c) fail(404, 'Sözleşme bulunamadı.');
    if (c.d.status === 'signed') fail(400, 'İmzalanmış sözleşme yeniden gönderilemez.'); if (c.d.status === 'void') fail(400, 'İptal edilmiş sözleşme gönderilemez.');
    const un = unresolved(c.d.body); if (un.length) fail(400, 'Metinde doldurulmamış alanlar var: ' + un.join(', ') + '. Taslağı düzenleyin.');
    if (!c.d.token) c.d.token = token(); c.d.status = 'sent'; c.d.sentAt = now(); pushHist(c.d, 'İmza için gönderildi.', actor, 'sent'); await put(db, c.id, 'contract', c.owner, c.d);
    const link = contractLink(req, c); let mailed = false;
    if (b.notify !== false) { const m = await mailTpl(db, {to: c.d.email, key: 'contract.sign', vars: {title: c.d.title, first: c.d.name.split(' ')[0], number: c.d.number}, link}); mailed = !!m.sent; }
    await log('contract.send', c.id); return json({ok: true, link, mailed});
  }
  if (route === 'sales/contracts/void' && req.method === 'POST') {
    const b = await body(), c = await get(db, clean(b.id, 80), 'contract'); if (!c) fail(404, 'Sözleşme bulunamadı.'); if (c.d.status === 'signed') fail(400, 'İmzalanmış sözleşme iptal edilemez; kaydı korunmalıdır.');
    c.d.status = 'void'; pushHist(c.d, 'Sözleşme iptal edildi.' + (b.reason ? ' ' + clean(b.reason, 200) : ''), actor, 'void'); await put(db, c.id, 'contract', c.owner, c.d); await log('contract.void', c.id); return json({ok: true});
  }
  if (route === 'sales/contracts/delete' && req.method === 'POST') {
    const b = await body(), c = await get(db, clean(b.id, 80), 'contract'); if (!c) fail(404, 'Sözleşme bulunamadı.'); if (c.d.status !== 'draft') fail(400, 'Yalnız taslak silinebilir; diğerlerini iptal edin.');
    await del(db, c.id); return json({ok: true});
  }

  // ----- ödeme / taksit planları -----
  if (route === 'sales/plans' && req.method === 'GET') {
    const plans = await all(db, "SELECT * FROM items WHERE kind='pay_plan' ORDER BY created DESC LIMIT 500");
    const inv = new Map((await all(db, "SELECT id, data FROM items WHERE kind='invoice' AND json_extract(data,'$.planId') IS NOT NULL LIMIT 5000")).map(r => [r.id, parse(r.data)]));
    const people = new Map((await all(db, "SELECT id, name, email FROM people WHERE role='customer'")).map(p => [p.id, p])), today = dayStr(now());
    const out = plans.map(r => {
      const d = parse(r.data), p = people.get(d.customerId) || {}, items = (d.items || []).map(i => { const v = inv.get(i.invoiceId); const status = v ? v.status : 'Silinmiş'; return {...i, status, overdue: status === 'Ödenmedi' && i.due < today, paidAt: v?.paidAt || null}; });
      const paid = items.filter(i => i.status === 'Ödendi').reduce((n, i) => n + i.amount, 0), overdue = items.filter(i => i.overdue);
      return {id: r.id, number: d.number, title: d.title, currency: d.currency, total: d.total, count: d.count, customer: {id: d.customerId, name: p.name || '—', email: p.email || ''}, status: d.status === 'cancelled' ? 'cancelled' : items.length && items.every(i => ['Ödendi', 'İptal'].includes(i.status)) ? 'completed' : 'active', paid, overdueCount: overdue.length, overdueAmount: overdue.reduce((n, i) => n + i.amount, 0), items, created: d.created};
    });
    return json({plans: out, settings: {reminders: (await get(db, 'config-sales'))?.d.reminders !== false}, currencies: CURRENCIES, services: SERVICES});
  }
  if (route === 'sales/plans/create' && req.method === 'POST') { const r = await createPlan(db, req, await body(), actor); await log('plan.create', r.id); return json({ok: true, ...r}); }
  if (route === 'sales/plans/cancel' && req.method === 'POST') {
    const b = await body(), p = await get(db, clean(b.id, 80), 'pay_plan'); if (!p) fail(404, 'Plan bulunamadı.'); let n = 0;
    for (const i of p.d.items || []) { const v = await get(db, i.invoiceId, 'invoice'); if (v && v.d.status === 'Ödenmedi') { await put(db, v.id, 'invoice', v.owner, {...v.d, status: 'İptal'}); n++; } }
    p.d.status = 'cancelled'; await put(db, p.id, 'pay_plan', p.owner, p.d); await log('plan.cancel', p.id); return json({ok: true, cancelled: n});
  }
  if (route === 'sales/settings' && req.method === 'POST') { const b = await body(); await put(db, 'config-sales', 'config', 'owner', {reminders: b.reminders !== false}); return json({ok: true}); }
  if (route === 'sales/customers' && req.method === 'GET') return json({customers: await all(db, "SELECT id, name, email FROM people WHERE role='customer' ORDER BY name LIMIT 2000")});
  return null;
}
