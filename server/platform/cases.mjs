// Dosya yönetimi (Faz 2): şablon kütüphanesi, aşama panosu, görev panosu, belge kontrol listesi,
// süre hatırlatıcıları ve müşteri zaman çizelgesi. Tüm veriler firmanın kendi veritabanındaki `items` tablosunda tutulur
// (case_template · case_state · case_task) — başka firmanın verisiyle karışmaz. Mevcut `application` kayıtları değişmeden kalır;
// yalnız aşama yol haritası (application.data.stages) ve kapanış durumu şablon aşamasıyla eşitlenir.
import {fail, clean, now, uuid, validEmail} from './auth.mjs';
import {sendMail} from './mail.mjs';
import {mailTpl} from './comms.mjs';
import {currentTenant, cfgEnv} from './tenant-context.mjs';

const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const first = (db, sql, ...a) => db.prepare(sql).bind(...a).first();
const put = (db, id, kind, owner, data) => db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').bind(id, kind, owner, JSON.stringify(data), now(), now()).run();
const del = (db, id) => db.prepare('DELETE FROM items WHERE id=?').bind(id).run();
const readBody = async req => { const t = await req.text(); if (t.length > 200000) fail(413, 'İstek çok büyük.'); try { return JSON.parse(t || '{}') || {}; } catch { fail(400, 'Geçersiz istek.'); } };
const notice = (db, owner, title, link) => put(db, uuid(), 'notice', owner, {title, link, read: false});
const DAY = 864e5;

export const SERVICES = ['Oturum İzni', 'Şirket Kurulum', 'Vergi Numarası', 'Vatandaşlık', 'Vize', 'Diğer'];
export const DOC_STATUS = ['bekleniyor', 'yuklendi', 'onaylandi', 'reddedildi', 'gerekmiyor'];
export const TASK_STATUS = ['todo', 'doing', 'done'];
const firmName = () => { const t = currentTenant(); return t.isDefault ? 'Brazil Migration' : (t.name || 'Danışmanlık firması'); };

