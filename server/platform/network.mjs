// Partner ağı (Faz 3): firmalar arası aday yönlendirme. Ortak veri yalnız platformun ana veritabanındaki iki ayrı tabloda tutulur
// (net_profile: isteyen firmanın dizin kaydı · net_ref: yönlendirmeler); firmaların kendi veritabanları birbirine hiç açılmaz.
//  • Dizine girmek isteğe bağlıdır (varsayılan: gizli). Dizinde yalnız firma adı, ülke/hizmet/dil ve kısa tanıtım görünür — iletişim e-postası görünmez.
//  • Yönlendirme için müşterinin rızası şarttır (kim, ne zaman onayladı kaydedilir). Alıcı firma, kabul edene kadar yalnız adın baş harfini,
//    ülkeyi ve hizmeti görür; e-posta/telefon kabulden sonra açılır. Reddedilen/geri çekilen yönlendirmede iletişim bilgisi silinir.
//  • Gelir payı yalnız KAYIT içindir (bilgilendirme); platform para tahsil etmez veya dağıtmaz.
//  • Her sorgu yalnız çağıran firmanın kimliğiyle (gönderen ya da alıcı) filtrelenir; kimlik istekten değil, çözümlenen firmadan gelir.
import {fail, clean, now, uuid, validEmail} from './auth.mjs';
import {sendMail} from './mail.mjs';
import {currentTenant} from './tenant-context.mjs';
import {getMainDatabase} from './db.mjs';
import {SERVICES} from './cases.mjs';
import {upsertLead, noteLead} from './sales.mjs';

const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
const readBody = async req => { const t = await req.text(); if (t.length > 100000) fail(413, 'İstek çok büyük.'); try { return JSON.parse(t || '{}') || {}; } catch { fail(400, 'Geçersiz istek.'); } };
const me = () => { const t = currentTenant(); return t.isDefault ? 'main' : t.id; };
const myName = () => { const t = currentTenant(); return t.isDefault ? 'Brazil Migration' : (t.name || 'Danışmanlık firması'); };

let ready = null;
async function netDb() {
  const db = getMainDatabase(); await db.ready();
  ready ??= db.exec(`CREATE TABLE IF NOT EXISTS net_profile (tenant TEXT PRIMARY KEY, listed INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS net_ref (id TEXT PRIMARY KEY, from_t TEXT NOT NULL, to_t TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS net_ref_from ON net_ref(from_t); CREATE INDEX IF NOT EXISTS net_ref_to ON net_ref(to_t);`).catch(e => { ready = null; throw e; });
  await ready; return db;
}
const list = (arr, n, m) => (Array.isArray(arr) ? arr : String(arr || '').split(',')).map(x => clean(x, m)).filter(Boolean).slice(0, n);
const maskName = n => { const p = String(n || '').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] || '—'; };
const STATUS = {pending: 'Yanıt bekliyor', accepted: 'Kabul edildi', declined: 'Reddedildi', withdrawn: 'Geri çekildi', contacted: 'İletişim kuruldu', won: 'Kazanıldı', lost: 'Kaybedildi'};

// Karşı firmanın göreceği biçim.
function view(row, role) {
  const d = parse(row.data), c = d.client || {}, full = role === 'from' || !['pending', 'declined', 'withdrawn'].includes(row.status);
  return {id: row.id, role, status: row.status, statusText: STATUS[row.status] || row.status, created: row.created, updated: row.updated, service: d.service, note: d.note, share: d.share, value: d.value || null, currency: d.currency || '',
    from: role === 'to' ? d.fromName : 'Siz', to: role === 'from' ? d.toName : 'Siz', client: full ? {name: c.name, email: c.email, phone: c.phone, country: c.country} : {name: maskName(c.name), country: c.country},
    masked: !full, consent: role === 'from' ? d.consent : {at: d.consent?.at, by: d.fromName}, history: d.history || [], leadId: role === 'to' ? d.toLeadId || '' : d.fromLeadId || ''};
}
const hist = (d, text, by) => { d.history = [...(d.history || []), {at: now(), by, text: clean(text, 400)}].slice(-60); };

