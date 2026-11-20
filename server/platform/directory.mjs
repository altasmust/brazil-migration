// Firma dizini (Faz 5 · 24): doğrulanmış danışmanlık firmalarının ülke/hizmet/dile göre aranabilir, herkese açık vitrini.
// Veri yalnız platformun ana veritabanındaki `dir_listing` tablosunda tutulur; firmaların kendi veritabanlarına yalnız "iletişim talebi" yazılır.
//  • Katılım isteğe bağlıdır (varsayılan: gizli). Firma kendi vitrinini yazar; yayına çıkmak için ana firmanın (platform sahibi) doğrulaması gerekir.
//  • Doğrulanmış kayıt firma adı değişirse yeniden onaya düşer (başkasının adıyla vitrin açılmasın diye). Askıya alınan veya askıdaki firma dizinden düşer.
//  • Herkese açık yanıtlar e-posta/telefon içermez. Ziyaretçi, firmaya yalnız açık rızasıyla ve firma adı yazılı bir onayla iletişim talebi gönderebilir;
//    talep firmanın kendi veritabanında "Firma dizini" kaynaklı aday olur, rıza kaydı o firmanın kayıtlarına yazılır (veri sorumlusu o firmadır).
//  • Spam koruması: gizli alan, çok hızlı gönderim, IP ve (firma, e-posta) başına sınır.
import {createHash} from 'node:crypto';
import {fail, clean, now, validEmail} from './auth.mjs';
import {sendMail} from './mail.mjs';
import {currentTenant, runWithTenant, MAIN} from './tenant-context.mjs';
import {getMainDatabase, getDatabase} from './db.mjs';
import {tenantById} from './tenant.mjs';
import {SERVICES} from './cases.mjs';
import {upsertLead, notice} from './sales.mjs';
import {recordConsent} from './privacy.mjs';
import {clientIp} from '../waf.mjs';

const json = (data, status = 200, headers = {}) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...headers}});
const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
const readBody = async req => { const t = await req.text(); if (t.length > 60000) fail(413, 'İstek çok büyük.'); try { return JSON.parse(t || '{}') || {}; } catch { fail(400, 'Geçersiz istek.'); } };
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').toLowerCase().trim();
const list = (arr, n, m) => [...new Set((Array.isArray(arr) ? arr : String(arr || '').split(',')).map(x => clean(x, m)).filter(Boolean))].slice(0, n);
const me = () => { const t = currentTenant(); return t.isDefault ? 'main' : t.id; };
const mySlug = () => { const t = currentTenant(); return t.isDefault ? 'brazil-migration' : t.slug; };
const myName = () => { const t = currentTenant(); return t.isDefault ? 'Brazil Migration' : (t.name || 'Danışmanlık firması'); };
const https = u => { const s = clean(u, 300); if (!s) return ''; try { const x = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); return x.protocol === 'https:' && x.hostname.includes('.') ? x.origin + (x.pathname === '/' ? '' : x.pathname) : ''; } catch { return ''; } };

export const DIR_STATUS = {draft: 'Yayında değil', pending: 'Doğrulama bekliyor', verified: 'Yayında (doğrulanmış)', rejected: 'Reddedildi', suspended: 'Askıya alındı'};

let ready = null;
async function dirDb() {
  const db = getMainDatabase(); await db.ready();
  ready ??= db.exec(`CREATE TABLE IF NOT EXISTS dir_listing (tenant TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, status TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS dir_listing_status ON dir_listing(status);`).catch(e => { ready = null; throw e; });
  await ready; return db;
}

// Bellek içi sınırlayıcı (örnek başına; WAF'ın genel sınırının üstüne ek koruma).
const HITS = new Map();
function limited(key, max, windowMs) {
  const t = Date.now(), a = (HITS.get(key) || []).filter(x => t - x < windowMs);
  if (a.length >= max) { HITS.set(key, a); return true; }
  a.push(t); HITS.set(key, a);
  if (HITS.size > 5000) for (const [k, v] of HITS) if (!v.length || t - v[v.length - 1] > windowMs) HITS.delete(k);
  return false;
}

// Herkese açık görünüm: iletişim e-postası ve iç notlar asla çıkmaz.
function pub(row) {
  const d = parse(row.data);
  return {slug: row.slug, name: d.name, about: d.about || '', city: d.city || '', countries: d.countries || [], services: d.services || [], languages: d.languages || [],
    website: d.website || '', registry: d.registry || '', accepting: d.accepting !== false, verifiedAt: d.verifiedAt || null};
}
// Yalnız yayında (doğrulanmış) ve etkin firmalar.
async function visible(D) {
  const rows = await D.prepare("SELECT l.* FROM dir_listing l LEFT JOIN tenants t ON t.id=l.tenant WHERE l.status='verified' AND (l.tenant='main' OR t.status='active') ORDER BY l.updated DESC LIMIT 500").all();
  return rows.results || [];
}
const dayOrder = (slug) => createHash('sha1').update(new Date().toISOString().slice(0, 10) + slug).digest('hex');   // günlük karışık sıra: adil, sayfalamada kararlı