// ---------------- Hazır şablonlar (Brezilya başlangıç paketi) ----------------
// Örnek içeriktir: firma kendi uygulamasına ve güncel mevzuata göre düzenler. Hukuki tavsiye değildir.
const ck = (name, required = true, hint = '') => ({name, required, hint});
const tk = (title, stage, dueDays) => ({title, stage, dueDays});
export const BUILTIN = [
  {key: 'oturum', name: 'Oturum izni (genel)', service: 'Oturum İzni', desc: 'Çalışma, yatırım veya emeklilik gibi genel oturum izni başvurusu için başlangıç şablonu.',
    stages: ['Başvuru alındı', 'Belgeler toplanıyor', 'Avukat incelemesi', 'Resmî başvuru yapıldı', 'Polícia Federal işlemleri', 'Süreç tamamlandı'],
    checklist: [ck('Pasaport (tüm sayfalar, geçerlilik süresi yeterli)', true, 'Renkli, okunaklı tarama'), ck('Adli sicil kaydı (apostilli)', true, 'Yeminli tercümesiyle birlikte'), ck('Doğum belgesi (apostilli)', true, 'Yeminli tercümesiyle birlikte'),
      ck('İkametgâh belgesi', true), ck('Biyometrik fotoğraf', true, 'Beyaz fon, yakın tarihli'), ck('CPF numarası', false, 'Yoksa danışman alır'), ck('Başvuru harcı dekontu (GRU)', true), ck('İmzalı hizmet sözleşmesi', true)],
    tasks: [tk('Belge listesini müşteriyle paylaş', 0, 1), tk('Gelen belgeleri kontrol et', 1, 7), tk('Avukat incelemesini tamamla', 2, 5), tk('Resmî başvuruyu yap ve protokol numarasını kaydet', 3, 3), tk('Polícia Federal randevusunu takip et', 4, 14)],
    deadlines: ['Pasaport geçerlilik bitişi', 'Polícia Federal randevusu', 'Oturum izni bitişi']},
  {key: 'aile', name: 'Aile birleşimi / união estável', service: 'Oturum İzni', desc: 'Brezilyalı eş veya partnerle aile birleşimi başvurusu.',
    stages: ['Başvuru alındı', 'Belgeler toplanıyor', 'Avukat incelemesi', 'Resmî başvuru yapıldı', 'Polícia Federal işlemleri', 'Süreç tamamlandı'],
    checklist: [ck('Başvuranın pasaportu', true), ck('Evlilik cüzdanı veya birliktelik beyanı (apostilli, tercümeli)', true), ck('Brezilyalı eşin kimlik ve CPF belgeleri', true), ck('Eşin vatandaşlık veya oturum kanıtı', true),
      ck('Adli sicil kaydı (apostilli)', true), ck('Doğum belgesi (apostilli)', true), ck('Ortak yaşam kanıtları (fatura, kira, fotoğraf)', false, 'Birliktelik başvurularında güçlendirir'), ck('Biyometrik fotoğraf', true), ck('Başvuru harcı dekontu (GRU)', true)],
    tasks: [tk('Belge listesini ve örnek beyanı paylaş', 0, 1), tk('Eşin belgelerini doğrula', 1, 7), tk('Avukat incelemesini tamamla', 2, 5), tk('Resmî başvuruyu yap', 3, 3)],
    deadlines: ['Pasaport geçerlilik bitişi', 'Polícia Federal randevusu', 'Oturum izni bitişi']},
  {key: 'vatandaslik', name: 'Vatandaşlık başvurusu', service: 'Vatandaşlık', desc: 'Doğal yoldan Brezilya vatandaşlığı (naturalização) için başlangıç şablonu.',
    stages: ['Başvuru alındı', 'Belgeler toplanıyor', 'Avukat incelemesi', 'Resmî başvuru yapıldı', 'Resmî değerlendirme', 'Süreç tamamlandı'],
    checklist: [ck('Pasaport', true), ck('Doğum belgesi (apostilli, tercümeli)', true), ck('Türkiye adli sicil kaydı (apostilli)', true), ck('Brezilya adli sicil belgeleri', true), ck('Geçerli oturum kartı (CRNM)', true),
      ck('İkamet süresi kanıtı', true), ck('Portekizce yeterlilik belgesi', true), ck('Fotoğraf', true), ck('İmzalı hizmet sözleşmesi', true)],
    tasks: [tk('Ön uygunluk kontrolü yap', 0, 2), tk('Eksik belgeleri takip et', 1, 10), tk('Avukat incelemesini tamamla', 2, 7), tk('Başvuru protokolünü kaydet ve müşteriye bildir', 3, 3)],
    deadlines: ['Pasaport geçerlilik bitişi', 'Oturum kartı bitişi', 'Dil sınavı / randevu tarihi']},
  {key: 'sirket', name: 'Şirket kurulumu (LTDA / MEI)', service: 'Şirket Kurulum', desc: 'Brezilya’da şirket kuruluşu ve vergi kayıtları.',
    stages: ['Başvuru alındı', 'Belgeler hazırlandı', 'Şirket türü ve unvan seçimi', 'Kuruluş başvurusu (Junta Comercial)', 'Vergi kaydı (CNPJ)', 'Belediye ve vergi kayıtları', 'Süreç tamamlandı'],
    checklist: [ck('Ortakların pasaport ve CPF belgeleri', true), ck('Brezilya adres kanıtı', true), ck('Unvan ve faaliyet kodu (CNAE) tercihleri', true), ck('Ortaklık yapısı ve sermaye bilgisi', true), ck('İmzalı vekâlet (procuração)', true), ck('Ticari adres / sanal ofis sözleşmesi', true), ck('Muhasebeci sözleşmesi', false)],
    tasks: [tk('Şirket türü ve ortaklık yapısını netleştir', 0, 3), tk('Unvan sorgusu yap', 2, 3), tk('Junta Comercial başvurusunu yap', 3, 5), tk('CNPJ kaydını takip et', 4, 7), tk('Belediye ve vergi kayıtlarını tamamla', 5, 14)],
    deadlines: ['Kuruluş başvurusu son tarihi', 'İlk vergi beyanı tarihi']},
  {key: 'cpf', name: 'Vergi numarası (CPF)', service: 'Vergi Numarası', desc: 'Bireysel CPF alma süreci.',
    stages: ['Başvuru alındı', 'Belgeler hazırlandı', 'CPF başvurusu yapıldı', 'CPF numarası alındı'],
    checklist: [ck('Pasaport kopyası', true), ck('Adres belgesi', true), ck('Anne adı ve doğum yeri bilgisi', true)],
    tasks: [tk('Başvuruyu yap', 1, 2), tk('CPF numarasını müşteriye ilet', 2, 5)], deadlines: []},
  {key: 'vize', name: 'Vize başvurusu', service: 'Vize', desc: 'Konsolosluk üzerinden vize başvurusu.',
    stages: ['Başvuru alındı', 'Belgeler hazırlandı', 'Form ve avukat incelemesi', 'Konsolosluk başvurusu', 'Süreç tamamlandı'],
    checklist: [ck('Pasaport', true), ck('Vize başvuru formu', true), ck('Biyometrik fotoğraf', true), ck('Seyahat ve konaklama planı', true), ck('Mali yeterlilik kanıtı', true), ck('Davet mektubu', false), ck('Konsolosluk ücreti dekontu', true)],
    tasks: [tk('Formu birlikte doldur', 0, 2), tk('Konsolosluk randevusunu al', 2, 5), tk('Sonucu takip et', 3, 14)],
    deadlines: ['Konsolosluk randevusu', 'Vize bitişi', 'Brezilya’ya giriş son tarihi']},
  {key: 'diger', name: 'Genel dosya', service: 'Diğer', desc: 'Özel bir hizmet için sade başlangıç şablonu.',
    stages: ['Başvuru alındı', 'İnceleme', 'İşlem yapılıyor', 'Süreç tamamlandı'],
    checklist: [ck('Kimlik / pasaport', true)], tasks: [tk('Talebi incele ve müşteriyi bilgilendir', 0, 2)], deadlines: []},
];

