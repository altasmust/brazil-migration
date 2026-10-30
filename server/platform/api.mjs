// Unified login, registration, partner onboarding, admin account management and panel modules.
import {
  OWNER_EMAIL, now, uuid, fail, clean, validEmail, hashPassword, checkPassword, passwordOk, PASSWORD_RULE,
  createSession, currentUser, destroySession, createToken, useToken, siteUrl, adminUrl, isAdminRequest, adminHosts,
} from './auth.mjs';
import {sendMail, mailConfigured} from './mail.mjs';
import {CITIES, locate, fromRequest, distanceKm} from './geo.mjs';
import {PARTNER_DOCS, verifyPartner, verifyCustomerDocument, verifierConfigured} from './verify.mjs';

export const PERMS = ['customers', 'applications', 'documents', 'kyc', 'finance', 'support', 'referrals', 'team', 'audit'];
export const PERM_LABELS = {customers: 'Müşteriler', applications: 'Başvurular', documents: 'Belgeler', kyc: 'KYC / Kimlik', finance: 'Finans', support: 'Destek', referrals: 'Referanslar', team: 'Ekip', audit: 'Denetim kaydı'};
const DEFAULT_PERMS = {
  advisor: {customers: 2, applications: 2, documents: 2, kyc: 2, finance: 1, support: 2, referrals: 2, team: 2, audit: 1},
  accountant: {customers: 1, applications: 1, documents: 1, kyc: 0, finance: 2, support: 1, referrals: 0, team: 0, audit: 1},
  other: {customers: 1, applications: 1, documents: 1, kyc: 0, finance: 0, support: 1, referrals: 0, team: 0, audit: 0},
};
export const ACCOUNT_TYPES = {customer: 'Müşteri', advisor: 'Danışman', lawyer: 'Avukat', accountant: 'Muhasebeci', other: 'Diğer'};
export const PARTNER_SERVICES = ['Oturum İzni', 'Vatandaşlık', 'Evlilik / União Estável', 'Şirket Kurulumu', 'Vize', 'Aile Birleşimi'];
export const PANELS = {customer: 'Müşteri paneli', partner: 'Danışman / partner paneli', staff: 'Muhasebe & diğer personel', lawyer: 'Avukat paneli'};