export async function networkAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('network/')) return null;
  const {audit, actor} = ctx, log = async (a, t) => { try { if (audit) await audit(db, actor, a, t).run(); } catch {} }, T = me();
  const body = async () => (req.method === 'GET' ? {} : await readBody(req)), url = new URL(req.url), N = await netDb();
  const profile = async id => { const r = await N.prepare('SELECT * FROM net_profile WHERE tenant=?').bind(id).first(); return r ? {tenant: r.tenant, listed: !!r.listed, ...parse(r.data)} : null; };

  if (route === 'network/me' && req.method === 'GET') return json({tenant: T, profile: await profile(T), services: SERVICES, defaultName: myName()});
  if (route === 'network/profile' && req.method === 'POST') {
    const b = await body(), name = clean(b.name, 100) || myName(), contact = clean(b.contactEmail, 254).toLowerCase();
    if (!validEmail(contact)) fail(400, 'Yönlendirme bildirimlerinin gideceği geçerli bir e-posta girin.');
    const d = {name, about: clean(b.about, 600), countries: list(b.countries, 12, 40), services: list(b.services, 12, 60), languages: list(b.languages, 8, 20), contactEmail: contact, share: Math.max(0, Math.min(50, Number(b.share) || 0))}, listed = !!b.listed;
    if (listed && (!d.countries.length || !d.services.length)) fail(400, 'Dizinde görünmek için en az bir ülke ve bir hizmet seçin.');
    await N.prepare('INSERT INTO net_profile(tenant,listed,data,updated) VALUES(?,?,?,?) ON CONFLICT(tenant) DO UPDATE SET listed=excluded.listed, data=excluded.data, updated=excluded.updated').bind(T, listed ? 1 : 0, JSON.stringify(d), now()).run();
    await log('network.profile', listed ? 'listed' : 'hidden'); return json({ok: true});
  }
  if (route === 'network/directory' && req.method === 'GET') {
    const q = clean(url.searchParams.get('q'), 60).toLowerCase(), country = clean(url.searchParams.get('country'), 40).toLowerCase(), service = clean(url.searchParams.get('service'), 60).toLowerCase();
    const rows = (await N.prepare("SELECT p.* FROM net_profile p LEFT JOIN tenants t ON t.id=p.tenant WHERE p.listed=1 AND p.tenant<>? AND (p.tenant='main' OR t.status='active') ORDER BY p.updated DESC LIMIT 300").bind(T).all()).results;
    const firms = rows.map(r => { const d = parse(r.data); return {tenant: r.tenant, name: d.name, about: d.about, countries: d.countries || [], services: d.services || [], languages: d.languages || [], share: d.share || 0}; })
      .filter(f => (!q || (f.name + ' ' + f.about).toLowerCase().includes(q)) && (!country || f.countries.some(c => c.toLowerCase().includes(country))) && (!service || f.services.some(s => s.toLowerCase().includes(service))));
    return json({firms});
  }
  if (route === 'network/refs' && req.method === 'GET') {
    const rows = (await N.prepare('SELECT * FROM net_ref WHERE from_t=? OR to_t=? ORDER BY updated DESC LIMIT 500').bind(T, T).all()).results;
    return json({sent: rows.filter(r => r.from_t === T).map(r => view(r, 'from')), received: rows.filter(r => r.to_t === T).map(r => view(r, 'to')), statuses: STATUS});
  }
  if (route === 'network/refs/send' && req.method === 'POST') {
    const b = await body(), mine = await profile(T); if (!mine) fail(400, 'Yönlendirme göndermek için önce Ağ profilinizi kaydedin (yanıt bildirimleri bu adrese gider).');
    const to = clean(b.to, 80), target = await profile(to); if (!target || !target.listed || to === T) fail(404, 'Firma dizinde bulunamadı.');
    const name = clean(b.name, 100), email = clean(b.email, 254).toLowerCase(), phone = clean(b.phone, 40);
    if (name.length < 2) fail(400, 'Müşterinin adını yazın.'); if (!email && !phone) fail(400, 'E-posta veya telefon gerekli.'); if (email && !validEmail(email)) fail(400, 'E-posta geçersiz.');
    if (b.consent !== true) fail(400, 'Müşterinin bilgilerinin bu firmayla paylaşılmasına onay verdiğini doğrulayın.');
    const day = (await N.prepare('SELECT COUNT(*) AS n FROM net_ref WHERE from_t=? AND created>?').bind(T, now() - 864e5).first()).n; if (day >= 20) fail(429, 'Günlük yönlendirme sınırına ulaştınız (20).');
    const dup = await N.prepare("SELECT id, data FROM net_ref WHERE from_t=? AND to_t=? AND status IN ('pending','accepted','contacted') ORDER BY created DESC LIMIT 50").bind(T, to).all();
    if (dup.results.some(r => { const c = parse(r.data).client || {}; return email ? c.email === email : c.phone === phone; })) fail(409, 'Bu müşteri bu firmaya zaten yönlendirilmiş.');
    const id = 'nr-' + uuid().slice(0, 16), d = {client: {name, email, phone, country: clean(b.country, 60)}, service: clean(b.service, 60), note: clean(b.note, 800), share: Math.max(0, Math.min(50, Number(b.share) || 0)), fromName: mine.name, fromContact: mine.contactEmail, toName: target.name, fromLeadId: clean(b.leadId, 80), consent: {at: now(), by: clean(actor, 80), text: 'Müşteri, bilgilerinin bu firmayla paylaşılmasına onay verdi (gönderen firma doğruladı).'}, history: []};
    hist(d, `${mine.name} yönlendirmeyi gönderdi.`, 'from');
    await N.prepare('INSERT INTO net_ref(id,from_t,to_t,status,data,created,updated) VALUES(?,?,?,?,?,?,?)').bind(id, T, to, 'pending', JSON.stringify(d), now(), now()).run();
    if (d.fromLeadId) await noteLead(db, d.fromLeadId, `Partner ağında ${target.name} firmasına yönlendirildi.`, actor);
    const m = await sendMail({to: target.contactEmail, subject: `Yeni yönlendirme: ${d.service || 'hizmet'} · ${d.client.country || ''}`, title: 'Partner ağından yeni yönlendirme', text: `${mine.name} size bir müşteri yönlendirdi (${d.service || 'hizmet belirtilmedi'}${d.client.country ? ', ' + d.client.country : ''}). Müşterinin iletişim bilgileri siz kabul edene kadar gizlidir. Yönetim panelinizde Partner Ağı → Gelen yönlendirmeler bölümünden yanıtlayabilirsiniz.`}).catch(() => ({}));
    await log('network.send', id); return json({ok: true, id, notified: !!m.sent});
  }
  if (route === 'network/refs/respond' && req.method === 'POST') {
    const b = await body(), r = await N.prepare('SELECT * FROM net_ref WHERE id=? AND to_t=?').bind(clean(b.id, 80), T).first(); if (!r) fail(404, 'Yönlendirme bulunamadı.');
    if (r.status !== 'pending') fail(409, 'Bu yönlendirme zaten yanıtlandı.'); const d = parse(r.data), accept = b.action === 'accept'; if (!accept && b.action !== 'decline') fail(400, 'Geçersiz işlem.');
    if (accept) {
      const c = d.client, lead = await upsertLead(db, {name: c.name, email: c.email, phone: c.phone, service: d.service, country: c.country, note: `${d.fromName} yönlendirdi.${d.note ? ' ' + d.note : ''}`, source: 'Partner ağı', consent: true, consentText: d.consent.text, historyText: `Partner ağından geldi (${d.fromName}).`}, 'Partner ağı');
      d.toLeadId = lead.id;
    } else { d.client = {name: maskName(d.client.name), email: '', phone: '', country: d.client.country}; }   // veri azaltma: reddedilince iletişim bilgisi silinir
    hist(d, accept ? `${d.toName} yönlendirmeyi kabul etti.${b.note ? ' Not: ' + clean(b.note, 300) : ''}` : `${d.toName} yönlendirmeyi reddetti.${b.note ? ' Neden: ' + clean(b.note, 300) : ''}`, 'to');
    const status = accept ? 'accepted' : 'declined';
    await N.prepare('UPDATE net_ref SET status=?, data=?, updated=? WHERE id=?').bind(status, JSON.stringify(d), now(), r.id).run();
    await sendMail({to: d.fromContact, subject: `Yönlendirmeniz ${accept ? 'kabul edildi' : 'reddedildi'}`, title: 'Partner ağı güncellemesi', text: `${d.toName}, yönlendirdiğiniz müşteriyi ${accept ? 'kabul etti' : 'reddetti'}.${b.note ? ' Not: ' + clean(b.note, 300) : ''}`}).catch(() => {});
    await log('network.respond', r.id + ':' + status); return json({ok: true, status, leadId: d.toLeadId || null});
  }
  if (route === 'network/refs/status' && req.method === 'POST') {
    const b = await body(), r = await N.prepare('SELECT * FROM net_ref WHERE id=? AND to_t=?').bind(clean(b.id, 80), T).first(); if (!r) fail(404, 'Yönlendirme bulunamadı.');
    const next = clean(b.status, 20); if (!['contacted', 'won', 'lost'].includes(next)) fail(400, 'Geçersiz durum.');
    if (!['accepted', 'contacted'].includes(r.status)) fail(409, r.status === 'pending' ? 'Önce yönlendirmeyi kabul edin.' : 'Bu yönlendirme kapandı.');
    const d = parse(r.data); if (next === 'won' && b.value !== undefined) { d.value = Math.max(0, Math.round((Number(b.value) || 0) * 100)); d.currency = ['USD', 'BRL', 'EUR', 'TRY'].includes(b.currency) ? b.currency : 'USD'; }
    hist(d, `Durum: ${STATUS[next]}.${b.note ? ' ' + clean(b.note, 300) : ''}${next === 'won' && d.value && d.share ? ` Kayıtlı pay: %${d.share} (${(d.value * d.share / 100 / 100).toFixed(2)} ${d.currency}) — ödeme platform dışında firmalar arasında yapılır.` : ''}`, 'to');
    await N.prepare('UPDATE net_ref SET status=?, data=?, updated=? WHERE id=?').bind(next, JSON.stringify(d), now(), r.id).run();
    if (d.toLeadId && next !== 'contacted') await noteLead(db, d.toLeadId, `Partner ağı kaydı: ${STATUS[next]}`, actor, next);
    else if (d.toLeadId) await noteLead(db, d.toLeadId, 'Partner ağı kaydı: İletişim kuruldu', actor, 'contacted');
    if (next !== 'contacted') await sendMail({to: d.fromContact, subject: `Yönlendirme sonucu: ${STATUS[next]}`, title: 'Partner ağı güncellemesi', text: `${d.toName} yönlendirdiğiniz müşteri için durumu "${STATUS[next]}" olarak işaretledi.`}).catch(() => {});
    await log('network.status', r.id + ':' + next); return json({ok: true});
  }
  if (route === 'network/refs/withdraw' && req.method === 'POST') {
    const b = await body(), r = await N.prepare('SELECT * FROM net_ref WHERE id=? AND from_t=?').bind(clean(b.id, 80), T).first(); if (!r) fail(404, 'Yönlendirme bulunamadı.');
    if (r.status !== 'pending') fail(409, 'Yalnız yanıt bekleyen yönlendirme geri çekilebilir.');
    const d = parse(r.data); d.client = {name: maskName(d.client.name), email: '', phone: '', country: d.client.country}; hist(d, 'Gönderen firma geri çekti; iletişim bilgisi silindi.', 'from');
    await N.prepare("UPDATE net_ref SET status='withdrawn', data=?, updated=? WHERE id=?").bind(JSON.stringify(d), now(), r.id).run(); await log('network.withdraw', r.id); return json({ok: true});
  }
  return null;
}