const short = () => uuid().slice(0, 8);
const tplFromBuiltin = b => ({name: b.name, service: b.service, desc: b.desc, builtin: b.key, stages: b.stages, checklist: b.checklist.map(c => ({id: short(), ...c})), tasks: b.tasks, deadlines: b.deadlines.map(label => ({id: short(), label}))});

export async function ensureTemplates(db, force = false) {
  const seeded = await first(db, "SELECT id FROM items WHERE id='config-case-seeded'");
  if (seeded && !force) return;
  const have = new Set((await all(db, "SELECT data FROM items WHERE kind='case_template'")).map(r => parse(r.data).builtin).filter(Boolean));
  for (const b of BUILTIN) if (!have.has(b.key)) await put(db, 'tpl-' + b.key, 'case_template', 'platform', tplFromBuiltin(b));
  await put(db, 'config-case-seeded', 'config', 'platform', {at: now()});
}

function cleanTemplate(b, old = {}) {
  const name = clean(b.name, 80); if (name.length < 2) fail(400, 'Şablon adı gerekli.');
  const service = SERVICES.includes(b.service) ? b.service : 'Diğer';
  const stages = (Array.isArray(b.stages) ? b.stages : []).map(s => clean(s, 60)).filter(Boolean).slice(0, 12);
  if (stages.length < 2) fail(400, 'En az iki aşama gerekli.');
  const keep = new Set((old.checklist || []).map(c => c.id));
  const checklist = (Array.isArray(b.checklist) ? b.checklist : []).slice(0, 40).map(c => ({id: clean(c.id, 12) && keep.has(c.id) ? c.id : short(), name: clean(c.name, 120), required: c.required !== false, hint: clean(c.hint, 200)})).filter(c => c.name);
  const tasks = (Array.isArray(b.tasks) ? b.tasks : []).slice(0, 40).map(t => ({title: clean(t.title, 140), stage: Math.max(0, Math.min(stages.length - 1, Math.round(Number(t.stage) || 0))), dueDays: Math.max(0, Math.min(365, Math.round(Number(t.dueDays) || 0)))})).filter(t => t.title);
  const deadlines = (Array.isArray(b.deadlines) ? b.deadlines : []).slice(0, 12).map(d => ({id: clean(d.id, 12) || short(), label: clean(typeof d === 'string' ? d : d.label, 100)})).filter(d => d.label);
  return {name, service, desc: clean(b.desc, 300), builtin: old.builtin, stages, checklist, tasks, deadlines};
}

// ---------------- Vaka durumu ----------------
const stageStates = (names, idx) => names.map((n, i) => ({n, s: idx >= names.length - 1 ? 'done' : i < idx ? 'done' : i === idx ? 'doing' : 'wait'}));
const pushEvent = (st, type, text, by, visible = true) => { (st.events ||= []).push({t: now(), type, text: clean(text, 300), by: clean(by, 60), visible}); if (st.events.length > 200) st.events.splice(0, st.events.length - 200); };
const progress = st => { const req = (st.checklist || []).filter(c => c.required && c.status !== 'gerekmiyor'); return {total: req.length, have: req.filter(c => c.status === 'yuklendi' || c.status === 'onaylandi').length, approved: req.filter(c => c.status === 'onaylandi').length, missing: req.filter(c => c.status === 'bekleniyor' || c.status === 'reddedildi').length}; };
const daysTo = (date, today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())) => Math.round((Date.parse(date + 'T00:00:00Z') - today) / DAY);
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const loadState = async (db, appId) => { const r = await first(db, 'SELECT * FROM items WHERE id=?', 'cs-' + appId); return r ? {row: r, st: parse(r.data)} : null; };
const saveState = (db, appId, owner, st) => put(db, 'cs-' + appId, 'case_state', owner, st);
async function appOf(db, id) { const r = await first(db, "SELECT * FROM items WHERE id=? AND kind='application'", clean(id, 80)); if (!r) fail(404, 'Başvuru bulunamadı.'); return {...r, d: parse(r.data)}; }

// Yol haritasını (müşteri panelinin okuduğu application.data.stages) şablon aşamasıyla eşitler.
// touchStatus: yalnız aşama taşımada kapanış durumunu günceller; "Aktif" (oturum kartı etkin) ve "Tamamlandı" durumları korunur.
async function syncApplication(db, app, st, touchStatus = true) {
  const d = {...app.d, stages: stageStates(st.stages, st.stage)};
  if (touchStatus) {
    const last = st.stage >= st.stages.length - 1;
    if (last) { if (d.status !== 'Aktif' && d.status !== 'Tamamlandı') d.status = 'Tamamlandı'; } else if (d.status === 'Tamamlandı') d.status = 'Aktif';
  }
  await put(db, app.id, 'application', app.owner, d);
}