const json = (data, status = 200, headers = {}) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...headers}});
const parse = s => { try { return JSON.parse(s); } catch { return {}; } };
const q = (db, s, ...v) => db.prepare(s).bind(...v);
const one = (db, s, ...v) => q(db, s, ...v).first();
const rows = async (db, s, ...v) => (await q(db, s, ...v).all()).results;
const getItem = async (db, id) => { const r = await one(db, 'SELECT * FROM items WHERE id=?', id); return r ? {...r, data: parse(r.data)} : null; };
const putItem = (db, id, kind, owner, data) => q(db, 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated', id, kind, owner, JSON.stringify(data), now(), now());
const notice = (db, owner, title, link) => q(db, 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', uuid(), 'notice', owner, JSON.stringify({title, link, read: false}), now(), now());
const audit = (db, actor, action, target) => q(db, 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', uuid(), 'audit', 'owner', JSON.stringify({actor, action, target}), now(), now());
async function body(req) {
  const t = await req.text(); if (t.length > 60000) fail(413, 'İstek çok büyük.');
  try { return t ? JSON.parse(t) : {}; } catch { fail(400, 'Geçersiz istek.'); }
}
function sameOrigin(req) {
  const o = req.headers.get('origin'); if (!o) return;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (new URL(o).host !== host) fail(403, 'Geçersiz istek kaynağı.');
}
const insertPerson = (db, p) => q(db, 'INSERT INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', p.id, p.uid, p.email, p.name, p.role, p.manager, JSON.stringify(p.permissions || {}), JSON.stringify(p.scope ?? 'all'), p.status || 'active', p.advisor ?? null, p.source ?? null, now());

// ---- shared lookups -------------------------------------------------------
export async function accountsFor(db, user) {
  const people = await rows(db, 'SELECT * FROM people WHERE uid=?', user.id);
  const law = await rows(db, 'SELECT * FROM law_accounts WHERE uid=? OR (uid IS NULL AND email=?)', user.id, user.email);
  const out = [];
  for (const p of people) {
    if (p.role === 'customer') out.push({panel: 'customer', home: '/panel/', label: 'Müşteri paneli', status: p.status});
    else if (p.role === 'advisor' || p.role === 'employee') {
      const meta = await getItem(db, 'meta-' + p.id);
      out.push({panel: meta?.data.type === 'accountant' || meta?.data.type === 'other' ? 'staff' : 'partner', home: '/partner/', label: meta?.data.type === 'accountant' ? 'Muhasebe paneli' : meta?.data.type === 'other' ? 'Personel paneli' : 'Danışman paneli', status: p.status, person: p.id});
    }
  }
  for (const a of law) if (a.status === 'active') out.push({panel: 'lawyer', home: '/avukat/', label: 'Avukat paneli', status: a.status});
  return out;
}
export async function partnerState(db, personId) {
  const p = await getItem(db, 'partner-' + personId);
  return p ? p.data : null;
}
async function nearestAdvisor(db, loc) {
  const advisors = await rows(db, "SELECT id FROM people WHERE role='advisor' AND status='active'");
  let best = null;
  for (const a of advisors) {
    const ps = await partnerState(db, a.id);
    if (ps && ps.status !== 'approved') continue;
    const meta = await getItem(db, 'meta-' + a.id);
    if (!meta?.data.lat && meta?.data.lat !== 0) continue;
    if (!loc) continue;
    const d = distanceKm(loc, meta.data);
    if (!best || d < best.d) best = {id: a.id, d};
  }
  return best;
}

async function sendVerify(db, req, user, name) {
  const token = await createToken(db, user.id, 'verify', 48);
  const link = `${siteUrl(req)}/giris/?dogrula=${token}`;
  return sendMail({to: user.email, subject: 'E-posta adresinizi doğrulayın', title: 'Hoş geldiniz' + (name ? ', ' + name : ''), text: 'Brazil Migration hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın. Bağlantı 48 saat geçerlidir.', link, button: 'E-postamı doğrula'});
}
async function sendInvite(db, req, user, name, typeLabel) {
  const token = await createToken(db, user.id, 'invite', 7 * 24);
  const link = `${siteUrl(req)}/giris/?sifre=${token}`;
  return sendMail({to: user.email, subject: 'Brazil Migration hesabınız oluşturuldu', title: 'Merhaba ' + name, text: `${typeLabel} hesabınız oluşturuldu. Aşağıdaki bağlantıdan şifrenizi belirleyip giriş yapabilirsiniz. Bağlantı 7 gün geçerlidir.`, link, button: 'Şifremi belirle'});
}
async function newAuthUser(db, email, password, verified) {
  if (await one(db, 'SELECT id FROM auth_users WHERE email=?', email)) fail(409, 'Bu e-posta ile zaten bir hesap var. Giriş yapın veya şifrenizi sıfırlayın.');
  const id = uuid(); let salt = null, hash = null;
  if (password) ({salt, hash} = await hashPassword(password));
  await q(db, 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', id, email, hash, salt, verified ? 1 : 0, 0, 0, now()).run();
  return {id, email};
}
function readLocation(b, req) {
  const country = clean(b.country, 60), city = clean(b.city, 80);
  const l = country ? locate(country, city) : null;
  return l || fromRequest(req);
}

// ---- /api/auth/* (public) -------------------------------------------------
export async function handleAuth(req, env, route) {
  const db = env.DB;
  route = route.replace(/^admin\//, '');
  if (req.method !== 'GET') sameOrigin(req);
  if (route === 'cities' && req.method === 'GET') return json({countries: Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, Object.keys(v)])), services: PARTNER_SERVICES});
  if (route === 'config' && req.method === 'GET') return json({mail: mailConfigured(), verifier: verifierConfigured(), adminSeparate: adminHosts().length > 0});

  if (route === 'me' && req.method === 'GET') {
    const u = await currentUser(db, req); if (!u) return json({user: null});
    const accounts = isAdminRequest(req) ? [{panel: 'admin', home: '/admin/', label: 'Yönetim paneli'}] : await accountsFor(db, u);
    return json({user: {email: u.email}, accounts});
  }
  if (route === 'logout' && req.method === 'POST') return json({ok: true}, 200, {'Set-Cookie': await destroySession(db, req)});

  const b = req.method === 'GET' ? {} : await body(req);

  if (route === 'register' && req.method === 'POST') { // customer self-registration
    const email = clean(b.email, 254).toLowerCase(), name = clean(b.name, 100);
    if (name.length < 2 || !validEmail(email)) fail(400, 'Ad soyad ve geçerli bir e-posta girin.');
    if (email === OWNER_EMAIL()) fail(400, 'Bu e-posta yönetici hesabına ayrılmıştır.');
    if (!passwordOk(b.password)) fail(400, PASSWORD_RULE);
    if (!b.consent) fail(400, 'Devam etmek için KVKK / gizlilik metnini onaylayın.');
    const user = await newAuthUser(db, email, b.password, false);
    const loc = readLocation(b, req);
    // Referral link has priority, otherwise the nearest active advisor, otherwise head office.
    let advisor = 'owner', source = null, reason = 'Merkez ofis';
    const code = (req.headers.get('cookie') || '').match(/(?:^|; )bm_ref=([a-f0-9-]+)/)?.[1];
    const ref = code ? await getItem(db, code) : null;
    if (ref?.kind === 'ref' && ref.data.active && await one(db, "SELECT id FROM people WHERE id=? AND status='active'", ref.owner)) { advisor = ref.owner; source = ref.id; reason = 'Referans bağlantısı'; }
    else { const near = await nearestAdvisor(db, loc); if (near) { advisor = near.id; reason = `En yakın danışman (~${Math.round(near.d)} km)`; } }
    const pid = uuid();
    await db.batch([
      insertPerson(db, {id: pid, uid: user.id, email, name, role: 'customer', manager: 'owner', permissions: {}, scope: 'all', advisor, source}),
      putItem(db, 'meta-' + pid, 'account_meta', pid, {type: 'customer', phone: clean(b.phone, 40), country: loc?.country || clean(b.country, 60), city: loc?.city || clean(b.city, 80), lat: loc?.lat ?? null, lng: loc?.lng ?? null, assignedBy: reason}),
      putItem(db, 'profile-' + pid, 'profile', pid, {name, phone: clean(b.phone, 40), address: [loc?.city, loc?.country].filter(Boolean).join(', ')}),
      notice(db, advisor, 'Yeni müşteri kaydı: ' + name + ' (' + reason + ')', 'customers'),
    ]);
    const mail = await sendVerify(db, req, user, name);
    return json({ok: true, verifyRequired: true, mailSent: mail.sent, devLink: mail.devLink});
  }

  if (route === 'partner-register' && req.method === 'POST') {
    const email = clean(b.email, 254).toLowerCase(), name = clean(b.name, 100), company = clean(b.company, 200);
    if (name.length < 2 || company.length < 2 || !validEmail(email)) fail(400, 'Firma unvanı, yetkili adı ve geçerli e-posta gerekli.');
    if (email === OWNER_EMAIL()) fail(400, 'Bu e-posta yönetici hesabına ayrılmıştır.');
    if (!passwordOk(b.password)) fail(400, PASSWORD_RULE);
    if (!b.consent) fail(400, 'Partnerlik koşullarını onaylayın.');
    const services = (Array.isArray(b.services) ? b.services : []).filter(s => PARTNER_SERVICES.includes(s));
    if (!services.length) fail(400, 'Vereceğiniz en az bir hizmeti seçin.');
    const loc = readLocation(b, req);
    if (!loc?.country) fail(400, 'Ülke ve şehir seçin.');
    const user = await newAuthUser(db, email, b.password, false);
    const pid = uuid();
    await db.batch([
      insertPerson(db, {id: pid, uid: user.id, email, name, role: 'advisor', manager: pid, permissions: DEFAULT_PERMS.advisor, scope: 'all'}),
      putItem(db, 'meta-' + pid, 'account_meta', pid, {type: 'advisor', partner: true, company, phone: clean(b.phone, 40), website: clean(b.website, 200), country: loc.country, city: loc.city, lat: loc.lat, lng: loc.lng}),
      putItem(db, 'profile-' + pid, 'profile', pid, {name, company, phone: clean(b.phone, 40), taxOffice: clean(b.taxOffice, 120), taxNumber: clean(b.taxNumber, 20), address: [loc.city, loc.country].join(', ')}),
      putItem(db, 'partner-' + pid, 'partner', pid, {status: 'docs_required', company, name, email, taxOffice: clean(b.taxOffice, 120), taxNumber: clean(b.taxNumber, 20), services, docs: {}, history: [{at: now(), text: 'Başvuru oluşturuldu'}]}),
      notice(db, 'owner', 'Yeni partner başvurusu: ' + company, 'partners'),
    ]);
    const mail = await sendVerify(db, req, user, name);
    return json({ok: true, verifyRequired: true, mailSent: mail.sent, devLink: mail.devLink});
  }

  if (route === 'verify' && req.method === 'POST') {
    const t = await useToken(db, b.token, ['verify']);
    await q(db, 'UPDATE auth_users SET verified=1 WHERE id=?', t.user).run();
    return json({ok: true});
  }
  if (route === 'resend' && req.method === 'POST') {
    const email = clean(b.email, 254).toLowerCase();
    const u = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    if (u && !u.verified) { const m = await sendVerify(db, req, u); return json({ok: true, devLink: m.devLink}); }
    return json({ok: true});
  }
  if (route === 'forgot' && req.method === 'POST') {
    const email = clean(b.email, 254).toLowerCase();
    const u = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    let devLink;
    if (u && (email !== OWNER_EMAIL() || isAdminRequest(req))) {
      const token = await createToken(db, u.id, 'reset', 2);
      const base = email === OWNER_EMAIL() ? adminUrl(req) + '/admin/giris/' : siteUrl(req) + '/giris/';
      const m = await sendMail({to: email, subject: 'Şifre sıfırlama', text: 'Şifrenizi sıfırlamak için bağlantıya tıklayın. Bağlantı 2 saat geçerlidir. Bu isteği siz yapmadıysanız dikkate almayın.', link: `${base}?sifre=${token}`, button: 'Yeni şifre belirle'});
      devLink = m.devLink;
    }
    return json({ok: true, devLink}); // same answer whether or not the address exists
  }
  if (route === 'reset' && req.method === 'POST') {
    if (!passwordOk(b.password)) fail(400, PASSWORD_RULE);
    const t = await useToken(db, b.token, ['reset', 'invite']);
    const {salt, hash} = await hashPassword(b.password);
    await q(db, 'UPDATE auth_users SET hash=?, salt=?, verified=1, failed=0, locked_until=0 WHERE id=?', hash, salt, t.user).run();
    await q(db, 'DELETE FROM auth_sessions WHERE user=?', t.user).run();
    return json({ok: true});
  }

  if (route === 'login' && req.method === 'POST') {
    const admin = isAdminRequest(req);
    const email = clean(b.email, 254).toLowerCase();
    const u = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    if (admin && email !== OWNER_EMAIL()) fail(403, 'Bu adres yalnızca yönetici girişi içindir.');
    if (!admin && email === OWNER_EMAIL()) fail(403, 'Yönetici hesabı yalnızca yönetim panelinin adresinden giriş yapabilir.');
    if (u?.locked_until > now()) fail(429, 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
    const ok = u && await checkPassword(String(b.password || ''), u.salt, u.hash);
    if (!ok) {
      if (u) await q(db, 'UPDATE auth_users SET failed=failed+1, locked_until=CASE WHEN failed+1>=8 THEN ? ELSE locked_until END WHERE id=?', now() + 15 * 6e4, u.id).run();
      fail(401, 'E-posta veya şifre hatalı.');
    }
    if (!u.verified) fail(403, 'E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu kontrol edin.', {unverified: true});
    await q(db, 'UPDATE auth_users SET failed=0, locked_until=0 WHERE id=?', u.id).run();
    let accounts;
    if (admin) accounts = [{panel: 'admin', home: '/admin/', label: 'Yönetim paneli'}];
    else {
      accounts = await accountsFor(db, u);
      if (!accounts.length) fail(403, 'Bu e-posta için aktif bir panel hesabı bulunamadı.');
    }
    return json({ok: true, accounts, home: accounts[0].home}, 200, {'Set-Cookie': await createSession(db, req, u.id)});
  }

  if (route === 'setup' && req.method === 'POST') { // first owner password, protected by ADMIN_SETUP_KEY
    if (!isAdminRequest(req)) fail(404, 'Bulunamadı.');
    const key = process.env.ADMIN_SETUP_KEY;
    if (!key) fail(503, 'ADMIN_SETUP_KEY ortam değişkeni tanımlı değil.');
    if (clean(b.setupKey, 200) !== key) fail(403, 'Kurulum anahtarı hatalı.');
    if (!passwordOk(b.password) || b.password.length < 12) fail(400, 'Yönetici şifresi en az 12 karakter olmalı ve harf ile rakam içermelidir.');
    let u = await one(db, 'SELECT * FROM auth_users WHERE email=?', OWNER_EMAIL());
    if (u?.hash) fail(409, 'Yönetici şifresi zaten belirlenmiş. "Şifremi unuttum" ile sıfırlayabilirsiniz.');
    const {salt, hash} = await hashPassword(b.password);
    if (u) await q(db, 'UPDATE auth_users SET hash=?, salt=?, verified=1 WHERE id=?', hash, salt, u.id).run();
    else { const id = uuid(); await q(db, 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', id, OWNER_EMAIL(), hash, salt, 1, 0, 0, now()).run(); u = {id}; }
    return json({ok: true}, 200, {'Set-Cookie': await createSession(db, req, u.id)});
  }
  if (route === 'status' && req.method === 'GET') {
    if (!isAdminRequest(req)) fail(404, 'Bulunamadı.');
    const u = await one(db, 'SELECT hash FROM auth_users WHERE email=?', OWNER_EMAIL());
    return json({setupNeeded: !u?.hash, setupKeyConfigured: !!process.env.ADMIN_SETUP_KEY});
  }
  fail(404, 'İşlem bulunamadı.');
}

// ---- /api/platform/* (signed-in members) -----------------------------------
async function memberContext(db, req) {
  const u = await currentUser(db, req); if (!u) fail(401, 'Giriş yapmanız gerekiyor.');
  const person = await one(db, 'SELECT * FROM people WHERE uid=?', u.id);
  return {u, person};
}
const sniff = bytes => String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-' ? 'application/pdf' : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg' : bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10' ? 'image/png' : null;
const MAX_UPLOAD = () => Number(process.env.MAX_UPLOAD_MB || (process.env.VERCEL ? 4 : 10)) * 1024 * 1024;

export async function runPartnerVerification(env, personId) {
  const db = env.DB;
  const rec = await getItem(db, 'partner-' + personId); if (!rec) return;
  const d = rec.data;
  if (!Object.keys(PARTNER_DOCS).every(k => d.docs[k])) return;
  d.status = 'checking'; d.history.push({at: now(), text: 'Otomatik doğrulama başladı'});
  await putItem(db, rec.id, 'partner', personId, d).run();
  let result;
  try {
    const files = [];
    for (const k of Object.keys(PARTNER_DOCS)) {
      const obj = await env.BUCKET.get(d.docs[k].key);
      if (!obj) throw new Error(PARTNER_DOCS[k].title + ' dosyası okunamadı.');
      files.push({doc: k, mime: d.docs[k].mime, bytes: new Uint8Array(await obj.arrayBuffer())});
    }
    result = await verifyPartner(d, files);
  } catch (e) { console.error('[partner-verify]', e.message); result = {decision: 'review', summary: 'Otomatik doğrulama tamamlanamadı: ' + e.message, checks: {}}; }
  const fresh = (await getItem(db, rec.id)).data;
  fresh.check = {...result, at: now()};
  for (const k of Object.keys(PARTNER_DOCS)) if (fresh.docs[k]) fresh.docs[k].status = result.checks?.[k] ? (result.checks[k].ok ? 'Uygun' : 'Sorunlu') : 'İncelemede';
  if (result.decision === 'approve') {
    fresh.status = 'approved'; fresh.approvedBy = 'Otomatik doğrulama'; fresh.history.push({at: now(), text: 'Belgeler otomatik doğrulandı, hesap onaylandı'});
    await db.batch([putItem(db, rec.id, 'partner', personId, fresh), notice(db, personId, 'Partner hesabınız onaylandı. Tüm modüller açıldı.', 'overview'), notice(db, 'owner', 'Partner otomatik onaylandı: ' + fresh.company, 'partners')]);
  } else {
    fresh.status = 'review'; fresh.history.push({at: now(), text: 'Admin incelemesine gönderildi'});
    await db.batch([putItem(db, rec.id, 'partner', personId, fresh), notice(db, personId, 'Belgeleriniz incelemeye alındı.', 'overview'), notice(db, 'owner', 'Partner belgeleri incelemenizi bekliyor: ' + fresh.company, 'partners')]);
  }
}

// Customer documents are checked automatically only after a service purchase.
export async function maybeVerifyCustomerUpload(env, documentId) {
  const db = env.DB;
  const doc = await getItem(db, documentId);
  if (!doc || doc.kind !== 'document' || doc.data.senderRole !== 'customer') return;
  const c = await one(db, "SELECT * FROM people WHERE id=? AND role='customer'", doc.owner); if (!c) return;
  const purchased = await one(db, "SELECT id FROM items WHERE owner=? AND ((kind='invoice' AND json_extract(data,'$.status')='Ödendi') OR kind='application') LIMIT 1", c.id);
  if (!purchased) return; // verification is optional before a purchase
  const titles = ['Pasaport', 'Adli Sicil Kaydı (Apostilli)', 'İkametgah Belgesi (Apostilli)', 'Diploma / Sertifika (Noter Onaylı)', 'Kira Kontratı', 'Biyometrik Fotoğraf', 'Ek Belge'];
  const expected = doc.data.title && doc.data.slot == null ? doc.data.title : titles[doc.data.slot] || doc.data.title || 'Başvuru belgesi';
  let result;
  try {
    const obj = await env.BUCKET.get(doc.data.key); if (!obj) return;
    result = await verifyCustomerDocument(c, {mime: doc.data.mime, bytes: new Uint8Array(await obj.arrayBuffer())}, expected);
  } catch (e) { console.error('[customer-verify]', e.message); result = {decision: 'review', summary: 'Otomatik kontrol tamamlanamadı.'}; }
  const fresh = await getItem(db, documentId);
  const data = {...fresh.data, autoCheck: {...result, at: now()}, status: result.decision === 'approve' ? 'Onaylandı' : 'İncelemede', reviewer: result.decision === 'approve' ? 'Otomatik doğrulama' : fresh.data.reviewer, reason: result.decision === 'approve' ? '' : result.summary};
  await db.batch([putItem(db, documentId, 'document', fresh.owner, data), notice(db, c.id, result.decision === 'approve' ? 'Belgeniz otomatik doğrulandı.' : 'Belgeniz danışman incelemesine alındı.', 'documents'), ...(result.decision === 'approve' ? [] : [notice(db, c.advisor || 'owner', 'Otomatik kontrolden geçemeyen belge: ' + c.name, 'documents')])]);
}

export async function handlePlatform(req, env, route, ctx = {}) {
  const db = env.DB;
  if (req.method !== 'GET') sameOrigin(req);
  if (route === 'modules' && req.method === 'GET') {
    const panel = clean(new URL(req.url).searchParams.get('panel'), 20);
    const list = (await rows(db, "SELECT * FROM items WHERE kind='panel_module' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data)})).filter(m => m.active !== false && (m.panels || []).includes(panel)).sort((a, b) => (a.order || 0) - (b.order || 0));
    const builtins = (await getItem(db, 'panel-builtins'))?.data?.[panel] || {hidden: []};
    return json({modules: list.map(m => ({id: m.id, title: m.title, icon: m.icon, type: m.type, content: m.content, url: m.url, order: m.order})), hidden: builtins.hidden || []});
  }
  const {u, person} = await memberContext(db, req);
  if (route === 'partner' && req.method === 'GET') {
    if (!person || person.role !== 'advisor') return json({partner: null});
    const p = await partnerState(db, person.id);
    if (!p) return json({partner: null});
    return json({partner: {status: p.status, company: p.company, services: p.services, docs: Object.fromEntries(Object.entries(p.docs).map(([k, v]) => [k, {name: v.name, status: v.status, at: v.at}])), check: p.check ? {summary: p.check.summary, at: p.check.at} : null, reason: p.reason || '', required: Object.fromEntries(Object.entries(PARTNER_DOCS).map(([k, v]) => [k, v.title])), maxMb: MAX_UPLOAD() / 1048576}});
  }
  if (route === 'partner/upload' && req.method === 'POST') {
    if (!person || person.role !== 'advisor') fail(403, 'Partner hesabı gerekli.');
    const rec = await getItem(db, 'partner-' + person.id); if (!rec) fail(404, 'Partner başvurusu bulunamadı.');
    if (['approved', 'checking'].includes(rec.data.status)) fail(409, rec.data.status === 'approved' ? 'Hesabınız zaten onaylı.' : 'Belgeleriniz şu anda kontrol ediliyor.');
    if (Number(req.headers.get('content-length') || 0) > MAX_UPLOAD() + 65536) fail(413, `Dosya en fazla ${MAX_UPLOAD() / 1048576} MB olabilir.`);
    const f = await req.formData(), file = f.get('file'), doc = clean(f.get('doc'), 20);
    if (!PARTNER_DOCS[doc]) fail(400, 'Belge türü geçersiz.');
    if (!file || typeof file === 'string' || !file.size || file.size > MAX_UPLOAD()) fail(400, `PDF, JPG veya PNG; en fazla ${MAX_UPLOAD() / 1048576} MB.`);
    const buf = await file.arrayBuffer(), mime = sniff(new Uint8Array(buf));
    if (!mime) fail(400, 'Geçerli bir PDF, JPG veya PNG dosyası seçin.');
    const key = `private/partner/${person.id}/${doc}-${uuid()}`;
    await env.BUCKET.put(key, buf, {httpMetadata: {contentType: mime}});
    const old = rec.data.docs[doc];
    rec.data.docs[doc] = {key, mime, name: clean(file.name, 200), size: file.size, at: now(), status: 'Yüklendi'};
    if (rec.data.status === 'rejected') rec.data.status = 'docs_required';
    const complete = Object.keys(PARTNER_DOCS).every(k => rec.data.docs[k]);
    rec.data.history.push({at: now(), text: PARTNER_DOCS[doc].title + ' yüklendi'});
    if (complete) rec.data.status = 'queued';
    await putItem(db, rec.id, 'partner', person.id, rec.data).run();
    if (old?.key) await env.BUCKET.delete(old.key).catch(() => {});
    if (complete && ctx.after) ctx.after(() => runPartnerVerification(env, person.id));
    return json({ok: true, complete});
  }
  if (route.startsWith('partner/file/') && req.method === 'GET') {
    if (!person) fail(403, 'Erişim yok.');
    const doc = route.split('/')[2]; const p = await partnerState(db, person.id);
    if (!p?.docs[doc]) fail(404, 'Dosya bulunamadı.');
    return streamFile(env, p.docs[doc]);
  }
  fail(404, 'İşlem bulunamadı.');
}

async function streamFile(env, d) {
  const obj = await env.BUCKET.get(d.key); if (!obj) fail(404, 'Dosya bulunamadı.');
  return new Response(obj.body, {headers: {'Content-Type': d.mime, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox"}});
}

// ---- /api/platform/admin/* (owner, admin host only) --------------------------
function validPerms(ps) {
  const out = {}; for (const p of PERMS) { const v = Number(ps?.[p] || 0); if (![0, 1, 2].includes(v)) fail(400, 'Geçersiz yetki.'); out[p] = v; }
  if (out.kyc > 0 && out.documents < 1) out.documents = 1;
  return out;
}
export async function handlePlatformAdmin(req, env, route, ctx = {}) {
  const db = env.DB;
  if (req.method !== 'GET') sameOrigin(req);
  const u = await currentUser(db, req);
  if (!u || u.email !== OWNER_EMAIL()) fail(401, 'Yönetici girişi gerekli.');
  const actor = 'Yönetici';

  if (route === 'meta' && req.method === 'GET') return json({types: ACCOUNT_TYPES, perms: PERMS, permLabels: PERM_LABELS, defaults: DEFAULT_PERMS, panels: PANELS, countries: Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, Object.keys(v)])), services: PARTNER_SERVICES, mail: mailConfigured(), verifier: verifierConfigured()});

  if (route === 'accounts' && req.method === 'GET') {
    const people = await rows(db, "SELECT * FROM people WHERE role!='owner' ORDER BY created DESC");
    const metas = Object.fromEntries((await rows(db, "SELECT owner,data FROM items WHERE kind='account_meta'")).map(r => [r.owner, parse(r.data)]));
    const partners = Object.fromEntries((await rows(db, "SELECT owner,data FROM items WHERE kind='partner'")).map(r => [r.owner, parse(r.data)]));
    const authed = Object.fromEntries((await rows(db, 'SELECT id,verified,hash FROM auth_users')).map(r => [r.id, r]));
    const names = Object.fromEntries(people.map(p => [p.id, p.name]));
    const list = people.map(p => {
      const meta = metas[p.id] || {}, a = authed[p.uid];
      const type = p.role === 'customer' ? 'customer' : meta.type || (p.role === 'advisor' ? 'advisor' : 'other');
      return {id: p.id, name: p.name, email: p.email, type, role: p.role, status: p.status, permissions: parse(p.permissions), scope: parse(p.scope), advisor: p.advisor, advisorName: p.advisor === 'owner' ? 'Merkez ofis' : names[p.advisor] || '', city: meta.city, country: meta.country, company: meta.company, phone: meta.phone, assignedBy: meta.assignedBy, title: meta.title, partner: partners[p.id] ? {status: partners[p.id].status} : null, login: a ? (a.hash ? (a.verified ? 'Aktif' : 'Doğrulama bekliyor') : 'Şifre bekleniyor') : 'Giriş yok', created: p.created};
    });
    const law = await rows(db, "SELECT * FROM law_accounts WHERE role!='owner' ORDER BY created DESC");
    for (const a of law) { const d = parse(a.data); const au = a.uid ? authed[a.uid] : null; list.push({id: 'law:' + a.id, name: d.profile?.name || a.email, email: a.email, type: 'lawyer', role: a.role, status: a.status === 'active' ? 'active' : 'disabled', permissions: {}, login: au ? (au.hash ? 'Aktif' : 'Şifre bekleniyor') : 'Giriş yok', created: a.created}); }
    list.sort((x, y) => y.created - x.created);
    return json({accounts: list});
  }

  const b = req.method === 'GET' ? {} : route.startsWith('modules/') && req.method === 'DELETE' ? {} : await body(req);

  if (route === 'accounts' && req.method === 'POST') {
    const type = clean(b.type, 20); if (!ACCOUNT_TYPES[type]) fail(400, 'Hesap türü seçin.');
    const email = clean(b.email, 254).toLowerCase(), name = clean(b.name, 100);
    if (name.length < 2 || !validEmail(email)) fail(400, 'Ad soyad ve geçerli e-posta gerekli.');
    if (email === OWNER_EMAIL()) fail(400, 'Bu e-posta yönetici hesabıdır.');
    if (await one(db, 'SELECT id FROM people WHERE email=?', email) || await one(db, 'SELECT id FROM law_accounts WHERE email=?', email)) fail(409, 'Bu e-posta ile kayıtlı bir hesap zaten var.');
    let user = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    if (!user) user = await newAuthUser(db, email, null, true);
    const loc = b.country ? locate(clean(b.country, 60), clean(b.city, 80)) : null;
    const pid = uuid(), ops = [];
    if (type === 'lawyer') {
      ops.push(q(db, "INSERT INTO law_accounts VALUES(?,?,?,NULL,'lawyer','active',?,?)", pid, user.id, email, JSON.stringify({profile: {name, phone: clean(b.phone, 40)}}), now()));
    } else if (type === 'customer') {
      let advisor = clean(b.advisor, 60) || '';
      if (advisor && advisor !== 'owner' && !await one(db, "SELECT id FROM people WHERE id=? AND role='advisor'", advisor)) fail(400, 'Danışman bulunamadı.');
      if (!advisor) { const near = await nearestAdvisor(db, loc); advisor = near?.id || 'owner'; }
      ops.push(insertPerson(db, {id: pid, uid: user.id, email, name, role: 'customer', manager: 'owner', permissions: {}, scope: 'all', advisor}));
      ops.push(notice(db, advisor, 'Yeni müşteri atandı: ' + name, 'customers'));
    } else {
      const perms = validPerms(b.permissions || DEFAULT_PERMS[type]);
      const scope = b.scope === 'all' || !Array.isArray(b.scope) ? 'all' : b.scope.slice(0, 200).map(x => clean(x, 60));
      ops.push(insertPerson(db, {id: pid, uid: user.id, email, name, role: type === 'advisor' ? 'advisor' : 'employee', manager: type === 'advisor' ? pid : 'owner', permissions: perms, scope}));
    }
    if (type !== 'lawyer') {
      ops.push(putItem(db, 'meta-' + pid, 'account_meta', pid, {type, phone: clean(b.phone, 40), company: clean(b.company, 200), title: clean(b.title, 100), country: loc?.country || '', city: loc?.city || '', lat: loc?.lat ?? null, lng: loc?.lng ?? null, createdBy: 'admin'}));
      ops.push(putItem(db, 'profile-' + pid, 'profile', pid, {name, phone: clean(b.phone, 40), company: clean(b.company, 200)}));
    }
    ops.push(audit(db, actor, 'account.create.' + type, email));
    await db.batch(ops);
    const fresh = await one(db, 'SELECT * FROM auth_users WHERE id=?', user.id);
    let mail = {sent: false};
    if (!fresh.hash) mail = await sendInvite(db, req, fresh, name, ACCOUNT_TYPES[type]);
    return json({ok: true, id: pid, mailSent: mail.sent, devLink: mail.devLink, existingLogin: !!fresh.hash});
  }

  if (route === 'accounts' && req.method === 'PATCH') {
    const id = clean(b.id, 80);
    if (id.startsWith('law:')) {
      const lid = id.slice(4);
      if (b.status) await q(db, "UPDATE law_accounts SET status=? WHERE id=? AND role!='owner'", b.status === 'active' ? 'active' : 'disabled', lid).run();
      await audit(db, actor, 'account.update', id).run();
      return json({ok: true});
    }
    const p = await one(db, "SELECT * FROM people WHERE id=? AND role!='owner'", id); if (!p) fail(404, 'Hesap bulunamadı.');
    const ops = [];
    if (b.status) ops.push(q(db, 'UPDATE people SET status=? WHERE id=?', b.status === 'active' ? 'active' : 'disabled', id));
    if (b.permissions && p.role !== 'customer') ops.push(q(db, 'UPDATE people SET permissions=? WHERE id=?', JSON.stringify(validPerms(b.permissions)), id));
    if (b.scope !== undefined && p.role !== 'customer') ops.push(q(db, 'UPDATE people SET scope=? WHERE id=?', JSON.stringify(b.scope === 'all' || !Array.isArray(b.scope) ? 'all' : b.scope.slice(0, 200)), id));
    if (b.advisor !== undefined && p.role === 'customer') {
      const adv = clean(b.advisor, 60) || 'owner';
      if (adv !== 'owner' && !await one(db, "SELECT id FROM people WHERE id=? AND role='advisor'", adv)) fail(400, 'Danışman bulunamadı.');
      ops.push(q(db, 'UPDATE people SET advisor=? WHERE id=?', adv, id), notice(db, adv, 'Size yeni müşteri atandı: ' + p.name, 'customers'));
    }
    if (b.name) ops.push(q(db, 'UPDATE people SET name=? WHERE id=?', clean(b.name, 100), id));
    ops.push(audit(db, actor, 'account.update', id));
    await db.batch(ops);
    return json({ok: true});
  }
  if (route === 'accounts/invite' && req.method === 'POST') {
    const id = clean(b.id, 80);
    const row = id.startsWith('law:') ? await one(db, 'SELECT email, data FROM law_accounts WHERE id=?', id.slice(4)) : await one(db, 'SELECT email, name FROM people WHERE id=?', id);
    if (!row) fail(404, 'Hesap bulunamadı.');
    let user = await one(db, 'SELECT * FROM auth_users WHERE email=?', row.email);
    if (!user) user = await newAuthUser(db, row.email, null, true);
    const token = await createToken(db, user.id, user.hash ? 'reset' : 'invite', 7 * 24);
    const link = `${siteUrl(req)}/giris/?sifre=${token}`;
    const m = await sendMail({to: row.email, subject: 'Brazil Migration giriş bağlantınız', text: 'Şifrenizi belirlemek / yenilemek için bağlantıyı kullanın. 7 gün geçerlidir.', link, button: 'Şifremi belirle'});
    return json({ok: true, mailSent: m.sent, devLink: m.devLink});
  }

  if (route === 'partners' && req.method === 'GET') {
    const list = await rows(db, "SELECT * FROM items WHERE kind='partner' ORDER BY updated DESC");
    return json({partners: list.map(r => { const d = parse(r.data); return {id: r.owner, company: d.company, name: d.name, email: d.email, taxOffice: d.taxOffice, taxNumber: d.taxNumber, services: d.services, status: d.status, reason: d.reason, check: d.check || null, docs: Object.fromEntries(Object.entries(d.docs).map(([k, v]) => [k, {name: v.name, status: v.status, at: v.at, mime: v.mime}])), history: d.history.slice(-12), updated: r.updated}; }), labels: Object.fromEntries(Object.entries(PARTNER_DOCS).map(([k, v]) => [k, v.title]))});
  }
  if (route === 'partners/review' && req.method === 'POST') {
    const id = clean(b.id, 80), rec = await getItem(db, 'partner-' + id); if (!rec) fail(404, 'Başvuru bulunamadı.');
    const decision = b.decision;
    if (decision === 'approve') { rec.data.status = 'approved'; rec.data.approvedBy = actor; rec.data.reason = ''; rec.data.history.push({at: now(), text: 'Admin tarafından onaylandı'}); }
    else if (decision === 'reject') { const reason = clean(b.reason, 1000); if (!reason) fail(400, 'Ret gerekçesi yazın.'); rec.data.status = 'rejected'; rec.data.reason = reason; rec.data.history.push({at: now(), text: 'Reddedildi: ' + reason}); }
    else if (decision === 'recheck') { if (ctx.after) ctx.after(() => runPartnerVerification(env, id)); rec.data.status = 'queued'; rec.data.history.push({at: now(), text: 'Yeniden otomatik kontrol istendi'}); }
    else fail(400, 'Karar geçersiz.');
    await db.batch([putItem(db, rec.id, 'partner', id, rec.data), notice(db, id, decision === 'approve' ? 'Partner hesabınız onaylandı.' : decision === 'reject' ? 'Belgelerinizde düzeltme gerekiyor: ' + rec.data.reason : 'Belgeleriniz yeniden kontrol ediliyor.', 'overview'), audit(db, actor, 'partner.' + decision, id)]);
    return json({ok: true});
  }
  if (route.startsWith('partners/file/') && req.method === 'GET') {
    const [, , id, doc] = route.split('/'); const p = await partnerState(db, id);
    if (!p?.docs[doc]) fail(404, 'Dosya bulunamadı.');
    return streamFile(env, p.docs[doc]);
  }

  if (route === 'modules' && req.method === 'GET') {
    const list = (await rows(db, "SELECT * FROM items WHERE kind='panel_module' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data)}));
    return json({modules: list, builtins: (await getItem(db, 'panel-builtins'))?.data || {}});
  }
  if (route === 'modules' && req.method === 'POST') {
    const panels = (Array.isArray(b.panels) ? b.panels : []).filter(p => PANELS[p]); if (!panels.length) fail(400, 'En az bir panel seçin.');
    const title = clean(b.title, 60); if (!title) fail(400, 'Modül adı gerekli.');
    const type = ['content', 'link', 'embed'].includes(b.type) ? b.type : 'content';
    let url = clean(b.url, 1000);
    if (type !== 'content') { try { const x = new URL(url); if (x.protocol !== 'https:') throw 0; url = x.href; } catch { fail(400, 'Bağlantı https:// ile başlamalı.'); } }
    const id = b.id && String(b.id).startsWith('mod-') ? clean(b.id, 80) : 'mod-' + uuid();
    await db.batch([putItem(db, id, 'panel_module', 'site', {title, icon: clean(b.icon, 20) || 'file', type, content: clean(b.content, 20000), url, panels, order: Number(b.order) || 0, active: b.active !== false}), audit(db, actor, 'module.save', title)]);
    return json({ok: true, id});
  }
  if (route.startsWith('modules/') && req.method === 'DELETE') {
    const id = clean(route.slice(8), 80);
    await db.batch([q(db, "DELETE FROM items WHERE id=? AND kind='panel_module'", id), audit(db, actor, 'module.delete', id)]);
    return json({ok: true});
  }
  if (route === 'builtins' && req.method === 'POST') {
    const out = {};
    for (const p of Object.keys(PANELS)) out[p] = {hidden: (Array.isArray(b[p]?.hidden) ? b[p].hidden : []).map(x => clean(x, 60)).filter(Boolean).slice(0, 40)};
    await db.batch([putItem(db, 'panel-builtins', 'panel_builtins', 'site', out), audit(db, actor, 'module.builtins', '')]);
    return json({ok: true});
  }
  fail(404, 'İşlem bulunamadı.');
}

// Partners whose documents are not approved yet may only open their profile.
export async function partnerGate(db, req, user, area, route) {
  if (!user) return;
  const p = await one(db, "SELECT id FROM people WHERE uid=? AND role='advisor'", user.id); if (!p) return;
  const st = await partnerState(db, p.id); if (!st || st.status === 'approved') return;
  const allowed = area === 'workspace' && ((route === 'bootstrap' && req.method === 'GET') || (route === 'profile' && req.method === 'POST') || (route === 'notices' && req.method === 'POST'));
  if (!allowed) fail(403, 'Partner hesabınız onay bekliyor. Belgeleriniz onaylanana kadar yalnızca profilinizi düzenleyebilirsiniz.', {limited: true});
}