// ---------------- Firma tarafı (platform yönetimi) ----------------
export async function directoryAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('directory/')) return null;
  const {audit, actor} = ctx, log = async (a, t) => { try { if (audit) await audit(db, actor, a, t).run(); } catch {} };
  const D = await dirDb(), T = me(), body = async () => (req.method === 'GET' ? {} : await readBody(req));
  const get = async t => { const r = await D.prepare('SELECT * FROM dir_listing WHERE tenant=?').bind(t).first(); return r ? {tenant: r.tenant, slug: r.slug, status: r.status, created: r.created, updated: r.updated, ...parse(r.data)} : null; };

  if (route === 'directory/me' && req.method === 'GET') {
    const l = await get(T);
    return json({listing: l, statusText: l ? DIR_STATUS[l.status] : DIR_STATUS.draft, slug: mySlug(), defaultName: myName(), services: SERVICES, isMain: !!currentTenant().isDefault});
  }
  if (route === 'directory/profile' && req.method === 'POST') {
    const b = await body(), old = await get(T), publish = !!b.publish;
    const d = {name: clean(b.name, 100) || myName(), about: clean(b.about, 600), city: clean(b.city, 60), countries: list(b.countries, 12, 40), services: list(b.services, 12, 60),
      languages: list(b.languages, 8, 20).map(x => x.toLowerCase()), website: https(b.website), registry: clean(b.registry, 80), leadEmail: clean(b.leadEmail, 254).toLowerCase(), accepting: b.accepting !== false};
    if (clean(b.website, 300) && !d.website) fail(400, 'Web sitesi adresi geçerli bir https:// adresi olmalı.');
    if (d.name.length < 2) fail(400, 'Firma adını yazın.');
    if (publish) {
      if (!d.countries.length || !d.services.length) fail(400, 'Yayına başvurmak için en az bir ülke ve bir hizmet seçin.');
      if (d.about.length < 40) fail(400, 'Kısa tanıtım en az 40 karakter olmalı (müşteriler sizi bu metinle tanır).');
      if (!validEmail(d.leadEmail)) fail(400, 'İletişim taleplerinin gideceği geçerli bir e-posta girin.');
    } else if (d.leadEmail && !validEmail(d.leadEmail)) fail(400, 'E-posta adresi geçersiz.');
    const keep = old ? {verifiedAt: old.verifiedAt, verifiedName: old.verifiedName, note: old.note, contacts: old.contacts || 0} : {contacts: 0};
    let status = old?.status || 'draft';
    if (status === 'suspended') { if (publish) fail(403, 'Vitrininiz askıya alındı' + (old.note ? ': ' + old.note : '.') + ' Ayrıntı için platform yönetimiyle iletişime geçin.'); }
    else if (!publish) status = 'draft';
    else if (keep.verifiedAt && keep.verifiedName === d.name) status = 'verified';       // aynı adla daha önce doğrulanmış: yeniden onay gerekmez
    else { status = 'pending'; if (old?.status !== 'pending') { delete keep.verifiedAt; delete keep.verifiedName; } }
    if (status === 'pending') delete keep.note;                                         // eski ret/askı notu yeni başvuruyla temizlenir
    const t = now(), slug = old?.slug || mySlug();
    await D.prepare('INSERT INTO dir_listing(tenant,slug,status,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(tenant) DO UPDATE SET status=excluded.status, data=excluded.data, updated=excluded.updated')
      .bind(T, slug, status, JSON.stringify({...d, ...keep}), old?.created || t, t).run();
    await log('directory.profile', status);
    if (status === 'pending' && old?.status !== 'pending') {                           // ana firmanın panelinde bildirim
      try { const mdb = await runWithTenant(MAIN, () => getDatabase()); await notice(mdb, 'owner', `Firma dizini: doğrulama bekleyen vitrin — ${d.name}`, 'firma-dizini'); } catch {}
    }
    return json({ok: true, status, statusText: DIR_STATUS[status], slug});
  }

  // ---- ana firma (platform sahibi): doğrulama ----
  if (route.startsWith('directory/admin/')) {
    if (!currentTenant().isDefault) fail(404, 'Bulunamadı.');
    if (route === 'directory/admin/list' && req.method === 'GET') {
      const rows = (await D.prepare('SELECT l.*, t.name AS tname, t.status AS tstatus, t.owner_email AS temail FROM dir_listing l LEFT JOIN tenants t ON t.id=l.tenant ORDER BY CASE l.status WHEN \'pending\' THEN 0 WHEN \'verified\' THEN 1 ELSE 2 END, l.updated DESC LIMIT 300').all()).results || [];
      return json({listings: rows.map(r => { const d = parse(r.data); return {tenant: r.tenant, slug: r.slug, status: r.status, statusText: DIR_STATUS[r.status], updated: r.updated, tenantName: r.tname || 'Brazil Migration', tenantStatus: r.tstatus || 'active', ownerEmail: r.temail || '', ...pub(r), leadEmail: d.leadEmail, note: d.note || '', verifiedAt: d.verifiedAt || null, contacts: d.contacts || 0}; }), statuses: DIR_STATUS});
    }
    if (route === 'directory/admin/decide' && req.method === 'POST') {
      const b = await body(), id = clean(b.tenant, 60), r = await D.prepare('SELECT * FROM dir_listing WHERE tenant=?').bind(id).first(); if (!r) fail(404, 'Kayıt bulunamadı.');
      const d = parse(r.data), action = clean(b.action, 12), note = clean(b.note, 400); let status = r.status;
      if (action === 'verify') { if (!['pending', 'rejected'].includes(r.status)) fail(409, 'Yalnız doğrulama bekleyen kayıt onaylanır.'); status = 'verified'; d.verifiedAt = now(); d.verifiedName = d.name; d.note = note; }
      else if (action === 'reject') { if (r.status !== 'pending') fail(409, 'Yalnız doğrulama bekleyen kayıt reddedilir.'); if (note.length < 5) fail(400, 'Ret nedenini yazın; firmaya iletilir.'); status = 'rejected'; d.note = note; }
      else if (action === 'suspend') { if (!['verified', 'pending'].includes(r.status)) fail(409, 'Bu kayıt zaten yayında değil.'); if (note.length < 5) fail(400, 'Askıya alma nedenini yazın.'); status = 'suspended'; d.note = note; }
      else if (action === 'restore') { if (r.status !== 'suspended') fail(409, 'Kayıt askıda değil.'); status = d.verifiedAt && d.verifiedName === d.name ? 'verified' : 'pending'; d.note = ''; }
      else fail(400, 'Geçersiz işlem.');
      await D.prepare('UPDATE dir_listing SET status=?, data=?, updated=? WHERE tenant=?').bind(status, JSON.stringify(d), now(), id).run();
      await log('directory.' + action, r.slug);
      if (validEmail(d.leadEmail || '') && ['verify', 'reject', 'suspend'].includes(action)) {
        const tx = {verify: 'Vitrininiz doğrulandı ve firma dizininde yayınlandı.', reject: 'Vitrin başvurunuz onaylanmadı.' + (note ? ' Neden: ' + note : '') + ' Bilgileri düzeltip yeniden başvurabilirsiniz.', suspend: 'Vitriniz firma dizininden geçici olarak kaldırıldı.' + (note ? ' Neden: ' + note : '')};
        await sendMail({to: d.leadEmail, subject: 'Firma dizini: ' + DIR_STATUS[status], title: 'Firma dizini', text: tx[action]}).catch(() => {});
      }
      return json({ok: true, status, statusText: DIR_STATUS[status]});
    }
  }
  return null;
}