// ---- Akıllı atama yardımcıları: mevcut ilerlemeyi tanır ----
const focusIdx = states => { const i = states.findIndex(s => s.s === 'doing'); if (i >= 0) return i; const w = states.findIndex(s => s.s === 'wait'); return w >= 0 ? w : Math.max(0, states.length - 1); };
// Elle düzenlenmiş aşama listesi (application.data.stages dolu ve en az 2 aşama) varsa döndürür.
const customStages = d => { if (!Array.isArray(d.stages)) return null; const c = d.stages.filter(x => x && clean(x.n, 60)).slice(0, 20).map(x => ({n: clean(x.n, 60), s: ['done', 'doing', 'wait'].includes(x.s) ? x.s : 'wait'})); return c.length >= 2 ? c : null; };
// Eski başvuru durumundan şablondaki başlangıç aşamasını bulur (müşteri panelinin eski varsayılanıyla uyumlu).
function startStage(names, status) {
  const last = names.length - 1, pick = (re, fb) => { const i = names.findIndex(n => re.test(n)); return i >= 0 ? i : fb; };
  if (status === 'Belgeler bekleniyor') return pick(/belge/i, Math.min(1, last));
  if (status === 'Avukatta') return pick(/avukat|inceleme/i, Math.min(2, last));
  if (status === 'Aktif' || status === 'Tamamlandı') return last;
  return /^Başvuru alındı/.test(names[0]) ? Math.min(1, last) : 0;
}
// Aşama listesi değişirken konumu korur: önce ad eşleşmesi, yoksa oransal konum.
function mapStage(fromNames, fromIdx, toNames) {
  const exact = toNames.findIndex(n => n.toLowerCase() === String(fromNames[fromIdx] || '').toLowerCase()); if (exact >= 0) return exact;
  if (fromNames.length < 2) return 0;
  return Math.max(0, Math.min(toNames.length - 1, Math.round(fromIdx / (fromNames.length - 1) * (toNames.length - 1))));
}

// keepStages (varsayılan açık): dosyada elle düzenlenmiş aşamalar varsa onlar korunur (müşterinin yol haritasına dokunulmaz);
// şablondan yalnız belge listesi, görevler ve süreler gelir. Kapalıysa şablonun aşamaları kullanılır, ilerleme eşlenir.
async function assign(db, app, tpl, by, {keepStages = true} = {}) {
  if (!tpl || !Array.isArray(tpl.stages)) fail(404, 'Şablon bulunamadı.');
  const old = await loadState(db, app.id), cs = old ? null : customStages(app.d), keep = !!(cs && keepStages);
  let names, stage;
  if (old) { names = tpl.stages.slice(); stage = mapStage(old.st.stages, old.st.stage, names); }
  else if (keep) { names = cs.map(x => x.n); stage = focusIdx(cs); }
  else if (cs) { names = tpl.stages.slice(); stage = mapStage(cs.map(x => x.n), focusIdx(cs), names); }
  else { names = tpl.stages.slice(); stage = startStage(names, app.d.status); }
  const prev = new Map((old?.st.checklist || []).map(c => [c.name, c]));
  const deadlines = [...(old?.st.deadlines || []), ...tpl.deadlines.filter(x => !(old?.st.deadlines || []).some(d => d.label === x.label)).map(x => ({id: x.id || short(), label: x.label, date: '', remind: [60, 30, 14, 7, 1], sent: {}}))];
  // Başvuruda kayıtlı geçerlilik/bitiş tarihi varsa ilgili süreye aktarılır
  if (validDate(String(app.d.expiry || ''))) { const dl = deadlines.find(x => !x.date && /bitiş/i.test(x.label) && /(oturum|vize|kart)/i.test(x.label)); if (dl) dl.date = app.d.expiry; }
  const st = {applicationId: app.id, templateId: tpl.id, templateName: tpl.name, stage, stages: names,
    checklist: tpl.checklist.map(c => ({...prev.get(c.name), id: c.id, name: c.name, required: c.required, hint: c.hint, status: prev.get(c.name)?.status || 'bekleniyor'})),
    deadlines, events: old?.st.events || []};
  pushEvent(st, 'assign', `Dosyanız “${tpl.name}” süreciyle takip edilmeye başlandı.${keep ? ' Mevcut aşamalarınız korundu.' : ''}`, by);
  if (cs && !keep) pushEvent(st, 'note', 'Önceki özel aşamalar: ' + cs.map(x => x.n).join(' → '), by, false);
  else if (old && JSON.stringify(old.st.stages) !== JSON.stringify(names)) pushEvent(st, 'note', 'Önceki aşamalar: ' + old.st.stages.join(' → '), by, false);
  await saveState(db, app.id, app.owner, st);
  if (!old) for (const t of tpl.tasks || []) await put(db, 'ct-' + uuid().slice(0, 12), 'case_task', app.owner, {caseId: app.id, title: t.title, status: 'todo', stage: Math.min(t.stage, names.length - 1), due: new Date(now() + (t.dueDays || 0) * DAY).toISOString().slice(0, 10), created: now()});
  if (!keep) await syncApplication(db, app, st, false);
  return st;
}

async function customerMap(db) { const m = new Map(); for (const p of await all(db, "SELECT id,name,email FROM people WHERE role='customer'")) m.set(p.id, p); return m; }
const nextDeadline = st => (st.deadlines || []).filter(d => d.date).map(d => ({label: d.label, date: d.date, days: daysTo(d.date)})).sort((a, b) => a.days - b.days).find(d => d.days >= -30) || null;

// ---------------- Yönetici uçları (/api/platform/admin/cases/...) ----------------
// Kalan gün ifadesi müşterinin dilinde.
const LEFT = {en: n => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`), pt: n => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`), fa: n => (n === 0 ? 'امروز' : n === 1 ? 'فردا' : `${n} روز دیگر`)};
export async function casesAdmin(req, db, route, {audit, actor} = {}) {
  if (!route.startsWith('cases/')) return null;
  const log = async (a, t) => { try { await audit?.(db, actor || 'Yönetici', a, t).run(); } catch {} };
  const get = req.method === 'GET', url = new URL(req.url);
  await ensureTemplates(db);

  if (route === 'cases/templates' && get) {
    const list = (await all(db, "SELECT id,data,updated FROM items WHERE kind='case_template' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data), updated: r.updated}));
    return json({templates: list, services: SERVICES, builtin: BUILTIN.map(b => ({key: b.key, name: b.name}))});
  }
  if (route === 'cases/templates' && req.method === 'POST') {
    const b = await readBody(req); let old = {}, id = clean(b.id, 40);
    if (id) { const r = await first(db, "SELECT data FROM items WHERE id=? AND kind='case_template'", id); if (!r) fail(404, 'Şablon bulunamadı.'); old = parse(r.data); } else id = 'tpl-' + short();
    const data = cleanTemplate(b, old); await put(db, id, 'case_template', 'platform', data); await log('case.template.save', id);
    return json({ok: true, id});
  }
  if (route === 'cases/templates/delete' && req.method === 'POST') {
    const b = await readBody(req), id = clean(b.id, 40);
    if (await first(db, "SELECT id FROM items WHERE kind='case_state' AND json_extract(data,'$.templateId')=? LIMIT 1", id)) fail(409, 'Bu şablonu kullanan dosyalar var; önce onları başka şablona taşıyın.');
    await del(db, id); await log('case.template.delete', id); return json({ok: true});
  }
  if (route === 'cases/templates/restore' && req.method === 'POST') { await ensureTemplates(db, true); return json({ok: true}); }

  if (route === 'cases/board' && get) {
    const templates = (await all(db, "SELECT id,data FROM items WHERE kind='case_template' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data)}));
    const people = await customerMap(db);
    const states = new Map((await all(db, "SELECT data FROM items WHERE kind='case_state'")).map(r => { const s = parse(r.data); return [s.applicationId, s]; }));
    const openTasks = new Map(); for (const t of await all(db, "SELECT data FROM items WHERE kind='case_task'")) { const d = parse(t.data); if (d.status !== 'done') openTasks.set(d.caseId, (openTasks.get(d.caseId) || 0) + 1); }
    const cases = [], unassigned = [];
    for (const a of await all(db, "SELECT id,owner,data,created FROM items WHERE kind='application' ORDER BY created DESC")) {
      const d = parse(a.data), c = people.get(a.owner) || {name: '—', email: ''}, st = states.get(a.id);
      const base = {applicationId: a.id, customerId: a.owner, customer: c.name, email: c.email, service: d.service, status: d.status, created: a.created};
      if (!st) { unassigned.push(base); continue; }
      cases.push({...base, templateId: st.templateId, templateName: st.templateName, stage: st.stage, stages: st.stages, progress: progress(st), next: nextDeadline(st), tasks: openTasks.get(a.id) || 0});
    }
    return json({templates, cases, unassigned});
  }
  if (route === 'cases/assign' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId);
    const r = await first(db, "SELECT id,data FROM items WHERE id=? AND kind='case_template'", clean(b.templateId, 40)); if (!r) fail(404, 'Şablon bulunamadı.');
    await assign(db, app, {id: r.id, ...parse(r.data)}, actor || 'Yönetici', {keepStages: b.keepStages !== false}); await log('case.assign', app.id); return json({ok: true});
  }
  if (route === 'cases/auto' && req.method === 'POST') {
    const tpls = (await all(db, "SELECT id,data FROM items WHERE kind='case_template' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data)}));
    const have = new Set((await all(db, "SELECT data FROM items WHERE kind='case_state'")).map(r => parse(r.data).applicationId)); let n = 0;
    for (const a of await all(db, "SELECT id,owner,data FROM items WHERE kind='application'")) {
      if (have.has(a.id)) continue; const d = parse(a.data), t = tpls.find(x => x.service === d.service) || tpls.find(x => x.service === 'Diğer'); if (!t) continue;
      await assign(db, {...a, d}, t, actor || 'Yönetici'); n++;
    }
    await log('case.auto', String(n)); return json({ok: true, assigned: n});
  }
  if (route === 'cases/move' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId), cur = await loadState(db, app.id); if (!cur) fail(404, 'Bu dosya henüz bir şablona atanmadı.');
    const st = cur.st, idx = Math.round(Number(b.stage)); if (!Number.isInteger(idx) || idx < 0 || idx >= st.stages.length) fail(400, 'Aşama geçersiz.');
    if (idx !== st.stage) {
      st.stage = idx; pushEvent(st, 'stage', `Aşama: ${st.stages[idx]}`, actor || 'Yönetici');
      await saveState(db, app.id, app.owner, st); await syncApplication(db, app, st);
      await notice(db, app.owner, `Dosyanız yeni aşamada: ${st.stages[idx]}`, 'services'); await log('case.move', app.id);
    }
    return json({ok: true});
  }
  if (route === 'cases/case' && get) {
    const app = await appOf(db, url.searchParams.get('id')), cur = await loadState(db, app.id);
    const c = await first(db, "SELECT id,name,email FROM people WHERE id=?", app.owner) || {name: '—'};
    const docs = (await all(db, "SELECT id,data,created FROM items WHERE kind='document' AND owner=? ORDER BY created DESC", app.owner)).map(r => { const d = parse(r.data); return {id: r.id, title: d.title || d.name || 'Belge', name: d.name, direction: d.direction, created: r.created}; });
    const tasks = (await all(db, "SELECT id,data FROM items WHERE kind='case_task' AND owner=?", app.owner)).map(r => ({id: r.id, ...parse(r.data)})).filter(t => t.caseId === app.id);
    return json({application: {id: app.id, service: app.d.service, from: app.d.from, to: app.d.to, status: app.d.status}, customer: c, state: cur?.st || null, progress: cur ? progress(cur.st) : null, documents: docs, tasks});
  }
  if (route === 'cases/checklist' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId), cur = await loadState(db, app.id); if (!cur) fail(404, 'Dosya şablona atanmadı.');
    const it = cur.st.checklist.find(c => c.id === clean(b.itemId, 12)); if (!it) fail(404, 'Kalem bulunamadı.');
    const before = it.status;
    if (b.status !== undefined) { if (!DOC_STATUS.includes(b.status)) fail(400, 'Durum geçersiz.'); it.status = b.status; }
    if (b.documentId !== undefined) {
      if (b.documentId) { const d = await first(db, "SELECT id FROM items WHERE id=? AND kind='document' AND owner=?", clean(b.documentId, 80), app.owner); if (!d) fail(404, 'Belge bulunamadı.'); it.documentId = d.id; if (b.status === undefined && (it.status === 'bekleniyor' || it.status === 'reddedildi')) it.status = 'yuklendi'; } else delete it.documentId;
    }
    if (b.note !== undefined) it.note = clean(b.note, 300);
    it.updated = now();
    if (it.status !== before) {
      const label = {onaylandi: 'onaylandı', reddedildi: 'için yeniden belge istendi', yuklendi: 'alındı', bekleniyor: 'bekleniyor', gerekmiyor: 'bu dosya için gerekmiyor'}[it.status];
      pushEvent(cur.st, 'doc', `${it.name}: ${label}${it.status === 'reddedildi' && it.note ? ' — ' + it.note : ''}`, actor || 'Yönetici');
      if (['onaylandi', 'reddedildi'].includes(it.status)) await notice(db, app.owner, it.status === 'onaylandi' ? `“${it.name}” belgeniz onaylandı.` : `“${it.name}” için yeni belge gerekiyor${it.note ? ': ' + it.note : '.'}`, 'services');
    }
    await saveState(db, app.id, app.owner, cur.st); await log('case.checklist', app.id); return json({ok: true, progress: progress(cur.st)});
  }
  if (route === 'cases/checklist/add' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId), cur = await loadState(db, app.id); if (!cur) fail(404, 'Dosya şablona atanmadı.');
    const name = clean(b.name, 120); if (!name) fail(400, 'Kalem adı gerekli.'); if (cur.st.checklist.length >= 60) fail(400, 'En fazla 60 kalem.');
    cur.st.checklist.push({id: short(), name, required: b.required !== false, hint: clean(b.hint, 200), status: 'bekleniyor'});
    pushEvent(cur.st, 'doc', `Yeni belge istendi: ${name}`, actor || 'Yönetici'); await saveState(db, app.id, app.owner, cur.st);
    await notice(db, app.owner, `Dosyanız için yeni bir belge isteniyor: ${name}`, 'services'); return json({ok: true});
  }
  if (route === 'cases/checklist/remove' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId), cur = await loadState(db, app.id); if (!cur) fail(404, 'Dosya şablona atanmadı.');
    cur.st.checklist = cur.st.checklist.filter(c => c.id !== clean(b.itemId, 12)); await saveState(db, app.id, app.owner, cur.st); return json({ok: true});
  }
  if (route === 'cases/deadline' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId), cur = await loadState(db, app.id); if (!cur) fail(404, 'Dosya şablona atanmadı.');
    const label = clean(b.label, 100); if (!label) fail(400, 'Süre adı gerekli.');
    const date = clean(b.date, 10); if (date && !validDate(date)) fail(400, 'Tarih geçersiz.');
    const remind = (Array.isArray(b.remind) ? b.remind : [60, 30, 14, 7, 1]).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 365).slice(0, 8);
    let d = b.id ? cur.st.deadlines.find(x => x.id === clean(b.id, 12)) : null;
    if (d) { if (d.date !== date) d.sent = {}; d.label = label; d.date = date; d.remind = remind; } else cur.st.deadlines.push(d = {id: short(), label, date, remind, sent: {}});
    if (date) pushEvent(cur.st, 'deadline', `${label}: ${date.split('-').reverse().join('.')}`, actor || 'Yönetici');
    await saveState(db, app.id, app.owner, cur.st); return json({ok: true});
  }
  if (route === 'cases/deadline/delete' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId), cur = await loadState(db, app.id); if (!cur) fail(404, 'Dosya şablona atanmadı.');
    cur.st.deadlines = cur.st.deadlines.filter(d => d.id !== clean(b.id, 12)); await saveState(db, app.id, app.owner, cur.st); return json({ok: true});
  }
  if (route === 'cases/event' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId), cur = await loadState(db, app.id); if (!cur) fail(404, 'Dosya şablona atanmadı.');
    const text = clean(b.text, 300); if (!text) fail(400, 'Not boş olamaz.');
    pushEvent(cur.st, 'note', text, actor || 'Yönetici', b.visible === true); await saveState(db, app.id, app.owner, cur.st);
    if (b.visible === true) await notice(db, app.owner, 'Dosyanıza yeni bir not eklendi.', 'services'); return json({ok: true});
  }
  if (route === 'cases/deadlines' && get) {
    const people = await customerMap(db), apps = new Map((await all(db, "SELECT id,data FROM items WHERE kind='application'")).map(a => [a.id, parse(a.data)])), out = [];
    for (const r of await all(db, "SELECT owner,data FROM items WHERE kind='case_state'")) { const st = parse(r.data), a = apps.get(st.applicationId);
      for (const d of st.deadlines || []) if (d.date) out.push({applicationId: st.applicationId, customer: people.get(r.owner)?.name || '—', service: a?.service || '', label: d.label, date: d.date, days: daysTo(d.date)}); }
    out.sort((a, b) => a.days - b.days); return json({deadlines: out});
  }
  if (route === 'cases/tasks' && get) {
    const people = await customerMap(db), apps = new Map((await all(db, "SELECT id,data FROM items WHERE kind='application'")).map(a => [a.id, parse(a.data)]));
    const tasks = (await all(db, "SELECT id,owner,data FROM items WHERE kind='case_task' ORDER BY created DESC")).map(r => { const d = parse(r.data); return {id: r.id, ...d, customer: people.get(r.owner)?.name || '—', service: apps.get(d.caseId)?.service || ''}; });
    return json({tasks, cases: (await all(db, "SELECT id,owner,data FROM items WHERE kind='application' ORDER BY created DESC")).map(a => ({id: a.id, label: `${people.get(a.owner)?.name || '—'} · ${parse(a.data).service}`}))});
  }
  if (route === 'cases/tasks' && req.method === 'POST') {
    const b = await readBody(req), title = clean(b.title, 140); let id = clean(b.id, 40), d = {};
    if (id) { const r = await first(db, "SELECT owner,data FROM items WHERE id=? AND kind='case_task'", id); if (!r) fail(404, 'Görev bulunamadı.'); d = {...parse(r.data), _owner: r.owner}; }
    if (!id && !title) fail(400, 'Görev başlığı gerekli.');
    if (title) d.title = title;
    if (b.status !== undefined) { if (!TASK_STATUS.includes(b.status)) fail(400, 'Durum geçersiz.'); d.status = b.status; }
    if (b.due !== undefined) { const due = clean(b.due, 10); if (due && !validDate(due)) fail(400, 'Tarih geçersiz.'); d.due = due; }
    if (!id) { let owner = 'owner'; if (b.caseId) { const app = await appOf(db, b.caseId); d.caseId = app.id; owner = app.owner; } d.status ||= 'todo'; d.created = now(); id = 'ct-' + short(); await put(db, id, 'case_task', owner, d); }
    else { const owner = d._owner; delete d._owner; await put(db, id, 'case_task', owner, d); }
    return json({ok: true, id});
  }
  if (route === 'cases/tasks/delete' && req.method === 'POST') { const b = await readBody(req); await del(db, clean(b.id, 40)); return json({ok: true}); }
  fail(404, 'İşlem bulunamadı.');
}