// ---------------- Herkese açık uçlar ----------------
export async function directoryPublic(req, db, route) {
  if (!route.startsWith('directory/')) return null;
  const url = new URL(req.url), D = await dirDb(), cache = {'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'};

  if (route === 'directory/list' && req.method === 'GET') {
    const q = fold(url.searchParams.get('q')), country = fold(url.searchParams.get('country')), service = fold(url.searchParams.get('service')), lang = fold(url.searchParams.get('language'));
    const page = Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1), size = 12, all = (await visible(D)).map(pub);
    const has = (arr, v) => !v || arr.some(x => fold(x) === v);
    const hit = all.filter(f => has(f.countries, country) && has(f.services, service) && has(f.languages, lang) && (!q || fold([f.name, f.about, f.city, f.countries.join(' '), f.services.join(' ')].join(' ')).includes(q)));
    hit.sort((a, b) => dayOrder(a.slug).localeCompare(dayOrder(b.slug)));
    const facet = key => { const m = new Map(); for (const f of all) for (const v of f[key]) { const k = fold(v); m.set(k, {value: m.get(k)?.value || v, n: (m.get(k)?.n || 0) + 1}); } return [...m.values()].sort((a, b) => b.n - a.n || a.value.localeCompare(b.value)).slice(0, 40); };
    return json({total: hit.length, page, pages: Math.max(1, Math.ceil(hit.length / size)), firms: hit.slice((page - 1) * size, page * size).map(f => ({...f, about: f.about.slice(0, 220)})),
      facets: {countries: facet('countries'), services: facet('services'), languages: facet('languages')}}, 200, cache);
  }
  if (route === 'directory/firm' && req.method === 'GET') {
    const slug = clean(url.searchParams.get('slug'), 60).toLowerCase();
    const row = (await visible(D)).find(r => r.slug === slug); if (!row) fail(404, 'Firma bulunamadı.');
    return json({firm: pub(row)}, 200, cache);
  }
  if (route === 'directory/contact' && req.method === 'POST') {
    const b = await readBody(req);
    if (clean(b.hp, 100)) return json({ok: true});                                       // gizli alan: botlar doldurur
    if (now() - (Number(b.ts) || 0) < 2500) return json({ok: true});                  // insan olamayacak kadar hızlı
    const ip = clientIp(req.headers); if (limited('dir:' + ip, 5, 3600e3)) fail(429, 'Çok fazla talep gönderdiniz. Lütfen daha sonra tekrar deneyin.');
    const slug = clean(b.slug, 60).toLowerCase(), name = clean(b.name, 100), email = clean(b.email, 254).toLowerCase(), phone = clean(b.phone, 40);
    if (name.length < 2) fail(400, 'Adınızı yazın.');
    if (!validEmail(email)) fail(400, 'Geçerli bir e-posta adresi girin.');
    if (phone && phone.replace(/\D/g, '').length < 6) fail(400, 'Telefon numarası geçersiz görünüyor.');
    if (!b.consent) fail(400, 'Devam etmek için onay kutusunu işaretleyin.');
    const row = (await visible(D)).find(r => r.slug === slug); if (!row) fail(404, 'Firma bulunamadı.');
    const f = parse(row.data); if (f.accepting === false || !validEmail(f.leadEmail || '')) fail(409, 'Bu firma şu an yeni talep almıyor.');
    if (limited(`dir:${slug}:${email}`, 3, 864e5)) fail(429, 'Bu firmaya zaten talep gönderdiniz; firma sizinle iletişime geçecek.');
    const message = clean(b.message, 1500), service = f.services.includes(b.service) ? b.service : clean(b.service, 60), country = clean(b.country, 60);
    const consentText = `Bilgilerimin ${f.name} firmasına iletilmesini ve benimle iletişime geçilmesini kabul ediyorum (Firma dizini).`;
    const tenant = row.tenant === 'main' ? MAIN : await tenantById(row.tenant).catch(() => null); if (!tenant) fail(404, 'Firma bulunamadı.');
    const created = await runWithTenant(tenant, async () => {
      const tdb = tenant === MAIN ? getDatabase() : tenant.db, r = await upsertLead(tdb, {name, email, phone, service, country, note: message, source: 'Firma dizini', consent: true, consentText, historyText: 'Firma dizini vitrininden iletişim talebi gönderdi.'}, 'Firma dizini');
      try { await recordConsent(tdb, {email, type: 'privacy-notice', source: 'directory', text: consentText}); } catch {}
      try { await notice(tdb, 'owner', `Firma dizininden yeni talep: ${name}${service ? ' · ' + service : ''}`, 'adaylar'); } catch {}
      return r;
    });
    await sendMail({to: f.leadEmail, subject: `Firma dizininden yeni talep: ${name}`, title: 'Firma dizininden yeni talep', text: `${name} (${email}${phone ? ', ' + phone : ''}) vitrininiz üzerinden iletişim talebi gönderdi.\n${service ? 'Hizmet: ' + service + '\n' : ''}${country ? 'Ülke: ' + country + '\n' : ''}${message ? '\n' + message : ''}\n\nKişi, bilgilerinin size iletilmesini onayladı. Aday kaydı panelinizdeki Adaylar bölümünde.`}).catch(() => {});
    await sendMail({to: email, subject: `Talebiniz ${f.name} firmasına iletildi`, title: 'Talebiniz iletildi', text: `${f.name} firması iletişim talebinizi aldı ve sizinle doğrudan iletişime geçecek. Bu talebi siz göndermediyseniz bu e-postayı yok sayabilirsiniz.`}).catch(() => {});
    try { const D2 = await dirDb(), cur = parse((await D2.prepare('SELECT data FROM dir_listing WHERE tenant=?').bind(row.tenant).first())?.data); cur.contacts = (cur.contacts || 0) + (created?.created ? 1 : 0); await D2.prepare('UPDATE dir_listing SET data=? WHERE tenant=?').bind(JSON.stringify(cur), row.tenant).run(); } catch {}
    return json({ok: true, message: `Talebiniz ${f.name} firmasına iletildi. Firma sizinle e-posta veya telefonla iletişime geçecek.`});
  }
  return null;
}