// ---------------- Müşteri uçları (/api/platform/case/...) ----------------
export async function casesCustomer(req, db, route, person) {
  if (!route.startsWith('case/')) return null;
  if (!person || person.role !== 'customer') { if (route === 'case/mine') return json({cases: []}); fail(403, 'Yalnız müşteriler için.'); }
  if (route === 'case/mine' && req.method === 'GET') {
    const out = [];
    for (const a of await all(db, "SELECT id,data,created FROM items WHERE kind='application' AND owner=? ORDER BY created DESC", person.id)) {
      const cur = await loadState(db, a.id); if (!cur) continue; const d = parse(a.data), st = cur.st;
      out.push({applicationId: a.id, service: d.service, from: d.from, to: d.to, status: d.status, templateName: st.templateName, stage: st.stage, stages: stageStates(st.stages, st.stage), progress: progress(st),
        checklist: st.checklist.map(c => ({id: c.id, name: c.name, required: c.required, hint: c.hint, status: c.status, note: c.status === 'reddedildi' ? c.note || '' : ''})),
        deadlines: (st.deadlines || []).filter(x => x.date).map(x => ({id: x.id, label: x.label, date: x.date, days: daysTo(x.date)})).sort((x, y) => x.days - y.days),
        events: (st.events || []).filter(e => e.visible).slice(-30).reverse().map(e => ({t: e.t, type: e.type, text: e.text}))});
    }
    return json({cases: out, firm: firmName()});
  }
  if (route === 'case/attach' && req.method === 'POST') {
    const b = await readBody(req), app = await appOf(db, b.applicationId); if (app.owner !== person.id) fail(403, 'Bu dosyaya erişiminiz yok.');
    const cur = await loadState(db, app.id); if (!cur) fail(404, 'Dosya bulunamadı.');
    const it = cur.st.checklist.find(c => c.id === clean(b.itemId, 12)); if (!it || it.status === 'gerekmiyor') fail(404, 'Kalem bulunamadı.');
    const doc = await first(db, "SELECT id FROM items WHERE id=? AND kind='document' AND owner=?", clean(b.documentId, 80), person.id); if (!doc) fail(404, 'Belge bulunamadı.');
    it.documentId = doc.id; it.status = 'yuklendi'; it.updated = now(); pushEvent(cur.st, 'doc', `${it.name}: belge yüklendi`, person.name);
    await saveState(db, app.id, app.owner, cur.st);
    await notice(db, app.d.advisor || 'owner', `Müşteriniz kontrol listesindeki belgeyi yükledi: ${it.name}`, 'documents');
    if ((app.d.advisor || 'owner') !== 'owner') await notice(db, 'owner', `${person.name}: ${it.name} yüklendi.`, 'documents');
    return json({ok: true, progress: progress(cur.st)});
  }
  fail(404, 'İşlem bulunamadı.');
}

// ---------------- Süre hatırlatıcıları ----------------
// Her süre için eşik günlerinde (varsayılan 60/30/14/7/1) bir kez müşteriye e-posta + panel bildirimi, firmaya panel bildirimi.
// Geç eklenen sürelerde aşılmış eşikler tek mesajda birleşir; süresi geçen için firmaya bir kez uyarı gider.
export async function runCaseReminders(db, nowMs = Date.now()) {
  const d0 = new Date(nowMs), today = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate());
  let sent = 0;
  for (const row of await all(db, "SELECT id,owner,data FROM items WHERE kind='case_state'")) {
    const st = parse(row.data); let changed = false, cust = null, app = null;
    for (const d of st.deadlines || []) {
      if (!d.date || !validDate(d.date)) continue;
      const days = daysTo(d.date, today); d.sent ||= {};
      if (days < 0) {
        if (!d.sent.over) { d.sent.over = nowMs; changed = true; app ||= parse((await first(db, 'SELECT data FROM items WHERE id=?', st.applicationId))?.data); cust ||= await first(db, 'SELECT id,name,email FROM people WHERE id=?', row.owner);
          await notice(db, app.advisor || 'owner', `Süre geçti: ${cust?.name || 'Müşteri'} · ${d.label} (${d.date.split('-').reverse().join('.')})`, 'applications'); sent++; }
        continue;
      }
      const due = (d.remind || []).filter(T => days <= T && !d.sent[T]); if (!due.length) continue;
      for (const T of (d.remind || []).filter(T => days <= T)) d.sent[T] = nowMs; changed = true;
      app ||= parse((await first(db, 'SELECT data FROM items WHERE id=?', st.applicationId))?.data); cust ||= await first(db, 'SELECT id,name,email FROM people WHERE id=?', row.owner);
      const when = d.date.split('-').reverse().join('.'), left = days === 0 ? 'bugün' : days === 1 ? 'yarın' : `${days} gün sonra`, title = `${d.label}: ${left}`;
      await notice(db, row.owner, `${title} (${when})`, 'services'); await notice(db, app.advisor || 'owner', `${cust?.name || 'Müşteri'} · ${title}`, 'applications');
      if (cust?.email && validEmail(cust.email)) {
        const base = (cfgEnv('SITE_URL') || '').replace(/\/$/, '');
        try { await mailTpl(db, {to: cust.email, key: 'case.deadline', vars: lg => ({firm: firmName(), label: d.label, first: String(cust.name || '').split(' ')[0], service: app.service || '', when, left: LEFT[lg] ? LEFT[lg](days) : left}), link: base ? base + '/panel/#services' : undefined}); } catch (e) { console.error('[case-reminder]', e.message); }
      }
      sent++;
    }
    if (changed) await put(db, row.id, 'case_state', row.owner, st);
  }
  return sent;
}
// Dakikalık zamanlayıcıdan çağrılır; firma başına en çok 3 saatte bir çalışır.
export async function maybeRunCaseReminders(db) {
  const id = currentTenant().id, last = (globalThis.__bmCaseRem ??= new Map()); const t = Date.now();
  if (t - (last.get(id) || 0) < 3 * 3600e3) return 0; last.set(id, t);
  return runCaseReminders(db, t);
}
